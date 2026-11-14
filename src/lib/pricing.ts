// What things cost to buy: the rate of every real purchase, which supplier is cheapest, and when a price moved.
// A "real" purchase is a purchase movement with a price above Rs 0 that was not undone: free bonus goods are not a price.
// Rates are written per the product's price unit (per piece, per kg, ...), so a carton price and a piece price compare fairly.
import type { Product, StockMove } from '../data/types';
import { priceInUnit, unitFactor } from './stock';

export const PRICE_ALERT_PCT = 10; // a buying price that moved this many percent (up or down) is worth telling
export const PRICE_ALERT_DAYS = 14;

type M = Pick<StockMove, 'id' | 'product_id' | 'party_id' | 'kind' | 'unit_price' | 'unit_factor' | 'reverses' | 'created_at'>;

export type Buy = { move_id: string; product_id: string; supplier_id: string | null; rate: number; at: string };

export function purchaseBuys(moves: readonly M[], products: ReadonlyMap<string, Product>): Buy[] {
  const undone = new Set(moves.map((m) => m.reverses).filter((v): v is string => v !== null));
  const out: Buy[] = [];
  for (const m of moves) {
    if (m.kind !== 'purchase' || undone.has(m.id) || !m.unit_price || m.unit_price <= 0) continue;
    const p = products.get(m.product_id);
    if (!p) continue;
    out.push({ move_id: m.id, product_id: m.product_id, supplier_id: m.party_id, rate: priceInUnit(m.unit_price, m.unit_factor || 1, unitFactor(p, p.price_unit) ?? 1), at: m.created_at });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export type SupplierRate = { supplier_id: string | null; rate: number; at: string; cheapest: boolean };

// The newest rate of every supplier for one product, cheapest marked (only when there is more than one rate and they differ)
export function supplierRates(buys: readonly Buy[], productId: string): SupplierRate[] {
  const latest = new Map<string, Buy>();
  for (const b of buys) if (b.product_id === productId) latest.set(b.supplier_id ?? '', b); // buys are in time order
  const rows = [...latest.values()].map((b) => ({ supplier_id: b.supplier_id, rate: b.rate, at: b.at, cheapest: false }));
  const low = Math.min(...rows.map((r) => r.rate));
  const high = Math.max(...rows.map((r) => r.rate));
  if (rows.length > 1 && low !== high) for (const r of rows) r.cheapest = r.rate === low;
  return rows.sort((a, b) => a.rate - b.rate);
}

export type PriceChange = {
  product: Product;
  supplier_id: string | null;
  from: number;
  to: number;
  pct: number; // positive = dearer, negative = cheaper
  at: string;
  belowCost: boolean; // the new buying price is at or above the selling price: selling it now makes no profit
};

// The newest purchase of each product (per supplier) against the one before it from the same supplier
export function priceChanges(buys: readonly Buy[], products: ReadonlyMap<string, Product>, sinceMs: number, minPct = PRICE_ALERT_PCT): PriceChange[] {
  const lastOf = new Map<string, Buy>();
  const newest = new Map<string, { prev: Buy; now: Buy }>();
  for (const b of buys) {
    const key = `${b.product_id}|${b.supplier_id ?? ''}`;
    const prev = lastOf.get(key);
    if (prev) newest.set(key, { prev, now: b });
    lastOf.set(key, b);
  }
  const out: PriceChange[] = [];
  for (const { prev, now } of newest.values()) {
    const p = products.get(now.product_id);
    if (!p || prev.rate <= 0 || Date.parse(now.at) < sinceMs) continue;
    const pct = Math.round(((now.rate - prev.rate) * 100) / prev.rate);
    if (Math.abs(pct) < minPct) continue;
    out.push({ product: p, supplier_id: now.supplier_id, from: prev.rate, to: now.rate, pct, at: now.at, belowCost: p.sell_price > 0 && now.rate >= p.sell_price });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
