import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, dayKeyOf, dayStartOf } from '../lib/cashbook';
import { rangeMs, summarize, trend } from '../lib/profit';
import { setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { reportRepo } from './reportRepo';
import { shopsRepo } from './shopsRepo';
import { tradeRepo } from './tradeRepo';

const USER = '00000000-0000-4000-8000-00000000000d';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
});

const today = () => dayKeyOf(new Date());
const hour = (day: string, h: number) => new Date(dayStartOf(day).getTime() + h * 3_600_000).toISOString();

// Test only: the app never changes the time of a saved row. This spreads the work over the day so the order is clear.
async function placeAt(entryId: string | null, moveIds: string[], day: string, h: number) {
  if (entryId) await db.entries.update(entryId, { created_at: hour(day, h) });
  for (const id of moveIds) await db.stock_moves.update(id, { created_at: hour(day, h) });
}

async function shop() {
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali' });
  const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 15 });
  return { karim, ali, biscuit };
}

describe('profit from real records', () => {
  it('buy at 10, sell, buy at 20, sell on udhaar, damage, expense: every figure matches the records', async () => {
    const { karim, ali, biscuit } = await shop();
    const day = today();
    const line = (qty: number, price: number) => [{ product_id: biscuit.id, unit: 'piece', qty_base: qty, unit_price: price }];

    const b1 = await tradeRepo.purchase({ supplier_id: karim.id, lines: line(100, 10) });
    await placeAt(b1.entry.id, b1.moves.map((m) => m.id), day, 1);
    const s1 = await tradeRepo.sale({ lines: line(40, 15) }); // cash, Rs 600
    await placeAt(s1.entry.id, s1.moves.map((m) => m.id), day, 2);
    const b2 = await tradeRepo.purchase({ supplier_id: karim.id, lines: line(100, 20) }); // the price went up
    await placeAt(b2.entry.id, b2.moves.map((m) => m.id), day, 3);
    const s2 = await tradeRepo.sale({ party_id: ali.id, lines: line(30, 25) }); // on udhaar, Rs 750
    await placeAt(s2.entry.id, s2.moves.map((m) => m.id), day, 4);
    const lost = await productsRepo.adjust(biscuit.id, 'damaged', 5, 'toot gaye');
    await placeAt(null, [lost.id], day, 5);
    const k = await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 100, category: 'rent' });
    await placeAt(k.id, [], day, 6);
    const plain = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 500 });
    await placeAt(plain.id, [], day, 7);
    const got = await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 300, method: 'jazzcash' });
    await placeAt(got.id, [], day, 8);

    const input = await reportRepo.load({ from: day, to: day });
    const { fromMs, toMs } = rangeMs({ from: day, to: day });
    const r = summarize(input, fromMs, toMs);

    // sales = the sale entries written with goods, plus the plain one
    expect(r.itemisedSales).toBe(600 + 750);
    expect(r.plainSales).toBe(500);
    expect(r.totalSales).toBe(1850);
    // cost at the average rate: 40 x 10 = 400, then (1000-400 + 2000) = 2600 over 160, 30 of them = 488
    expect(r.cogs).toBe(400 + 488);
    expect(r.grossProfit).toBe(1350 - 888);
    expect(r.stockLoss).toBe(81); // 5 of the 130 left, worth 2112
    expect(r.expenses).toBe(100);
    expect(r.netProfit).toBe(462 - 100 - 81);
    expect(r.netProfit).not.toBe(r.totalSales);
    // the money: cash sales (600 + 500) and the JazzCash payment; the udhaar sale and the stock bought on credit moved none
    expect(r.moneyIn).toBe(1100 + 300);
    expect(r.digitalReceived).toBe(300);
    expect(r.moneyOut).toBe(100);
    expect(r.udhaarGiven).toBe(0); // the udhaar was a sale with goods
    // product-wise: sales and cost of this product are the totals above
    expect(r.byProduct).toHaveLength(1);
    expect(r.byProduct[0]).toMatchObject({ qty_base: 70, sales: 1350, cost: 888, profit: 462 });

    // the stock value on the Saman screen is what is left: 2112 - 81 = 2031 at the average (the screen uses the cost price)
    const stock = (await productsRepo.listStock())[0];
    expect(stock.stock).toBe(125);

    // any way of cutting the days gives the same totals
    const range = { from: addDays(day, -3), to: day };
    const whole = rangeMs(range);
    const all = summarize(input, whole.fromMs, whole.toMs);
    for (const step of ['day', 'week', 'month'] as const) {
      const parts = trend(input, range, step);
      expect(parts.reduce((t, p) => t + p.report.totalSales, 0)).toBe(all.totalSales);
      expect(parts.reduce((t, p) => t + p.report.netProfit, 0)).toBe(all.netProfit);
      expect(parts.reduce((t, p) => t + p.report.moneyIn, 0)).toBe(all.moneyIn);
    }
  });

  it('cancelling a sale takes both its sales and its cost out, and the goods come back at the same cost', async () => {
    const { karim, biscuit } = await shop();
    const day = today();
    const line = (qty: number, price: number) => [{ product_id: biscuit.id, unit: 'piece', qty_base: qty, unit_price: price }];
    const b = await tradeRepo.purchase({ supplier_id: karim.id, lines: line(10, 10) });
    await placeAt(b.entry.id, b.moves.map((m) => m.id), day, 1);
    const s = await tradeRepo.sale({ lines: line(4, 15) });
    await placeAt(s.entry.id, s.moves.map((m) => m.id), day, 2);
    await entriesRepo.cancel(s.entry.id, 'wrong_entry');
    await db.stock_moves.filter((m) => m.kind === 'reversal').modify({ created_at: hour(day, 3) });

    const { fromMs, toMs } = rangeMs({ from: day, to: day });
    const r = summarize(await reportRepo.load({ from: day, to: day }), fromMs, toMs);
    expect(r).toMatchObject({ totalSales: 0, cogs: 0, grossProfit: 0, netProfit: 0 });
    // and selling all 10 afterwards costs the whole Rs 100 the goods were bought for
    const again = await tradeRepo.sale({ lines: line(10, 15) });
    await placeAt(again.entry.id, again.moves.map((m) => m.id), day, 4);
    const r2 = summarize(await reportRepo.load({ from: day, to: day }), fromMs, toMs);
    expect(r2).toMatchObject({ itemisedSales: 150, cogs: 100, grossProfit: 50 });
  });

  it('a day with nothing in it is all zeros', async () => {
    await shop();
    const day = today();
    const { fromMs, toMs } = rangeMs({ from: day, to: day });
    const r = summarize(await reportRepo.load({ from: day, to: day }), fromMs, toMs);
    expect(r).toMatchObject({ totalSales: 0, netProfit: 0, moneyIn: 0, moneyOut: 0, byProduct: [] });
  });
});
