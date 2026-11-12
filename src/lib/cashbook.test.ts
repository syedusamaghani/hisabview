import { describe, expect, it } from 'vitest';
import { addDays, cashDay, cashDifference, cashNet, dayKeyOf, dayStartOf, isCashListed, isDayKey, moneyMove } from './cashbook';

const kinds = new Map([['cust', 'customer'], ['sup', 'supplier']]);
// 12 Nov 2026, 10:00 in Pakistan = 05:00 UTC
const at = (hourPk: number, day = '2026-11-12') => new Date(Date.parse(`${day}T00:00:00Z`) - 5 * 3_600_000 + hourPk * 3_600_000).toISOString();
const e = (kind: string, amount: number, over: Partial<{ party_id: string | null; method: string | null; status: string; created_at: string }> = {}) => ({
  kind, amount, party_id: null, method: null as string | null, status: 'active', created_at: at(10), ...over,
});

describe('Pakistan days', () => {
  it('a day starts at midnight Pakistan time (19:00 UTC the evening before)', () => {
    expect(dayStartOf('2026-11-12').toISOString()).toBe('2026-11-11T19:00:00.000Z');
    expect(dayKeyOf('2026-11-11T18:59:59Z')).toBe('2026-11-11');
    expect(dayKeyOf('2026-11-11T19:00:00Z')).toBe('2026-11-12');
  });
  it('adds days across month ends and checks the text', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(isDayKey('2026-11-12')).toBe(true);
    expect(isDayKey('2026-13-40')).toBe(false);
    expect(isDayKey('hello')).toBe(false);
  });
});

describe('what moves money', () => {
  it('udhaar to a customer and goods bought on credit move no cash', () => {
    expect(moneyMove(e('diye', 500, { party_id: 'cust' }), kinds)).toBeNull();
    expect(moneyMove(e('purchase', 2880, { party_id: 'sup' }), kinds)).toBeNull();
    expect(moneyMove(e('opening', 900, { party_id: 'cust' }), kinds)).toBeNull();
  });
  it('a payment to a supplier goes out, money from a customer comes in, a supplier refund comes in', () => {
    expect(moneyMove(e('diye', 1000, { party_id: 'sup' }), kinds)).toMatchObject({ source: 'supplierPayments', direction: 'out', method: 'cash' });
    expect(moneyMove(e('mile', 300, { party_id: 'cust' }), kinds)).toMatchObject({ source: 'fromCustomers', direction: 'in' });
    expect(moneyMove(e('mile', 300, { party_id: 'sup' }), kinds)).toMatchObject({ source: 'fromSuppliers', direction: 'in' });
  });
  it('cancelled entries move nothing', () => {
    expect(moneyMove(e('cash_sale', 100, { status: 'cancelled' }), kinds)).toBeNull();
  });
});

describe('one day of cashbook', () => {
  const entries = [
    e('cash_sale', 360),
    e('mile', 500, { party_id: 'cust' }),
    e('mile', 200, { party_id: 'sup' }), // a refund
    e('deposit', 1000),
    e('diye', 1000, { party_id: 'sup' }), // paid a supplier
    e('kharcha', 150),
    e('withdrawal', 400),
    e('diye', 700, { party_id: 'cust' }), // udhaar: not cash
    e('cash_sale', 999, { status: 'cancelled' }),
    e('cash_sale', 888, { created_at: at(10, '2026-11-13') }), // another day
    e('cash_sale', 777, { created_at: at(10, '2026-11-11') }), // another day
  ];

  it('closing cash = opening + inflows - outflows', () => {
    const day = cashDay(entries, kinds, '2026-11-12', 2000);
    expect(day.cashIn).toBe(360 + 500 + 200 + 1000);
    expect(day.cashOut).toBe(1000 + 150 + 400);
    expect(day.closing).toBe(2000 + day.cashIn - day.cashOut);
    expect(day.closing).toBe(2510);
    expect(day.lines).toEqual({ cashSale: 360, fromCustomers: 500, fromSuppliers: 200, deposit: 1000, supplierPayments: 1000, expenses: 150, withdrawal: 400 });
    expect(day.count).toBe(7);
  });

  it('digital methods are kept apart and never touch the drawer', () => {
    const mixed = [
      e('cash_sale', 100),
      e('cash_sale', 250, { method: 'jazzcash' }),
      e('mile', 700, { party_id: 'cust', method: 'bank' }),
      e('kharcha', 90, { method: 'easypaisa' }),
      e('kharcha', 30),
      e('diye', 400, { party_id: 'sup', method: 'bank' }),
    ];
    const day = cashDay(mixed, kinds, '2026-11-12', 0);
    expect(day.closing).toBe(100 - 30);
    expect(day.byMethod.cash).toEqual({ in: 100, out: 30 });
    expect(day.byMethod.jazzcash).toEqual({ in: 250, out: 0 });
    expect(day.byMethod.bank).toEqual({ in: 700, out: 400 });
    expect(day.byMethod.easypaisa).toEqual({ in: 0, out: 90 });
    expect(day.byMethod.other).toEqual({ in: 0, out: 0 });
  });

  it('an entry with no method (an old entry) counts as cash', () => {
    expect(cashDay([e('kharcha', 50, { method: null })], kinds, '2026-11-12', 100).closing).toBe(50);
  });

  it('the cash of days that were never closed is carried forward', () => {
    const two = [e('cash_sale', 300, { created_at: at(10, '2026-11-10') }), e('kharcha', 100, { created_at: at(12, '2026-11-11') })];
    expect(cashNet(two, kinds, dayStartOf('2026-11-10').getTime(), dayStartOf('2026-11-12').getTime())).toBe(200);
  });

  it('the list shows entries that moved money, not udhaar', () => {
    expect(isCashListed({ kind: 'cash_sale', party_id: null }, kinds)).toBe(true);
    expect(isCashListed({ kind: 'diye', party_id: 'sup' }, kinds)).toBe(true);
    expect(isCashListed({ kind: 'diye', party_id: 'cust' }, kinds)).toBe(false);
  });

  it('difference: below 0 = cash missing', () => {
    expect(cashDifference(2400, 2510)).toBe(-110);
    expect(cashDifference(2510, 2510)).toBe(0);
    expect(cashDifference(2600, 2510)).toBe(90);
  });
});
