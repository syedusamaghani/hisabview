// Products and the stock movements. Stock is never an editable number: it is the sum of the add-only
// movements (stock_moves). product_stats keeps that sum per product so the Saman list opens fast; it is
// updated in the SAME transaction as every movement and can always be rebuilt (rebuildStats).
import { MAX_IMAGE_CHARS } from '../lib/image';
import { allUnits, defaultPriceUnit, isLowStock, lineTotal, MAX_FACTOR, MAX_QTY_BASE, MAX_UNIT_PRICE, signOk, unitFactor, valuation } from '../lib/stock';
import { snapshot, write } from './auditRepo';
import { requireShop, requireUser } from './context';
import { shopMoves } from './moves';
import { db } from './db';
import { newId, nowIso } from './ids';
import type { BaseUnit, Product, ProductStat, ProductUnit, StockMove, StockMoveKind } from './types';

const BASES: BaseUnit[] = ['piece', 'gram', 'ml'];

export type ProductFields = {
  name: string;
  category?: string | null;
  barcode?: string | null;
  sku?: string | null;
  base_unit: BaseUnit;
  units?: ProductUnit[];
  price_unit?: string;
  cost_price?: number;
  sell_price?: number;
  min_stock?: number;
  image?: string | null;
};

const text = (v: string | null | undefined, max: number, label: string): string | null => {
  const t = v?.trim() ?? '';
  if (t.length > max) throw new Error(`${label} is too long`);
  return t || null;
};
const whole = (v: number, max: number, label: string) => {
  if (!Number.isInteger(v) || v < 0 || v > max) throw new Error(`${label} is not valid`);
  return v;
};

// Checks and tidies the fields of a product; returns the row (without id, dates and sync flag)
function clean(input: ProductFields): Omit<Product, 'id' | 'shop_id' | 'created_at' | 'pending_sync' | 'archived'> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 120) throw new Error('Name must be 1 to 120 letters');
  if (!BASES.includes(input.base_unit)) throw new Error('Unit is not valid');
  const units = (input.units ?? []).map((u) => ({ name: u.name.trim().toLowerCase(), factor: u.factor }));
  const builtIn = new Set(allUnits({ base_unit: input.base_unit, units: [] }).map((u) => u.name));
  const seen = new Set<string>();
  for (const u of units) {
    if (u.name.length < 1 || u.name.length > 20 || builtIn.has(u.name) || seen.has(u.name)) throw new Error('Packing name is not valid');
    if (!Number.isInteger(u.factor) || u.factor < 2 || u.factor > MAX_FACTOR) throw new Error('Packing count is not valid');
    seen.add(u.name);
  }
  const priceUnit = input.price_unit ?? defaultPriceUnit(input.base_unit);
  if (unitFactor({ base_unit: input.base_unit, units }, priceUnit) === null) throw new Error('Price unit is not valid');
  const image = input.image ?? null;
  if (image !== null && (image.length > MAX_IMAGE_CHARS || !image.startsWith('data:image/'))) throw new Error('Picture is not valid');
  return {
    name,
    category: text(input.category, 40, 'Category'),
    barcode: text(input.barcode, 64, 'Barcode'),
    sku: text(input.sku, 64, 'SKU'),
    base_unit: input.base_unit,
    units,
    price_unit: priceUnit,
    cost_price: whole(input.cost_price ?? 0, MAX_UNIT_PRICE, 'Cost price'),
    sell_price: whole(input.sell_price ?? 0, MAX_UNIT_PRICE, 'Selling price'),
    min_stock: whole(input.min_stock ?? 0, MAX_QTY_BASE, 'Minimum stock'),
    image,
  };
}

// ---- the stock summary (call inside a transaction that includes product_stats)

export async function bumpStat(productId: string, shopId: string, delta: number, at: string): Promise<void> {
  const stat = await db.product_stats.get(productId);
  await db.product_stats.put({ product_id: productId, shop_id: shopId, stock: (stat?.stock ?? 0) + delta, last_at: stat?.last_at && stat.last_at > at ? stat.last_at : at });
}

export type MoveInput = {
  product: Product;
  kind: StockMoveKind;
  qty_base: number;
  unit?: string;
  unit_price?: number | null;
  line_total?: number;
  entry_id?: string | null;
  party_id?: string | null;
  reason?: string | null;
  reverses?: string | null;
};

