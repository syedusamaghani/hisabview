import { describe, expect, it } from 'vitest';
import { daysIn, rangeFor, rangeMs, replayCosts, stepFor, summarize, trend, weekStartOf, type CostMove, type ReportEntry } from './profit';

let n = 0;
const mv = (kind: string, qty: number, total: number, at: string, extra: Partial<CostMove> = {}): CostMove => ({ id: `m${++n}`, product_id: 'p', entry_id: null, kind, qty_base: qty, line_total: total, reverses: null, created_at: at, ...extra });
const P = [{ id: 'p', name: 'Biscuit', cost_price: 10, price_factor: 1 }];
const T = (h: number) => `2026-11-10T${String(h).padStart(2, '0')}:00:00.000Z`;

describe('weighted average cost', () => {
  it('a sale takes the average rate; a later price rise only changes later sales', () => {
    const buy1 = mv('purchase', 100, 1000, T(1)); // Rs 10 each
    const sell1 = mv('sale', -40, 600, T(2)); // cost 400
    const buy2 = mv('purchase', 100, 2000, T(3)); // Rs 20 each: stock 160, worth 2600
    const sell2 = mv('sale', -80, 1600, T(4)); // 2600 x 80 / 160 = 1300
    const c = replayCosts([sell2, buy2, sell1, buy1], P);
    expect(c.get(sell1.id)).toBe(400);
    expect(c.get(sell2.id)).toBe(1300);
  });

  it('the last piece takes all the value left, so no rupee is lost to rounding', () => {
    const a = mv('purchase', 3, 100, T(1));
    const s = [mv('sale', -1, 0, T(2)), mv('sale', -1, 0, T(3)), mv('sale', -1, 0, T(4))];
    const c = replayCosts([a, ...s], P);
    expect(s.map((x) => c.get(x.id))).toEqual([33, 34, 33]);
    expect(s.reduce((t, x) => t + (c.get(x.id) ?? 0), 0)).toBe(100);
  });

  it('free bonus goods lower the average', () => {
    const buy = mv('purchase', 100, 1000, T(1));
    const bonus = mv('purchase', 20, 0, T(2)); // 20 free pieces
    const sale = mv('sale', -60, 0, T(3)); // 1000 x 60 / 120
    expect(replayCosts([buy, bonus, sale], P).get(sale.id)).toBe(500);
  });

  it('selling more than the stock says uses the cost price for the extra pieces', () => {
    const buy = mv('purchase', 10, 100, T(1));
    const sale = mv('sale', -15, 0, T(2)); // 100 + 5 x Rs 10
    expect(replayCosts([buy, sale], P).get(sale.id)).toBe(150);
  });

  it('a cancelled sale gives the goods back at the cost they left at', () => {
    const buy = mv('purchase', 10, 100, T(1));
    const sale = mv('sale', -4, 0, T(2));
    const back = mv('reversal', 4, 0, T(3), { reverses: sale.id });
    const again = mv('sale', -10, 0, T(4)); // all 10 left: the whole Rs 100
    const c = replayCosts([buy, sale, back, again], P);
    expect(c.get(sale.id)).toBe(40);
    expect(c.get(back.id)).toBe(40);
    expect(c.get(again.id)).toBe(100);
  });

  it('two movements in the same millisecond still go in a sensible order', () => {
    const sale = mv('sale', -1, 0, T(1));
    const buy = mv('purchase', 10, 100, T(1));
    expect(replayCosts([sale, buy], P).get(sale.id)).toBe(10);
  });
});

const entry = (id: string, kind: string, amount: number, at: string, extra: Partial<ReportEntry> = {}): ReportEntry => ({ id, kind, amount, status: 'active', party_id: null, created_at: at, ...extra });
const names = new Map([['p', 'Biscuit']]);

