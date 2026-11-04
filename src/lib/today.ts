// "Aaj ka hisaab": what was given and received today, by Pakistan's clock.
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

// Only real money entries count: Diye and Mile, not cancelled, made today.
export function todaySummary(entries: readonly TodayEntry[], now = new Date()): { diye: number; mile: number; count: number } {
  const start = pakistanDayStart(now).getTime();
  const end = start + DAY;
  const result = { diye: 0, mile: 0, count: 0 };
  for (const e of entries) {
    if (e.status !== 'active' || (e.kind !== 'diye' && e.kind !== 'mile')) continue;
    const at = new Date(e.created_at).getTime();
    if (at < start || at >= end) continue;
    result[e.kind] += e.amount;
    result.count += 1;
  }
  return result;
}
