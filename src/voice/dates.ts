// Promise days said out loud: kal, parson, Jumma, agle hafte, "1 tareekh". Always Pakistan time.
import type { Token } from './tokens';

export type DayFound = {
  date?: string; // "2026-11-06"
  guessedDirection: boolean; // "kal" and "parson" can also mean yesterday and the day before
  used: Set<number>; // token places that belong to the day, so the amount finder skips them
};

const KARACHI_HOURS = 5; // Pakistan has no daylight saving

function karachiToday(now: Date) {
  const d = new Date(now.getTime() + KARACHI_HOURS * 3_600_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay() };
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

function plusDays(now: Date, n: number): string {
  const t = karachiToday(now);
  return iso(Date.UTC(t.year, t.month, t.day) + n * DAY);
}

// The next time this day-of-month comes (this month if it is still ahead, else next month)
function nextDayOfMonth(now: Date, dayOfMonth: number): string {
  const t = karachiToday(now);
  let month = t.month;
  let year = t.year;
  if (dayOfMonth <= t.day) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return iso(Date.UTC(year, month, Math.min(dayOfMonth, daysInMonth)));
}

export function findDay(tokens: Token[], now: Date): DayFound {
  const found: DayFound = { guessedDirection: false, used: new Set() };
  const set = (date: string, guessed = false) => {
    if (found.date === undefined) {
      found.date = date;
      found.guessedDirection = guessed;
    }
  };

  tokens.forEach((t, i) => {
    const tag = t.tag;
    if (!tag) return;
    if (tag.t === 'weekday') {
      const today = karachiToday(now).weekday;
      set(plusDays(now, (tag.v - today + 7) % 7 || 7));
      found.used.add(i);
      return;
    }
    if (tag.t !== 'word') return;
    switch (tag.v) {
      case 'today':
        found.used.add(i);
        break;
      case 'tomorrow':
        set(plusDays(now, 1), true);
        found.used.add(i);
        break;
      case 'dayafter':
        set(plusDays(now, 2), true);
        found.used.add(i);
        break;
      case 'next':
        found.used.add(i);
        if (tokens[i + 1]?.tag?.t === 'word' && tokens[i + 1].tag?.v === 'week') {
          set(plusDays(now, 7));
          found.used.add(i + 1);
        }
        break;
      case 'tareekh': {
        found.used.add(i);
        const before = tokens[i - 1];
        const after = tokens[i + 1];
        const pick = [before, after].find((x) => x && x.digits !== null && !x.asWord && Number.isInteger(x.digits) && x.digits >= 1 && x.digits <= 31);
        if (pick) {
          set(nextDayOfMonth(now, pick.digits as number));
          found.used.add(tokens.indexOf(pick));
        }
        break;
      }
      default:
        break;
    }
  });
  return found;
}
