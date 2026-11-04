// "Aaj ka hisaab": what was given, received, sold and spent today, by Pakistan's clock.
// Pakistan is always 5 hours ahead of UTC (no daylight saving), so a day starts at 19:00 UTC.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PAKISTAN_OFFSET = 5 * HOUR;

// The moment today began in Pakistan, for example 12:00 midnight at night
export function pakistanDayStart(now: Date): Date {
  const local = now.getTime() + PAKISTAN_OFFSET;
  return new Date(Math.floor(local / DAY) * DAY - PAKISTAN_OFFSET);
}

type TodayEntry = { kind: string; amount: number; status: string; created_at: string };

export type TodaySummary = { diye: number; mile: number; sale: number; kharcha: number; count: number };

// The four kinds that belong to "today": udhaar given (diye), money received (mile), cash sale, kharcha
const SUMMARY_KEY = { diye: 'diye', mile: 'mile', cash_sale: 'sale', kharcha: 'kharcha' } as const;
const isDayKind = (kind: string): kind is keyof typeof SUMMARY_KEY => kind in SUMMARY_KEY;

const madeToday = (e: TodayEntry, now: Date) => {
  const start = pakistanDayStart(now).getTime();
  const at = new Date(e.created_at).getTime();
  return at >= start && at < start + DAY;
};

// Only real money entries count: not cancelled, made today. Opening balances are not today's business.
export function todaySummary(entries: readonly TodayEntry[], now = new Date()): TodaySummary {
  const result: TodaySummary = { diye: 0, mile: 0, sale: 0, kharcha: 0, count: 0 };
  for (const e of entries) {
    if (e.status !== 'active' || !isDayKind(e.kind) || !madeToday(e, now)) continue;
    result[SUMMARY_KEY[e.kind]] += e.amount;
    result.count += 1;
  }
  return result;
}

// Today's entries for the list, newest first. Cancelled ones stay in the list (shown struck out).
export function todayEntries<T extends TodayEntry>(entries: readonly T[], now = new Date()): T[] {
  return entries
    .filter((e) => e.status !== 'draft' && isDayKind(e.kind) && madeToday(e, now))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
