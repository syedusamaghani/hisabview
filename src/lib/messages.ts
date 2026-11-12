// The texts the shopkeeper sends on WhatsApp. The words live in translations.ts; this only fills in
// names and amounts. Pure functions, so they are easy to test.
import { text, type Lang, type TextKey } from '../i18n/translations';
import { formatDay } from './dates';
import { ledgerRows } from './ledger';
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

type StatementEntry = { id: string; party_id: string | null; kind: string; amount: number; status: string; created_at: string };

// WhatsApp opens a long message fine, but not an endless one: the text is cut to fit this many characters once
// it is made safe for a link (Urdu letters take the most room). The newest lines are always kept.
export const STATEMENT_MAX_ENCODED = 2400;

const balanceShort = (balance: number, lang: Lang): string =>
  balance > 0 ? tr('stmtBal', lang, { amount: formatRs(balance) }) : balance < 0 ? tr('stmtAdvance', lang, { amount: formatRs(-balance) }) : tr('stmtBalZero', lang);

// The account as a list: every entry with the balance after it (oldest first), then where the account stands now.
// When the list is long only the newest lines are kept, and the line "pehle ka baqi" carries the balance in, so
// the running balance of every line shown is still correct.
export function statementText(
  lang: Lang,
  who: Who,
  party: { type: string; opening_balance: number },
  entries: readonly StatementEntry[],
  maxEncoded = STATEMENT_MAX_ENCODED,
): string {
  const kindLabel = (k: string): string =>
    tr(k === 'mile' ? 'mile' : k === 'opening' ? 'openingLabel' : k === 'purchase' ? 'purchaseLabel' : k === 'purchase_return' ? 'purchaseReturnLabel' : 'diye', lang);
  const rows = ledgerRows(party, entries).filter((r) => r.balance !== null && ['diye', 'mile', 'opening', 'purchase', 'purchase_return'].includes(r.entry.kind));
  const lineOf = (r: (typeof rows)[number]) => `${formatDay(r.entry.created_at, lang)}: ${kindLabel(r.entry.kind)} ${formatRs(r.entry.amount)} | ${balanceShort(r.balance as number, lang)}`;
  const head = [tr('msgStatementTitle', lang, { shop: who.shop, name: who.name }), ''];
  const foot = ['', balanceLine(rows.length > 0 ? (rows[rows.length - 1].balance as number) : party.opening_balance, lang)];
  // Take lines from the newest backwards until the message is full
  const kept: string[] = [];
  let first = rows.length;
  for (let i = rows.length - 1; i >= 0; i--) {
    const carry = i > 0 ? [tr('stmtCarried', lang, { balance: balanceShort(rows[i - 1].balance as number, lang) })] : [];
    const next = [...head, ...carry, lineOf(rows[i]), ...kept, ...foot].join('\n');
    if (encodeURIComponent(next).length > maxEncoded && kept.length > 0) break;
    kept.unshift(lineOf(rows[i]));
    first = i;
  }
  const carried = first > 0 ? [tr('stmtCarried', lang, { balance: balanceShort(rows[first - 1].balance as number, lang) })] : [];
  return [...head, ...carried, ...kept, ...foot].join('\n');
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
