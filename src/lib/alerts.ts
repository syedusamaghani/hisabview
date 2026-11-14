// In-app alerts ("Khabrein"): worked out on the phone from what is saved, never stored. An alert goes away by itself
// when the problem is gone (stock refilled, promise kept) or gets old. Which kinds are wanted is a per-phone setting.
// No push messages: they need a paid or self-run server, so alerts show inside the app (and the sync keeps them fresh).
import type { AuditRow, CashClosing, Entry, Party, Product, StockMove } from '../data/types';
import { unitFactor } from './stock';

export const ALERT_KINDS = ['lowStock', 'discount', 'cancelled', 'cashMismatch', 'overdue', 'summary'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
export type AlertPrefs = Record<AlertKind, boolean>;

export const DEFAULT_PREFS: AlertPrefs = { lowStock: true, discount: true, cancelled: true, cashMismatch: true, overdue: true, summary: true };

// A sale at least this many percent under the usual selling price is a "large discount"
export const DISCOUNT_ALERT_PCT = 20;
// Cancelled entries and big discounts stay in the list this long; closings with a difference this long
export const RECENT_DAYS = 3;
export const CLOSING_DAYS = 7;

export type Alert = {
  id: string;
  kind: AlertKind;
  at: string; // when it happened (ISO); the summary uses "now"
  actor?: string; // user id of the person who did it
  product?: Product;
  stock?: number; // base units, for low stock
  party?: string; // customer name
  amount?: number;
  price?: number; // sold at
  list?: number; // usual price
  pct?: number;
  entryKind?: string;
  reason?: string | null;
  day?: string; // "2026-11-12"
  date?: string; // promise date
  summary?: { sales: number; expenses: number; profit: number };
};

export type AlertInput = {
  now: number;
  userId: string; // the person looking: their own actions are not news
  lowStock: { product: Product; stock: number }[];
  recentSales: StockMove[]; // sale and reversal movements of the last days
  products: Map<string, Product>;
  audit: AuditRow[]; // recent diary lines
  closings: CashClosing[]; // recent closings
  entries: Entry[]; // active diye with a promise date
  parties: Party[];
  balances: Record<string, number>; // customer balance, above 0 = they owe me
  summary: { sales: number; expenses: number; profit: number } | null;
};

const dayKey = (now: number) => new Date(now + 5 * 3_600_000).toISOString().slice(0, 10); // Pakistan day

export function discountAlerts(moves: StockMove[], products: Map<string, Product>): Alert[] {
  const undone = new Set(moves.filter((m) => m.kind === 'reversal' && m.reverses).map((m) => m.reverses as string));
  const out: Alert[] = [];
  for (const m of moves) {
    if (m.kind !== 'sale' || undone.has(m.id) || m.unit_price === null) continue;
    const p = products.get(m.product_id);
    if (!p || p.sell_price <= 0) continue;
    const priceFactor = unitFactor(p, p.price_unit) ?? 1;
    // compare per base unit without dividing: price x priceFactor against list x unit_factor
    const lhs = m.unit_price * priceFactor * 100;
    const rhs = p.sell_price * m.unit_factor;
    if (rhs <= 0 || lhs > rhs * (100 - DISCOUNT_ALERT_PCT)) continue; // lhs / rhs is the sold price as a percent of the usual one
    const listInSoldUnit = Math.round((p.sell_price * m.unit_factor) / priceFactor);
    out.push({ id: `disc:${m.id}`, kind: 'discount', at: m.created_at, actor: m.created_by, product: p, price: m.unit_price, list: listInSoldUnit, pct: Math.round(100 - lhs / rhs) });
  }
  return out;
}

export function buildAlerts(input: AlertInput, prefs: AlertPrefs = DEFAULT_PREFS): Alert[] {
  const nowIso = new Date(input.now).toISOString();
  const recentFrom = input.now - RECENT_DAYS * 86_400_000;
  const out: Alert[] = [];

  if (prefs.lowStock) {
    for (const r of input.lowStock) out.push({ id: `low:${r.product.id}`, kind: 'lowStock', at: nowIso, product: r.product, stock: r.stock });
  }

  if (prefs.discount) {
    const recent = input.recentSales.filter((m) => Date.parse(m.created_at) >= recentFrom);
    out.push(...discountAlerts(recent, input.products));
  }

  if (prefs.cancelled) {
    for (const a of input.audit) {
      if (a.entity !== 'entry' || a.action !== 'cancel' || a.actor === input.userId || Date.parse(a.created_at) < recentFrom) continue;
      const v = { ...(a.before_value ?? {}), ...(a.after_value ?? {}) };
      const party = typeof v.party_id === 'string' ? input.parties.find((p) => p.id === v.party_id)?.name : undefined;
      out.push({
        id: `cancel:${a.id}`,
        kind: 'cancelled',
        at: a.created_at,
        actor: a.actor,
        amount: typeof v.amount === 'number' ? v.amount : undefined,
        entryKind: typeof v.kind === 'string' ? v.kind : undefined,
        party,
        reason: a.reason ?? null,
      });
    }
  }

  if (prefs.cashMismatch) {
    // the newest closing of each day counts
    const newest = new Map<string, CashClosing>();
    for (const c of input.closings) {
      const seen = newest.get(c.day);
      if (!seen || c.created_at > seen.created_at) newest.set(c.day, c);
    }
    const from = dayKey(input.now - CLOSING_DAYS * 86_400_000);
    for (const c of newest.values()) {
      if (c.difference !== 0 && c.day >= from) out.push({ id: `close:${c.id}`, kind: 'cashMismatch', at: c.created_at, actor: c.created_by, day: c.day, amount: c.difference });
    }
  }

  if (prefs.overdue) {
    const today = dayKey(input.now);
    const worst = new Map<string, Entry>(); // earliest broken promise of each customer
    for (const e of input.entries) {
      if (e.kind !== 'diye' || e.status !== 'active' || !e.party_id || !e.promise_date || e.promise_date >= today) continue;
      const seen = worst.get(e.party_id);
      if (!seen || (e.promise_date as string) < (seen.promise_date as string)) worst.set(e.party_id, e);
    }
    for (const [partyId, e] of worst) {
      const party = input.parties.find((p) => p.id === partyId);
      const owed = input.balances[partyId] ?? 0;
      if (!party || party.archived || party.type !== 'customer' || owed <= 0) continue;
      out.push({ id: `late:${partyId}`, kind: 'overdue', at: e.promise_date as string, party: party.name, amount: owed, date: e.promise_date as string });
    }
  }

  if (prefs.summary && input.summary) out.push({ id: `sum:${dayKey(input.now)}`, kind: 'summary', at: nowIso, summary: input.summary });

  // news that needs a look first, newest first inside a kind; the summary last
  const order = (k: AlertKind) => ALERT_KINDS.indexOf(k);
  return out.sort((a, b) => order(a.kind) - order(b.kind) || b.at.localeCompare(a.at));
}

// How many alerts need a look (the daily summary is only news)
export const needsAttention = (alerts: Alert[]): number => alerts.filter((a) => a.kind !== 'summary').length;
