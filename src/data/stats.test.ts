import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { partyBalance } from '../lib/balance';
import { db } from './db';
import { setDataContext } from './context';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { shopsRepo } from './shopsRepo';
import { statsRepo } from './statsRepo';
import { computeStats } from './stats';
import { createSync } from './sync/engine';
import { createFakeServer } from './sync/fakeRemote';
import { resetSyncState } from './sync/status';

const USER = '00000000-0000-4000-8000-0000000000bb';

async function wipe() {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.sync_meta.clear(), db.party_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
  resetSyncState();
}

beforeEach(wipe);

// The summary must always equal what the entries say. This is the safety check used everywhere below.
async function expectSummaryTrue() {
  expect(await statsRepo.verify()).toEqual([]);
  const shop = (await shopsRepo.getMine())!;
  const parties = await db.parties.where('shop_id').equals(shop.id).toArray();
  const entries = await db.entries.toArray();
  const stats = await statsRepo.all();
  for (const p of parties) expect(stats[p.id].balance).toBe(partyBalance(p, entries.filter((e) => e.party_id === p.id)));
}

describe('computeStats', () => {
  const party = { id: 'a', shop_id: 's', type: 'customer', opening_balance: 100 };
  const entry = (kind: string, amount: number, created_at: string, status = 'active') => ({ party_id: 'a', kind, amount, status, created_at }) as never;

  it('adds diye, subtracts mile, ignores cancelled, counts old balance, remembers the newest entry', () => {
    const [s] = computeStats([party], [entry('diye', 500, '2026-11-01T00:00:00Z'), entry('mile', 200, '2026-11-03T00:00:00Z'), entry('diye', 999, '2026-11-04T00:00:00Z', 'cancelled')]);
    expect(s).toEqual({ party_id: 'a', shop_id: 's', balance: 400, last_at: '2026-11-04T00:00:00Z' });
  });
  it('a supplier opening entry counts as "I owe them"', () => {
    const [s] = computeStats([{ ...party, type: 'supplier', opening_balance: 0 }], [entry('opening', 700, '2026-11-01T00:00:00Z')]);
    expect(s.balance).toBe(-700);
  });
  it('drafts do not count as contact', () => {
    const [s] = computeStats([party], [entry('diye', 50, '2026-11-01T00:00:00Z', 'draft')]);
    expect(s.last_at).toBeNull();
  });
});

describe('the summary follows every change', () => {
  it('new customer with an old balance, entries, a cancel', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party: ali } = await partiesRepo.create({ name: 'Ali', opening: { amount: 1000, direction: 'theyOweMe' } });
    const { party: sup } = await partiesRepo.create({ name: 'Supplier', opening: { amount: 400, direction: 'iOweThem' } });
    expect((await statsRepo.all())[ali.id].balance).toBe(1000);
    expect((await statsRepo.all())[sup.id].balance).toBe(-400);
    const e = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 250 });
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 100 });
    await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 5000 }); // touches nobody
    expect((await statsRepo.all())[ali.id].balance).toBe(1150);
    await entriesRepo.cancel(e.id);
    expect((await statsRepo.all())[ali.id].balance).toBe(900);
    await expectSummaryTrue();
  });

  it('remembers the time of the newest entry (also for cancelled), for "recent customers"', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party } = await partiesRepo.create({ name: 'Ali' });
    expect((await statsRepo.all())[party.id].last_at).toBeNull();
    const e = await entriesRepo.create({ kind: 'diye', party_id: party.id, amount: 10 });
    expect((await statsRepo.all())[party.id].last_at).toBe(e.created_at);
  });

  it('a failed save leaves the summary untouched (all or nothing)', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party } = await partiesRepo.create({ name: 'Ali' });
    await expect(entriesRepo.create({ kind: 'diye', party_id: party.id, amount: -5 })).rejects.toThrow();
    await expect(entriesRepo.create({ kind: 'diye', party_id: 'nobody', amount: 5 })).rejects.toThrow();
    expect((await statsRepo.all())[party.id].balance).toBe(0);
    await expectSummaryTrue();
  });

  it('the legacy old-balance field is still counted when it is edited', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party } = await partiesRepo.create({ name: 'Ali', opening_balance: 300 });
    await entriesRepo.create({ kind: 'diye', party_id: party.id, amount: 50 });
    expect((await statsRepo.all())[party.id].balance).toBe(350);
    await partiesRepo.update(party.id, { opening_balance: 100 });
    expect((await statsRepo.all())[party.id].balance).toBe(150);
    await expectSummaryTrue();
  });

  it('rebuildAll repairs a summary that was damaged', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party } = await partiesRepo.create({ name: 'Ali' });
    await entriesRepo.create({ kind: 'diye', party_id: party.id, amount: 70 });
    await db.party_stats.put({ party_id: party.id, shop_id: party.shop_id, balance: 999999, last_at: null });
    expect((await statsRepo.verify()).length).toBe(1);
    await statsRepo.rebuildAll();
    expect(await statsRepo.verify()).toEqual([]);
    expect((await statsRepo.all())[party.id].balance).toBe(70);
  });

  it('a missing summary row is worked out from the entries when the next entry arrives', async () => {
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party } = await partiesRepo.create({ name: 'Ali', opening: { amount: 500, direction: 'theyOweMe' } });
    await db.party_stats.delete(party.id);
    await entriesRepo.create({ kind: 'diye', party_id: party.id, amount: 20 });
    expect((await statsRepo.all())[party.id].balance).toBe(520);
  });
});

