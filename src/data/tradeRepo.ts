// Sales, purchases and purchase returns with goods. Each one is ONE transaction: the money entry, the stock
// movements, the supplier's balance, the product's new cost price and the diary lines are saved together,
// or none of them is. (Dexie rolls the whole thing back if any step fails.)
//
//   sale      cash_sale (no person), or diye when the customer takes it on udhaar; stock goes down
//   purchase  'purchase' entry on the supplier's account (we owe more); stock goes up; the part paid now
//             is a separate 'diye' entry to the supplier, linked to the purchase (cancelled together)
//   return    'purchase_return' on the supplier's account (we owe less); stock goes down; money handed
//             back by the supplier is a separate 'mile' entry, linked to the return
import { allocateDiscount, lineTotal, priceInUnit, unitFactor } from '../lib/stock';
import { snapshot, write } from './auditRepo';
import { requireShop } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { addMove } from './productsRepo';
import { MAX_AMOUNT, type Entry, type PaymentMethod, type Product, type StockMove } from './types';

export type TradeLine = { product_id: string; unit: string; qty_base: number; unit_price: number };
type Priced = { product: Product; line: TradeLine; factor: number; total: number };

const TABLES = () => [db.entries, db.parties, db.audit_log, db.party_stats, db.products, db.stock_moves, db.product_stats];

// Look every line up, check it, and work out its rupees. Call inside the transaction.
async function price(lines: TradeLine[]): Promise<{ rows: Priced[]; total: number }> {
  if (lines.length === 0) throw new Error('Add at least one item');
  const rows: Priced[] = [];
  for (const line of lines) {
    const product = await db.products.get(line.product_id);
    if (!product || product.shop_id !== requireShop() || product.archived) throw new Error('Product not found');
    const factor = unitFactor(product, line.unit);
    if (factor === null) throw new Error('Unit is not valid');
    if (!Number.isInteger(line.qty_base) || line.qty_base < 1) throw new Error('Quantity is not valid');
    if (!Number.isInteger(line.unit_price) || line.unit_price < 0) throw new Error('Price is not valid');
    rows.push({ product, line, factor, total: lineTotal(line.qty_base, line.unit_price, factor) });
  }
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  if (total < 1 || total > MAX_AMOUNT) throw new Error('Total is not valid');
  return { rows, total };
}

async function supplierOf(id: string) {
  const party = await db.parties.get(id);
  if (!party || party.shop_id !== requireShop()) throw new Error('Supplier not found');
  if (party.type !== 'supplier') throw new Error('This person is not a supplier');
  return party;
}

export type TradeResult = { entry: Entry; payment: Entry | null; moves: StockMove[]; total: number };

