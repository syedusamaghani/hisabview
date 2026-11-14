// The reports a shopkeeper (or an accountant) can open and export. Pure functions: no database, no screen.
//
// SINGLE SOURCE OF TRUTH: no report has a formula of its own. The money totals come from the same
// summarize() (src/lib/profit.ts), totals() (src/lib/balance.ts) and stock values the dashboard uses.
// The rows are just the same records listed one by one, and the tests check that rows add up to the total.
import type { Party, Product } from '../data/types';
import type { TextKey } from '../i18n/translations';
import { totals } from './balance';
import { METHODS, METHOD_TEXT } from './methods';
import { categoryLabel } from './expenses';
import { formatRs } from './money';
import { rangeMs, summarize, type DayRange, type Report, type ReportInput } from './profit';
import type { PersonStat } from './team';
import { formatDay } from './dates';
import type { Lang } from '../i18n/translations';
import type { Role } from '../data/types';
import { canSeeProfit, canSeeTeamWork } from './permissions';

export type ReportId = 'sales' | 'purchases' | 'expenses' | 'pnl' | 'stock' | 'low' | 'customers' | 'suppliers' | 'methods' | 'staff' | 'best' | 'profitability';

export type Cell = string | number;
export type ColType = 'text' | 'money' | 'num' | 'pct';
export type Col = { key: TextKey; type: ColType };
export type ReportTable = {
  id: ReportId;
  title: TextKey;
  cols: Col[];
  rows: Cell[][];
  total: Cell[] | null; // the last line, same columns (a text cell is shown as it is)
  snapshot: boolean; // true = "as of now" (stock, balances): the dates chosen do not apply
};

type Need = 'stock' | 'money' | 'team';
export const REPORTS: { id: ReportId; title: TextKey; need: Need }[] = [
  { id: 'sales', title: 'rpSales', need: 'money' },
  { id: 'purchases', title: 'rpPurchases', need: 'money' },
  { id: 'expenses', title: 'rpExpenses', need: 'money' },
  { id: 'pnl', title: 'rpPnl', need: 'money' },
  { id: 'profitability', title: 'rpProfitability', need: 'money' },
  { id: 'best', title: 'rpBest', need: 'money' },
  { id: 'methods', title: 'rpMethods', need: 'money' },
  { id: 'customers', title: 'rpCustomers', need: 'money' },
  { id: 'suppliers', title: 'rpSuppliers', need: 'money' },
  { id: 'stock', title: 'rpStock', need: 'stock' },
  { id: 'low', title: 'rpLow', need: 'stock' },
  { id: 'staff', title: 'rpStaff', need: 'team' },
];

// Who may open which report. A cashier sees only the stock reports (and not what the goods cost);
// profit, sales, balances and the payment split are owner and manager. Staff work is owner and manager too.
export function reportsFor(role: Role | 'revoked'): typeof REPORTS {
  return REPORTS.filter((r) => (r.need === 'stock' ? role !== 'revoked' : r.need === 'money' ? canSeeProfit(role) : canSeeTeamWork(role)));
}

export type ReportData = {
  range: DayRange;
  input: ReportInput; // entries of the days, every stock movement, costs, names
  report: Report; // the dashboard's own numbers for these days
  stock: { product: Product; stock: number; low: boolean; value: number }[];
  parties: Party[];
  balances: Record<string, number>; // partyId -> balance now (the dashboard's source)
  staff: PersonStat[];
};

export type Ctx = {
  t: (key: TextKey) => string;
  lang: Lang;
  who: (userId: string) => string; // a person's name
  qty: (qtyBase: number, productId: string) => string; // "2 carton 3 piece"
  showCost: boolean; // false for a cashier: no cost or value of goods
};

export const buildReportData = (range: DayRange, input: ReportInput, stock: ReportData['stock'], parties: Party[], balances: Record<string, number>, staff: PersonStat[]): ReportData => {
  const { fromMs, toMs } = rangeMs(range);
  return { range, input, report: summarize(input, fromMs, toMs), stock, parties, balances, staff };
};

const sum = (rows: Cell[][], at: number): number => rows.reduce((n, r) => n + (r[at] as number), 0);
const inRange = (iso: string, d: ReportData): boolean => {
  const { fromMs, toMs } = rangeMs(d.range);
  const at = Date.parse(iso);
  return at >= fromMs && at < toMs;
};