// Adds one movement and updates the stock summary. Call inside a transaction with stock_moves and product_stats.
export async function addMove(input: MoveInput): Promise<StockMove> {
  const { product, kind, qty_base } = input;
  if (!signOk(kind, qty_base)) throw new Error('Quantity is not valid');
  if (Math.abs(qty_base) > MAX_QTY_BASE) throw new Error('Quantity is too big');
  const unit = input.unit ?? product.base_unit;
  const factor = unitFactor(product, unit);
  if (factor === null) throw new Error('Unit is not valid');
  const unitPrice = input.unit_price ?? null;
  if (unitPrice !== null) whole(unitPrice, MAX_UNIT_PRICE, 'Price');
  const move: StockMove = {
    id: newId(),
    shop_id: product.shop_id,
    product_id: product.id,
    entry_id: input.entry_id ?? null,
    party_id: input.party_id ?? null,
    kind,
    qty_base,
    unit,
    unit_factor: factor,
    unit_price: unitPrice,
    line_total: input.line_total ?? (unitPrice === null ? 0 : lineTotal(qty_base, unitPrice, factor)),
    reason: text(input.reason, 200, 'Reason'),
    reverses: input.reverses ?? null,
    created_by: requireUser(),
    created_at: nowIso(),
    pending_sync: 1,
  };
  await db.stock_moves.add(move);
  await bumpStat(product.id, product.shop_id, qty_base, move.created_at);
  return move;
}

// An entry (sale, purchase, ...) was cancelled: put its stock back with 'reversal' movements. A movement is undone once only.
// Call inside a transaction with products, stock_moves and product_stats.
export async function reverseMovesOf(entryId: string): Promise<StockMove[]> {
  const moves = await db.stock_moves.where('entry_id').equals(entryId).toArray();
  const undone = new Set(moves.map((m) => m.reverses).filter((v): v is string => v !== null));
  const made: StockMove[] = [];
  for (const m of moves) {
    if (m.kind === 'reversal' || undone.has(m.id)) continue;
    const product = await db.products.get(m.product_id);
    if (!product) continue;
    made.push(await addMove({ product, kind: 'reversal', qty_base: -m.qty_base, unit: m.unit, unit_price: m.unit_price, line_total: m.line_total, entry_id: entryId, party_id: m.party_id, reason: 'cancel', reverses: m.id }));
  }
  return made;
}

export type StockRow = { product: Product; stock: number; low: boolean; value: number };