describe('profit is not sales', () => {
  const buy = mv('purchase', 100, 1000, T(1));
  const sale1 = mv('sale', -40, 600, T(2), { entry_id: 's1' });
  const damaged = mv('damaged', -5, 0, T(3));
  const moves = [buy, sale1, damaged];
  const costs = replayCosts(moves, P);
  const input = {
    entries: [
      entry('s1', 'cash_sale', 600, T(2)),
      entry('s2', 'cash_sale', 300, T(3)), // typed as one amount: cost unknown
      entry('u1', 'diye', 200, T(4), { party_id: 'c' }), // udhaar, no goods
      entry('k1', 'kharcha', 50, T(5)),
      entry('k2', 'kharcha', 999, T(5), { status: 'cancelled' }),
      entry('m1', 'mile', 120, T(6), { party_id: 'c', method: 'jazzcash' }),
    ],
    moves, costs, partyKinds: new Map([['c', 'customer']]), names,
  };
  const day = rangeMs({ from: '2026-11-10', to: '2026-11-10' });

  it('sales, cost, profit and expenses add up', () => {
    const r = summarize(input, day.fromMs, day.toMs);
    expect(r.itemisedSales).toBe(600);
    expect(r.plainSales).toBe(300);
    expect(r.totalSales).toBe(900);
    expect(r.cogs).toBe(400);
    expect(r.grossProfit).toBe(200);
    expect(r.stockLoss).toBe(50); // 5 damaged at Rs 10
    expect(r.expenses).toBe(50);
    expect(r.netProfit).toBe(100); // 200 - 50 - 50
    expect(r.netProfit).not.toBe(r.totalSales);
    expect(r.udhaarGiven).toBe(200);
  });

  it('money in and out is kept apart from profit', () => {
    const r = summarize(input, day.fromMs, day.toMs);
    expect(r.moneyIn).toBe(600 + 300 + 120);
    expect(r.cashReceived).toBe(900);
    expect(r.digitalReceived).toBe(120);
    expect(r.moneyOut).toBe(50); // the udhaar given and the stock bought moved no money here
  });

  it('only the days asked for are counted, and a cancelled sale vanishes from sales and cost', () => {
    const other = rangeMs({ from: '2026-11-11', to: '2026-11-11' });
    expect(summarize(input, other.fromMs, other.toMs).totalSales).toBe(0);
    const back = mv('reversal', 40, 0, T(8), { reverses: sale1.id });
    const m2 = [...moves, back];
    const cancelled = { ...input, moves: m2, costs: replayCosts(m2, P), entries: input.entries.map((e) => (e.id === 's1' ? { ...e, status: 'cancelled' } : e)) };
    const r = summarize(cancelled, day.fromMs, day.toMs);
    expect(r.itemisedSales).toBe(0);
    expect(r.cogs).toBe(0);
  });

  it('product-wise profit', () => {
    const r = summarize(input, day.fromMs, day.toMs);
    expect(r.byProduct).toEqual([{ product_id: 'p', name: 'Biscuit', qty_base: 40, sales: 600, cost: 400, profit: 200 }]);
  });

  it('the days of a trend add up to the whole range', () => {
    const range = { from: '2026-11-09', to: '2026-11-12' };
    const days = trend(input, range, 'day');
    expect(days.map((d) => d.start)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']);
    const whole = rangeMs(range);
    const all = summarize(input, whole.fromMs, whole.toMs);
    expect(days.reduce((t, d) => t + d.report.totalSales, 0)).toBe(all.totalSales);
    expect(days.reduce((t, d) => t + d.report.netProfit, 0)).toBe(all.netProfit);
  });
});

describe('dates', () => {
  it('this week starts on Monday and the ranges come out right', () => {
    expect(weekStartOf('2026-11-12')).toBe('2026-11-09'); // a Thursday
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09'); // a Sunday
    expect(rangeFor('yesterday', '2026-11-01')).toEqual({ from: '2026-10-31', to: '2026-10-31' });
    expect(rangeFor('month', '2026-11-12')).toEqual({ from: '2026-11-01', to: '2026-11-12' });
    expect(rangeFor('custom', '2026-11-12', { from: '2026-11-10', to: '2026-11-03' })).toEqual({ from: '2026-11-03', to: '2026-11-10' });
  });

  it('weeks and months cut a long range into pieces without gaps', () => {
    const range = { from: '2026-10-28', to: '2026-12-02' };
    const empty = { entries: [], moves: [], costs: new Map<string, number>(), partyKinds: new Map<string, string>(), names };
    const months = trend(empty, range, 'month');
    expect(months.map((m) => [m.start, m.end])).toEqual([['2026-10-28', '2026-10-31'], ['2026-11-01', '2026-11-30'], ['2026-12-01', '2026-12-02']]);
    const weeks = trend(empty, range, 'week');
    expect(weeks[0].start).toBe('2026-10-28');
    expect(weeks[1].start).toBe('2026-11-02');
    expect(weeks.at(-1)?.end).toBe('2026-12-02');
    expect(stepFor({ from: '2026-11-01', to: '2026-11-30' })).toBe('day');
    expect(daysIn(range)).toBe(36);
    expect(stepFor(range)).toBe('week');
  });
});
