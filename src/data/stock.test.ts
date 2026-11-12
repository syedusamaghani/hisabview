import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { auditRepo } from './auditRepo';
import { balancesByParty } from '../lib/balance';
import { toBase } from '../lib/stock';
import { setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { shopsRepo } from './shopsRepo';
import { statsRepo } from './statsRepo';
import { tradeRepo } from './tradeRepo';

const USER = '00000000-0000-4000-8000-00000000000b';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
});

async function startShop() {
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali' });
  // 1 carton = 12 packets = 144 pieces. Costs Rs 10 a piece, sells at Rs 12.
  const biscuit = await productsRepo.create({
    name: 'Biscuit',
    category: 'Snacks',
    base_unit: 'piece',
    units: [{ name: 'packet', factor: 12 }, { name: 'carton', factor: 144 }],
    price_unit: 'piece',
    cost_price: 10,
    sell_price: 12,
    min_stock: 20,
  });
  return { karim, ali, biscuit };
}

const stockOf = async (id: string) => (await productsRepo.listStock()).find((r) => r.product.id === id)!;
const supplierBalance = async (id: string) => (await statsRepo.all())[id].balance;
const carton = (n: number) => toBase(String(n), 144)!;

describe('the Phase 3 test: buy 2 cartons, sell 30 pieces', () => {
  it('gives the right stock, value, supplier balance and history', async () => {
    const { karim, biscuit } = await startShop();
    // Buy 2 cartons at Rs 1,440 a carton, pay Rs 1,000 now, the rest on credit
    const bought = await tradeRepo.purchase({ supplier_id: karim.id, invoice_no: 'A-17', paid: 1000, method: 'jazzcash', lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: carton(2), unit_price: 1440 }] });
    expect(bought.total).toBe(2880);
    expect(bought.entry).toMatchObject({ kind: 'purchase', amount: 2880, invoice_no: 'A-17', party_id: karim.id });
    expect(bought.payment).toMatchObject({ kind: 'diye', amount: 1000, ref_id: bought.entry.id, method: 'jazzcash' });
    expect(await supplierBalance(karim.id)).toBe(-1880); // I still owe Rs 1,880
    expect((await stockOf(biscuit.id)).stock).toBe(288);

    // Sell 30 pieces for cash at Rs 12
    const sold = await tradeRepo.sale({ lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 30, unit_price: 12 }] });
    expect(sold.entry).toMatchObject({ kind: 'cash_sale', amount: 360, party_id: null });
    const row = await stockOf(biscuit.id);
    expect(row.stock).toBe(258);
    expect(row.value).toBe(2580); // 258 pieces at cost Rs 10
    expect(row.low).toBe(false);

    // Every movement is in the product history
    const history = await productsRepo.movesFor(biscuit.id);
    expect(history.map((m) => [m.kind, m.qty_base, m.unit, m.line_total])).toEqual([['sale', -30, 'piece', 360], ['purchase', 288, 'carton', 2880]]);
    expect(await productsRepo.verify()).toEqual([]);
  });

  it('the newest purchase price becomes the cost price, and the change is in the diary', async () => {
    const { karim, biscuit } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1584 }] });
    expect((await productsRepo.get(biscuit.id))?.cost_price).toBe(11);
    const log = (await db.audit_log.where('entity_id').equals(biscuit.id).toArray()).filter((a) => a.action === 'edit');
    expect(log).toHaveLength(1);
    expect(log[0].reason).toBe('purchase price');
  });
});

describe('cancelling puts stock and balances back', () => {
  it('cancelling a sale returns its stock with a reversal movement (nothing is deleted)', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    const sold = await tradeRepo.sale({ lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 30, unit_price: 12 }] });
    await entriesRepo.cancel(sold.entry.id, 'wrong_entry');
    expect((await stockOf(biscuit.id)).stock).toBe(144);
    const moves = await productsRepo.movesFor(biscuit.id);
    expect(moves).toHaveLength(3);
    expect(moves.find((m) => m.kind === 'reversal')).toMatchObject({ qty_base: 30, reverses: sold.moves[0].id });
    expect((await db.entries.get(sold.entry.id))?.status).toBe('cancelled');
    expect(await productsRepo.verify()).toEqual([]);
  });

  it('cancelling a purchase also cancels its payment, and the supplier balance is clean again', async () => {
    const { biscuit, karim } = await startShop();
    const bought = await tradeRepo.purchase({ supplier_id: karim.id, paid: 500, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    expect(await supplierBalance(karim.id)).toBe(-940);
    await entriesRepo.cancel(bought.entry.id, 'wrong_entry');
    expect(await supplierBalance(karim.id)).toBe(0);
    expect((await db.entries.get(bought.payment!.id))?.status).toBe('cancelled');
    expect((await stockOf(biscuit.id)).stock).toBe(0);
    await expect(entriesRepo.cancel(bought.entry.id)).rejects.toThrow(); // already cancelled: stock is not put back twice
    expect((await stockOf(biscuit.id)).stock).toBe(0);
  });
});

