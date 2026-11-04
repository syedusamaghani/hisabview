import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { balancesByParty } from '../../lib/balance';
import { entriesRepo } from '../entriesRepo';
import { partiesRepo } from '../partiesRepo';
import { shopsRepo } from '../shopsRepo';
import { db } from '../db';
import { requireShop, setDataContext } from '../context';
import { createSync } from './engine';
import { createFakeServer, type FakeServer } from './fakeRemote';
import { describeSync, getSyncState, resetSyncState } from './status';

const USER = '00000000-0000-4000-8000-0000000000aa';

let server: FakeServer;
let sync: ReturnType<typeof createSync>;

async function wipePhone() {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.sync_meta.clear(), db.party_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
}

beforeEach(async () => {
  await wipePhone();
  resetSyncState();
  server = createFakeServer(USER);
  sync = createSync(async () => server);
});

// A shop with two customers and a few entries, all only on this phone so far
async function startShop() {
  const shop = await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali', identifier: 'chai wala', phone: '0300-1234567', opening: { amount: 1000, direction: 'theyOweMe' } });
  const { party: bilal } = await partiesRepo.create({ name: 'Bilal' });
  const e1 = await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 500, note: 'chawal', source: 'voice', transcript: 'Ali ko 500 diye' });
  const e2 = await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 200 });
  const sale = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 1500 });
  return { shop, ali, bilal, e1, e2, sale };
}

const pendingCount = async () => (await db.parties.where('pending_sync').equals(1).count()) + (await db.entries.where('pending_sync').equals(1).count()) + (await db.audit_log.where('pending_sync').equals(1).count()) + (await db.shops.where('pending_sync').equals(1).count());

describe('push: the phone sends its changes', () => {
  it('sends everything, in an order the server accepts, and marks it sent', async () => {
    const { shop } = await startShop();
    expect(await pendingCount()).toBeGreaterThan(0);
    expect(await sync.syncNow()).toBe('ok');
    expect(await pendingCount()).toBe(0);
    expect(server.tables.shops.get(shop.id)?.shop_name).toBe('Ahmed General Store');
    expect(server.tables.parties.size).toBe(2);
    expect(server.tables.entries.size).toBe(4); // diye, mile, sale, and the opening balance
    expect(server.tables.audit_log.size).toBe(await db.audit_log.count());
    expect(describeSync(getSyncState())).toBe('synced');
    expect(getSyncState().lastSyncAt).not.toBeNull();
  });

  it('keeps the voice transcript and note', async () => {
    const { e1 } = await startShop();
    await sync.syncNow();
    const row = server.tables.entries.get(e1.id)!;
    expect(row.transcript).toBe('Ali ko 500 diye');
    expect(row.source).toBe('voice');
    expect(row.note).toBe('chawal');
    expect('pending_sync' in row).toBe(false);
  });

  it('without internet nothing is lost: it waits, then goes when internet is back', async () => {
    await startShop();
    server.offline = true;
    expect(await sync.syncNow()).toBe('offline');
    expect(getSyncState().phase).toBe('offline');
    expect(getSyncState().pending).toBeGreaterThan(0);
    expect(describeSync(getSyncState())).toBe('queued');
    expect(await db.entries.count()).toBe(4); // still all on the phone
    server.offline = false;
    expect(await sync.syncNow()).toBe('ok');
    expect(describeSync(getSyncState())).toBe('synced');
    expect(server.tables.entries.size).toBe(4);
  });

  it('works offline for hours: new entries pile up and all go together later', async () => {
    const { ali } = await startShop();
    await sync.syncNow();
    server.offline = true;
    for (let i = 1; i <= 5; i++) await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: i * 100 });
    expect(await sync.syncNow()).toBe('offline');
    expect(getSyncState().pending).toBeGreaterThanOrEqual(10); // 5 entries and 5 diary lines
    server.offline = false;
    await sync.syncNow();
    expect(server.tables.entries.size).toBe(9);
    expect(await pendingCount()).toBe(0);
  });

  it('sending twice does not make duplicates (same id), also for the diary', async () => {
    await startShop();
    await sync.syncNow();
    const sizes = [server.tables.parties.size, server.tables.entries.size, server.tables.audit_log.size];
    for (const t of ['parties', 'entries', 'audit_log'] as const) {
      await (db[t] as unknown as { toCollection(): { modify(changes: object): Promise<number> } }).toCollection().modify({ pending_sync: 1 });
    }
    expect(await sync.syncNow()).toBe('ok');
    expect([server.tables.parties.size, server.tables.entries.size, server.tables.audit_log.size]).toEqual(sizes);
  });

  it('a cancel is sent as a change to the same entry', async () => {
    const { e1 } = await startShop();
    await sync.syncNow();
    await entriesRepo.cancel(e1.id);
    expect(await pendingCount()).toBeGreaterThan(0);
    await sync.syncNow();
    expect(server.tables.entries.get(e1.id)?.status).toBe('cancelled');
    expect(server.tables.entries.get(e1.id)?.cancelled_at).not.toBeNull();
  });

  it('a row changed while it was travelling stays pending and goes in the next round', async () => {
    const { ali } = await startShop();
    const slow = {
      ...server,
      async upsert(table: Parameters<typeof server.upsert>[0], rows: Parameters<typeof server.upsert>[1], options?: Parameters<typeof server.upsert>[2]) {
        if (table === 'parties') await partiesRepo.update(ali.id, { name: 'Ali Raza' }); // edited during the trip
        return server.upsert(table, rows, options);
      },
    };
    const racing = createSync(async () => slow);
    await racing.syncNow();
    expect((await db.parties.get(ali.id))?.pending_sync).toBe(1); // not wrongly marked as sent
    await racing.syncNow();
    expect((await db.parties.get(ali.id))?.pending_sync).toBe(0);
    expect(server.tables.parties.get(ali.id)?.name).toBe('Ali Raza');
  });

  it('one refused row does not stop the others, and is not tried again and again', async () => {
    const { e2 } = await startShop();
    server.refuseRows((table, row) => table === 'entries' && row.id === e2.id);
    expect(await sync.syncNow()).toBe('problem');
    expect(getSyncState().blocked).toBe(1);
    expect(describeSync(getSyncState())).toBe('problem');
    expect(server.tables.entries.size).toBe(3); // diye, sale, opening went through
    expect(server.tables.audit_log.size).toBeGreaterThan(0);
    const before = server.calls.length;
    await sync.syncNow();
    // the refused row is skipped; nothing else is left to send
    expect(server.calls.slice(before).filter((c) => c.op === 'upsert').length).toBe(0);
    expect((await db.entries.get(e2.id))?.pending_sync).toBe(1); // still safe on the phone
  });
});

