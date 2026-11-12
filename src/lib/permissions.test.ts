import { describe, expect, it } from 'vitest';
import { canChangeEntry, canChangeShop, canEditCustomer, canManageStaff } from './permissions';

const ME = 'user-me';
const NOW = Date.parse('2026-11-12T10:00:00Z');
const entry = (minutesAgo: number, by = ME) => ({ created_by: by, created_at: new Date(NOW - minutesAgo * 60_000).toISOString() });

describe('what each role may do', () => {
  it('only the owner changes settings and staff', () => {
    expect(canChangeShop('owner') && canManageStaff('owner')).toBe(true);
    for (const role of ['manager', 'cashier'] as const) expect(canChangeShop(role) || canManageStaff(role)).toBe(false);
  });

  it('a cashier cannot edit customers; owner and manager can', () => {
    expect(canEditCustomer('cashier')).toBe(false);
    expect(canEditCustomer('manager') && canEditCustomer('owner')).toBe(true);
  });

  it('owner and manager can change any entry at any time', () => {
    expect(canChangeEntry('owner', entry(60 * 24 * 30, 'someone-else'), ME, NOW)).toBe(true);
    expect(canChangeEntry('manager', entry(500, 'someone-else'), ME, NOW)).toBe(true);
  });

  it('a cashier can take back only their own entry, only within 10 minutes (same rule as the database)', () => {
    expect(canChangeEntry('cashier', entry(2), ME, NOW)).toBe(true);
    expect(canChangeEntry('cashier', entry(10), ME, NOW)).toBe(true);
    expect(canChangeEntry('cashier', entry(11), ME, NOW)).toBe(false);
    expect(canChangeEntry('cashier', entry(2, 'someone-else'), ME, NOW)).toBe(false);
  });
});
