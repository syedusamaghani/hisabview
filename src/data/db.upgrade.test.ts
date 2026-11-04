import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { HisabDB } from './db';

// A phone that already has the app (database version 2: before the balance summary existed)
// opens the new version. Every customer's balance must be worked out from the old entries.
describe('upgrade from database version 2 to 3', () => {
  it('builds the balance summary from the existing entries', async () => {
    const name = 'old-phone';
    const old = new Dexie(name);
    old.version(1).stores({
      shops: 'id, owner_user_id, pending_sync',
      parties: 'id, shop_id, pending_sync',
      entries: 'id, shop_id, party_id, [party_id+status], created_at, pending_sync',
      audit_log: 'id, shop_id, entity_id, created_at, pending_sync',
    });
    old.version(2).stores({ sync_meta: 'key' });
    await old.open();
    const base = { shop_id: 's1', identifier: null, phone: null, credit_limit: null, created_at: '2026-01-01T00:00:00.000Z', archived: false, pending_sync: 0 };
    await old.table('parties').bulkPut([
      { ...base, id: 'ali', name: 'Ali', type: 'customer', opening_balance: 0 },
      { ...base, id: 'sup', name: 'Supplier', type: 'supplier', opening_balance: 0 },
      { ...base, id: 'old', name: 'Old', type: 'customer', opening_balance: 300 }, // the older way to keep an old balance
      { ...base, id: 'none', name: 'Nobody yet', type: 'customer', opening_balance: 0 },
    ]);
    const e = (id: string, party_id: string | null, kind: string, amount: number, created_at: string, status = 'active') => ({
      id, shop_id: 's1', party_id, kind, amount, note: null, transcript: null, source: 'manual', status, promise_date: null, created_by: 'u',
      created_at, cancelled_at: status === 'cancelled' ? created_at : null, pending_sync: 0,
    });
    await old.table('entries').bulkPut([
      e('1', 'ali', 'opening', 1000, '2026-02-01T00:00:00.000Z'),
      e('2', 'ali', 'diye', 500, '2026-03-01T00:00:00.000Z'),
      e('3', 'ali', 'mile', 200, '2026-04-01T00:00:00.000Z'),
      e('4', 'ali', 'diye', 999, '2026-05-01T00:00:00.000Z', 'cancelled'),
      e('5', 'sup', 'opening', 400, '2026-02-01T00:00:00.000Z'),
      e('6', 'old', 'diye', 50, '2026-02-02T00:00:00.000Z'),
      e('7', null, 'cash_sale', 5000, '2026-06-01T00:00:00.000Z'),
    ]);
    old.close();

    const upgraded = new HisabDB(name); // opens as version 3 and runs the upgrade
    await upgraded.open();
    const stats = Object.fromEntries((await upgraded.party_stats.toArray()).map((s) => [s.party_id, s]));
    expect(stats.ali).toMatchObject({ balance: 1300, last_at: '2026-05-01T00:00:00.000Z', shop_id: 's1' }); // cancelled counts as contact, not as money
    expect(stats.sup.balance).toBe(-400);
    expect(stats.old.balance).toBe(350);
    expect(stats.none).toMatchObject({ balance: 0, last_at: null });
    expect(Object.keys(stats).sort()).toEqual(['ali', 'none', 'old', 'sup']);
    upgraded.close();
  });
});
