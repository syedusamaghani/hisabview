// Profit and loss. Pure functions: same input, same answer, no database.
//
// HOW COST IS WORKED OUT (weighted average cost, "average rate"):
//   Every product keeps a running stock quantity and a running stock VALUE (rupees). A purchase (or opening stock)
//   adds its quantity and its rupees. A sale takes goods out at the average rate at that moment:
//        cost of this sale = stock value x quantity sold / stock quantity
//   so a price change on the next purchase only changes the cost of goods sold AFTER it, and an old sale keeps the
//   cost it had. The last piece takes whatever value is left, so rounding never leaves rupees behind.
//   - Discount: the shopkeeper types the price actually charged, so a discount is simply a lower sale price.
//   - Free / bonus items bought: a purchase line with price 0 adds quantity but no rupees, which lowers the average.
//   - Customer returns: a sale that is cancelled puts its goods back at the cost they left at (a 'reversal'
//     movement) and drops out of sales and cost together. There is no separate "customer return" entry yet.
//   - Goods sent back to the supplier leave stock at the average rate; that is stock leaving, not a cost of sale.
//   - Damaged / lost goods, and a stock count that found less, are a LOSS at the average rate (own line).
//   - If more is sold than the stock says (shop stock is often behind), the extra pieces use the product's cost price.
//
// WHAT IS A SALE:
//   itemised sale = a cash sale, or a Diye (udhaar) sale, that was written with goods (Saman). Its cost is known.
//   plain cash sale = a cash sale typed as one amount. Its cost is NOT known, so it is shown but kept OUT of profit.
//   A plain Diye to a customer is udhaar (money lent), not a sale, because nobody can tell what it was for.
//
//   gross profit = itemised sales - cost of those goods
//   net profit   = gross profit - expenses (kharcha) - lost or damaged goods        (an estimate)
// Profit is not cash: udhaar sales are profit before the money comes, and buying stock is cash out but not a cost yet.
import { dayKeyOf, dayStartOf, addDays, moneyMove, type DayKey, type PartyKinds } from './cashbook';
import { METHODS, type Method } from './methods';
import { lineTotal } from './stock';

export type CostMove = {
  id: string;
  product_id: string;
  entry_id: string | null;
  kind: string; // opening | purchase | purchase_return | sale | adjust | damaged | lost | reversal
  qty_base: number;
  line_total: number;
  unit_price?: number | null; // the list price the line was written at (a sale line: the discount is list total - line_total)
  unit_factor?: number;
  reverses: string | null;
  created_at: string;
};
// What a product costs when the stock cannot say (price_factor = base units in one price unit)
export type CostProduct = { id: string; name: string; cost_price: number; price_factor: number };

// Round half up on whole rupees, using only integers so there is no floating point drift
const share = (value: number, part: number, whole: number): number => Math.floor((2 * value * part + whole) / (2 * whole));

// The rupee value of every movement, worked out in time order. Out-movements get their cost, in-movements their purchase value.
// Result: moveId -> rupees (always >= 0). A reversal gets the value of the movement it undoes.
export function replayCosts(moves: readonly CostMove[], products: readonly CostProduct[]): Map<string, number> {
  const info = new Map(products.map((p) => [p.id, p]));
  const state = new Map<string, { qty: number; value: number }>();
  const worth = new Map<string, number>(); // rupees each movement moved (signed: + into stock, - out of stock)
  const out = new Map<string, number>();
  const fallback = (id: string, qty: number) => {
    const p = info.get(id);
    return p ? share(p.cost_price, qty, p.price_factor || 1) : 0;
  };
  // time order; two movements in the same millisecond go: goods in, then goods out, then reversals
  const rank = (kind: string) => (kind === 'opening' || kind === 'purchase' ? 0 : kind === 'adjust' ? 1 : kind === 'reversal' ? 3 : 2);
  const sorted = [...moves].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : rank(a.kind) - rank(b.kind)));
  // a movement can only be undone by one that comes after it, so look it up in the order of time
  for (const m of sorted) {
    const s = state.get(m.product_id) ?? { qty: 0, value: 0 };
    state.set(m.product_id, s);
    let delta: number;
    if (m.kind === 'reversal') {
      delta = -(worth.get(m.reverses ?? '') ?? 0);
      s.qty += m.qty_base;
      s.value = Math.max(0, s.value + delta);
    } else if (m.qty_base > 0) {
      delta = m.line_total;
      s.qty += m.qty_base;
      s.value += delta;
    } else {
      const q = -m.qty_base;
      let cost: number;
      if (s.qty <= 0) cost = fallback(m.product_id, q);
      else if (q < s.qty) cost = share(s.value, q, s.qty);
      else cost = s.value + (q > s.qty ? fallback(m.product_id, q - s.qty) : 0);
      s.qty -= q;
      s.value = Math.max(0, s.value - cost);
      delta = -cost;
    }
    worth.set(m.id, delta);
    out.set(m.id, Math.abs(delta));
  }
  return out;
}

