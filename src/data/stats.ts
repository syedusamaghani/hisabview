// The summary kept for every customer (see PartyStat). The pure part: working it out from entries.
import { effect } from '../lib/balance';
import type { Entry, PartyStat } from './types';

type StatParty = { id: string; shop_id: string; type: string; opening_balance: number };
type StatEntry = Pick<Entry, 'party_id' | 'kind' | 'amount' | 'status' | 'created_at'>;

// balance = old balance + diye - mile (cancelled ignored), last_at = newest entry that is not a draft
export function computeStats(parties: readonly StatParty[], entries: readonly StatEntry[]): PartyStat[] {
  const byId = new Map<string, PartyStat & { type: string }>();
  for (const p of parties) byId.set(p.id, { party_id: p.id, shop_id: p.shop_id, balance: p.opening_balance, last_at: null, type: p.type });
  for (const e of entries) {
    const stat = e.party_id ? byId.get(e.party_id) : undefined;
    if (!stat) continue;
    stat.balance += effect(e, stat.type);
    if (e.status !== 'draft' && (!stat.last_at || e.created_at > stat.last_at)) stat.last_at = e.created_at;
  }
  return [...byId.values()].map(({ type: _type, ...stat }) => stat);
}
