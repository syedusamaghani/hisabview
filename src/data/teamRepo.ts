// Reads for the staff-work and activity screens, plus the remembered names of the team.
// Names live on the server (shop_members), so they are copied to the phone each time the team can be read
// and used from the copy when there is no internet. Nothing here changes a record.
import type { Act, ActivityRow, FeedFilter, PersonStat, What } from '../lib/team';
import { activityFeed, saleEntryIds, staffStats } from '../lib/team';
import { rangeMs, type DayRange } from '../lib/profit';
import { requireShop } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { staffRepo, type StaffMember } from './staffRepo';
import type { Entry } from './types';

export type { Act, ActivityRow, FeedFilter, PersonStat, What };

export type Teammate = Pick<StaffMember, 'user_id' | 'role' | 'active' | 'email'>;

const teamKey = (shopId: string) => `team:${shopId}`;

export async function cachedTeam(shopId: string): Promise<Teammate[]> {
  const raw = (await db.sync_meta.get(teamKey(shopId)))?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as Teammate[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Fresh from the server when there is internet; the saved copy otherwise. Never throws.
export async function loadTeam(shopId: string): Promise<Teammate[]> {
  try {
    const { members } = await staffRepo.list(shopId);
    const list = members.map((m) => ({ user_id: m.user_id, role: m.role, active: m.active, email: m.email }));
    // An empty answer (a role that may not read the team) must never wipe the saved names
    if (list.length === 0) return cachedTeam(shopId);
    await db.sync_meta.put({ key: teamKey(shopId), value: JSON.stringify(list) });
    return list;
  } catch {
    return cachedTeam(shopId);
  }
}

export const teamRepo = {
  // Per person, for the days chosen, plus the entries themselves (cashier-wise history)
  async staffWork(range: DayRange): Promise<{ stats: PersonStat[]; entries: Entry[] }> {
    const shop = requireShop();
    const { fromMs, toMs } = rangeMs(range);
    const fromIso = new Date(fromMs).toISOString();
    const toIso = new Date(toMs).toISOString();
    const [entries, moves, audit] = await Promise.all([
      entriesRepo.listBetween(fromIso, toIso),
      db.stock_moves.where('created_at').between(fromIso, toIso, true, false).filter((m) => m.shop_id === shop && m.kind === 'sale').toArray(),
      db.audit_log.where('created_at').between(fromIso, toIso, true, false).filter((a) => a.shop_id === shop).toArray(),
    ]);
    return { stats: staffStats(entries, audit, saleEntryIds(moves), fromMs, toMs), entries };
  },

  // The newest diary lines and stock corrections, filtered. `limit` keeps a big khata fast.
  async feed(filter: FeedFilter, limit = 200): Promise<ActivityRow[]> {
    const shop = requireShop();
    const [audit, adjusts, parties, products] = await Promise.all([
      db.audit_log.orderBy('created_at').reverse().filter((a) => a.shop_id === shop).limit(600).toArray(),
      db.stock_moves.orderBy('created_at').reverse().filter((m) => m.shop_id === shop && (m.kind === 'adjust' || m.kind === 'damaged' || m.kind === 'lost')).limit(300).toArray(),
      db.parties.where('shop_id').equals(shop).toArray(),
      db.products.where('shop_id').equals(shop).toArray(),
    ]);
    return activityFeed(audit, adjusts, new Map(parties.map((p) => [p.id, p.name])), new Map(products.map((p) => [p.id, p])), filter, limit);
  },
};
