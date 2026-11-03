// The phone's own database (IndexedDB through Dexie). Every write goes here first.
// Only the repositories in this folder may use it. Screens never touch it directly.
import Dexie, { type Table } from 'dexie';
import type { AuditRow, Entry, Party, Shop } from './types';

class HisabDB extends Dexie {
  shops!: Table<Shop, string>;
  parties!: Table<Party, string>;
  entries!: Table<Entry, string>;
  audit_log!: Table<AuditRow, string>;

  constructor(name = 'hisabview') {
    super(name);
    // Only the fields we search by are listed. pending_sync lets Phase 4 find
    // everything that still has to be sent to the server.
    this.version(1).stores({
      shops: 'id, owner_user_id, pending_sync',
      parties: 'id, shop_id, pending_sync',
      entries: 'id, shop_id, party_id, [party_id+status], created_at, pending_sync',
      audit_log: 'id, shop_id, entity_id, created_at, pending_sync',
    });
  }
}

export const db = new HisabDB();
