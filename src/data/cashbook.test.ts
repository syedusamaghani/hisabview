import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { balancesByParty } from '../lib/balance';
import { addDays, dayKeyOf, dayStartOf } from '../lib/cashbook';
import { customCategories } from '../lib/expenses';
import { ledgerRows } from '../lib/ledger';
import { statementText } from '../lib/messages';
import { setDataContext } from './context';
import { cashRepo } from './cashRepo';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { shopsRepo } from './shopsRepo';
import { statsRepo } from './statsRepo';

const USER = '00000000-0000-4000-8000-00000000000c';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.cash_closings.clear()]);
  setDataContext({ userId: USER, shopId: null });
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
});

const today = () => dayKeyOf(new Date());

// Move an entry to another Pakistan day (test only: the app never changes an entry's date)
async function moveToDay(id: string, day: string, hourPk = 12) {
  await db.entries.update(id, { created_at: new Date(dayStartOf(day).getTime() + hourPk * 3_600_000).toISOString() });
}

describe('expenses with a category', () => {
  it('saves a built-in or typed category, tidies it, and lists the typed ones for next time', async () => {
    const a = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 5000, category: 'rent', method: 'bank' });
    const b = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 120, category: '  Chai   pani ' });
    await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 80, category: 'RENT' });
    expect(a).toMatchObject({ category: 'rent', method: 'bank' });
    expect(b.category).toBe('Chai pani');
    expect((await entriesRepo.listKharcha()).map((e) => e.category).sort()).toEqual(['Chai pani', 'rent', 'rent']);
    expect(customCategories(await entriesRepo.listKharcha())).toEqual(['Chai pani']);
  });

  it('refuses a category on anything but a kharcha, and a too long one', async () => {
    await expect(entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 10, category: 'rent' })).rejects.toThrow(/category/i);
    await expect(entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 10, category: 'x'.repeat(41) })).rejects.toThrow(/category/i);
  });

  it('the category is saved in the diary like the rest of the entry', async () => {
    const e = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 700, category: 'electricity' });
    const rows = await db.audit_log.where('entity_id').equals(e.id).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].after_value).toMatchObject({ category: 'electricity', amount: 700 });
  });
});

describe('cash put in and taken out of the drawer', () => {
  it('has no customer and is always cash', async () => {
    const { party } = await partiesRepo.create({ name: 'Ali' });
    await expect(entriesRepo.create({ kind: 'withdrawal', party_id: party.id, amount: 100 })).rejects.toThrow(/no person/i);
    await expect(entriesRepo.create({ kind: 'deposit', party_id: null, amount: 100, method: 'bank' })).rejects.toThrow(/always cash/i);
    await expect(entriesRepo.create({ kind: 'deposit', party_id: null, amount: 0 })).rejects.toThrow(/amount/i);
    const ok = await entriesRepo.create({ kind: 'withdrawal', party_id: null, amount: 400 });
    expect(ok.kind).toBe('withdrawal');
  });

  it('can be cancelled like any entry, and the cashbook follows', async () => {
    const w = await entriesRepo.create({ kind: 'withdrawal', party_id: null, amount: 400 });
    await entriesRepo.create({ kind: 'deposit', party_id: null, amount: 1000 });
    expect((await cashRepo.cashbookFor(today())).day.closing).toBe(600);
    await entriesRepo.cancel(w.id, 'wrong_entry');
    expect((await cashRepo.cashbookFor(today())).day.closing).toBe(1000);
  });
});