describe('purchase returns', () => {
  it('sends goods back: stock goes down and what I owe goes down', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 288, unit_price: 1440 }] });
    expect(await supplierBalance(karim.id)).toBe(-2880);
    await tradeRepo.purchaseReturn({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    expect(await supplierBalance(karim.id)).toBe(-1440);
    expect((await stockOf(biscuit.id)).stock).toBe(144);
  });

  it('cash handed back by the supplier leaves what I owe as it was', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 288, unit_price: 1440 }] });
    const back = await tradeRepo.purchaseReturn({ supplier_id: karim.id, refund: 1440, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    expect(back.payment).toMatchObject({ kind: 'mile', amount: 1440 });
    expect(await supplierBalance(karim.id)).toBe(-2880);
  });
});

describe('selling on udhaar and the balances of everyone', () => {
  it('a credit sale is a Diye to the customer and takes stock down', async () => {
    const { biscuit, ali, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    const sold = await tradeRepo.sale({ party_id: ali.id, lines: [{ product_id: biscuit.id, unit: 'dozen', qty_base: 24, unit_price: 140 }] });
    expect(sold.entry).toMatchObject({ kind: 'diye', amount: 280, party_id: ali.id });
    expect((await statsRepo.all())[ali.id].balance).toBe(280);
    expect((await stockOf(biscuit.id)).stock).toBe(120);
    const balances = balancesByParty(await partiesRepo.listAll(), await db.entries.toArray());
    expect(balances[ali.id]).toBe(280);
    expect(await statsRepo.verify()).toEqual([]);
  });
});

describe('stock adjustment, damaged and lost', () => {
  it('records the reason and the value lost', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    const damaged = await productsRepo.adjust(biscuit.id, 'damaged', 6, 'packet phat gaya');
    expect(damaged).toMatchObject({ kind: 'damaged', qty_base: -6, line_total: 60, reason: 'packet phat gaya' });
    await productsRepo.adjust(biscuit.id, 'adjust', -4, 'gina kam nikla');
    await productsRepo.adjust(biscuit.id, 'adjust', 2, 'gina zyada nikla');
    expect((await stockOf(biscuit.id)).stock).toBe(136);
    await expect(productsRepo.adjust(biscuit.id, 'lost', 1, '  ')).rejects.toThrow(); // a reason is needed
    await expect(productsRepo.adjust(biscuit.id, 'adjust', 0, 'x')).rejects.toThrow();
  });

  it('flags low stock', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 25, unit_price: 10 }] });
    expect((await stockOf(biscuit.id)).low).toBe(false);
    await tradeRepo.sale({ lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 6, unit_price: 12 }] });
    expect((await stockOf(biscuit.id)).low).toBe(true); // 19, alert at 20
  });
});

describe('rules: bad input saves nothing', () => {
  it('rolls everything back when one line is wrong', async () => {
    const { biscuit, karim } = await startShop();
    const entries = await db.entries.count();
    await expect(
      tradeRepo.purchase({
        supplier_id: karim.id,
        lines: [
          { product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 },
          { product_id: biscuit.id, unit: 'kg', qty_base: 5, unit_price: 10 }, // a piece product has no kg
        ],
      }),
    ).rejects.toThrow();
    expect(await db.entries.count()).toBe(entries);
    expect(await db.stock_moves.count()).toBe(0);
    expect((await stockOf(biscuit.id)).stock).toBe(0);
  });

  it('checks supplier, quantity, price and payment', async () => {
    const { biscuit, karim, ali } = await startShop();
    const line = { product_id: biscuit.id, unit: 'piece', qty_base: 10, unit_price: 10 };
    await expect(tradeRepo.purchase({ supplier_id: ali.id, lines: [line] })).rejects.toThrow(/supplier/i);
    await expect(tradeRepo.purchase({ supplier_id: karim.id, lines: [] })).rejects.toThrow();
    await expect(tradeRepo.purchase({ supplier_id: karim.id, lines: [{ ...line, qty_base: 0 }] })).rejects.toThrow();
    await expect(tradeRepo.purchase({ supplier_id: karim.id, lines: [{ ...line, unit_price: -1 }] })).rejects.toThrow();
    await expect(tradeRepo.purchase({ supplier_id: karim.id, paid: 101, lines: [line] })).rejects.toThrow(/paid/i);
    await expect(tradeRepo.sale({ lines: [{ ...line, unit_price: 0 }] })).rejects.toThrow(/total/i);
    expect(await db.stock_moves.count()).toBe(0);
  });

  it('warns about stock that is not there and about a bill used twice', async () => {
    const { biscuit, karim } = await startShop();
    expect(await tradeRepo.shortages([{ product_id: biscuit.id, unit: 'piece', qty_base: 1, unit_price: 12 }])).toEqual([biscuit.id]);
    await tradeRepo.purchase({ supplier_id: karim.id, invoice_no: 'B-9', lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 5, unit_price: 10 }] });
    expect(await tradeRepo.shortages([{ product_id: biscuit.id, unit: 'piece', qty_base: 5, unit_price: 12 }])).toEqual([]);
    expect(await tradeRepo.findInvoice(karim.id, 'B-9')).toBeDefined();
    expect(await tradeRepo.findInvoice(karim.id, 'B-10')).toBeUndefined();
  });
});