describe('restore: a new phone with the same login', () => {
  it('brings back the shop, customers, entries and diary, with the same balances', async () => {
    const { shop, ali, bilal } = await startShop();
    await sync.syncNow();
    const entriesBefore = await db.entries.toArray();
    const balancesBefore = balancesByParty(await db.parties.toArray(), entriesBefore);

    await wipePhone(); // lost phone, new phone
    expect(await sync.restore()).toBe('restored');

    expect((await shopsRepo.getMine())?.id).toBe(shop.id);
    expect(await db.parties.count()).toBe(2);
    expect(await db.entries.count()).toBe(entriesBefore.length);
    expect(await db.audit_log.count()).toBe(server.tables.audit_log.size);
    expect(balancesByParty(await db.parties.toArray(), await db.entries.toArray())).toEqual(balancesBefore);
    expect((await db.parties.get(ali.id))?.phone).toBe('0300-1234567');
    expect((await db.parties.get(bilal.id))?.name).toBe('Bilal');
    expect(await pendingCount()).toBe(0); // nothing to send back
    // the times are in the same format as entries made on this phone
    for (const e of await db.entries.toArray()) expect(e.created_at).toMatch(/Z$/);
  });

  it('says "none" for a login that has no shop yet', async () => {
    expect(await sync.restore()).toBe('none');
  });

  it('says "offline" without internet, and leaves the phone empty (no half restore)', async () => {
    await startShop();
    await sync.syncNow();
    await wipePhone();
    server.offline = true;
    expect(await sync.restore()).toBe('offline');
    expect(await db.shops.count()).toBe(0);
  });

  it('the app can keep working right after a restore (new entry, goes to the server)', async () => {
    const { ali } = await startShop();
    await sync.syncNow();
    await wipePhone();
    await sync.restore();
    setDataContext({ userId: USER, shopId: null });
    const shop = (await shopsRepo.getMine())!;
    setDataContext({ userId: USER, shopId: shop.id });
    await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 100 });
    await sync.syncNow();
    expect(server.tables.entries.size).toBe(5);
  });
});

