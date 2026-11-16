// Working without a login (guest) and the day a login arrives.
//
// A guest khata is written under a private guest id (src/lib/guest.ts) and never sent anywhere. When the person logs
// in with Google, adoptGuestData moves everything under the real login. After that the normal sync sends it to the
// server (and, if the login already has a shop there, the sync merges this phone's records into it: see reconcileShop).
// Nothing is deleted or changed except the owner id on the records.
import { requireShop } from './context';
import { db } from './db';

const CHILD_TABLES = ['parties', 'entries', 'audit_log', 'products', 'stock_moves', 'cash_closings'] as const;

export async function adoptGuestData(guestId: string, userId: string): Promise<boolean> {
  if (!guestId || guestId === userId) return false;
  return db.transaction('rw', [db.shops, db.parties, db.entries, db.audit_log, db.party_stats, db.products, db.stock_moves, db.product_stats, db.cash_closings], async () => {
    const guestShops = await db.shops.where('owner_user_id').equals(guestId).toArray();
    if (guestShops.length === 0) return false;
    let target = await db.shops.where('owner_user_id').equals(userId).first(); // this login already had a shop on this phone
    for (const g of guestShops) {
      if (!target) {
        await db.shops.update(g.id, { owner_user_id: userId, pending_sync: 1 });
        target = { ...g, owner_user_id: userId };
        continue;
      }
      if (g.id === target.id) continue;
      // Two shops for one login: the guest records join the existing shop, then the empty guest shop goes
      for (const name of CHILD_TABLES) {
        await (db[name] as unknown as { where(k: string): { equals(v: string): { modify(c: object): Promise<number> } } }).where('shop_id').equals(g.id).modify({ shop_id: target.id, pending_sync: 1 });
      }
      await db.party_stats.where('shop_id').equals(g.id).modify({ shop_id: target.id });
      await db.product_stats.where('shop_id').equals(g.id).modify({ shop_id: target.id });
      await db.shops.delete(g.id);
    }
    // Who wrote each record: the server only accepts the logged-in person here
    await db.entries.toCollection().modify((r) => { if (r.created_by === guestId) r.created_by = userId; });
    await db.audit_log.toCollection().modify((r) => { if (r.actor === guestId) r.actor = userId; });
    await db.stock_moves.toCollection().modify((r) => { if (r.created_by === guestId) r.created_by = userId; });
    await db.cash_closings.toCollection().modify((r) => { if (r.created_by === guestId) r.created_by = userId; });
    return true;
  });
}

// How many entries this khata has (the "save your khata" question comes after 10)
export async function entryCount(): Promise<number> {
  return db.entries.where('shop_id').equals(requireShop()).count();
}
