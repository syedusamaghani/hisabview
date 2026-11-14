import { describe, expect, it } from 'vitest';
import type { Party, Product, StockMove } from '../data/types';
import { buildAlerts, type AlertInput } from './alerts';
import { saleReceiptText } from './messages';
import { movement } from './movers';
import { priceChanges, purchaseBuys, supplierRates } from './pricing';
import { allocateDiscount } from './stock';

const NOW = Date.parse('2026-11-14T10:00:00.000Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

let n = 0;
const move = (o: Partial<StockMove>): StockMove => ({
  id: `m${++n}`, shop_id: 's', product_id: 'p1', entry_id: null, party_id: null, kind: 'sale', qty_base: -1, unit: 'piece', unit_factor: 1,
  unit_price: 20, line_total: 20, reason: null, reverses: null, created_by: 'u', created_at: ago(1), pending_sync: 0, ...o,
});
const product = (o: Partial<Product> = {}): Product => ({
  id: 'p1', shop_id: 's', name: 'Biscuit', category: null, barcode: null, sku: null, base_unit: 'piece', units: [], price_unit: 'piece',
  cost_price: 10, sell_price: 20, min_stock: 0, image: null, archived: false, created_at: ago(200), pending_sync: 0, ...o,
});

describe('a discount shared over the lines of a bill', () => {
  it('adds up exactly to the discount, in whole rupees, and never takes more than a line costs', () => {
    for (const [totals, d] of [[[100, 200, 300], 100], [[1, 1, 1], 2], [[333, 333, 334], 7], [[10, 0, 5], 15], [[5, 5], 0]] as [number[], number][]) {
      const cut = allocateDiscount(totals, d);
      expect(cut.reduce((a, b) => a + b, 0)).toBe(d);
      cut.forEach((c, i) => {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeLessThanOrEqual(totals[i]);
      });
    }
  });
  it('shares in proportion, and a free line (Rs 0) takes none', () => {
    expect(allocateDiscount([100, 200, 300], 60)).toEqual([10, 20, 30]);
    expect(allocateDiscount([500, 0], 50)).toEqual([50, 0]);
  });
  it('refuses a discount that is negative, fractional or bigger than the bill', () => {
    expect(() => allocateDiscount([100], -1)).toThrow();
    expect(() => allocateDiscount([100], 1.5)).toThrow();
    expect(() => allocateDiscount([100], 101)).toThrow();
  });
});

describe('fast and slow items, and how long stock lasts', () => {
  const fastP = product({ id: 'fast', name: 'Fast' });
  const slowP = product({ id: 'slow', name: 'Slow' });
  const newP = product({ id: 'new', name: 'New', created_at: ago(2) });
  const moves = [
    move({ id: 'o1', product_id: 'fast', kind: 'opening', qty_base: 100, created_at: ago(100) }),
    move({ id: 'o2', product_id: 'slow', kind: 'opening', qty_base: 50, created_at: ago(100) }),
    move({ id: 'o3', product_id: 'new', kind: 'opening', qty_base: 10, created_at: ago(2) }),
    ...Array.from({ length: 30 }, (_, i) => move({ product_id: 'fast', qty_base: -2, line_total: 40, created_at: ago(i + 0.5) })), // 60 in 30 days = 2 a day
    move({ product_id: 'slow', qty_base: -5, line_total: 100, created_at: ago(60) }), // sold, but not in the last 30 days
  ];
  const stock = { fast: 8, slow: 45, new: 10 };

  it('works out the rate, the days left and what to reorder', () => {
    const r = movement(moves, [fastP, slowP, newP], stock, NOW);
    const fast = r.all.find((m) => m.product.id === 'fast')!;
    expect(fast).toMatchObject({ sold: 60, revenue: 1200, days: 30, perDay: 2, daysLeft: 4, reorder: 20 }); // 2 x 14 - 8
    expect(r.runningOut.map((m) => m.product.id)).toEqual(['fast']);
    expect(r.fast.map((m) => m.product.id)).toEqual(['fast']);
  });

  it('a stuck item has stock, no sale in 30 days and is older than that; a new item is never called slow', () => {
    const r = movement(moves, [fastP, slowP, newP], stock, NOW);
    expect(r.slow.map((m) => m.product.id)).toEqual(['slow']);
    expect(r.slow[0].value).toBe(450); // 45 x cost 10
  });

  it('a sale that was undone does not count, and a new item is counted over at least 7 days', () => {
    const sale = move({ product_id: 'new', qty_base: -7, line_total: 140, created_at: ago(1) });
    const undo = move({ product_id: 'new', kind: 'reversal', qty_base: 7, line_total: 140, reverses: sale.id, created_at: ago(0.5) });
    const none = movement([moves[2], sale, undo], [newP], { new: 10 }, NOW);
    expect(none.all[0]).toMatchObject({ sold: 0, daysLeft: null });
    const one = movement([moves[2], move({ product_id: 'new', qty_base: -7, line_total: 140, created_at: ago(1) })], [newP], { new: 3 }, NOW);
    expect(one.all[0]).toMatchObject({ days: 7, perDay: 1, daysLeft: 3 }); // not 7 a day because it is only 2 days old
  });

  it('stock that is already gone while it still sells is "0 days left"', () => {
    const r = movement([move({ product_id: 'fast', qty_base: -4, created_at: ago(2) })], [fastP], { fast: 0 }, NOW);
    expect(r.runningOut[0].daysLeft).toBe(0);
  });
});

describe('buying prices and suppliers', () => {
  const p = product();
  const prods = new Map([[p.id, p]]);
  const buy = (o: Partial<StockMove>) => move({ kind: 'purchase', qty_base: 100, ...o });

  it('compares suppliers per piece even when one sold by the carton', () => {
    const moves = [
      buy({ party_id: 'karim', unit_price: 12, created_at: ago(30) }),
      buy({ party_id: 'zahid', unit: 'carton', unit_factor: 10, unit_price: 100, created_at: ago(10) }), // Rs 100 for 10 pieces = Rs 10 each
      buy({ party_id: 'karim', unit_price: 14, created_at: ago(5) }),
    ];
    const rates = supplierRates(purchaseBuys(moves, prods), 'p1');
    expect(rates.map((r) => [r.supplier_id, r.rate, r.cheapest])).toEqual([['zahid', 10, true], ['karim', 14, false]]); // karim's newest rate counts
  });

  it('free goods and cancelled purchases are not a price', () => {
    const bought = buy({ party_id: 'karim', unit_price: 12, created_at: ago(8) });
    const free = buy({ party_id: 'karim', unit_price: 0, line_total: 0, created_at: ago(7) });
    const undo = move({ kind: 'reversal', qty_base: -100, reverses: bought.id, created_at: ago(6) });
    expect(purchaseBuys([bought, free], prods)).toHaveLength(1);
    expect(purchaseBuys([bought, free, undo], prods)).toHaveLength(0);
  });

  it('tells about a price that moved 10 percent or more against the same supplier, and when it passes the selling price', () => {
    const moves = [buy({ party_id: 'karim', unit_price: 10, created_at: ago(40) }), buy({ party_id: 'karim', unit_price: 21, created_at: ago(2) })];
    const ch = priceChanges(purchaseBuys(moves, prods), prods, NOW - 14 * DAY);
    expect(ch).toHaveLength(1);
    expect(ch[0]).toMatchObject({ from: 10, to: 21, pct: 110, belowCost: true }); // sells at 20
    // a small move, or another supplier's price, is not a change
    expect(priceChanges(purchaseBuys([buy({ party_id: 'karim', unit_price: 10, created_at: ago(40) }), buy({ party_id: 'karim', unit_price: 10, created_at: ago(2) }), buy({ party_id: 'zahid', unit_price: 50, created_at: ago(1) })], prods), prods, NOW - 14 * DAY)).toHaveLength(0);
    // an old change is not news
    expect(priceChanges(purchaseBuys(moves, prods), prods, NOW)).toHaveLength(0);
    // cheaper is told too
    expect(priceChanges(purchaseBuys([buy({ party_id: 'karim', unit_price: 20, created_at: ago(40) }), buy({ party_id: 'karim', unit_price: 15, created_at: ago(2) })], prods), prods, NOW - 14 * DAY)[0].pct).toBe(-25);
  });
});

describe('the new alerts', () => {
  const base = (o: Partial<AlertInput>): AlertInput => ({
    now: NOW, userId: 'owner', lowStock: [], recentSales: [], products: new Map(), audit: [], closings: [], entries: [], parties: [], balances: {}, summary: null, ...o,
  });
  const customer = (id: string, limit: number | null): Party => ({ id, shop_id: 's', name: id, identifier: null, phone: null, type: 'customer', credit_limit: limit, opening_balance: 0, created_at: ago(300), archived: false, pending_sync: 0 });

  it('a customer over the credit limit is told; at the limit or without a limit is not', () => {
    const alerts = buildAlerts(base({ parties: [customer('ali', 1000), customer('bilal', 1000), customer('sana', null)], balances: { ali: 1500, bilal: 1000, sana: 99999 } }));
    expect(alerts.map((a) => [a.kind, a.party, a.amount, a.limit])).toEqual([['overLimit', 'ali', 1500, 1000]]);
  });

  it('running out is told once: an item already in the low-stock list is not said twice', () => {
    const p = product();
    const mover = { product: p, stock: 3, sold: 30, revenue: 0, days: 30, perDay: 1, daysLeft: 3, reorder: 11, value: 0 };
    expect(buildAlerts(base({ runningOut: [mover] })).map((a) => a.kind)).toEqual(['runningOut']);
    expect(buildAlerts(base({ runningOut: [mover], lowStock: [{ product: p, stock: 3 }] })).map((a) => a.kind)).toEqual(['lowStock']);
  });

  it('a bill discount counts as a large discount; free goods do not', () => {
    const p = product();
    const prods = new Map([[p.id, p]]);
    const discounted = move({ qty_base: -10, unit_price: 20, line_total: 120 }); // bill discount took it to Rs 12 each
    const free = move({ qty_base: -1, unit_price: 0, line_total: 0 });
    const alerts = buildAlerts(base({ products: prods, recentSales: [discounted, free] }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: 'discount', pct: 40, price: 12, list: 20 });
  });
});

describe('the WhatsApp bill', () => {
  it('lists items at the usual price, a discount line, the total and the balance; free goods are marked', () => {
    const text = saleReceiptText('en', { shop: 'Ahmed Store', customer: 'Ali' }, [{ name: 'Biscuit', qty: '10 piece', amount: 200, free: false }, { name: 'Biscuit', qty: '1 piece', amount: 0, free: true }], 20, 180, 450);
    expect(text).toContain('Ahmed Store');
    expect(text).toContain('Customer: Ali');
    expect(text).toContain('Biscuit: 10 piece = Rs 200');
    expect(text).toContain('Biscuit: 1 piece - free');
    expect(text).toContain('Discount: Rs 20');
    expect(text).toContain('Total: Rs 180');
    expect(text).toMatch(/450/);
    expect(saleReceiptText('en', { shop: 'S', customer: null }, [], 0, 50, null)).not.toContain('Discount');
  });
});