describe('pull: changes from another phone', () => {
  it('brings new customers and entries made on the other phone', async () => {
    const { shop, ali } = await startShop();
    await sync.syncNow();
    // the other phone adds an entry on the server
    server.tables.entries.set('ffffffff-0000-4000-8000-000000000001', {
      id: 'ffffffff-0000-4000-8000-000000000001', shop_id: shop.id, party_id: ali.id, kind: 'diye', amount: 750, note: null, transcript: null,
      source: 'manual', status: 'active', promise_date: null, created_by: USER, created_at: '2026-11-05T09:00:00+00:00', cancelled_at: null,
      updated_at: '2030-01-01T00:00:00+00:00',
    });
    await sync.syncNow({ pull: true });
    expect((await db.entries.get('ffffffff-0000-4000-8000-000000000001'))?.amount).toBe(750);
    expect((await db.entries.get('ffffffff-0000-4000-8000-000000000001'))?.created_at).toBe('2026-11-05T09:00:00.000Z');
  });

  it('an entry cancelled on the other phone is cancelled here too (cancelled is final)', async () => {
    const { shop, e1 } = await startShop();
    await sync.syncNow();
    const row = server.tables.entries.get(e1.id)!;
    server.tables.entries.set(e1.id, { ...row, status: 'cancelled', cancelled_at: '2026-11-05T10:00:00+00:00', updated_at: '2030-01-01T00:00:00+00:00' });
    expect(shop.id).toBeTruthy();
    await sync.syncNow({ pull: true });
    const local = await db.entries.get(e1.id);
    expect(local?.status).toBe('cancelled');
    expect(local?.pending_sync).toBe(0);
  });

  it('never un-cancels: a stale "active" from the server does not bring a cancelled entry back', async () => {
    const { e1 } = await startShop();
    await sync.syncNow();
    await entriesRepo.cancel(e1.id);
    await sync.syncNow();
    const row = server.tables.entries.get(e1.id)!;
    server.tables.entries.set(e1.id, { ...row, status: 'active', cancelled_at: null, updated_at: '2031-01-01T00:00:00+00:00' }); // a stale copy
    await sync.syncNow({ pull: true });
    expect((await db.entries.get(e1.id))?.status).toBe('cancelled');
  });

  it('does not overwrite a change that is still waiting on this phone', async () => {
    const { ali } = await startShop();
    await sync.syncNow();
    await partiesRepo.update(ali.id, { name: 'Ali Local' });
    server.refuseRows((table, row) => table === 'parties' && row.id === ali.id); // this phone cannot send it right now
    const remote = server.tables.parties.get(ali.id)!;
    server.tables.parties.set(ali.id, { ...remote, name: 'Ali Server', updated_at: '2030-01-01T00:00:00+00:00' });
    await sync.syncNow({ pull: true });
    expect((await db.parties.get(ali.id))?.name).toBe('Ali Local');
    expect((await db.parties.get(ali.id))?.pending_sync).toBe(1);
  });

  it('takes the other phone\'s edit when nothing is waiting here', async () => {
    const { ali } = await startShop();
    await sync.syncNow();
    const remote = server.tables.parties.get(ali.id)!;
    server.tables.parties.set(ali.id, { ...remote, phone: '03211234567', updated_at: '2030-01-01T00:00:00+00:00' });
    await sync.syncNow({ pull: true });
    expect((await db.parties.get(ali.id))?.phone).toBe('03211234567');
  });

  it('remembers how far it got, and still works on a server without migration 0003', async () => {
    await startShop();
    await sync.syncNow({ pull: true });
    expect((await db.sync_meta.get('pull:entries'))?.value).toBeTruthy();

    // a server that does not stamp updated_at: no cursor is kept, everything is read again, nothing breaks
    await wipePhone();
    resetSyncState();
    server.supportsUpdatedAt = false;
    expect(await sync.restore()).toBe('restored');
    expect(await db.entries.count()).toBe(4);
    expect(await db.sync_meta.get('pull:entries')).toBeUndefined();
    expect(await sync.syncNow({ pull: true })).toBe('ok');
  });
});

describe('two phones that each made their own shop before ever syncing', () => {
  it('keeps the server shop and moves this phone\'s customers and entries into it. Nothing is lost.', async () => {
    // phone A syncs first
    const a = await startShop();
    await sync.syncNow();

    // phone B was used offline with its own shop, never synced
    await wipePhone();
    const shopB = await shopsRepo.create({ shop_name: 'Phone B shop', language: 'ur' });
    const { party: sana } = await partiesRepo.create({ name: 'Sana', opening: { amount: 300, direction: 'theyOweMe' } });
    const entryB = await entriesRepo.create({ kind: 'diye', party_id: sana.id, amount: 90 });
    expect(shopB.id).not.toBe(a.shop.id);

    expect(await sync.syncNow({ pull: true })).toBe('ok'); // the app's first round after login also pulls

    expect(await db.shops.count()).toBe(1);
    expect((await shopsRepo.getMine())?.id).toBe(a.shop.id); // the server's shop wins
    expect(requireShop()).toBe(a.shop.id);
    expect(server.tables.shops.size).toBe(1);
    expect(server.tables.entries.get(entryB.id)?.shop_id).toBe(a.shop.id); // phone B's entry landed in the shop
    expect(server.tables.parties.get(sana.id)?.shop_id).toBe(a.shop.id);
    expect(await pendingCount()).toBe(0);
    expect(await db.parties.count()).toBe(3); // Ali and Bilal (pulled from the server) and Sana (this phone)
  });
});

describe('status words', () => {
  it('synced, queued, syncing and problem', () => {
    const base = { phase: 'idle' as const, pending: 0, blocked: 0, lastSyncAt: null };
    expect(describeSync(base)).toBe('synced');
    expect(describeSync({ ...base, pending: 3, phase: 'offline' })).toBe('queued');
    expect(describeSync({ ...base, pending: 3, phase: 'syncing' })).toBe('syncing');
    expect(describeSync({ ...base, pending: 0, phase: 'syncing' })).toBe('synced');
    expect(describeSync({ ...base, blocked: 1 })).toBe('problem');
  });
});
