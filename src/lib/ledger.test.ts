import { describe, expect, it } from 'vitest';
import { partyBalance } from './balance';
import { creditLeft, overCreditLimit } from './credit';
import { cleanCategory, customCategories, totalsByCategory } from './expenses';
import { ledgerRows } from './ledger';

let n = 0;
const e = (kind: string, amount: number, created_at: string, status = 'active', category: string | null = null) => ({ id: `e${++n}`, party_id: 'p', kind, amount, status, created_at, category });

describe('ledger running balance', () => {
  const customer = { type: 'customer', opening_balance: 100 };
  const list = [
    e('diye', 500, '2026-11-02T10:00:00Z'),
    e('mile', 200, '2026-11-03T10:00:00Z'),
    e('diye', 999, '2026-11-03T11:00:00Z', 'cancelled'),
    e('mile', 700, '2026-11-04T10:00:00Z'),
  ];

  it('starts from the old balance and follows every entry; a cancelled entry changes nothing', () => {
    expect(ledgerRows(customer, list).map((r) => r.balance)).toEqual([600, 400, null, -300]);
  });

  it('the last balance is exactly the account balance (so the statement and the screen never disagree)', () => {
    const rows = ledgerRows(customer, list);
    expect(rows.filter((r) => r.balance !== null).at(-1)?.balance).toBe(partyBalance(customer, list));
  });

  it('works whatever order the entries come in', () => {
    const shuffled = [list[3], list[0], list[2], list[1]];
    expect(ledgerRows(customer, shuffled).map((r) => r.balance)).toEqual([600, 400, null, -300]);
  });

  it('a supplier: purchase raises what we owe, a payment lowers it', () => {
    const rows = ledgerRows({ type: 'supplier', opening_balance: 0 }, [e('purchase', 2880, '2026-11-01T10:00:00Z'), e('diye', 1000, '2026-11-01T10:01:00Z'), e('purchase_return', 100, '2026-11-02T10:00:00Z')]);
    expect(rows.map((r) => r.balance)).toEqual([-2880, -1880, -1780]);
  });
});

describe('credit limit', () => {
  it('warns only when the new udhaar goes above the limit', () => {
    expect(overCreditLimit(5000, 4000, 1000)).toBeNull(); // exactly at the limit is fine
    expect(overCreditLimit(5000, 4000, 1001)).toBe(5000);
    expect(overCreditLimit(null, 99999, 1)).toBeNull(); // no limit set
    expect(overCreditLimit(5000, 0, 0)).toBeNull();
  });
  it('how much room is left', () => {
    expect(creditLeft(5000, 3200)).toBe(1800);
    expect(creditLeft(5000, 9000)).toBe(0);
    expect(creditLeft(5000, -300)).toBe(5000); // paid in advance
    expect(creditLeft(undefined, 10)).toBeNull();
  });
});

describe('expense categories', () => {
  it('a typed name that is a built-in one picks the built-in; spaces are tidied', () => {
    expect(cleanCategory('  Rent ')).toBe('rent');
    expect(cleanCategory('Chai   pani')).toBe('Chai pani');
    expect(cleanCategory('')).toBeNull();
    expect(cleanCategory('x'.repeat(41))).toBeNull();
  });
  it('totals per category, biggest first, cancelled ones left out', () => {
    const rows = [
      e('kharcha', 5000, '2026-11-01T10:00:00Z', 'active', 'rent'),
      e('kharcha', 300, '2026-11-02T10:00:00Z', 'active', 'Chai pani'),
      e('kharcha', 200, '2026-11-03T10:00:00Z', 'active', 'Chai pani'),
      e('kharcha', 90, '2026-11-03T10:00:00Z', 'active'),
      e('kharcha', 777, '2026-11-03T10:00:00Z', 'cancelled', 'rent'),
      e('mile', 40, '2026-11-03T10:00:00Z'),
    ];
    expect(totalsByCategory(rows)).toEqual([
      { category: 'rent', total: 5000, count: 1 },
      { category: 'Chai pani', total: 500, count: 2 },
      { category: null, total: 90, count: 1 },
    ]);
    expect(customCategories(rows)).toEqual(['Chai pani']);
  });
});
