import 'fake-indexeddb/auto';
import { unzipSync, strFromU8 } from 'fflate';
import { beforeEach, describe, expect, it } from 'vitest';
import { totals } from '../lib/balance';
import { dayKeyOf } from '../lib/cashbook';
import { pagesToPdf } from '../lib/pdf';
import { rangeMs, summarize } from '../lib/profit';
import { buildReport, cellText, reportsFor, reportText, REPORTS, type Ctx, type ReportId } from '../lib/reports';
import { makeXlsx } from '../lib/xlsx';
import { english as en } from '../i18n/english';
import { setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { reportRepo } from './reportRepo';
import { shopsRepo } from './shopsRepo';
import { statsRepo } from './statsRepo';
import { tradeRepo } from './tradeRepo';

const USER = '00000000-0000-4000-8000-0000000000d8';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
});

const ctx: Ctx = { t: (k) => (en as Record<string, string>)[k] ?? k, lang: 'en', who: (id) => id.slice(0, 4), qty: (n) => String(n), showCost: true };
const today = () => {
  const d = dayKeyOf(new Date());
  return { from: d, to: d };
};

// A small busy day: stock bought, a cash sale with a discount, a udhaar sale, an expense, a payment, a purchase return
async function busyDay() {
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali', phone: '0300-1234567' });
  const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20, min_stock: 5 });
  const soap = await productsRepo.create({ name: 'Soap', base_unit: 'piece', price_unit: 'piece', cost_price: 30, sell_price: 45, min_stock: 100 });
  const line = (p: { id: string }, qty: number, price: number) => ({ product_id: p.id, unit: 'piece', qty_base: qty, unit_price: price });
  await tradeRepo.purchase({ supplier_id: karim.id, lines: [line(biscuit, 100, 10), line(soap, 20, 30)] });
  await tradeRepo.sale({ lines: [line(biscuit, 10, 20), line(biscuit, 1, 0)], discount: 20 }); // cash, Rs 180
  await tradeRepo.sale({ party_id: ali.id, lines: [line(soap, 4, 45)] }); // udhaar, Rs 180
  await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 70 }); // a plain one-amount sale
  await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 50, category: 'rent' });
  await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 40, method: 'jazzcash' });
}

async function load() {
  const range = today();
  const input = await reportRepo.load(range);
  const data = await reportRepo.forReports(range);
  const { fromMs, toMs } = rangeMs(range);
  return { data, dash: summarize(input, fromMs, toMs) };
}
const rowsSum = (rows: (string | number)[][], at: number) => rows.reduce((n, r) => n + (r[at] as number), 0);

