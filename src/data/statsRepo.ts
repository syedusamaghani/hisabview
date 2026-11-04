// Keeps the per-customer summary (balance and last contact) in step with the entries.
// Every function that writes an entry calls applyEntryChange in the SAME transaction, so the summary
// and the entries are saved together or not at all. If it were ever wrong, rebuildAll() fixes it
// from the entries, which stay the truth.
import { effect } from '../lib/balance';
import { requireShop } from './context';
import { db } from './db';
import { computeStats } from './stats';
import type { Entry, PartyStat } from './types';

type StatParty = { id: string; shop_id: string; type: string; opening_balance: number };

// Work one customer out again from their entries. Call inside a transaction with entries and party_stats.
export async function recomputeStat(party: StatParty): Promise<PartyStat> {
  const entries = await db.entries.where('party_id').equals(party.id).toArray();
  const [stat] = computeStats([party], entries);
  await db.party_stats.put(stat);
  return stat;
}

// An entry was added, cancelled or replaced: move the customer's balance by the difference.
// `before` is undefined for a new entry. Call inside a transaction with entries and party_stats.
export async function applyEntryChange(party: StatParty, before: Entry | undefined, after: Entry): Promise<void> {
  const stat = await db.party_stats.get(party.id);
  if (!stat) {
    await recomputeStat(party); // the summary was missing: work it out from the entries (the new one is already saved)
    return;
  }
  const delta = effect(after, party.type) - (before ? effect(before, party.type) : 0);
  const newest = after.status !== 'draft' && (!stat.last_at || after.created_at > stat.last_at) ? after.created_at : stat.last_at;
  if (delta !== 0 || newest !== stat.last_at) await db.party_stats.put({ ...stat, balance: stat.balance + delta, last_at: newest });
}

export const statsRepo = {
  // { customerId: summary } for this shop: a small table, fast even with years of entries
  async all(): Promise<Record<string, PartyStat>> {
    const rows = await db.party_stats.where('shop_id').equals(requireShop()).toArray();
    return Object.fromEntries(rows.map((r) => [r.party_id, r]));
  },

  // Throw the summary away and work it all out again from the entries
  async rebuildAll(shopId = requireShop()): Promise<void> {
    await db.transaction('rw', db.parties, db.entries, db.party_stats, async () => {
      const parties = await db.parties.where('shop_id').equals(shopId).toArray();
      const entries = await db.entries.where('shop_id').equals(shopId).toArray();
      await db.party_stats.where('shop_id').equals(shopId).delete();
      await db.party_stats.bulkPut(computeStats(parties, entries));
    });
  },

  // Customers whose stored summary differs from what the entries say (should always be empty)
  async verify(shopId = requireShop()): Promise<{ party_id: string; stored: number | null; actual: number }[]> {
    const parties = await db.parties.where('shop_id').equals(shopId).toArray();
    const entries = await db.entries.where('shop_id').equals(shopId).toArray();
    const stored = new Map((await db.party_stats.where('shop_id').equals(shopId).toArray()).map((s) => [s.party_id, s]));
    return computeStats(parties, entries)
      .filter((s) => stored.get(s.party_id)?.balance !== s.balance || (stored.get(s.party_id)?.last_at ?? null) !== s.last_at)
      .map((s) => ({ party_id: s.party_id, stored: stored.get(s.party_id)?.balance ?? null, actual: s.balance }));
  },
};
