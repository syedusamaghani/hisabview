import { describe, expect, it } from 'vitest';
import { parseList, splitRows } from './bulkItems';

describe('bulk item list', () => {
  it('reads name and price from many styles of lines', () => {
    const rows = parseList(['Name, Price', '1. Biscuit 20', 'Sugar - 150', 'Soap, 80', 'Tea  Rs 1,250', 'Rice: 300/-', 'Dal ۲۰۰', 'Chips', '500', '   '].join('\n'));
    expect(rows).toEqual([
      { name: 'Biscuit', price: '20' },
      { name: 'Sugar', price: '150' },
      { name: 'Soap', price: '80' },
      { name: 'Tea', price: '1250' },
      { name: 'Rice', price: '300' },
      { name: 'Dal', price: '200' },
      { name: 'Chips', price: '' },
    ]);
  });
  it('keeps numbers that belong to the name and rounds decimals', () => {
    expect(parseList('Pepsi 1.5 litre 120.6')).toEqual([{ name: 'Pepsi 1.5 litre', price: '121' }]);
  });
  it('skips existing and repeated names, and empty rows', () => {
    const r = splitRows([{ name: 'Sugar', price: '1' }, { name: ' biscuit ', price: '2' }, { name: 'Biscuit', price: '3' }, { name: '', price: '' }], ['sugar']);
    expect(r.ok).toEqual([{ name: ' biscuit ', price: '2' }]);
    expect(r.dup).toHaveLength(2);
    expect(r.empty).toBe(1);
  });
});