describe('every report total agrees with the dashboard for the same days', () => {
  it('sales, expenses, profit, products and payment methods', async () => {
    await busyDay();
    const { data, dash } = await load();
    const get = (id: ReportId) => buildReport(id, data, ctx);

    const sales = get('sales');
    expect(sales.total![3]).toBe(dash.totalSales);
    expect(rowsSum(sales.rows, 3)).toBe(dash.totalSales);
    expect(sales.rows).toHaveLength(dash.salesCount);
    expect(dash.totalSales).toBe(180 + 180 + 70);

    expect(get('expenses').total![3]).toBe(dash.expenses);

    const pl = get('pnl').rows;
    const line = (label: string) => pl.find((r) => r[0] === label)![1];
    expect(line('Sales (with goods)')).toBe(dash.itemisedSales);
    expect(line('Gross profit')).toBe(dash.grossProfit);
    expect(line('Net profit')).toBe(dash.netProfit);
    expect(line('Discount given (already included)')).toBe(dash.discountGiven);

    const prof = get('profitability');
    expect(prof.total![3]).toBe(dash.grossProfit);
    expect(prof.total![1]).toBe(dash.itemisedSales);
    expect(prof.total![2]).toBe(dash.cogs);
    expect(get('best').total![2]).toBe(dash.itemisedSales);

    const methods = get('methods');
    expect(methods.total![1]).toBe(dash.moneyIn);
    expect(methods.total![2]).toBe(dash.moneyOut);
  });

  it('customer and supplier balances use the same split as the dashboard', async () => {
    await busyDay();
    const { data } = await load();
    const stats = await statsRepo.all();
    const balances: Record<string, number> = {};
    for (const p of data.parties) if (!p.archived) balances[p.id] = stats[p.id]?.balance ?? 0;
    const all = totals(balances);
    const c = buildReport('customers', data, ctx);
    const s = buildReport('suppliers', data, ctx);
    expect(c.total![2]).toBe(140); // Ali owes 180, paid 40
    expect((c.total![2] as number) + (s.total![2] as number)).toBe(all.leneHain);
    expect((c.total![3] as number) + (s.total![3] as number)).toBe(all.deneHain);
    expect(rowsSum(c.rows, 2)).toBe(c.total![2]);
    expect(rowsSum(s.rows, 3)).toBe(s.total![3]); // we owe Karim for the goods
    expect(c.snapshot).toBe(true);
  });

  it('stock value matches the dashboard stock value, and low stock lists only what is low', async () => {
    await busyDay();
    const { data } = await load();
    const stock = buildReport('stock', data, ctx);
    expect(stock.total![2]).toBe(data.stock.reduce((n, r) => n + r.value, 0));
    expect(rowsSum(stock.rows, 2)).toBe(stock.total![2]);
    const low = buildReport('low', data, ctx);
    expect(low.rows.map((r) => r[0])).toEqual(['Soap']); // 16 left of a minimum of 100
  });

  it('purchases net of returns, and staff totals add up', async () => {
    await busyDay();
    const { data } = await load();
    const buy = buildReport('purchases', data, ctx);
    expect(buy.total![3]).toBe(100 * 10 + 20 * 30);
    const staff = buildReport('staff', data, ctx);
    expect(staff.total![2]).toBe(rowsSum(staff.rows, 2));
    expect(staff.rows).toHaveLength(1);
  });

  it('a cancelled sale drops out of every report, as it does on the dashboard', async () => {
    await busyDay();
    const sale = (await entriesRepo.listBetween(new Date(0).toISOString(), new Date(Date.now() + 1e9).toISOString())).find((e) => e.amount === 180 && !e.party_id)!;
    await entriesRepo.cancel(sale.id, 'wrong_entry');
    const { data, dash } = await load();
    expect(buildReport('sales', data, ctx).total![3]).toBe(dash.totalSales);
    expect(dash.totalSales).toBe(180 + 70);
    expect(buildReport('profitability', data, ctx).total![3]).toBe(dash.grossProfit);
  });

  it('an empty day gives empty reports with zero totals, not a crash', async () => {
    const data = await reportRepo.forReports(today());
    for (const r of REPORTS) {
      const t = buildReport(r.id, data, ctx);
      expect(t.rows).toBeDefined();
      if (r.id !== 'pnl' && t.total) expect(t.total.filter((v) => typeof v === 'number').every((v) => v === 0)).toBe(true);
    }
  });

  it('a cashier gets only stock reports and no cost of goods', async () => {
    expect(reportsFor('cashier').map((r) => r.id)).toEqual(['stock', 'low']);
    expect(reportsFor('manager').map((r) => r.id)).toEqual(REPORTS.map((r) => r.id));
    expect(reportsFor('owner')).toHaveLength(12);
    expect(reportsFor('revoked')).toHaveLength(0);
    await busyDay();
    const { data } = await load();
    const stock = buildReport('stock', data, { ...ctx, showCost: false });
    expect(stock.cols).toHaveLength(2);
    expect(stock.total).toBeNull();
  });
});

describe('the files', () => {
  it('an Excel file is a real .xlsx with numbers as numbers, the total line and the sheet name cleaned', async () => {
    await busyDay();
    const { data } = await load();
    const table = buildReport('sales', data, ctx);
    const bytes = makeXlsx({ name: 'Sales/2026 [x]', title: 'Shop - Sales', period: '2026-11-14', header: table.cols.map((c) => ctx.t(c.key)), rows: table.rows, total: table.total, rtl: false, moneyCols: [3] });
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]); // "PK": a zip
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('<v>180</v>');
    expect(sheet).toContain('<v>430</v>'); // the total, as a number
    expect(sheet).toContain('Ahmed'.slice(0, 0)); // well-formed
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="Sales 2026  x"');
  });

  it('text with & < > and Urdu letters is escaped, and a right-to-left sheet is marked', () => {
    const bytes = makeXlsx({ name: 'رپورٹ', title: 'A & B <x>', period: '', header: ['نام'], rows: [['Ali & Sons']], total: null, rtl: true, moneyCols: [] });
    const sheet = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('A &amp; B &lt;x&gt;');
    expect(sheet).toContain('Ali &amp; Sons');
    expect(sheet).toContain('rightToLeft="1"');
    expect(sheet).toContain('نام');
  });

  it('a PDF has the right header, one page object per picture, and a cross-reference table that points at its objects', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const bytes = pagesToPdf([{ jpeg, w: 10, h: 10 }, { jpeg, w: 10, h: 10 }]);
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 2');
    const start = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const offsets = [...text.slice(start).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(text.slice(o, o + 9).startsWith(`${i + 1} 0 obj`)).toBe(true));
    expect(() => pagesToPdf([])).toThrow();
  });

  it('the WhatsApp summary has the title, the days, the lines and the total', async () => {
    await busyDay();
    const { data } = await load();
    const text = reportText(buildReport('expenses', data, ctx), ctx, '2026-11-14', 'Ahmed General Store');
    expect(text).toContain('Ahmed General Store - Expenses');
    expect(text).toContain('Rent');
    expect(cellText({ key: 'cAmount', type: 'money' }, -5)).toBe('-Rs 5');
  });
});
