// Stock arithmetic. Pure functions: same input, same answer, no database.
//
// Stock is always kept as a WHOLE number of the product's smallest unit (its "base unit"):
// pieces, grams or millilitres. Bigger units (dozen, packet, carton, kg, litre) are only a way
// to type and read amounts: each has a "factor" = how many base units it holds. Because every
// quantity is converted to a whole base number once, adding and removing stock is exact.
//   1 carton = 12 packets = 144 pieces  ->  carton factor 144, packet factor 12
// Prices are whole rupees PER UNIT (per carton, per kg, ...). A line total is worked out once:
//   total = round(base quantity x unit price / unit factor)

import type { BaseUnit, ProductUnit } from '../data/types';
export type { BaseUnit, ProductUnit };

export const BASE_UNITS: BaseUnit[] = ['piece', 'gram', 'ml'];

// Units every product of that base has, without being set up
const BUILT_IN: Record<BaseUnit, ProductUnit[]> = {
  piece: [{ name: 'piece', factor: 1 }, { name: 'dozen', factor: 12 }],
  gram: [{ name: 'gram', factor: 1 }, { name: 'kg', factor: 1000 }],
  ml: [{ name: 'ml', factor: 1 }, { name: 'litre', factor: 1000 }],
};

// Packing names a shopkeeper can add to a product ("1 carton = 144 piece")
export const PACK_NAMES = ['packet', 'box', 'carton', 'bori', 'tin', 'bottle'] as const;

// The limits keep every calculation below 2^53 (so no rounding surprises) and match the database
export const MAX_QTY_BASE = 100_000_000;
export const MAX_UNIT_PRICE = 10_000_000;
export const MAX_FACTOR = 1_000_000;

type UnitProduct = { base_unit: BaseUnit; units: ProductUnit[] };

// Every unit this product can be bought and sold in, smallest first
export function allUnits(p: UnitProduct): ProductUnit[] {
  const seen = new Set<string>();
  const out: ProductUnit[] = [];
  for (const u of [...BUILT_IN[p.base_unit], ...p.units]) {
    if (seen.has(u.name)) continue;
    seen.add(u.name);
    out.push(u);
  }
  return out.sort((a, b) => a.factor - b.factor);
}

export function unitFactor(p: UnitProduct, name: string): number | null {
  return allUnits(p).find((u) => u.name === name)?.factor ?? null;
}

// The unit a price is usually quoted in when a product is new: kg for grams, litre for ml, piece for pieces
export function defaultPriceUnit(base: BaseUnit): string {
  return base === 'gram' ? 'kg' : base === 'ml' ? 'litre' : 'piece';
}

// A typed quantity ("2", "2.5", "0.25") in a unit, turned into whole base units. Exact: works on the digits,
// never on floating point. Returns null when it is not a whole number of base units (half a piece), zero,
// negative, or too big.
export function toBase(text: string, factor: number): number | null {
  const m = /^(\d{1,9})(?:[.,](\d{1,3}))?$/.exec(text.trim());
  if (!m || !Number.isInteger(factor) || factor < 1) return null;
  const decimals = (m[2] ?? '').length;
  const scale = 10 ** decimals;
  const scaled = Number(m[1]) * scale + Number(m[2] ?? '0'); // quantity x 10^decimals, whole
  const times = scaled * factor;
  if (times % scale !== 0) return null;
  const base = times / scale;
  return base >= 1 && base <= MAX_QTY_BASE ? base : null;
}

// Rupees for a line: base quantity x price per unit / unit factor, rounded once (half up)
export function lineTotal(qtyBase: number, unitPrice: number, factor: number): number {
  const numerator = Math.abs(qtyBase) * unitPrice;
  return Math.floor((2 * numerator + factor) / (2 * factor));
}

// What a product's stock is worth at its cost price. A price per unit, so the same one rounding.
export function valuation(stockBase: number, costPrice: number, priceFactor: number): number {
  if (stockBase <= 0 || costPrice <= 0) return 0;
  return lineTotal(stockBase, costPrice, priceFactor);
}

// A price quoted per one unit, converted to the price per the product's price unit (rounded to whole rupees)
export function priceInUnit(unitPrice: number, fromFactor: number, toFactor: number): number {
  return Math.floor((2 * unitPrice * toFactor + fromFactor) / (2 * fromFactor));
}

// "2 carton 30 piece": the stock written with the biggest units first. Negative stock gets a minus sign.
export function breakdown(qtyBase: number, p: UnitProduct): { count: number; unit: string }[] {
  let left = Math.abs(qtyBase);
  const parts: { count: number; unit: string }[] = [];
  // The built-in dozen is left out when the shopkeeper added their own packings ("1 carton 9 packet" reads better than "1 carton 9 dozen")
  const custom = p.units.length > 0;
  const units = allUnits(p).reverse(); // biggest first
  for (const u of units) {
    if (u.factor === 1 || (custom && u.name === 'dozen' && !p.units.some((x) => x.name === 'dozen'))) continue;
    const count = Math.floor(left / u.factor);
    if (count > 0) {
      parts.push({ count, unit: u.name });
      left -= count * u.factor;
    }
  }
  if (left > 0 || parts.length === 0) parts.push({ count: left, unit: allUnits(p)[0].name });
  return parts;
}

export const isLowStock = (stockBase: number, minStock: number): boolean => minStock > 0 && stockBase <= minStock;

// Which way each kind of movement moves the stock: +1 adds, -1 removes, 0 either (adjust and reversal)
export const MOVE_SIGN = { opening: 1, purchase: 1, purchase_return: -1, sale: -1, damaged: -1, lost: -1, adjust: 0, reversal: 0 } as const;
export type MoveKind = keyof typeof MOVE_SIGN;

export function signOk(kind: MoveKind, qtyBase: number): boolean {
  if (!Number.isInteger(qtyBase) || qtyBase === 0) return false;
  const sign = MOVE_SIGN[kind];
  return sign === 0 || Math.sign(qtyBase) === sign;
}

// Stock of every product from its movements: { productId: base quantity }
export function stockByProduct(moves: readonly { product_id: string; qty_base: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of moves) out[m.product_id] = (out[m.product_id] ?? 0) + m.qty_base;
  return out;
}
