// The phone's own database (IndexedDB through Dexie). Every write goes here first.
// Only the repositories in this folder may use it. Screens never touch it directly.
import Dexie, { type Table } from 'dexie';
import { computeStats } from './stats';
import { REAL_DB_NAME, TEST_DB_NAME, isTesting } from './testMode';
import type { AuditRow, Entry, Party, PartyStat, Shop, SyncMeta } from './types';

export class HisabDB extends Dexie {
  shops!: Table<Shop, string>;
  parties!: Table<Party, string>;
  entries!: Table<Entry, string>;
  audit_log!: Table<AuditRow, string>;
  sync_meta!: Table<SyncMeta, string>;
  party_stats!: Table<PartyStat, string>;

  constructor(name = REAL_DB_NAME) {
    super(name);
    // Only the fields we search by are listed. pending_sync lets Phase 4 find
    // everything that still has to be sent to the server.
    this.version(1).stores({
      shops: 'id, owner_user_id, pending_sync',
      parties: 'id, shop_id, pending_sync',
      entries: 'id, shop_id, party_id, [party_id+status], created_at, pending_sync',
      audit_log: 'id, shop_id, entity_id, created_at, pending_sync',
    });
    // Version 2: a small notebook for the sync engine (where the last download stopped, and so on)
    this.version(2).stores({ sync_meta: 'key' });
    // Version 3: a summary per customer (balance and last contact), so a big khata opens fast.
    // Worked out once here from the entries; after that every entry change keeps it up to date.
    this.version(3)
      .stores({ party_stats: 'party_id, shop_id' })
      .upgrade(async (tx) => {
        const parties = (await tx.table('parties').toArray()) as Party[];
        const entries = (await tx.table('entries').toArray()) as Entry[];
        await tx.table('party_stats').bulkPut(computeStats(parties, entries));
      });
  }
}

// In testing mode the phone opens its separate testing database instead of the real one
export const db = new HisabDB(isTesting() ? TEST_DB_NAME : REAL_DB_NAME);
