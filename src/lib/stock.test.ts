import { describe, expect, it } from 'vitest';
import { allUnits, breakdown, defaultPriceUnit, isLowStock, lineTotal, priceInUnit, signOk, stockByProduct, toBase, unitFactor, valuation } from './stock';

const biscuit = { base_unit: 'piece' as const, units: [{ name: 'packet', factor: 12 }, { name: 'carton', factor: 144 }] };
const rice = { base_unit: 'gram' as const, units: [{ name: 'bori', factor: 50_000 }] };

describe('units', () => {
  it('lists built-in and packing units, smallest first', () => {
    expect(allUnits(biscuit).map((u) => u.name)).toEqual(['piece', 'dozen', 'packet', 'carton']);
    expect(allUnits(rice).map((u) => u.name)).toEqual(['gram', 'kg', 'bori']);
  });
  it('finds a factor, or null', () => {
    expect(unitFactor(biscuit, 'carton')).toBe(144);
    expect(unitFactor(biscuit, 'kg')).toBeNull();
    expect(defaultPriceUnit('gram')).toBe('kg');
  });
});

describe('toBase: typed quantity to whole base units, exactly', () => {
  it('converts cartons, dozens and kilos', () => {
    expect(toBase('2', 144)).toBe(288);
    expect(toBase('2.5', 1000)).toBe(2500);
    expect(toBase('0,25', 12)).toBe(3);
    expect(toBase('0.1', 1000)).toBe(100); // no floating point drift
    expect(toBase('1.005', 1000)).toBe(1005);
  });
  it('refuses what cannot be exact or sensible', () => {
    expect(toBase('0.5', 1)).toBeNull(); // half a piece
    expect(toBase('0', 1)).toBeNull();
    expect(toBase('-3', 1)).toBeNull();
    expect(toBase('abc', 1)).toBeNull();
    expect(toBase('', 1)).toBeNull();
    expect(toBase('1.2345', 1000)).toBeNull();
    expect(toBase('999999999', 1000)).toBeNull(); // too big
  });
});

describe('money', () => {
  it('works out a line once and rounds half up', () => {
    expect(lineTotal(30, 12, 1)).toBe(360);
    expect(lineTotal(288, 1440, 144)).toBe(2880);
    expect(lineTotal(2500, 200, 1000)).toBe(500); // 2.5 kg at Rs 200/kg
    expect(lineTotal(1, 5, 2)).toBe(3); // 2.5 -> 3
  });
  it('values stock at cost, never below zero', () => {
    expect(valuation(258, 10, 1)).toBe(2580);
    expect(valuation(-5, 10, 1)).toBe(0);
    expect(valuation(2500, 180, 1000)).toBe(450);
  });
  it('converts a price between units', () => {
    expect(priceInUnit(1440, 144, 1)).toBe(10);
    expect(priceInUnit(10, 1, 1000)).toBe(10_000);
  });
});

describe('reading stock', () => {
  it('writes the biggest units first', () => {
    expect(breakdown(318, biscuit)).toEqual([{ count: 2, unit: 'carton' }, { count: 2, unit: 'packet' }, { count: 6, unit: 'piece' }]);
    expect(breakdown(2500, rice)).toEqual([{ count: 2, unit: 'kg' }, { count: 500, unit: 'gram' }]);
    expect(breakdown(258, { base_unit: 'piece', units: [{ name: 'carton', factor: 144 }] })).toEqual([{ count: 1, unit: 'carton' }, { count: 114, unit: 'piece' }]);
    expect(breakdown(30, { base_unit: 'piece', units: [] })).toEqual([{ count: 2, unit: 'dozen' }, { count: 6, unit: 'piece' }]);
    expect(breakdown(0, biscuit)).toEqual([{ count: 0, unit: 'piece' }]);
    expect(breakdown(-12, biscuit)).toEqual([{ count: 1, unit: 'packet' }]);
  });
  it('flags low stock only when an alert is set', () => {
    expect(isLowStock(5, 10)).toBe(true);
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
    expect(isLowStock(0, 0)).toBe(false);
  });
});

describe('movements', () => {
  it('checks the direction of each kind', () => {
    expect(signOk('purchase', 5)).toBe(true);
    expect(signOk('purchase', -5)).toBe(false);
    expect(signOk('sale', -1)).toBe(true);
    expect(signOk('sale', 1)).toBe(false);
    expect(signOk('adjust', -3)).toBe(true);
    expect(signOk('reversal', 3)).toBe(true);
    expect(signOk('adjust', 0)).toBe(false);
    expect(signOk('adjust', 1.5)).toBe(false);
  });
  it('adds movements up per product', () => {
    expect(stockByProduct([{ product_id: 'a', qty_base: 10 }, { product_id: 'a', qty_base: -3 }, { product_id: 'b', qty_base: 4 }])).toEqual({ a: 7, b: 4 });
  });
});
