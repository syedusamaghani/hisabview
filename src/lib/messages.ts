// The texts the shopkeeper sends on WhatsApp. The words live in translations.ts; this only fills in
// names and amounts. Pure functions, so they are easy to test.
import { text, type Lang, type TextKey } from '../i18n/translations';
import { formatDay } from './dates';
import { formatRs } from './money';
import type { TodaySummary } from './today';

function tr(key: TextKey, lang: Lang, values: Record<string, string> = {}): string {
  return text[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '');
}

// "Naram", "Normal", "Sakht": three tones for the same reminder
export type Tone = 'soft' | 'normal' | 'firm';
export const TONES: { tone: Tone; title: TextKey; body: TextKey }[] = [
  { tone: 'soft', title: 'toneSoft', body: 'msgSoft' },
  { tone: 'normal', title: 'toneNormal', body: 'msgNormal' },
  { tone: 'firm', title: 'toneFirm', body: 'msgFirm' },
];

// balance above 0 = they owe me, below 0 = I owe them
export function balanceLine(balance: number, lang: Lang): string {
  if (balance > 0) return tr('balOwes', lang, { amount: formatRs(balance) });
  if (balance < 0) return tr('balAdvance', lang, { amount: formatRs(-balance) });
  return tr('balZero', lang);
}

type Who = { name: string; shop: string };

export function reminderText(body: TextKey, lang: Lang, who: Who, owed: number): string {
  return tr(body, lang, { name: who.name, shop: who.shop, amount: formatRs(owed) });
}

// Sent right after an entry: what was written, and where the account stands now
export function receiptText(kind: 'diye' | 'mile', lang: Lang, who: Who, amount: number, balance: number): string {
  return tr(kind === 'diye' ? 'msgReceiptDiye' : 'msgReceiptMile', lang, {
    name: who.name,
    shop: who.shop,
    amount: formatRs(amount),
    balance: balanceLine(balance, lang),
  });
}

type StatementEntry = { kind: string; amount: number; status: string; created_at: string };

// The whole account in a few lines: the last entries (oldest first) and the balance
export function statementText(lang: Lang, who: Who, entries: readonly StatementEntry[], balance: number, maxLines = 8): string {
  const kindLabel = (k: string): string => tr(k === 'mile' ? 'mile' : k === 'opening' ? 'openingLabel' : 'diye', lang);
  const lines = entries
    .filter((e) => e.status === 'active' && ['diye', 'mile', 'opening'].includes(e.kind))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-maxLines)
    .map((e) => `${formatDay(e.created_at, lang)}: ${kindLabel(e.kind)} ${formatRs(e.amount)}`);
  return [tr('msgStatementTitle', lang, { shop: who.shop, name: who.name }), '', ...lines, '', balanceLine(balance, lang)].join('\n');
}

// Today's summary, to send to a partner or keep in a chat
export function todayText(lang: Lang, shop: string, now: Date, s: TodaySummary): string {
  const day = formatDay(now.toISOString(), lang);
  return [
    tr('todayShareTitle', lang, { shop, day }),
    '',
    `${tr('todayDiye', lang)}: ${formatRs(s.diye)}`,
    `${tr('todayMile', lang)}: ${formatRs(s.mile)}`,
    `${tr('todaySale', lang)}: ${formatRs(s.sale)}`,
    `${tr('todayKharcha', lang)}: ${formatRs(s.kharcha)}`,
  ].join('\n');
}
