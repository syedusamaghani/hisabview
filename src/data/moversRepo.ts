// Reads for the fast/slow screen and the supplier rates on a product page. Nothing is changed here.
import { movement } from '../lib/movers';
import { purchaseBuys, supplierRates, type SupplierRate } from '../lib/pricing';
import { requireShop } from './context';
import { db } from './db';
import { productsRepo } from './productsRepo';

export const moversRepo = {
  async load(now = Date.now()) {
    const shop = requireShop();
    const [moves, rows] = await Promise.all([db.stock_moves.where('shop_id').equals(shop).toArray(), productsRepo.listStock()]);
    const stock: Record<string, number> = {};
    for (const r of rows) stock[r.product.id] = r.stock;
    return movement(moves, rows.map((r) => r.product), stock, now);
  },

  // What each supplier last charged for this product (per its price unit), cheapest marked, with the supplier's name
  async supplierRates(productId: string): Promise<(SupplierRate & { name: string | null })[]> {
    const shop = requireShop();
    const [moves, products, parties] = await Promise.all([
      db.stock_moves.where('product_id').equals(productId).filter((m) => m.shop_id === shop).toArray(),
      db.products.where('shop_id').equals(shop).toArray(),
      db.parties.where('shop_id').equals(shop).toArray(),
    ]);
    // a reversal of one of these purchases carries the same product, so the undone ones drop out
    const names = new Map(parties.map((p) => [p.id, p.name]));
    const buys = purchaseBuys(moves, new Map(products.map((p) => [p.id, p])));
    return supplierRates(buys, productId).map((r) => ({ ...r, name: r.supplier_id ? (names.get(r.supplier_id) ?? null) : null }));
  },

  // The newest buying rate of a product (any supplier, or just this one), for the hint while writing a purchase
  async lastRate(productId: string, supplierId: string | null): Promise<{ rate: number; supplier: string | null } | null> {
    const rates = await this.supplierRates(productId);
    const pick = (supplierId ? rates.find((r) => r.supplier_id === supplierId) : undefined) ?? [...rates].sort((a, b) => b.at.localeCompare(a.at))[0];
    return pick ? { rate: pick.rate, supplier: pick.name } : null;
  },
};
