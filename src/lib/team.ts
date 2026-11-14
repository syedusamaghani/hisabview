// Staff work and the activity feed: who did what. Pure rules, no database (the reading is in src/data/teamRepo.ts).
//
// Staff-wise sales = every active cash sale, plus every Diye written WITH goods (a sale on udhaar), by the person who saved it.
// The feed is the shop's diary (audit_log: every create / edit / cancel, with the person) plus stock corrections
// (damaged, lost, adjust), which are stock movements and not diary lines.
import type { AuditRow, Entry, Product, StockMove } from '../data/types';

export type PersonStat = {
  user_id: string;
  entries: number; // every active entry they saved
  sales: number; // rupees
  salesCount: number;
  kharcha: number; // rupees
  cancelled: number; // entries they cancelled (any day's entry, cancelled inside the range)
};

// Entry ids that have goods attached (a sale made from Saman)
export const saleEntryIds = (moves: StockMove[]): Set<string> => new Set(moves.filter((m) => m.kind === 'sale' && m.entry_id).map((m) => m.entry_id as string));

export function isSaleEntry(e: Entry, withGoods: Set<string>): boolean {
  return e.status === 'active' && (e.kind === 'cash_sale' || (e.kind === 'diye' && withGoods.has(e.id)));
}

// One line per person who did anything in the range, biggest sales first
export function staffStats(entries: Entry[], audit: AuditRow[], withGoods: Set<string>, fromMs: number, toMs: number): PersonStat[] {
  const by = new Map<string, PersonStat>();
  const of = (id: string): PersonStat => {
    let p = by.get(id);
    if (!p) by.set(id, (p = { user_id: id, entries: 0, sales: 0, salesCount: 0, kharcha: 0, cancelled: 0 }));
    return p;
  };
  const inRange = (iso: string) => {
    const t = Date.parse(iso);
    return t >= fromMs && t < toMs;
  };
  for (const e of entries) {
    if (e.status !== 'active' || !inRange(e.created_at)) continue;
    const p = of(e.created_by);
    p.entries += 1;
    if (isSaleEntry(e, withGoods)) {
      p.sales += e.amount;
      p.salesCount += 1;
    }
    if (e.kind === 'kharcha') p.kharcha += e.amount;
  }
  for (const a of audit) {
    if (a.entity === 'entry' && a.action === 'cancel' && inRange(a.created_at)) of(a.actor).cancelled += 1;
  }
  return [...by.values()].sort((a, b) => b.sales - a.sales || b.entries - a.entries);
}

// ---- activity feed

export type What = 'sale' | 'diye' | 'mile' | 'kharcha' | 'purchase' | 'cash' | 'stock' | 'customer' | 'other';
export type Act = 'create' | 'edit' | 'cancel';

export type ActivityRow = {
  id: string;
  at: string;
  actor: string;
  action: Act;
  what: What;
  amount: number | null;
  label: string | null; // a name (customer, item) when there is one
  reason: string | null;
};

const WHAT_OF_KIND: Record<string, What> = {
  cash_sale: 'sale',
  diye: 'diye',
  mile: 'mile',
  kharcha: 'kharcha',
  purchase: 'purchase',
  purchase_return: 'purchase',
  withdrawal: 'cash',
  deposit: 'cash',
};

export const whatOfKind = (kind: string): What => WHAT_OF_KIND[kind] ?? 'other';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export function auditRowToActivity(a: AuditRow, partyNames: Map<string, string>): ActivityRow {
  const after = a.after_value ?? {};
  const before = a.before_value ?? {};
  const pick = (k: string) => after[k] ?? before[k];
  let what: What = 'other';
  let label: string | null = null;
  let amount: number | null = null;
  if (a.entity === 'entry') {
    what = WHAT_OF_KIND[str(pick('kind')) ?? ''] ?? 'other';
    amount = num(pick('amount'));
    const party = str(pick('party_id'));
    label = party ? (partyNames.get(party) ?? null) : null;
  } else if (a.entity === 'party') {
    what = 'customer';
    label = str(pick('name'));
  } else if (a.entity === 'product') {
    what = 'stock';
    label = str(pick('name'));
  } else if (a.entity === 'cash_closing') {
    what = 'cash';
    amount = num(pick('counted_cash'));
  }
  return { id: a.id, at: a.created_at, actor: a.actor, action: a.action, what, amount, label, reason: a.reason ?? null };
}

// Damaged, lost and corrected stock: movements, not diary lines
export function adjustToActivity(m: StockMove, products: Map<string, Product>): ActivityRow {
  return { id: m.id, at: m.created_at, actor: m.created_by, action: 'create', what: 'stock', amount: null, label: `${products.get(m.product_id)?.name ?? ''} ${m.qty_base > 0 ? '+' : ''}${m.qty_base}`.trim(), reason: m.reason };
}

export type FeedFilter = { user: string | null; action: Act | null; what: What | null };

export function activityFeed(audit: AuditRow[], adjusts: StockMove[], partyNames: Map<string, string>, products: Map<string, Product>, filter: FeedFilter, limit = 200): ActivityRow[] {
  const rows = [
    ...audit.filter((a) => a.shop_id).map((a) => auditRowToActivity(a, partyNames)),
    ...adjusts.filter((m) => m.kind === 'adjust' || m.kind === 'damaged' || m.kind === 'lost').map((m) => adjustToActivity(m, products)),
  ];
  return rows
    .filter((r) => (!filter.user || r.actor === filter.user) && (!filter.action || r.action === filter.action) && (!filter.what || r.what === filter.what))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
