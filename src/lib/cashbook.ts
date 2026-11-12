// The cashbook: what went into and out of the drawer (and the digital accounts) on one Pakistan day.
// Pure functions: same input, same answer, no database. The server has the same rule in the view
// cash_movements (supabase/migrations/0007_cashbook_expenses.sql); keep the two the same.
//
//   money in : cash sale, money received (from a customer, or a supplier's refund), cash put in the drawer
//   money out: payment to a supplier, kharcha (expense), cash taken out of the drawer
//   NOT money: udhaar given to a customer (diye), goods bought on credit (purchase), old balances.
//              The goods left the shop, but no cash moved.
//   closing cash = opening cash + cash in - cash out   (cash only; the other methods are listed separately)
//
// An entry with no method is cash (every entry made before methods existed).
import { METHODS, type Method } from './methods';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PAKISTAN_OFFSET = 5 * HOUR; // Pakistan is always UTC + 5

// A Pakistan day as plain text, "2026-11-12"
export type DayKey = string;

export function dayKeyOf(at: Date | string): DayKey {
  const ms = (typeof at === 'string' ? Date.parse(at) : at.getTime()) + PAKISTAN_OFFSET;
  return new Date(ms).toISOString().slice(0, 10);
}

// The moment that day began (midnight in Pakistan)
export function dayStartOf(day: DayKey): Date {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - PAKISTAN_OFFSET);
}

export function addDays(day: DayKey, n: number): DayKey {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY).toISOString().slice(0, 10);
}

export const isDayKey = (v: unknown): v is DayKey => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

type CashEntry = { kind: string; amount: number; status: string; method?: string | null; party_id: string | null; created_at: string };
export type PartyKinds = ReadonlyMap<string, string>; // partyId -> 'customer' | 'supplier'

export type CashSource = 'cashSale' | 'fromCustomers' | 'fromSuppliers' | 'deposit' | 'supplierPayments' | 'expenses' | 'withdrawal';
export const CASH_IN_SOURCES: CashSource[] = ['cashSale', 'fromCustomers', 'fromSuppliers', 'deposit'];
export const CASH_OUT_SOURCES: CashSource[] = ['supplierPayments', 'expenses', 'withdrawal'];

// What one entry does to the drawer: null = no money moved
export function moneyMove(entry: CashEntry, partyKinds: PartyKinds): { method: Method; source: CashSource; direction: 'in' | 'out' } | null {
  if (entry.status !== 'active') return null;
  const person = entry.party_id ? partyKinds.get(entry.party_id) : undefined;
  const method = (METHODS as readonly string[]).includes(entry.method ?? '') ? (entry.method as Method) : 'cash';
  switch (entry.kind) {
    case 'cash_sale': return { method, source: 'cashSale', direction: 'in' };
    case 'mile': return { method, source: person === 'supplier' ? 'fromSuppliers' : 'fromCustomers', direction: 'in' };
    case 'deposit': return { method: 'cash', source: 'deposit', direction: 'in' };
    case 'kharcha': return { method, source: 'expenses', direction: 'out' };
    case 'withdrawal': return { method: 'cash', source: 'withdrawal', direction: 'out' };
    case 'diye': return person === 'supplier' ? { method, source: 'supplierPayments', direction: 'out' } : null; // udhaar to a customer moves no money
    default: return null;
  }
}

export type MethodTotals = { in: number; out: number };
export type CashDay = {
  day: DayKey;
  opening: number;
  // the cash drawer, line by line
  lines: Record<CashSource, number>;
  cashIn: number;
  cashOut: number;
  closing: number; // what the drawer should hold now: opening + cash in - cash out
  byMethod: Record<Method, MethodTotals>; // every method, cash included, kept apart
  count: number; // entries that moved money
};

const emptyLines = (): Record<CashSource, number> => ({ cashSale: 0, fromCustomers: 0, fromSuppliers: 0, deposit: 0, supplierPayments: 0, expenses: 0, withdrawal: 0 });
const emptyMethods = (): Record<Method, MethodTotals> => Object.fromEntries(METHODS.map((m) => [m, { in: 0, out: 0 }])) as Record<Method, MethodTotals>;

export function cashDay(entries: readonly CashEntry[], partyKinds: PartyKinds, day: DayKey, opening: number): CashDay {
  const start = dayStartOf(day).getTime();
  const result: CashDay = { day, opening, lines: emptyLines(), cashIn: 0, cashOut: 0, closing: opening, byMethod: emptyMethods(), count: 0 };
  for (const e of entries) {
    const at = Date.parse(e.created_at);
    if (at < start || at >= start + DAY) continue;
    const move = moneyMove(e, partyKinds);
    if (!move) continue;
    result.count += 1;
    result.byMethod[move.method][move.direction] += e.amount;
    if (move.method !== 'cash') continue; // only cash is in the drawer
    result.lines[move.source] += e.amount;
    if (move.direction === 'in') result.cashIn += e.amount;
    else result.cashOut += e.amount;
  }
  result.closing = opening + result.cashIn - result.cashOut;
  return result;
}

// Net cash (in minus out) of the entries made from one moment up to (not including) another.
// Used to carry the drawer over days that were never closed.
export function cashNet(entries: readonly CashEntry[], partyKinds: PartyKinds, fromMs: number, toMs: number): number {
  let net = 0;
  for (const e of entries) {
    const at = Date.parse(e.created_at);
    if (at < fromMs || at >= toMs) continue;
    const move = moneyMove(e, partyKinds);
    if (!move || move.method !== 'cash') continue;
    net += move.direction === 'in' ? e.amount : -e.amount;
  }
  return net;
}

// Entries that appear in the day's cash list (the ones that moved money, cancelled ones too so they show struck out)
export function isCashListed(entry: { kind: string; party_id: string | null }, partyKinds: PartyKinds): boolean {
  if (entry.kind === 'cash_sale' || entry.kind === 'mile' || entry.kind === 'deposit' || entry.kind === 'kharcha' || entry.kind === 'withdrawal') return true;
  return entry.kind === 'diye' && !!entry.party_id && partyKinds.get(entry.party_id) === 'supplier';
}

// How the count compares with the app: below 0 = cash is missing, above 0 = there is more than expected
export const cashDifference = (counted: number, expected: number): number => counted - expected;