export type ReportEntry = { id: string; kind: string; amount: number; status: string; method?: string | null; party_id: string | null; created_at: string; category?: string | null; invoice_no?: string | null; note?: string | null };
export type ReportInput = {
  entries: readonly ReportEntry[];
  moves: readonly CostMove[];
  costs: ReadonlyMap<string, number>; // from replayCosts
  partyKinds: PartyKinds;
  names: ReadonlyMap<string, string>; // product id -> name
};

export type ProductProfit = { product_id: string; name: string; qty_base: number; sales: number; cost: number; profit: number };
export type MethodMoney = Record<Method, number>;

export type Report = {
  fromMs: number;
  toMs: number;
  // profit
  itemisedSales: number; // sales written with goods
  plainSales: number; // cash sales typed as one amount (cost unknown, not in profit)
  totalSales: number; // itemisedSales + plainSales
  cogs: number; // cost of the goods that were sold
  grossProfit: number; // itemisedSales - cogs
  expenses: number;
  stockLoss: number; // damaged, lost or missing goods at cost
  netProfit: number; // grossProfit - expenses - stockLoss
  discountGiven: number; // rupees taken off sales bills (already inside sales and profit; shown for information)
  freeCost: number; // cost of goods given free (a scheme like 10+1); already inside cost and profit
  udhaarGiven: number; // Diye to customers with no goods written (money lent, not a sale)
  // cash flow (the money, not the profit)
  moneyIn: number;
  moneyOut: number;
  inByMethod: MethodMoney;
  outByMethod: MethodMoney;
  cashReceived: number; // money in as cash
  digitalReceived: number; // money in by JazzCash, Easypaisa, bank or other
  salesCount: number;
  byProduct: ProductProfit[];
};

const zeroMethods = (): MethodMoney => Object.fromEntries(METHODS.map((m) => [m, 0])) as MethodMoney;

