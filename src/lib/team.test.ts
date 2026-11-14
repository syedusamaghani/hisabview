import { describe, expect, it } from 'vitest';
import type { AuditRow, CashClosing, Entry, Party, Product, StockMove } from '../data/types';
import { buildAlerts, discountAlerts, needsAttention, DEFAULT_PREFS, type AlertInput } from './alerts';
import { activityFeed, saleEntryIds, staffStats } from './team';

const OWNER = 'owner-1';
const SARA = 'cashier-sara';
const BILAL = 'cashier-bilal';
const NOW = Date.parse('2026-11-14T10:00:00.000Z');
const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

let n = 0;
const entry = (o: Partial<Entry>): Entry => ({
  id: `e${++n}`, shop_id: 's', party_id: null, kind: 'cash_sale', amount: 100, note: null, transcript: null, source: 'manual', status: 'active',
  promise_date: null, created_by: SARA, created_at: iso(1), cancelled_at: null, pending_sync: 0, ...o,
});
const move = (o: Partial<StockMove>): StockMove => ({
  id: `m${++n}`, shop_id: 's', product_id: 'p1', entry_id: null, party_id: null, kind: 'sale', qty_base: -1, unit: 'piece', unit_factor: 1,
  unit_price: 15, line_total: 15, reason: null, reverses: null, created_by: SARA, created_at: iso(1), pending_sync: 0, ...o,
});
const audit = (o: Partial<AuditRow>): AuditRow => ({
  id: `a${++n}`, shop_id: 's', entity: 'entry', entity_id: 'x', action: 'create', before_value: null, after_value: null, actor: SARA, created_at: iso(1), pending_sync: 0, ...o,
});
const product: Product = {
  id: 'p1', shop_id: 's', name: 'Biscuit', category: null, barcode: null, sku: null, base_unit: 'piece', units: [], price_unit: 'piece',
  cost_price: 10, sell_price: 20, min_stock: 5, image: null, archived: false, created_at: iso(100), pending_sync: 0,
};

describe('staff-wise sales', () => {
  const from = NOW - 86_400_000;
  const to = NOW + 1;
  it('counts cash sales, itemised udhaar sales and expenses by the person who saved them', () => {
    const withGoodsEntry = entry({ kind: 'diye', amount: 750, party_id: 'ali', created_by: BILAL });
    const moves = [move({ entry_id: withGoodsEntry.id })];
    const entries = [
      entry({ kind: 'cash_sale', amount: 600, created_by: SARA }),
      entry({ kind: 'cash_sale', amount: 200, created_by: SARA }),
      withGoodsEntry,
      entry({ kind: 'diye', amount: 5000, party_id: 'ali', created_by: BILAL }), // plain udhaar: not a sale
      entry({ kind: 'kharcha', amount: 150, created_by: SARA }),
      entry({ kind: 'cash_sale', amount: 999, created_by: SARA, status: 'cancelled' }), // cancelled: nothing
      entry({ kind: 'cash_sale', amount: 111, created_by: SARA, created_at: iso(48) }), // before the range
    ];
    const stats = staffStats(entries, [], saleEntryIds(moves), from, to);
    const sara = stats.find((s) => s.user_id === SARA)!;
    const bilal = stats.find((s) => s.user_id === BILAL)!;
    expect(sara).toMatchObject({ sales: 800, salesCount: 2, kharcha: 150, entries: 3 });
    expect(bilal).toMatchObject({ sales: 750, salesCount: 1, entries: 2 });
    expect(stats[0].user_id).toBe(SARA); // biggest sales first
  });

  it('counts the cancellations a person made inside the range', () => {
    const rows = [audit({ action: 'cancel', actor: OWNER }), audit({ action: 'cancel', actor: OWNER, created_at: iso(72) }), audit({ action: 'create', actor: OWNER })];
    const stats = staffStats([], rows, new Set(), from, to);
    expect(stats.find((s) => s.user_id === OWNER)?.cancelled).toBe(1);
  });
});

describe('activity feed', () => {
  const parties = new Map([['ali', 'Ali']]);
  const products = new Map([['p1', product]]);
  const rows = [
    audit({ action: 'create', actor: SARA, after_value: { kind: 'cash_sale', amount: 600 }, created_at: iso(5) }),
    audit({ action: 'cancel', actor: OWNER, before_value: { kind: 'kharcha', amount: 90 }, after_value: { kind: 'kharcha', amount: 90 }, reason: 'wrong_entry', created_at: iso(2) }),
    audit({ entity: 'party', action: 'edit', actor: OWNER, after_value: { name: 'Ali' }, created_at: iso(3) }),
    audit({ action: 'create', actor: BILAL, after_value: { kind: 'diye', amount: 400, party_id: 'ali' }, created_at: iso(1) }),
  ];
  const adjusts = [move({ kind: 'damaged', qty_base: -5, actor: undefined, created_by: SARA, reason: 'toot gaye', created_at: iso(4) } as Partial<StockMove>), move({ kind: 'sale', created_at: iso(1) })];
  const all = { user: null, action: null, what: null };

  it('lists newest first and names what each line was, with the person', () => {
    const feed = activityFeed(rows, adjusts, parties, products, all);
    expect(feed).toHaveLength(5); // 4 diary lines + the damaged stock (a plain sale movement is not an adjustment)
    expect(feed.map((r) => r.at)).toEqual([...feed.map((r) => r.at)].sort().reverse());
    const cancel = feed.find((r) => r.action === 'cancel')!;
    expect(cancel).toMatchObject({ actor: OWNER, what: 'kharcha', amount: 90, reason: 'wrong_entry' });
    expect(feed.find((r) => r.actor === BILAL)).toMatchObject({ what: 'diye', amount: 400, label: 'Ali' });
    expect(feed.find((r) => r.what === 'stock' && r.actor === SARA)?.label).toBe('Biscuit -5');
  });

  it('filters by user, action and what', () => {
    expect(activityFeed(rows, adjusts, parties, products, { ...all, user: OWNER })).toHaveLength(2);
    expect(activityFeed(rows, adjusts, parties, products, { ...all, action: 'cancel' })).toHaveLength(1);
    expect(activityFeed(rows, adjusts, parties, products, { ...all, what: 'sale' }).map((r) => r.actor)).toEqual([SARA]);
    expect(activityFeed(rows, adjusts, parties, products, { user: SARA, action: 'create', what: 'stock' })).toHaveLength(1);
  });
});

