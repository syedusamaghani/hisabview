// Kharcha (expense) categories. Five are built in and stored as a short code; anything else the shopkeeper
// typed is stored as their own words (up to 40 letters). Pure functions.
import type { TextKey } from '../i18n/translations';

export const EXPENSE_CATEGORIES = ['rent', 'electricity', 'salary', 'transport', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_TEXT: Record<ExpenseCategory, TextKey> = {
  rent: 'catRent',
  electricity: 'catElectricity',
  salary: 'catSalary',
  transport: 'catTransport',
  other: 'catOther',
};

export const MAX_CATEGORY_LENGTH = 40;

export const isBuiltInCategory = (value: unknown): value is ExpenseCategory => typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value);

// Words for the screen: a built-in code is translated, a custom name is shown as typed, no category = "Other"
export function categoryLabel(category: string | null | undefined, t: (key: TextKey) => string): string {
  if (!category) return t('catNone');
  return isBuiltInCategory(category) ? t(CATEGORY_TEXT[category]) : category;
}

// A typed category: trimmed, one space between words, 1 to 40 letters. null = nothing usable.
export function cleanCategory(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (text.length === 0 || text.length > MAX_CATEGORY_LENGTH) return null;
  // Typing "rent" (or "Rent") picks the built-in one, so the same thing is never stored two ways
  const lower = text.toLowerCase();
  return isBuiltInCategory(lower) ? lower : text;
}

type ExpenseEntry = { kind: string; amount: number; status: string; category?: string | null };

// Total of each category over the active kharcha entries, biggest first. No category = the empty string key.
export function totalsByCategory(entries: readonly ExpenseEntry[]): { category: string | null; total: number; count: number }[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    if (e.kind !== 'kharcha' || e.status !== 'active') continue;
    const key = e.category ?? '';
    const row = sums.get(key) ?? { total: 0, count: 0 };
    row.total += e.amount;
    row.count += 1;
    sums.set(key, row);
  }
  return [...sums.entries()].map(([key, v]) => ({ category: key === '' ? null : key, ...v })).sort((a, b) => b.total - a.total);
}

// The categories the shopkeeper typed themselves before (not built in), most used first
export function customCategories(entries: readonly ExpenseEntry[]): string[] {
  const used = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== 'kharcha' || !e.category || isBuiltInCategory(e.category)) continue;
    used.set(e.category, (used.get(e.category) ?? 0) + 1);
  }
  return [...used.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}