// A long random day at the shop: the summary must never drift from the entries
describe('random shop life', () => {
  function rng(seed: number) {
    let s = seed;
    return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  }

  it('300 random actions, checked against the entries after every 25', async () => {
    const rand = rng(7);
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const ids: string[] = [];
    const entryIds: string[] = [];
    for (let i = 1; i <= 300; i++) {
      const r = rand();
      if (ids.length < 3 || r < 0.08) {
        const dir = rand() < 0.3 ? 'iOweThem' : 'theyOweMe';
        const { party } = await partiesRepo.create({ name: `P${i}`, opening: rand() < 0.5 ? { amount: 100 + Math.floor(rand() * 900), direction: dir } : undefined });
        ids.push(party.id);
      } else if (r < 0.75) {
        const e = await entriesRepo.create({ kind: rand() < 0.6 ? 'diye' : 'mile', party_id: ids[Math.floor(rand() * ids.length)], amount: 1 + Math.floor(rand() * 5000) });
        entryIds.push(e.id);
      } else if (r < 0.85) {
        await entriesRepo.create({ kind: rand() < 0.5 ? 'cash_sale' : 'kharcha', party_id: null, amount: 1 + Math.floor(rand() * 900) });
      } else if (r < 0.95 && entryIds.length > 0) {
        const id = entryIds.splice(Math.floor(rand() * entryIds.length), 1)[0];
        await entriesRepo.cancel(id);
      } else {
        await partiesRepo.update(ids[Math.floor(rand() * ids.length)], { archived: rand() < 0.5 });
      }
      if (i % 25 === 0) await expectSummaryTrue();
    }
    await expectSummaryTrue();
  });
});

describe('with sync: entries that arrive from another phone', () => {
  it('a restore builds the summary, a later pull keeps it right (new entry, a cancel, a new customer)', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    // phone A
    await shopsRepo.create({ shop_name: 'Store', language: 'ro' });
    const { party: ali } = await partiesRepo.create({ name: 'Ali', opening: { amount: 1000, direction: 'theyOweMe' } });
    const e1 = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 300 });
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 100 });
    await sync.syncNow();

    // phone B: fresh
    await wipe();
    expect(await sync.restore()).toBe('restored');
    const shop = (await shopsRepo.getMine())!;
    setDataContext({ userId: USER, shopId: shop.id });
    expect((await statsRepo.all())[ali.id].balance).toBe(1200);
    await expectSummaryTrue();

    // phone A (the server) gets a new customer with an entry, and a cancel of e1
    const t = '2030-01-01T00:00:00+00:00';
    server.tables.parties.set('f0000000-0000-4000-8000-000000000001', { id: 'f0000000-0000-4000-8000-000000000001', shop_id: shop.id, name: 'Sana', identifier: null, phone: null, type: 'customer', credit_limit: null, opening_balance: 0, created_at: '2026-11-06T00:00:00+00:00', archived: false, updated_at: t });
    server.tables.entries.set('f0000000-0000-4000-8000-000000000002', { id: 'f0000000-0000-4000-8000-000000000002', shop_id: shop.id, party_id: 'f0000000-0000-4000-8000-000000000001', kind: 'diye', amount: 450, note: null, transcript: null, source: 'manual', status: 'active', promise_date: null, created_by: USER, created_at: '2026-11-06T01:00:00+00:00', cancelled_at: null, updated_at: t });
    server.tables.entries.set(e1.id, { ...server.tables.entries.get(e1.id)!, status: 'cancelled', cancelled_at: '2026-11-06T02:00:00+00:00', updated_at: t });
    await sync.syncNow({ pull: true });
    const stats = await statsRepo.all();
    expect(stats['f0000000-0000-4000-8000-000000000001'].balance).toBe(450);
    expect(stats[ali.id].balance).toBe(900); // 1000 + 300 - 100, then the 300 was cancelled on the other phone
    await expectSummaryTrue();
  });

  it('two phones with their own shops: after they meet, the summary still matches', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    await shopsRepo.create({ shop_name: 'A', language: 'ro' });
    const { party: a } = await partiesRepo.create({ name: 'Ali' });
    await entriesRepo.create({ kind: 'diye', party_id: a.id, amount: 100 });
    await sync.syncNow();
    await wipe();
    await shopsRepo.create({ shop_name: 'B', language: 'ro' });
    const { party: b } = await partiesRepo.create({ name: 'Bilal', opening: { amount: 50, direction: 'theyOweMe' } });
    await entriesRepo.create({ kind: 'diye', party_id: b.id, amount: 25 });
    await sync.syncNow({ pull: true });
    const shop = (await shopsRepo.getMine())!;
    setDataContext({ userId: USER, shopId: shop.id });
    expect((await statsRepo.all())[b.id].balance).toBe(75);
    expect((await statsRepo.all())[a.id].balance).toBe(100);
    await expectSummaryTrue();
  });
});
