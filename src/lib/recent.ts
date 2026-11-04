// When picking a customer for a new entry, the people you dealt with most recently come first.

type P = { id: string; name: string };
type E = { party_id: string | null; created_at: string; status: string };

// Returns { recent, others }: "recent" = people with an entry, newest first (at most `limit`).
// "others" = everyone else, A to Z.
export function splitByRecent<T extends P>(parties: readonly T[], entries: readonly E[], limit = 5): { recent: T[]; others: T[] } {
  const last: Record<string, string> = {};
  for (const e of entries) {
    if (e.party_id === null || e.status === 'draft') continue;
    if (!last[e.party_id] || e.created_at > last[e.party_id]) last[e.party_id] = e.created_at;
  }
  const used = parties.filter((p) => last[p.id]).sort((a, b) => last[b.id].localeCompare(last[a.id]));
  const recent = used.slice(0, limit);
  const rest = [...used.slice(limit), ...parties.filter((p) => !last[p.id])];
  return { recent, others: rest.sort((a, b) => a.name.localeCompare(b.name)) };
}
