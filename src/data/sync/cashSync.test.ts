import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { dayKeyOf } from '../../lib/cashbook';
import { attachShop, setDataContext } from '../context';
import { cashRepo } from '../cashRepo';
import { db } from '../db';
import { entriesRepo } from '../entriesRepo';
import { partiesRepo } from '../partiesRepo';
import { productsRepo } from '../productsRepo';
import { shopsRepo } from '../shopsRepo';
import { createSync } from './engine';
import { createFakeServer, type FakeServer } from './fakeRemote';
import { getSyncState, resetSyncState } from './status';

const USER = '00000000-0000-4000-8000-0000000000cc';

let server: FakeServer;
let sync: ReturnType<typeof createSync>;

async function wipePhone() {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.sync_meta.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear(), db.cash_closings.clear()]);
  setDataContext({ userId: USER, shopId: null });
}

beforeEach(async () => {
  await wipePhone();
  resetSyncState();
  server = createFakeServer(USER);
  sync = createSync(async () => server);
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
});

const today = () => dayKeyOf(new Date());

describe('expenses, the drawer and the closing go to the server and come back', () => {
  it('sends a kharcha with its category, cash taken out, and the closing; everything is marked sent', async () => {
    const spent = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 5000, category: 'rent', method: 'bank' });
    const out = await entriesRepo.create({ kind: 'withdrawal', party_id: null, amount: 400 });
    const closing = await cashRepo.close({ day: today(), opening_cash: 1000, expected_cash: 600, counted_cash: 580 });
    expect(await sync.syncNow()).toBe('ok');
    expect(server.tables.entries.get(spent.id)).toMatchObject({ kind: 'kharcha', category: 'rent', method: 'bank' });
    expect(server.tables.entries.get(out.id)).toMatchObject({ kind: 'withdrawal', amount: 400 });
    expect(server.tables.cash_closings.get(closing.id)).toMatchObject({ day: today(), counted_cash: 580, difference: -20 });
    expect(await db.cash_closings.where('pending_sync').equals(1).count()).toBe(0);
    expect(getSyncState().pending).toBe(0);
  });

  it('a new phone with the same login gets the closing and the cash of the day back', async () => {
    await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 360 });
    const closing = await cashRepo.close({ day: today(), opening_cash: 500, expected_cash: 860, counted_cash: 860 });
    await sync.syncNow();
    await wipePhone();
    expect(await sync.restore()).toBe('restored');
    attachShop((await db.shops.toArray())[0].id);
    const back = await db.cash_closings.get(closing.id);
    expect(back).toMatchObject({ counted_cash: 860, opening_cash: 500, difference: 0, pending_sync: 0 });
    const view = await cashRepo.cashbookFor(today());
    expect(view.closing?.id).toBe(closing.id);
    expect(view.day.opening).toBe(500);
    expect(view.day.closing).toBe(860);
  });

  it('sending a closing twice is harmless (add-only)', async () => {
    const closing = await cashRepo.close({ day: today(), opening_cash: 0, expected_cash: 0, counted_cash: 0 });
    await sync.syncNow();
    await db.cash_closings.update(closing.id, { pending_sync: 1 }); // pretend the answer was lost
    expect(await sync.syncNow()).toBe('ok');
    expect(server.tables.cash_closings.size).toBe(1);
  });
});

describe('a server that has not run migration 0007 yet', () => {
  it('everything else keeps syncing; the closing waits quietly and goes later', async () => {
    server.supportsCash = false;
    const sale = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 100 });
    const { party } = await partiesRepo.create({ name: 'Ali' });
    const closing = await cashRepo.close({ day: today(), opening_cash: 0, expected_cash: 100, counted_cash: 100 });
    expect(await sync.syncNow()).toBe('ok');
    expect(server.tables.entries.has(sale.id)).toBe(true);
    expect(server.tables.parties.has(party.id)).toBe(true);
    expect(server.tables.cash_closings.size).toBe(0);
    expect((await db.cash_closings.get(closing.id))?.pending_sync).toBe(1);
    expect(getSyncState().pending).toBe(0); // not counted as "waiting" while the server cannot take it
  });

  it('stock still syncs when only the cash table is missing (and the other way round)', async () => {
    server.supportsCash = false;
    const product = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', units: [], price_unit: 'piece', cost_price: 10, sell_price: 12 });
    await sync.syncNow();
    expect(server.tables.products.has(product.id)).toBe(true);

    server.supportsCash = true;
    server.supportsStock = false;
    const sync2 = createSync(async () => server);
    await cashRepo.close({ day: today(), opening_cash: 0, expected_cash: 0, counted_cash: 0 });
    expect(await sync2.syncNow()).toBe('ok');
    expect(server.tables.cash_closings.size).toBe(1);
  });
});

describe('what the server refuses', () => {
  it('a cashier cannot take cash out: only that entry is parked, the rest goes', async () => {
    server.team[USER] = { shopId: (await shopsRepo.getMine())!.id, role: 'cashier' };
    const sale = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 100 });
    const out = await entriesRepo.create({ kind: 'withdrawal', party_id: null, amount: 50 });
    const result = await sync.syncNow();
    expect(result).toBe('problem');
    expect(server.tables.entries.has(sale.id)).toBe(true);
    expect(server.tables.entries.has(out.id)).toBe(false);
    expect(getSyncState().blocked).toBe(1);
  });
});