describe('products', () => {
  it('creates with opening stock, edits with a diary line, hides instead of deleting', async () => {
    await startShop();
    const rice = await productsRepo.create({ name: ' Chawal ', base_unit: 'gram', price_unit: 'kg', cost_price: 180, sell_price: 220, opening_qty_base: toBase('25', 1000)! });
    expect(rice.name).toBe('Chawal');
    const row = await stockOf(rice.id);
    expect(row.stock).toBe(25_000);
    expect(row.value).toBe(4500); // 25 kg at Rs 180
    const moved = await productsRepo.update(rice.id, { sell_price: 230 });
    expect(moved.sell_price).toBe(230);
    expect((await auditRepo.listFor(rice.id)).map((a) => a.action)).toEqual(['create', 'edit']);
    await productsRepo.archive(rice.id);
    expect((await productsRepo.listStock()).some((r) => r.product.id === rice.id)).toBe(false);
    expect(await db.products.get(rice.id)).toBeDefined(); // still there
    await expect(tradeRepo.sale({ lines: [{ product_id: rice.id, unit: 'kg', qty_base: 1000, unit_price: 230 }] })).rejects.toThrow(); // hidden products cannot be sold
  });

  it('refuses a wrong unit change after stock exists, and bad fields', async () => {
    const { biscuit } = await startShop();
    const p = await productsRepo.create({ name: 'Oil', base_unit: 'ml', cost_price: 0, sell_price: 0, opening_qty_base: 1000 });
    await expect(productsRepo.update(p.id, { base_unit: 'gram' })).rejects.toThrow();
    await expect(productsRepo.create({ name: '', base_unit: 'piece' })).rejects.toThrow();
    await expect(productsRepo.create({ name: 'x', base_unit: 'piece', cost_price: -1 })).rejects.toThrow();
    await expect(productsRepo.create({ name: 'x', base_unit: 'piece', units: [{ name: 'dozen', factor: 12 }] })).rejects.toThrow(); // built in already
    await expect(productsRepo.create({ name: 'x', base_unit: 'piece', units: [{ name: 'box', factor: 1 }] })).rejects.toThrow();
    await expect(productsRepo.create({ name: 'x', base_unit: 'piece', price_unit: 'carton' })).rejects.toThrow();
    await expect(productsRepo.create({ name: 'x', base_unit: 'piece', image: 'http://evil' })).rejects.toThrow();
    expect(await productsRepo.findByBarcode('')).toBeUndefined();
    await productsRepo.update(biscuit.id, { barcode: '8964000' });
    expect((await productsRepo.findByBarcode('8964000'))?.id).toBe(biscuit.id);
    expect(await productsRepo.findByBarcode('8964000', biscuit.id)).toBeUndefined();
  });

  it('can rebuild stock from the movements', async () => {
    const { biscuit, karim } = await startShop();
    await tradeRepo.purchase({ supplier_id: karim.id, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: 144, unit_price: 1440 }] });
    await db.product_stats.put({ product_id: biscuit.id, shop_id: biscuit.shop_id, stock: 999, last_at: null });
    expect(await productsRepo.verify()).toEqual([biscuit.id]);
    await productsRepo.rebuildStats();
    expect(await productsRepo.verify()).toEqual([]);
    expect((await stockOf(biscuit.id)).stock).toBe(144);
  });
});