describe('the cashbook of a day', () => {
  async function busyDay() {
    const { party: ali } = await partiesRepo.create({ name: 'Ali' });
    const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
    await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 360 });
    await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 250, method: 'jazzcash' });
    await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 900 }); // udhaar: no cash moves
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 300 }); // cash from a customer
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 200, method: 'easypaisa' });
    await entriesRepo.create({ kind: 'purchase', party_id: karim.id, amount: 2880 }); // on credit: no cash moves
    await entriesRepo.create({ kind: 'diye', party_id: karim.id, amount: 1000 }); // paid the supplier in cash
    await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 150, category: 'transport' });
    await entriesRepo.create({ kind: 'withdrawal', party_id: null, amount: 100 });
    return { ali, karim };
  }

  it('closing cash = opening + cash in - cash out, with every method kept apart', async () => {
    await busyDay();
    const view = await cashRepo.cashbookFor(today());
    expect(view.day.cashIn).toBe(360 + 300);
    expect(view.day.cashOut).toBe(1000 + 150 + 100);
    expect(view.day.closing).toBe(0 + 660 - 1250);
    expect(view.day.byMethod.jazzcash).toEqual({ in: 250, out: 0 });
    expect(view.day.byMethod.easypaisa).toEqual({ in: 200, out: 0 });
    expect(view.day.byMethod.cash).toEqual({ in: 660, out: 1250 });
    expect(view.openingKnown).toBe(false);
    // the list shows what moved money (not the udhaar and not the purchase on credit)
    expect(view.list).toHaveLength(7);
  });

  it('close the day: the difference is saved, logged, and the next day opens with what was counted', async () => {
    await busyDay();
    const expected = (await cashRepo.cashbookFor(today())).day.closing; // -590 (the test shop started with no cash)
    // the first closing asks for the morning cash: 2,000 in the drawer
    const opening = 2000;
    const closing = await cashRepo.close({ day: today(), opening_cash: opening, expected_cash: opening + expected, counted_cash: 1380, note: 'Chai wala ko 30 diye' });
    expect(closing).toMatchObject({ opening_cash: 2000, expected_cash: 1410, counted_cash: 1380, difference: -30 });
    // closed and logged in the diary
    const diary = await db.audit_log.where('entity_id').equals(closing.id).toArray();
    expect(diary).toHaveLength(1);
    expect(diary[0]).toMatchObject({ entity: 'cash_closing', action: 'create' });
    // the same day now knows its opening
    const again = await cashRepo.cashbookFor(today());
    expect(again.openingKnown).toBe(true);
    expect(again.day.opening).toBe(2000);
    expect(again.day.closing).toBe(1410);
    // tomorrow starts with what was COUNTED, not what was expected
    const tomorrow = await cashRepo.openingFor(addDays(today(), 1));
    expect(tomorrow).toEqual({ cash: 1380, from: today() });
  });

  it('counting again the same day adds a newer closing; the newest one counts and the older stays', async () => {
    const first = await cashRepo.close({ day: today(), opening_cash: 500, expected_cash: 500, counted_cash: 480 });
    const second = await cashRepo.close({ day: today(), opening_cash: 500, expected_cash: 500, counted_cash: 500 });
    expect((await cashRepo.forDay(today()))?.id).toBe(second.id);
    expect((await cashRepo.listForDay(today())).map((c) => c.id).sort()).toEqual([first.id, second.id].sort());
    expect(await db.cash_closings.count()).toBe(2);
  });

  it('days that were never closed are carried forward, so nothing is lost', async () => {
    const yesterday = addDays(today(), -3);
    await cashRepo.close({ day: yesterday, opening_cash: 1000, expected_cash: 1000, counted_cash: 1000 });
    const sale = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 400 });
    await moveToDay(sale.id, addDays(today(), -2));
    const spent = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 150 });
    await moveToDay(spent.id, addDays(today(), -1));
    await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 60 });
    const view = await cashRepo.cashbookFor(today());
    expect(view.day.opening).toBe(1000 + 400 - 150);
    expect(view.day.closing).toBe(1250 + 60);
  });

  it('refuses a closing with a bad number or day', async () => {
    const base = { day: today(), opening_cash: 0, expected_cash: 0, counted_cash: 0 };
    await expect(cashRepo.close({ ...base, counted_cash: -1 })).rejects.toThrow(/counted/i);
    await expect(cashRepo.close({ ...base, counted_cash: 1.5 })).rejects.toThrow(/counted/i);
    await expect(cashRepo.close({ ...base, opening_cash: -5 })).rejects.toThrow(/opening/i);
    await expect(cashRepo.close({ ...base, day: 'yesterday' })).rejects.toThrow(/day/i);
    await expect(cashRepo.close({ ...base, note: 'x'.repeat(301) })).rejects.toThrow(/note/i);
    expect(await db.cash_closings.count()).toBe(0);
  });
});

describe('customer and supplier balances follow every transaction; the statement agrees', () => {
  it('Aslam: udhaar, partial payments, cancel, purchase and supplier payment', async () => {
    const { party: aslam } = await partiesRepo.create({ name: 'Aslam', opening: { amount: 1000, direction: 'theyOweMe' } });
    const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
    const diye = await entriesRepo.create({ kind: 'diye', party_id: aslam.id, amount: 500 });
    await entriesRepo.create({ kind: 'mile', party_id: aslam.id, amount: 300 }); // partial payment
    await entriesRepo.create({ kind: 'diye', party_id: aslam.id, amount: 70 });
    await entriesRepo.cancel(diye.id, 'wrong_entry');
    await entriesRepo.create({ kind: 'purchase', party_id: karim.id, amount: 2880 });
    await entriesRepo.create({ kind: 'diye', party_id: karim.id, amount: 1000 });

    const parties = await partiesRepo.listAll();
    const entries = await entriesRepo.listAll();
    const stats = await statsRepo.all();
    const balances = balancesByParty(parties, entries);
    expect(balances[aslam.id]).toBe(1000 - 300 + 70);
    expect(balances[karim.id]).toBe(-1880);
    expect(stats[aslam.id].balance).toBe(balances[aslam.id]);
    expect(stats[karim.id].balance).toBe(balances[karim.id]);

    // the ledger's last running balance is the same number, and the WhatsApp statement ends with it
    const mine = entries.filter((e) => e.party_id === aslam.id);
    const rows = ledgerRows(aslam, mine).filter((r) => r.balance !== null);
    expect(rows.at(-1)?.balance).toBe(770);
    const text = statementText('ro', { name: 'Aslam', shop: 'Ahmed General Store' }, aslam, mine);
    expect(text.split('\n').at(-1)).toBe('Ab tak ka baqi hisaab: Rs 770.');
    expect(text).toContain('| Baqi: Rs 770');
  });
});
