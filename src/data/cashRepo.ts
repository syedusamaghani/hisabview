// The daily cash closing. The shopkeeper counts the drawer, the app shows the difference from what it expected,
// and the closing is saved (add-only, with a diary line, both in one transaction). Counting again the same day
// adds a newer closing; the older ones stay.
import { snapshot, write } from './auditRepo';
import { requireShop, requireUser } from './context';
import { db } from './db';
import { newId, nowIso } from './ids';
import { MAX_AMOUNT, type CashClosing } from './types';
import { addDays, cashDay, cashNet, dayStartOf, isCashListed, isDayKey, type CashDay, type DayKey } from '../lib/cashbook';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import type { Entry } from './types';

export type NewClosing = { day: DayKey; opening_cash: number; expected_cash: number; counted_cash: number; note?: string | null };

const whole = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= MAX_AMOUNT;

// One day of the cashbook, ready to show
export type CashbookView = {
  day: CashDay;
  list: Entry[]; // the day's entries that moved money (cancelled ones included, shown struck out), newest first
  closing: CashClosing | undefined; // the newest closing of this day
  openingKnown: boolean; // false = the shop never closed a day before this one, so the opening is not known (shown as 0)
};

export const cashRepo = {
  async close(input: NewClosing): Promise<CashClosing> {
    if (!isDayKey(input.day)) throw new Error('Day is not valid');
    if (!whole(input.opening_cash, 0)) throw new Error('Opening cash is not valid');
    if (!whole(input.counted_cash, 0)) throw new Error('Counted cash is not valid');
    if (!Number.isInteger(input.expected_cash) || Math.abs(input.expected_cash) > MAX_AMOUNT) throw new Error('Expected cash is not valid');
    if (input.note && input.note.trim().length > 300) throw new Error('Note is too long');
    const closing: CashClosing = {
      id: newId(),
      shop_id: requireShop(),
      day: input.day,
      opening_cash: input.opening_cash,
      expected_cash: input.expected_cash,
      counted_cash: input.counted_cash,
      difference: input.counted_cash - input.expected_cash,
      note: input.note?.trim() || null,
      created_by: requireUser(),
      created_at: nowIso(),
      pending_sync: 1,
    };
    await db.transaction('rw', db.cash_closings, db.audit_log, async () => {
      await db.cash_closings.add(closing);
      await write('cash_closing', closing.id, 'create', null, snapshot(closing));
    });
    return closing;
  },

  // The newest closing of one day (the last count wins), or undefined
  async forDay(day: DayKey): Promise<CashClosing | undefined> {
    const shop = requireShop();
    const rows = (await db.cash_closings.where('day').equals(day).toArray()).filter((c) => c.shop_id === shop);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  },

  // What was counted at the end of the latest closed day BEFORE this one = what the drawer started this day with.
  // Looks back at most 400 days. undefined = the shop never closed a day before this one.
  async openingFor(day: DayKey): Promise<{ cash: number; from: DayKey } | undefined> {
    const shop = requireShop();
    const earlier = (await db.cash_closings.where('day').below(day).toArray()).filter((c) => c.shop_id === shop && c.day >= addDays(day, -400));
    if (earlier.length === 0) return undefined;
    const lastDay = earlier.reduce((a, c) => (c.day > a ? c.day : a), '');
    const newest = earlier.filter((c) => c.day === lastDay).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return { cash: newest.counted_cash, from: lastDay };
  },

  // The cashbook of one day. The opening is what was counted at the last closing before this day, plus the cash
  // that moved on the days in between that were never closed (so nothing falls through a missed closing).
  async cashbookFor(day: DayKey): Promise<CashbookView> {
    const prior = await cashRepo.openingFor(day);
    const closing = await cashRepo.forDay(day);
    const dayStart = dayStartOf(day);
    const dayEnd = dayStartOf(addDays(day, 1));
    const from = prior ? dayStartOf(addDays(prior.from, 1)) : dayStart;
    const entries = await entriesRepo.listBetween(from.toISOString(), dayEnd.toISOString());
    const kinds = new Map((await partiesRepo.listAll()).map((p) => [p.id, p.type]));
    const opening = prior ? prior.cash + cashNet(entries, kinds, from.getTime(), dayStart.getTime()) : (closing?.opening_cash ?? 0);
    const inDay = entries.filter((e) => e.created_at >= dayStart.toISOString() && e.created_at < dayEnd.toISOString());
    return {
      day: cashDay(inDay, kinds, day, opening),
      list: inDay.filter((e) => e.status !== 'draft' && isCashListed(e, kinds)).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      closing,
      openingKnown: !!prior || !!closing,
    };
  },

  // Every closing of one day, newest first (to show the log of counts)
  async listForDay(day: DayKey): Promise<CashClosing[]> {
    const shop = requireShop();
    return (await db.cash_closings.where('day').equals(day).toArray()).filter((c) => c.shop_id === shop).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};
