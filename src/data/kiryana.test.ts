import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { receiptLink } from '../screens/whatsappActions';
import { dayKeyOf } from '../lib/cashbook';
import { rangeMs, summarize } from '../lib/profit';
import { setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { moversRepo } from './moversRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { reportRepo } from './reportRepo';
import { shopsRepo } from './shopsRepo';
import { tradeRepo } from './tradeRepo';

const USER = '00000000-0000-4000-8000-0000000000c7';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
});

const day = () => {
  const d = dayKeyOf(new Date());
  return { from: d, to: d };
};
async function today() {
  const { fromMs, toMs } = rangeMs(day());
  return summarize(await reportRepo.load(day()), fromMs, toMs);
}
async function stockOf(id: string) {
  return (await productsRepo.listStock()).find((r) => r.product.id === id)!.stock;
}
async function setup() {
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const { party: zahid } = await partiesRepo.create({ name: 'Zahid Wholesale', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali', phone: '0300-1234567' });
  const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20 });
  const line = (qty: number, price: number) => ({ product_id: biscuit.id, unit: 'piece', qty_base: qty, unit_price: price });
  await tradeRepo.purchase({ supplier_id: karim.id, lines: [line(100, 10)] });
  return { karim, zahid, ali, biscuit, line };
}

describe('a sale with a discount and free goods (10+1)', () => {
  it('saves the rupees really asked, takes the free piece out of stock, and profit follows', async () => {
    const { biscuit, line } = await setup();
    // 10 pieces at Rs 20 = 200, Rs 20 off the bill, and 1 piece free
    const sale = await tradeRepo.sale({ lines: [line(10, 20), line(1, 0)], discount: 20 });
    expect(sale.entry.amount).toBe(180);
    expect(sale.total).toBe(180);
    expect(sale.moves.map((m) => m.line_total).sort((a, b) => a - b)).toEqual([0, 180]); // lines add up to the bill
    expect(sale.moves.reduce((n, m) => n + m.line_total, 0)).toBe(sale.entry.amount);
    expect(await stockOf(biscuit.id)).toBe(89); // 100 - 10 - 1 free

    const r = await today();
    expect(r.itemisedSales).toBe(180);
    expect(r.cogs).toBe(110); // 11 pieces at Rs 10, free one included
    expect(r.grossProfit).toBe(70);
    expect(r.discountGiven).toBe(20);
    expect(r.freeCost).toBe(10);
    expect(r.grossProfit).not.toBe(r.itemisedSales); // profit is not sales
    expect(r.byProduct[0]).toMatchObject({ qty_base: 11, sales: 180, cost: 110, profit: 70 });
  });

  it('cancelling the sale puts the stock back and takes the profit away', async () => {
    const { biscuit, line } = await setup();
    const sale = await tradeRepo.sale({ lines: [line(10, 20), line(1, 0)], discount: 20 });
    await entriesRepo.cancel(sale.entry.id, 'wrong_entry');
    expect(await stockOf(biscuit.id)).toBe(100);
    const r = await today();
    expect(r).toMatchObject({ itemisedSales: 0, cogs: 0, grossProfit: 0, discountGiven: 0, freeCost: 0 });
  });

  it('a discount as big as the bill is refused and nothing is saved', async () => {
    const { biscuit, line } = await setup();
    const before = await db.entries.count();
    await expect(tradeRepo.sale({ lines: [line(10, 20)], discount: 200 })).rejects.toThrow();
    await expect(tradeRepo.sale({ lines: [line(10, 20)], discount: -5 })).rejects.toThrow();
    expect(await db.entries.count()).toBe(before);
    expect(await stockOf(biscuit.id)).toBe(100);
  });

  it('a discount on a udhaar sale lowers what the customer owes', async () => {
    const { ali, line } = await setup();
    const sale = await tradeRepo.sale({ party_id: ali.id, lines: [line(10, 20)], discount: 50 });
    expect(sale.entry.amount).toBe(150);
    const { partyBalance } = await import('../lib/balance');
    expect(partyBalance((await partiesRepo.get(ali.id))!, await entriesRepo.listForParty(ali.id))).toBe(150);
  });
});

describe('free goods bought from a supplier', () => {
  it('add stock at no money, keep the cost price, and lower the average cost', async () => {
    const { karim, biscuit, line } = await setup(); // 100 bought at Rs 10 (Rs 1,000)
    const buy = await tradeRepo.purchase({ supplier_id: karim.id, lines: [line(100, 20), line(10, 0)] }); // 100 at Rs 20 and 10 free
    expect(buy.entry.amount).toBe(2000); // the free ones cost nothing
    expect(await stockOf(biscuit.id)).toBe(210);
    expect((await productsRepo.get(biscuit.id))!.cost_price).toBe(20); // the free line is not a price, the paid one is
    // average cost = (1,000 + 2,000) / 210 pieces; selling 21 pieces costs Rs 300
    await tradeRepo.sale({ lines: [line(21, 30)] });
    const r = await today();
    expect(r.cogs).toBe(300);
    expect(r.itemisedSales).toBe(630);
  });

  it('a purchase of only free goods is refused (there is nothing to record)', async () => {
    const { karim, line } = await setup();
    await expect(tradeRepo.purchase({ supplier_id: karim.id, lines: [line(10, 0)] })).rejects.toThrow();
  });
});

describe('supplier rates', () => {
  it('lists each supplier newest rate with the cheapest marked, and the last rate for a hint', async () => {
    const { karim, zahid, biscuit, line } = await setup(); // karim 100 at Rs 10
    await tradeRepo.purchase({ supplier_id: zahid.id, lines: [line(50, 9)] });
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [line(50, 12)] });
    const rates = await moversRepo.supplierRates(biscuit.id);
    expect(rates.map((r) => [r.name, r.rate, r.cheapest])).toEqual([['Zahid Wholesale', 9, true], ['Karim Traders', 12, false]]);
    expect(await moversRepo.lastRate(biscuit.id, karim.id)).toEqual({ rate: 12, supplier: 'Karim Traders' });
    expect(await moversRepo.lastRate('nope', null)).toBeNull();
  });

  it('a cancelled purchase is no longer a rate', async () => {
    const { zahid, biscuit, line } = await setup();
    const buy = await tradeRepo.purchase({ supplier_id: zahid.id, lines: [line(50, 9)] });
    await entriesRepo.cancel(buy.entry.id, 'wrong_entry');
    expect((await moversRepo.supplierRates(biscuit.id)).map((r) => r.name)).toEqual(['Karim Traders']);
  });
});

describe('the WhatsApp bill of a sale', () => {
  it('has the items, the free piece, the discount, the total and the customer balance, and goes to the customer number', async () => {
    const { ali, line } = await setup();
    const sale = await tradeRepo.sale({ party_id: ali.id, lines: [line(10, 20), line(1, 0)], discount: 20 });
    const link = (await receiptLink(sale.entry.id, 'ro'))!;
    expect(link).toContain('wa.me/923001234567');
    const text = decodeURIComponent(link.split('?text=')[1]);
    expect(text).toContain('Ahmed General Store');
    expect(text).toContain('Rs 200');
    expect(text).toContain('Discount: Rs 20');
    expect(text).toContain('Kul: Rs 180');
    expect(text).toContain('muft');
    expect(text).toContain('180'); // the balance line
  });

  it('a plain typed sale or a kharcha has no bill', async () => {
    const plain = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 100 });
    expect(await receiptLink(plain.id, 'ro')).toBeNull();
  });
});
