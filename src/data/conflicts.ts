// When two phones changed the same customer or item, the phone keeps its own change (it is not lost) and it goes to the
// server on top of the other one. The other phone's version is NOT silently thrown away: it is written here so the
// owner can see both and fix it by hand if the other one was right. Financial records (entries, stock movements, closings)
// are never overwritten, so they cannot conflict this way: an entry is frozen and can only be cancelled.
import { db } from './db';

export type ConflictTable = 'parties' | 'products';
export type Conflict = { id: string; table: ConflictTable; row_id: string; name: string; at: string; fields: { field: string; mine: unknown; theirs: unknown }[] };

const WATCH: Record<ConflictTable, string[]> = {
  parties: ['name', 'phone', 'identifier', 'credit_limit', 'archived'],
  products: ['name', 'cost_price', 'sell_price', 'min_stock', 'barcode', 'archived'],
};
const key = (shopId: string) => `conflicts:${shopId}`;
const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

// The fields that really differ (empty = no conflict worth showing)
export function differences(table: ConflictTable, mine: Record<string, unknown>, theirs: Record<string, unknown>): Conflict['fields'] {
  return WATCH[table].filter((f) => !same(mine[f], theirs[f])).map((field) => ({ field, mine: mine[field] ?? null, theirs: theirs[field] ?? null }));
}

async function read(shopId: string): Promise<Conflict[]> {
  const raw = (await db.sync_meta.get(key(shopId)))?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as Conflict[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const conflictsRepo = {
  list: read,
  async count(shopId: string): Promise<number> {
    return (await read(shopId)).length;
  },
  // Remember a clash (a newer one about the same record replaces the older note)
  async record(shopId: string, table: ConflictTable, mine: Record<string, unknown>, theirs: Record<string, unknown>): Promise<boolean> {
    const fields = differences(table, mine, theirs);
    if (fields.length === 0) return false;
    const id = `${table}:${String(mine.id)}`;
    const rest = (await read(shopId)).filter((c) => c.id !== id);
    rest.push({ id, table, row_id: String(mine.id), name: String(mine.name ?? ''), at: new Date().toISOString(), fields });
    await db.sync_meta.put({ key: key(shopId), value: JSON.stringify(rest.slice(-50)) });
    return true;
  },
  // "Theek hai, dekh liya"
  async dismiss(shopId: string, id: string): Promise<void> {
    await db.sync_meta.put({ key: key(shopId), value: JSON.stringify((await read(shopId)).filter((c) => c.id !== id)) });
  },
};