export function buildReport(id: ReportId, d: ReportData, c: Ctx): ReportTable {
  const { t } = c;
  const name = new Map(d.parties.map((p) => [p.id, p.name]));
  const entries = d.input.entries.filter((e) => e.status === 'active' && inRange(e.created_at, d)).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const day = (iso: string) => formatDay(iso, c.lang);
  const table = (cols: Col[], rows: Cell[][], total: Cell[] | null, snapshot = false): ReportTable => ({ id, title: REPORTS.find((r) => r.id === id)!.title, cols, rows, total, snapshot });
  const totalLabel = t('rpTotal');

  switch (id) {
    case 'sales': {
      // the same rule summarize() uses: a cash sale, or a Diye written with goods (not undone)
      const undone = new Set(d.input.moves.map((m) => m.reverses).filter((v): v is string => v !== null));
      const withGoods = new Set(d.input.moves.filter((m) => m.kind === 'sale' && m.entry_id && !undone.has(m.id)).map((m) => m.entry_id as string));
      const rows: Cell[][] = [];
      for (const e of entries) {
        const goods = withGoods.has(e.id);
        if (!(e.kind === 'cash_sale' || (e.kind === 'diye' && goods))) continue;
        rows.push([day(e.created_at), e.party_id ? name.get(e.party_id) ?? '' : t('rpCashCustomer'), goods ? t('rpTypeGoods') : t('rpTypePlain'), e.amount]);
      }
      return table([{ key: 'cDate', type: 'text' }, { key: 'cParty', type: 'text' }, { key: 'cType', type: 'text' }, { key: 'cAmount', type: 'money' }], rows, [totalLabel, '', '', sum(rows, 3)]);
    }
    case 'purchases': {
      const rows: Cell[][] = entries
        .filter((e) => e.kind === 'purchase' || e.kind === 'purchase_return')
        .map((e) => [day(e.created_at), e.party_id ? name.get(e.party_id) ?? '' : '', e.invoice_no ?? '', e.kind === 'purchase' ? e.amount : -e.amount]);
      return table([{ key: 'cDate', type: 'text' }, { key: 'cSupplier', type: 'text' }, { key: 'cBill', type: 'text' }, { key: 'cAmount', type: 'money' }], rows, [totalLabel, '', '', sum(rows, 3)]);
    }
    case 'expenses': {
      const rows: Cell[][] = entries.filter((e) => e.kind === 'kharcha').map((e) => [day(e.created_at), categoryLabel(e.category, t), e.note ?? '', e.amount]);
      return table([{ key: 'cDate', type: 'text' }, { key: 'cCategory', type: 'text' }, { key: 'cNote', type: 'text' }, { key: 'cAmount', type: 'money' }], rows, [totalLabel, '', '', sum(rows, 3)]);
    }
    case 'pnl': {
      const r = d.report;
      const rows: Cell[][] = [
        [t('rpPlSales'), r.itemisedSales],
        [t('rpPlCogs'), -r.cogs],
        [t('rpPlGross'), r.grossProfit],
        [t('rpPlExpenses'), -r.expenses],
        [t('rpPlLoss'), -r.stockLoss],
        [t('rpPlNet'), r.netProfit],
        [t('rpPlPlain'), r.plainSales],
        [t('rpPlDiscount'), r.discountGiven],
        [t('rpPlFree'), r.freeCost],
      ];
      return table([{ key: 'cLine', type: 'text' }, { key: 'cAmount', type: 'money' }], rows, null);
    }
    case 'profitability': {
      const r = d.report;
      const rows: Cell[][] = [...r.byProduct].sort((a, b) => b.profit - a.profit).map((p) => [p.name, p.sales, p.cost, p.profit, p.sales > 0 ? Math.round((p.profit * 100) / p.sales) : '']);
      return table(
        [{ key: 'cProduct', type: 'text' }, { key: 'cSales', type: 'money' }, { key: 'cCost', type: 'money' }, { key: 'cProfit', type: 'money' }, { key: 'cMargin', type: 'pct' }],
        rows,
        [totalLabel, sum(rows, 1), sum(rows, 2), sum(rows, 3), r.itemisedSales > 0 ? Math.round((sum(rows, 3) * 100) / r.itemisedSales) : ''],
      );
    }
    case 'best': {
      const rows: Cell[][] = [...d.report.byProduct].sort((a, b) => b.qty_base - a.qty_base || b.sales - a.sales).map((p) => [p.name, c.qty(p.qty_base, p.product_id), p.sales]);
      return table([{ key: 'cProduct', type: 'text' }, { key: 'cQty', type: 'text' }, { key: 'cSales', type: 'money' }], rows, [totalLabel, '', sum(rows, 2)]);
    }
    case 'methods': {
      const r = d.report;
      const rows: Cell[][] = METHODS.filter((m) => r.inByMethod[m] > 0 || r.outByMethod[m] > 0).map((m) => [t(METHOD_TEXT[m]), r.inByMethod[m], r.outByMethod[m]]);
      return table([{ key: 'cMethod', type: 'text' }, { key: 'cIn', type: 'money' }, { key: 'cOut', type: 'money' }], rows, [totalLabel, sum(rows, 1), sum(rows, 2)]);
    }
    case 'customers':
    case 'suppliers': {
      const kind = id === 'customers' ? 'customer' : 'supplier';
      const people = d.parties.filter((p) => !p.archived && p.type === kind);
      const bal: Record<string, number> = {};
      for (const p of people) bal[p.id] = d.balances[p.id] ?? 0; // what is owed up to now (from the stored balances), not just in the days chosen
      const rows: Cell[][] = people
        .filter((p) => bal[p.id] !== 0)
        .sort((a, b) => Math.abs(bal[b.id]) - Math.abs(bal[a.id]))
        .map((p) => [p.name, p.phone ?? '', Math.max(0, bal[p.id]), Math.max(0, -bal[p.id])]);
      const sums = totals(bal); // the dashboard's own split: lene hain / dene hain
      return table([{ key: 'cName', type: 'text' }, { key: 'cPhone', type: 'text' }, { key: 'cLene', type: 'money' }, { key: 'cDene', type: 'money' }], rows, [totalLabel, '', sums.leneHain, sums.deneHain], true);
    }
    case 'stock': {
      const cols: Col[] = [{ key: 'cProduct', type: 'text' }, { key: 'cStock', type: 'text' }];
      const rows: Cell[][] = d.stock.map((s) => [s.product.name, c.qty(s.stock, s.product.id), ...(c.showCost ? [s.value] : [])]);
      if (c.showCost) cols.push({ key: 'cValue', type: 'money' });
      return table(cols, rows, c.showCost ? [totalLabel, '', sum(rows, 2)] : null, true);
    }
    case 'low': {
      const rows: Cell[][] = d.stock.filter((s) => s.low).map((s) => [s.product.name, c.qty(s.stock, s.product.id), c.qty(s.product.min_stock, s.product.id)]);
      return table([{ key: 'cProduct', type: 'text' }, { key: 'cStock', type: 'text' }, { key: 'cMin', type: 'text' }], rows, null, true);
    }
    case 'staff': {
      const rows: Cell[][] = d.staff.map((s) => [c.who(s.user_id), s.entries, s.sales, s.kharcha, s.cancelled]);
      return table(
        [{ key: 'cPerson', type: 'text' }, { key: 'cEntries', type: 'num' }, { key: 'cSales', type: 'money' }, { key: 'cExpensesCol', type: 'money' }, { key: 'cCancelled', type: 'num' }],
        rows,
        [totalLabel, sum(rows, 1), sum(rows, 2), sum(rows, 3), sum(rows, 4)],
      );
    }
  }
}

// How one cell is written on screen and in the PDF
export function cellText(col: Col, cell: Cell): string {
  if (typeof cell === 'string') return cell;
  if (col.type === 'money') return cell < 0 ? `-${formatRs(-cell)}` : formatRs(cell);
  if (col.type === 'pct') return `${cell}%`;
  return cell.toLocaleString('en-US');
}

// A short WhatsApp text: the title, the days, up to 10 lines and the total
export function reportText(table: ReportTable, c: Ctx, period: string, shop: string): string {
  const lines = [`${shop} - ${c.t(table.title)}`, period, ''];
  for (const row of table.rows.slice(0, 10)) lines.push(row.map((cell, i) => cellText(table.cols[i], cell)).filter((x) => x !== '').join(' | '));
  if (table.rows.length > 10) lines.push(`... +${table.rows.length - 10}`);
  if (table.total) lines.push('', table.total.map((cell, i) => cellText(table.cols[i], cell)).filter((x) => x !== '').join(' | '));
  return lines.join('\n');
}