describe('alerts', () => {
  const ali: Party = { id: 'ali', shop_id: 's', name: 'Ali', identifier: null, phone: null, type: 'customer', credit_limit: null, opening_balance: 0, created_at: iso(500), archived: false, pending_sync: 0 };
  const closing = (o: Partial<CashClosing>): CashClosing => ({ id: `c${++n}`, shop_id: 's', day: '2026-11-13', opening_cash: 0, expected_cash: 1000, counted_cash: 900, difference: -100, note: null, created_by: SARA, created_at: iso(10), pending_sync: 0, ...o });
  const input = (o: Partial<AlertInput> = {}): AlertInput => ({
    now: NOW, userId: OWNER, lowStock: [], recentSales: [], products: new Map([['p1', product]]), audit: [], closings: [], entries: [], parties: [ali], balances: { ali: 450 }, summary: null, ...o,
  });

  it('a large discount is a sale 20 percent or more under the usual price; 19 percent is not', () => {
    expect(discountAlerts([move({ unit_price: 16 })], new Map([['p1', product]]))).toHaveLength(1); // 20 -> 16 = 20% less
    expect(discountAlerts([move({ unit_price: 17 })], new Map([['p1', product]]))).toHaveLength(0); // 15% less
    expect(discountAlerts([move({ unit_price: 12 })], new Map([['p1', product]]))[0]).toMatchObject({ pct: 40, price: 12, list: 20 });
  });

  it('a sale that was undone (reversal) is not a discount any more', () => {
    const sale = move({ unit_price: 10 });
    const undo = move({ kind: 'reversal', qty_base: 1, reverses: sale.id });
    expect(discountAlerts([sale, undo], new Map([['p1', product]]))).toHaveLength(0);
  });

  it('prices and units are compared per piece: a carton price against a piece price', () => {
    const carton = { ...product, units: [{ name: 'carton', factor: 10 }], price_unit: 'piece', sell_price: 20 };
    // sold one carton (10 pieces) at Rs 120 = Rs 12 a piece, usual Rs 20: 40% less
    const sale = move({ unit: 'carton', unit_factor: 10, unit_price: 120, qty_base: -10, line_total: 120 });
    expect(discountAlerts([sale], new Map([['p1', carton]]))[0]).toMatchObject({ pct: 40, list: 200 });
  });

  it('low stock, other people cancelling, cash mismatch and a broken promise all show; my own cancel does not', () => {
    const alerts = buildAlerts(
      input({
        lowStock: [{ product, stock: 3 }],
        audit: [
          audit({ action: 'cancel', actor: SARA, before_value: { kind: 'cash_sale', amount: 600 } }),
          audit({ action: 'cancel', actor: OWNER, before_value: { kind: 'cash_sale', amount: 50 } }), // mine: not news
          audit({ action: 'cancel', actor: SARA, before_value: { kind: 'cash_sale', amount: 70 }, created_at: iso(24 * 5) }), // too old
        ],
        closings: [closing({}), closing({ day: '2026-11-13', counted_cash: 1000, difference: 0, created_at: iso(5) })], // newest of that day is fine
        entries: [entry({ kind: 'diye', party_id: 'ali', promise_date: '2026-11-10' })],
      }),
    );
    expect(alerts.map((a) => a.kind).sort()).toEqual(['cancelled', 'lowStock', 'overdue']);
    expect(alerts.find((a) => a.kind === 'cancelled')).toMatchObject({ actor: SARA, amount: 600 });
    expect(alerts.find((a) => a.kind === 'overdue')).toMatchObject({ party: 'Ali', amount: 450, date: '2026-11-10' });
  });

  it('a closing that is short shows, and a kept promise or a paid-up customer does not', () => {
    const short = buildAlerts(input({ closings: [closing({})] }));
    expect(short).toHaveLength(1);
    expect(short[0]).toMatchObject({ kind: 'cashMismatch', amount: -100, day: '2026-11-13' });
    const paid = buildAlerts(input({ entries: [entry({ kind: 'diye', party_id: 'ali', promise_date: '2026-11-10' })], balances: { ali: 0 } }));
    expect(paid).toHaveLength(0);
    const future = buildAlerts(input({ entries: [entry({ kind: 'diye', party_id: 'ali', promise_date: '2026-11-20' })] }));
    expect(future).toHaveLength(0);
  });

  it('every kind can be turned off, and the summary is news, not something that needs a look', () => {
    const base = input({ lowStock: [{ product, stock: 1 }], summary: { sales: 1000, expenses: 100, profit: 300 }, closings: [closing({})] });
    const all = buildAlerts(base);
    expect(all.map((a) => a.kind)).toEqual(['lowStock', 'cashMismatch', 'summary']);
    expect(needsAttention(all)).toBe(2);
    const off = buildAlerts(base, { ...DEFAULT_PREFS, lowStock: false, summary: false });
    expect(off.map((a) => a.kind)).toEqual(['cashMismatch']);
    expect(buildAlerts(base, { lowStock: false, discount: false, cancelled: false, cashMismatch: false, overdue: false, summary: false })).toEqual([]);
  });
});