// Everything for [fromMs, toMs): sales, cost, profit, and the money that moved.
export function summarize(input: ReportInput, fromMs: number, toMs: number): Report {
  const inside = (iso: string) => {
    const at = Date.parse(iso);
    return at >= fromMs && at < toMs;
  };
  const r: Report = {
    fromMs, toMs, itemisedSales: 0, plainSales: 0, totalSales: 0, cogs: 0, grossProfit: 0, expenses: 0, stockLoss: 0, netProfit: 0, discountGiven: 0, freeCost: 0, udhaarGiven: 0,
    moneyIn: 0, moneyOut: 0, inByMethod: zeroMethods(), outByMethod: zeroMethods(), cashReceived: 0, digitalReceived: 0, salesCount: 0, byProduct: [],
  };
  const undone = new Set(input.moves.map((m) => m.reverses).filter((v): v is string => v !== null));
  const salesOf = new Map<string, CostMove[]>(); // entry id -> its sale movements (not undone)
  for (const m of input.moves) {
    if (m.kind !== 'sale' || !m.entry_id || undone.has(m.id)) continue;
    const list = salesOf.get(m.entry_id) ?? [];
    list.push(m);
    salesOf.set(m.entry_id, list);
  }
  const products = new Map<string, ProductProfit>();

  for (const e of input.entries) {
    if (e.status !== 'active' || !inside(e.created_at)) continue;
    const move = moneyMove(e, input.partyKinds);
    if (move) {
      if (move.direction === 'in') {
        r.moneyIn += e.amount;
        r.inByMethod[move.method] += e.amount;
      } else {
        r.moneyOut += e.amount;
        r.outByMethod[move.method] += e.amount;
      }
    }
    if (e.kind === 'kharcha') r.expenses += e.amount;
    const goods = salesOf.get(e.id);
    if ((e.kind === 'cash_sale' || e.kind === 'diye') && goods && goods.length > 0) {
      r.itemisedSales += e.amount;
      r.salesCount += 1;
      for (const m of goods) {
        const cost = input.costs.get(m.id) ?? 0;
        const row = products.get(m.product_id) ?? { product_id: m.product_id, name: input.names.get(m.product_id) ?? '', qty_base: 0, sales: 0, cost: 0, profit: 0 };
        row.qty_base += -m.qty_base;
        row.sales += m.line_total;
        row.cost += cost;
        products.set(m.product_id, row);
        r.cogs += cost;
        if (m.unit_price) r.discountGiven += Math.max(0, lineTotal(m.qty_base, m.unit_price, m.unit_factor ?? 1) - m.line_total);
        if (m.unit_price === 0 && m.line_total === 0) r.freeCost += cost;
      }
    } else if (e.kind === 'cash_sale') {
      r.plainSales += e.amount;
      r.salesCount += 1;
    } else if (e.kind === 'diye' && e.party_id && input.partyKinds.get(e.party_id) !== 'supplier') {
      r.udhaarGiven += e.amount;
    }
  }

  // goods lost, damaged or found missing at a stock count (not tied to an entry)
  for (const m of input.moves) {
    if (undone.has(m.id) || m.kind === 'reversal' || !inside(m.created_at)) continue;
    if (m.kind === 'damaged' || m.kind === 'lost' || (m.kind === 'adjust' && m.qty_base < 0)) r.stockLoss += input.costs.get(m.id) ?? 0;
  }

  for (const row of products.values()) row.profit = row.sales - row.cost;
  r.byProduct = [...products.values()].sort((a, b) => b.profit - a.profit || b.sales - a.sales);
  r.totalSales = r.itemisedSales + r.plainSales;
  r.grossProfit = r.itemisedSales - r.cogs;
  r.netProfit = r.grossProfit - r.expenses - r.stockLoss;
  r.cashReceived = r.inByMethod.cash;
  r.digitalReceived = r.moneyIn - r.inByMethod.cash;
  return r;
}

// ---- the dates the shopkeeper can pick

export type RangeKind = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type DayRange = { from: DayKey; to: DayKey }; // both days included

// Monday of the week the day is in
export function weekStartOf(day: DayKey): DayKey {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

export function rangeFor(kind: RangeKind, today: DayKey, custom?: DayRange): DayRange {
  switch (kind) {
    case 'today': return { from: today, to: today };
    case 'yesterday': return { from: addDays(today, -1), to: addDays(today, -1) };
    case 'week': return { from: weekStartOf(today), to: today };
    case 'month': return { from: `${today.slice(0, 7)}-01`, to: today };
    default: {
      const a = custom?.from ?? today;
      const b = custom?.to ?? today;
      return a <= b ? { from: a, to: b } : { from: b, to: a }; // dates typed the wrong way round are swapped
    }
  }
}

export const rangeMs = (range: DayRange): { fromMs: number; toMs: number } => ({ fromMs: dayStartOf(range.from).getTime(), toMs: dayStartOf(addDays(range.to, 1)).getTime() });
export const daysIn = (range: DayRange): number => Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000) + 1;

// ---- trend: one number per day, week or month

export type Step = 'day' | 'week' | 'month';
export type Bucket = { start: DayKey; end: DayKey; report: Report };

// Cut a range into days, Monday-weeks or calendar months (the first and last piece may be shorter) and total each piece
export function trend(input: ReportInput, range: DayRange, step: Step): Bucket[] {
  const out: Bucket[] = [];
  let start = range.from;
  while (start <= range.to) {
    let end: DayKey;
    if (step === 'day') end = start;
    else if (step === 'week') end = addDays(weekStartOf(start), 6);
    else end = addDays(`${addMonth(start)}-01`, -1);
    if (end > range.to) end = range.to;
    const { fromMs, toMs } = rangeMs({ from: start, to: end });
    out.push({ start, end, report: summarize(input, fromMs, toMs) });
    start = addDays(end, 1);
  }
  return out;
}

const addMonth = (day: DayKey): string => {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

// A good step for a range: days up to 31 days, then weeks up to about 6 months, then months
export const stepFor = (range: DayRange): Step => (daysIn(range) <= 31 ? 'day' : daysIn(range) <= 190 ? 'week' : 'month');

export { dayKeyOf };