export const productsRepo = {
  async create(input: ProductFields & { opening_qty_base?: number }): Promise<Product> {
    const fields = clean(input);
    const product: Product = { ...fields, id: newId(), shop_id: requireShop(), archived: false, created_at: nowIso(), pending_sync: 1 };
    const opening = input.opening_qty_base ?? 0;
    if (!Number.isInteger(opening) || opening < 0 || opening > MAX_QTY_BASE) throw new Error('Opening stock is not valid');
    await db.transaction('rw', db.products, db.stock_moves, db.product_stats, db.audit_log, async () => {
      await db.products.add(product);
      await db.product_stats.put({ product_id: product.id, shop_id: product.shop_id, stock: 0, last_at: null });
      await write('product', product.id, 'create', null, snapshot(product));
      if (opening > 0) {
        const factor = unitFactor(product, product.price_unit) ?? 1;
        await addMove({ product, kind: 'opening', qty_base: opening, unit: product.price_unit, unit_price: product.cost_price, line_total: lineTotal(opening, product.cost_price, factor), reason: 'opening stock' });
      }
    });
    return product;
  },

  // Change a product (also used to hide it). Every change is written to the audit diary with before and after.
  async update(id: string, changes: Partial<ProductFields> & { archived?: boolean }): Promise<Product> {
    return db.transaction('rw', db.products, db.stock_moves, db.audit_log, async () => {
      const before = await db.products.get(id);
      if (!before || before.shop_id !== requireShop()) throw new Error('Product not found');
      const merged = { ...before, ...changes };
      if (changes.base_unit && changes.base_unit !== before.base_unit && (await db.stock_moves.where('product_id').equals(id).count()) > 0) {
        throw new Error('The unit cannot change after stock was recorded');
      }
      const after: Product = { ...before, ...clean(merged), archived: changes.archived ?? before.archived, pending_sync: 1 };
      await db.products.put(after);
      await write('product', id, 'edit', snapshot(before), snapshot(after));
      return after;
    });
  },

  archive(id: string) {
    return this.update(id, { archived: true });
  },
  restore(id: string) {
    return this.update(id, { archived: false });
  },

  async get(id: string): Promise<Product | undefined> {
    const p = await db.products.get(id);
    return p && p.shop_id === requireShop() ? p : undefined;
  },

  // Every product that is not hidden, A to Z, with its stock, a low-stock flag and its value at cost
  async listStock(includeArchived = false): Promise<StockRow[]> {
    const shop = requireShop();
    const [products, stats] = await Promise.all([db.products.where('shop_id').equals(shop).toArray(), db.product_stats.where('shop_id').equals(shop).toArray()]);
    const stock = new Map(stats.map((s) => [s.product_id, s.stock]));
    return products
      .filter((p) => includeArchived || !p.archived)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => {
        const s = stock.get(product.id) ?? 0;
        return { product, stock: s, low: isLowStock(s, product.min_stock), value: valuation(s, product.cost_price, unitFactor(product, product.price_unit) ?? 1) };
      });
  },

  // Is another product already using this barcode? (a warning in the form, not a block)
  async findByBarcode(barcode: string, exceptId?: string): Promise<Product | undefined> {
    const code = barcode.trim();
    if (!code) return undefined;
    const all = await db.products.where('shop_id').equals(requireShop()).toArray();
    return all.find((p) => p.barcode === code && p.id !== exceptId && !p.archived);
  },

  // The movements of one product, newest first: the product's history (purchases, sales, losses, corrections)
  async movesFor(productId: string): Promise<StockMove[]> {
    const rows = await db.stock_moves.where('product_id').equals(productId).toArray();
    return rows.filter((m) => m.shop_id === requireShop()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // Stock theek karo: counted stock was different, or something was damaged or lost. Always has a reason.
  // 'adjust' takes a signed quantity; damaged and lost take what was lost (a positive number). Valued at cost.
  async adjust(productId: string, kind: 'adjust' | 'damaged' | 'lost', qty: number, reason: string): Promise<StockMove> {
    if (!Number.isInteger(qty) || qty === 0) throw new Error('Quantity is not valid');
    if (!reason.trim()) throw new Error('A reason is needed');
    return db.transaction('rw', db.products, db.stock_moves, db.product_stats, async () => {
      const product = await db.products.get(productId);
      if (!product || product.shop_id !== requireShop()) throw new Error('Product not found');
      const signed = kind === 'adjust' ? qty : -Math.abs(qty);
      const factor = unitFactor(product, product.price_unit) ?? 1;
      return addMove({ product, kind, qty_base: signed, unit: product.price_unit, unit_price: product.cost_price, line_total: lineTotal(signed, product.cost_price, factor), reason });
    });
  },

  // Work every product's stock out again from the movements (the movements are the truth)
  async rebuildStats(shopId = requireShop()): Promise<void> {
    await db.transaction('rw', db.products, db.stock_moves, db.product_stats, async () => {
      const [products, moves] = await Promise.all([db.products.where('shop_id').equals(shopId).toArray(), shopMoves(shopId)]);
      const stats = new Map<string, ProductStat>(products.map((p) => [p.id, { product_id: p.id, shop_id: shopId, stock: 0, last_at: null }]));
      for (const m of moves) {
        const s = stats.get(m.product_id);
        if (!s) continue;
        s.stock += m.qty_base;
        if (!s.last_at || m.created_at > s.last_at) s.last_at = m.created_at;
      }
      await db.product_stats.where('shop_id').equals(shopId).delete();
      await db.product_stats.bulkPut([...stats.values()]);
    });
  },

  // Products whose stored stock differs from what the movements say (should always be empty)
  async verify(shopId = requireShop()): Promise<string[]> {
    const [moves, stats] = await Promise.all([db.stock_moves.where('shop_id').equals(shopId).toArray(), db.product_stats.where('shop_id').equals(shopId).toArray()]);
    const truth = new Map<string, number>();
    for (const m of moves) truth.set(m.product_id, (truth.get(m.product_id) ?? 0) + m.qty_base);
    const stored = new Map(stats.map((s) => [s.product_id, s.stock]));
    const ids = new Set([...truth.keys(), ...stored.keys()]);
    return [...ids].filter((id) => (truth.get(id) ?? 0) !== (stored.get(id) ?? 0));
  },
};
