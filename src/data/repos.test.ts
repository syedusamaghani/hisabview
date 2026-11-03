import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { setDataContext } from './context';
import { shopsRepo } from './shopsRepo';
import { partiesRepo } from './partiesRepo';
import { entriesRepo } from './entriesRepo';
import { auditRepo } from './auditRepo';
import { balancesByParty } from '../lib/balance';

const USER = '00000000-0000-4000-8000-00000000000a';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear()]);
  setDataContext({ userId: USER, shopId: null });
});

async function startShop() {
  const shop = await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const ali = await partiesRepo.create({ name: 'Ali', identifier: 'Gali no 4', opening_balance: 1000 });
  return { shop, ali };
}

describe('shop', () => {
  it('creates the shop, marks it pending sync and writes an audit line', async () => {
    const { shop } = await startShop();
    expect(shop.pending_sync).toBe(1);
    expect(await shopsRepo.getMine()).toMatchObject({ id: shop.id });
    const log = await auditRepo.listFor(shop.id);
    expect(log.map((l) => l.action)).toEqual(['create']);
  });

  it('rejects an empty shop name', async () => {
    await expect(shopsRepo.create({ shop_name: '   ', language: 'ur' })).rejects.toThrow();
    expect(await db.shops.count()).toBe(0);
    expect(await db.audit_log.count()).toBe(0);
  });
});

describe('entries', () => {
  it('saves an entry with its audit line, both marked pending sync', async () => {
    const { ali } = await startShop();
    const entry = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 2500 });
    expect(entry).toMatchObject({ status: 'active', amount: 2500, pending_sync: 1, created_by: USER });
    const log = await auditRepo.listFor(entry.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: 'create', before_value: null, actor: USER, pending_sync: 1 });
    expect(log[0].after_value).toMatchObject({ amount: 2500, kind: 'diye' });
  });

  it('rejects bad amounts and saves nothing', async () => {
    const { ali } = await startShop();
    const before = await db.audit_log.count();
    for (const amount of [0, -10, 2.5, 1_000_000_000, NaN]) {
      await expect(entriesRepo.create({ kind: 'diye', party_id: ali.id, amount })).rejects.toThrow();
    }
    expect(await db.entries.count()).toBe(0);
    expect(await db.audit_log.count()).toBe(before);
  });

  it('needs a person for diye and mile, and the person must exist in this shop', async () => {
    await startShop();
    await expect(entriesRepo.create({ kind: 'mile', party_id: null, amount: 100 })).rejects.toThrow();
    await expect(entriesRepo.create({ kind: 'diye', party_id: 'nobody', amount: 100 })).rejects.toThrow();
    expect(await db.entries.count()).toBe(0);
  });

  it('cancel keeps the row, sets status and time, and writes before/after in the audit log', async () => {
    const { ali } = await startShop();
    const entry = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 700 });
    const cancelled = await entriesRepo.cancel(entry.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_at).not.toBeNull();
    expect(await db.entries.count()).toBe(1); // never deleted
    const log = await auditRepo.listFor(entry.id);
    expect(log.map((l) => l.action)).toEqual(['create', 'cancel']);
    expect(log[1].before_value).toMatchObject({ status: 'active' });
    expect(log[1].after_value).toMatchObject({ status: 'cancelled' });
  });

  it('cannot cancel twice', async () => {
    const { ali } = await startShop();
    const entry = await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 50 });
    await entriesRepo.cancel(entry.id);
    await expect(entriesRepo.cancel(entry.id)).rejects.toThrow();
    expect(await auditRepo.listFor(entry.id)).toHaveLength(2);
  });

  it('lists newest first', async () => {
    const { ali } = await startShop();
    const a = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 1 });
    await new Promise((r) => setTimeout(r, 5));
    const b = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 2 });
    expect((await entriesRepo.listRecent()).map((x) => x.id)).toEqual([b.id, a.id]);
    expect((await entriesRepo.listForParty(ali.id)).map((x) => x.id)).toEqual([b.id, a.id]);
  });
});

describe('parties', () => {
  it('keeps three Alis apart by identifier', async () => {
    await startShop();
    await partiesRepo.create({ name: 'Ali', identifier: 'Bakery wala' });
    await partiesRepo.create({ name: 'Ali', identifier: 'Rickshaw' });
    const list = await partiesRepo.listActive();
    expect(list.filter((p) => p.name === 'Ali')).toHaveLength(3);
  });

  it('archive hides a person but keeps the row and writes an audit line', async () => {
    const { ali } = await startShop();
    await partiesRepo.archive(ali.id);
    expect((await partiesRepo.listActive()).map((p) => p.id)).not.toContain(ali.id);
    expect(await db.parties.get(ali.id)).toBeDefined();
    expect((await auditRepo.listFor(ali.id)).map((l) => l.action)).toEqual(['create', 'edit']);
  });

  it('rejects a wrong opening amount', async () => {
    await startShop();
    await expect(partiesRepo.create({ name: 'Zeeshan', opening_balance: 12.5 })).rejects.toThrow();
  });
});

describe('balance from saved data', () => {
  it('counts only active entries', async () => {
    const { ali } = await startShop();
    await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 2500 });
    const wrong = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 9000 });
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 1000 });
    await entriesRepo.cancel(wrong.id);
    const balances = balancesByParty(await partiesRepo.listActive(), await entriesRepo.listAll());
    expect(balances[ali.id]).toBe(1000 + 2500 - 1000);
  });
});

describe('another shop', () => {
  it('cannot be reached from a different login', async () => {
    const { ali } = await startShop();
    const entry = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 100 });
    setDataContext({ userId: '00000000-0000-4000-8000-00000000000b', shopId: '99999999-0000-4000-8000-000000000000' });
    expect(await entriesRepo.get(entry.id)).toBeUndefined();
    expect(await partiesRepo.listActive()).toEqual([]);
    await expect(entriesRepo.cancel(entry.id)).rejects.toThrow();
  });
});
