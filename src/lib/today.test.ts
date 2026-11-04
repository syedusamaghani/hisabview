import { describe, expect, it } from 'vitest';
import { pakistanDayStart, todayEntries, todaySummary } from './today';

const e = (kind: string, amount: number, created_at: string, status = 'active') => ({ kind, amount, status, created_at });

describe('pakistanDayStart', () => {
  it('starts the day at midnight Pakistan time (19:00 UTC the evening before)', () => {
    // 3 Nov 2026, 10:00 in Karachi = 05:00 UTC
    expect(pakistanDayStart(new Date('2026-11-03T05:00:00Z')).toISOString()).toBe('2026-11-02T19:00:00.000Z');
  });
  it('is still the same day at 11:59 pm in Karachi', () => {
    expect(pakistanDayStart(new Date('2026-11-03T18:59:00Z')).toISOString()).toBe('2026-11-02T19:00:00.000Z');
  });
  it('moves to the next day exactly at midnight in Karachi', () => {
    expect(pakistanDayStart(new Date('2026-11-03T19:00:00Z')).toISOString()).toBe('2026-11-03T19:00:00.000Z');
  });
});

describe('todaySummary', () => {
  const now = new Date('2026-11-03T08:00:00Z'); // 1:00 pm in Karachi

  it("adds up today's diye and mile", () => {
    const list = [e('diye', 500, '2026-11-03T04:00:00Z'), e('diye', 250, '2026-11-03T07:00:00Z'), e('mile', 300, '2026-11-03T06:00:00Z')];
    expect(todaySummary(list, now)).toEqual({ diye: 750, mile: 300, sale: 0, kharcha: 0, count: 3 });
  });

  it('adds cash sales and kharcha too', () => {
    const list = [e('cash_sale', 15000, '2026-11-03T04:00:00Z'), e('cash_sale', 500, '2026-11-03T05:00:00Z'), e('kharcha', 3000, '2026-11-03T06:00:00Z')];
    expect(todaySummary(list, now)).toEqual({ diye: 0, mile: 0, sale: 15500, kharcha: 3000, count: 3 });
  });

  it('ignores cancelled entries, old days, tomorrow and old balances', () => {
    const list = [
      e('diye', 999, '2026-11-03T04:00:00Z', 'cancelled'),
      e('kharcha', 80, '2026-11-03T04:00:00Z', 'cancelled'),
      e('diye', 111, '2026-11-02T18:59:00Z'), // 11:59 pm yesterday in Karachi
      e('diye', 222, '2026-11-03T19:00:00Z'), // midnight, already tomorrow
      e('opening', 5000, '2026-11-03T04:00:00Z'),
      e('mile', 60, '2026-11-02T19:00:00Z'), // 12:00 midnight today, counts
    ];
    expect(todaySummary(list, now)).toEqual({ diye: 0, mile: 60, sale: 0, kharcha: 0, count: 1 });
  });

  it('is all zeros on a quiet day', () => {
    expect(todaySummary([], now)).toEqual({ diye: 0, mile: 0, sale: 0, kharcha: 0, count: 0 });
  });
});

describe('todayEntries', () => {
  const now = new Date('2026-11-03T08:00:00Z');
  it("lists today's entries newest first, keeps cancelled ones, leaves out other days and old balances", () => {
    const list = [
      e('diye', 1, '2026-11-03T04:00:00Z'),
      e('cash_sale', 2, '2026-11-03T07:00:00Z'),
      e('kharcha', 3, '2026-11-03T05:00:00Z', 'cancelled'),
      e('mile', 4, '2026-11-02T10:00:00Z'),
      e('opening', 5, '2026-11-03T06:00:00Z'),
      e('diye', 6, '2026-11-03T06:00:00Z', 'draft'),
    ];
    expect(todayEntries(list, now).map((x) => x.amount)).toEqual([2, 3, 1]);
  });
});