export const tradeRepo = {
  // Products whose stock would go below zero if these lines were sold or returned (only a warning: shop stock is often behind)
  async shortages(lines: TradeLine[]): Promise<string[]> {
    const need = new Map<string, number>();
    for (const l of lines) need.set(l.product_id, (need.get(l.product_id) ?? 0) + l.qty_base);
    const out: string[] = [];
    for (const [id, qty] of need) if (((await db.product_stats.get(id))?.stock ?? 0) < qty) out.push(id);
    return out;
  },

  // A bill number already used for this supplier (a warning against writing the same bill twice)
  async findInvoice(supplierId: string, invoiceNo: string): Promise<Entry | undefined> {
    const no = invoiceNo.trim();
    if (!no) return undefined;
    return (await db.entries.where('party_id').equals(supplierId).toArray()).find((e) => e.kind === 'purchase' && e.status === 'active' && e.invoice_no === no);
  },

  // `discount` = rupees taken off the whole bill. The sale is written for the rupees really asked; the discount is shared over the
  // lines so every line total is what was really taken (the list price stays in unit_price, so the discount can always be worked out).
  // Free goods (a scheme like 10+1) are simply a line at Rs 0: they leave the stock and carry their cost, but bring no money.
  async sale(input: { lines: TradeLine[]; party_id?: string | null; method?: PaymentMethod | null; note?: string | null; discount?: number }): Promise<TradeResult> {
    return db.transaction('rw', TABLES(), async () => {
      const priced = await price(input.lines);
      const discount = input.discount ?? 0;
      if (!Number.isInteger(discount) || discount < 0 || discount >= priced.total) throw new Error('Discount is not valid');
      const cut = allocateDiscount(priced.rows.map((r) => r.total), discount);
      const rows = priced.rows.map((r, i) => ({ ...r, total: r.total - cut[i] }));
      const total = priced.total - discount;
      const entry = await entriesRepo.create({ kind: input.party_id ? 'diye' : 'cash_sale', party_id: input.party_id ?? null, amount: total, note: input.note, method: input.party_id ? null : input.method });
      const moves: StockMove[] = [];
      for (const r of rows) moves.push(await addMove({ product: r.product, kind: 'sale', qty_base: -r.line.qty_base, unit: r.line.unit, unit_price: r.line.unit_price, line_total: r.total, entry_id: entry.id, party_id: input.party_id ?? null }));
      return { entry, payment: null, moves, total };
    });
  },

  async purchase(input: { supplier_id: string; lines: TradeLine[]; invoice_no?: string | null; paid?: number; method?: PaymentMethod | null; note?: string | null }): Promise<TradeResult> {
    return db.transaction('rw', TABLES(), async () => {
      await supplierOf(input.supplier_id);
      const { rows, total } = await price(input.lines);
      const paid = input.paid ?? 0;
      if (!Number.isInteger(paid) || paid < 0 || paid > total) throw new Error('Paid amount is not valid');
      const entry = await entriesRepo.create({ kind: 'purchase', party_id: input.supplier_id, amount: total, invoice_no: input.invoice_no, note: input.note });
      const moves: StockMove[] = [];
      for (const r of rows) {
        moves.push(await addMove({ product: r.product, kind: 'purchase', qty_base: r.line.qty_base, unit: r.line.unit, unit_price: r.line.unit_price, line_total: r.total, entry_id: entry.id, party_id: input.supplier_id }));
        // The newest purchase price becomes the product's cost price (per its price unit). Written to the diary like any edit.
        const priceFactor = unitFactor(r.product, r.product.price_unit) ?? 1;
        const cost = priceInUnit(r.line.unit_price, r.factor, priceFactor);
        const fresh = (await db.products.get(r.product.id)) as Product;
        // Free bonus goods (Rs 0) lower the average cost in the profit rules but are not a new price: the cost price stays
        if (r.line.unit_price > 0 && cost !== fresh.cost_price) {
          const after: Product = { ...fresh, cost_price: cost, pending_sync: 1 };
          await db.products.put(after);
          await write('product', fresh.id, 'edit', snapshot(fresh), snapshot(after), requireShop(), 'purchase price');
        }
      }
      const payment = paid > 0 ? await entriesRepo.create({ kind: 'diye', party_id: input.supplier_id, amount: paid, method: input.method, ref_id: entry.id, note: input.invoice_no ? `Bill ${input.invoice_no.trim()}` : null }) : null;
      return { entry, payment, moves, total };
    });
  },

  async purchaseReturn(input: { supplier_id: string; lines: TradeLine[]; invoice_no?: string | null; refund?: number; method?: PaymentMethod | null; note?: string | null }): Promise<TradeResult> {
    return db.transaction('rw', TABLES(), async () => {
      await supplierOf(input.supplier_id);
      const { rows, total } = await price(input.lines);
      const refund = input.refund ?? 0;
      if (!Number.isInteger(refund) || refund < 0 || refund > total) throw new Error('Refund amount is not valid');
      const entry = await entriesRepo.create({ kind: 'purchase_return', party_id: input.supplier_id, amount: total, invoice_no: input.invoice_no, note: input.note });
      const moves: StockMove[] = [];
      for (const r of rows) moves.push(await addMove({ product: r.product, kind: 'purchase_return', qty_base: -r.line.qty_base, unit: r.line.unit, unit_price: r.line.unit_price, line_total: r.total, entry_id: entry.id, party_id: input.supplier_id }));
      const payment = refund > 0 ? await entriesRepo.create({ kind: 'mile', party_id: input.supplier_id, amount: refund, method: input.method, ref_id: entry.id, note: 'Return ka paisa' }) : null;
      return { entry, payment, moves, total };
    });
  },

  // The goods of one entry (what was in the sale or purchase), for showing it
  async movesOfEntry(entryId: string): Promise<StockMove[]> {
    return (await db.stock_moves.where('entry_id').equals(entryId).toArray()).filter((m) => m.kind !== 'reversal');
  },
};
