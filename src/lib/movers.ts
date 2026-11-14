// Fast and slow products, and a simple "how many days will this last" guess from how fast it really sold.
// Pure rules over the add-only stock movements; no database here (reading is in src/data/moversRepo.ts).
//
//  window    the last 30 days, but never fewer than 7 days of history and never more days than the product has existed
//            (a product added yesterday is not "slow", and one sale of a new product is not "10 a day")
//  sold      pieces that left by sales in the window; a sale that was undone (reversal) does not count
//  per day   sold / days in the window
//  days left stock / per day, rounded down. Only a guess: it assumes the next days sell like the last ones.
//  running out   sells at all and will not last 7 more days (or stock is already 0 or below)
//  reorder   what would cover the next 14 days
//  slow      has stock, sold nothing in the window, and has existed longer than the window
import type { Product, StockMove } from '../data/types';
import { unitFactor, valuation } from './stock';

export const WINDOW_DAYS = 30;
export const MIN_WINDOW_DAYS = 7;
export const SOON_DAYS = 7;
export const COVER_DAYS = 14;
const DAY = 86_400_000;

export type Mover = {
  product: Product;
  stock: number; // base units
  sold: number; // base units in the window
  revenue: number; // rupees taken in the window
  days: number; // length of the window used
  perDay: number; // base units a day (can be a fraction)
  daysLeft: number | null; // null = it does not sell, so no guess
  reorder: number; // base units to buy to cover COVER_DAYS
  value: number; // rupees of stock at the cost price
};

type M = Pick<StockMove, 'id' | 'product_id' | 'kind' | 'qty_base' | 'line_total' | 'reverses' | 'created_at'>;

export function movement(moves: readonly M[], products: readonly Product[], stock: Readonly<Record<string, number>>, now: number): { fast: Mover[]; slow: Mover[]; runningOut: Mover[]; all: Mover[] } {
  const undone = new Set(moves.map((m) => m.reverses).filter((v): v is string => v !== null));
  const first = new Map<string, number>();
  const sold = new Map<string, { qty: number; revenue: number }>();
  const from = now - WINDOW_DAYS * DAY;
  for (const m of moves) {
    const at = Date.parse(m.created_at);
    if (at < (first.get(m.product_id) ?? Infinity)) first.set(m.product_id, at);
    if (m.kind !== 'sale' || undone.has(m.id) || at < from || at > now) continue;
    const s = sold.get(m.product_id) ?? { qty: 0, revenue: 0 };
    s.qty += -m.qty_base;
    s.revenue += m.line_total;
    sold.set(m.product_id, s);
  }
  const all: Mover[] = [];
  for (const p of products) {
    if (p.archived) continue;
    const have = stock[p.id] ?? 0;
    const s = sold.get(p.id) ?? { qty: 0, revenue: 0 };
    const age = Math.ceil((now - (first.get(p.id) ?? Date.parse(p.created_at))) / DAY);
    const days = Math.min(WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, age));
    const perDay = s.qty / days;
    all.push({
      product: p,
      stock: have,
      sold: s.qty,
      revenue: s.revenue,
      days,
      perDay,
      daysLeft: perDay > 0 ? Math.max(0, Math.floor(have / perDay)) : null,
      reorder: perDay > 0 ? Math.max(0, Math.ceil(perDay * COVER_DAYS - have)) : 0,
      value: valuation(have, p.cost_price, unitFactor(p, p.price_unit) ?? 1),
    });
  }
  const ageOf = (m: Mover) => now - (first.get(m.product.id) ?? Date.parse(m.product.created_at));
  return {
    all,
    fast: all.filter((m) => m.sold > 0).sort((a, b) => b.revenue - a.revenue || b.sold - a.sold).slice(0, 10),
    slow: all.filter((m) => m.stock > 0 && m.sold === 0 && ageOf(m) > WINDOW_DAYS * DAY).sort((a, b) => b.value - a.value),
    runningOut: all.filter((m) => m.daysLeft !== null && m.daysLeft <= SOON_DAYS).sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number)),
  };
}
