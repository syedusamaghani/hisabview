// A whole shop day, offline: opening cash -> buying stock -> sales (cash, digital, udhaar) -> expense -> customer payment
// -> closing. Then the internet comes back, everything syncs, a second phone is restored from the server, and every number
// (dashboard, cash drawer, customer balances, stock, reports) is the same on both phones.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { dayKeyOf } from '../../lib/cashbook';
import { rangeMs, summarize } from '../../lib/profit';
import { buildReport, REPORTS, type Ctx } from '../../lib/reports';
import { english } from '../../i18n/english';
import { attachShop, setDataContext } from '../context';
import { cashRepo } from '../cashRepo';
import { db } from '../db';
import { entriesRepo } from '../entriesRepo';
import { partiesRepo } from '../partiesRepo';
import { productsRepo } from '../productsRepo';
import { reportRepo } from '../reportRepo';
import { shopsRepo } from '../shopsRepo';
import { statsRepo } from '../statsRepo';
import { tradeRepo } from '../tradeRepo';
import { createSync } from './engine';
import { createFakeServer, type FakeServer } from './fakeRemote';
import { RemoteError } from './remote';
import { describeSync, getSyncState, resetSyncState } from './status';

const USER = '00000000-0000-4000-8000-0000000000e9';
const ctx: Ctx = { t: (k) => (english as Record<string, string>)[k] ?? k, lang: 'en', who: (id) => id.slice(0, 4), qty: (n) => String(n), showCost: true };
const TABLES = [db.shops, db.parties, db.entries, db.audit_log, db.sync_meta, db.party_stats, db.products, db.stock_moves, db.product_stats, db.cash_closings];

let server: FakeServer;
let sync: ReturnType<typeof createSync>;
const wipePhone = async () => {
  await Promise.all(TABLES.map((t) => t.clear()));
  setDataContext({ userId: USER, shopId: null });
};
beforeEach(async () => {
  await wipePhone();
  resetSyncState();
  server = createFakeServer(USER);
  sync = createSync(async () => server);
});

const today = () => dayKeyOf(new Date());
const yesterday = () => dayKeyOf(new Date(Date.now() - 86_400_000));

// Everything a shopkeeper looks at, as plain numbers
async function numbers() {
  const range = { from: today(), to: today() };
  const input = await reportRepo.load(range);
  const { fromMs, toMs } = rangeMs(range);
  const dash = summarize(input, fromMs, toMs);
  const data = await reportRepo.forReports(range);
  const stats = await statsRepo.all();
  const cash = (await cashRepo.cashbookFor(today())).day;
  return {
    dash: { sales: dash.totalSales, itemised: dash.itemisedSales, cogs: dash.cogs, gross: dash.grossProfit, expenses: dash.expenses, net: dash.netProfit, moneyIn: dash.moneyIn, moneyOut: dash.moneyOut, digital: dash.digitalReceived },
    cash: { opening: cash.opening, in: cash.cashIn, out: cash.cashOut, closing: cash.closing },
    balances: Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, s.balance])),
    stock: Object.fromEntries((await productsRepo.listStock()).map((r) => [r.product.id, [r.stock, r.value]])),
    totals: Object.fromEntries(REPORTS.filter((r) => r.id !== 'staff').map((r) => [r.id, buildReport(r.id, data, ctx).total])),
    pnl: buildReport('pnl', data, ctx).rows,
  };
}

async function theDay() {
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali', phone: '0300-1234567', credit_limit: 5000 });
  const { party: sana } = await partiesRepo.create({ name: 'Sana' });
  const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20, min_stock: 20 });
  const soap = await productsRepo.create({ name: 'Soap', base_unit: 'piece', price_unit: 'piece', cost_price: 30, sell_price: 45 });
  const line = (p: { id: string }, qty: number, price: number) => ({ product_id: p.id, unit: 'piece', qty_base: qty, unit_price: price });

  // 1. opening cash: yesterday the drawer was counted at Rs 5,000
  await cashRepo.close({ day: yesterday(), opening_cash: 0, expected_cash: 5000, counted_cash: 5000 });
  // 2. a purchase on credit, Rs 1,000 paid in cash
  await tradeRepo.purchase({ supplier_id: karim.id, paid: 1000, method: 'cash', lines: [line(biscuit, 100, 10), line(soap, 20, 30)] });
  // 3. sales: cash with a discount and a free piece, digital, udhaar, and a plain one-amount cash sale
  await tradeRepo.sale({ lines: [line(biscuit, 10, 20), line(biscuit, 1, 0)], discount: 20 }); // Rs 180 cash
  await tradeRepo.sale({ method: 'jazzcash', lines: [line(soap, 4, 45)] }); // Rs 180 digital
  await tradeRepo.sale({ party_id: ali.id, lines: [line(biscuit, 20, 20)] }); // Rs 400 on udhaar
  await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 70 });
  // 4. an expense, and a customer pays part of the udhaar
  await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 100, category: 'rent' });
  await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 150, method: 'cash' });
  // 5. a mistake is cancelled
  const wrong = await entriesRepo.create({ kind: 'diye', party_id: sana.id, amount: 999 });
  await entriesRepo.cancel(wrong.id, 'wrong_entry');
  // 6. closing: count the drawer (exactly what the app expected)
  const book = (await cashRepo.cashbookFor(today())).day;
  await cashRepo.close({ day: today(), opening_cash: book.opening, expected_cash: book.closing, counted_cash: book.closing });
  return { karim, ali, sana, biscuit, soap };
}

describe('a whole day offline, then online', () => {
  it('the day adds up on the phone: every report agrees with the dashboard and the drawer', async () => {
    await theDay();
    const n = await numbers();
    expect(n.dash.sales).toBe(180 + 180 + 400 + 70);
    expect(n.cash.opening).toBe(5000);
    // cash in: 180 sale + 70 plain + 150 from Ali; cash out: 1,000 to the supplier + 100 rent
    expect(n.cash.in).toBe(180 + 70 + 150);
    expect(n.cash.out).toBe(1000 + 100);
    expect(n.cash.closing).toBe(5000 + 400 - 1100);
    expect(n.dash.digital).toBe(180);
    expect(n.dash.net).toBe(n.dash.gross - 100);
    expect(n.totals.sales![3]).toBe(n.dash.sales);
    expect(n.totals.expenses![3]).toBe(100);
    expect(n.totals.profitability![3]).toBe(n.dash.gross);
    expect(Object.values(n.stock).map((s) => s[0])).toEqual(expect.arrayContaining([100 - 11 - 20, 20 - 4]));
  });

  it('with no internet nothing is lost; when it returns everything goes once, and a second phone shows the same numbers', async () => {
    await theDay();
    const before = await numbers();
    server.offline = true;
    expect(await sync.syncNow()).toBe('offline');
    expect(describeSync(getSyncState())).toBe('queued');
    expect(getSyncState().pending).toBeGreaterThan(0);
    expect(await numbers()).toEqual(before); // still the same on the phone

    server.offline = false;
    expect(await sync.syncNow()).toBe('ok');
    expect(describeSync(getSyncState())).toBe('synced');
    expect(server.tables.stock_moves.size).toBe(await db.stock_moves.count());
    expect(server.tables.cash_closings.size).toBe(2);
    expect(server.tables.entries.size).toBe(await db.entries.count());

    // a second round changes nothing (sending twice is harmless)
    const sizes = Object.values(server.tables).map((t) => t.size);
    await db.entries.toCollection().modify({ pending_sync: 1 });
    await db.stock_moves.toCollection().modify({ pending_sync: 1 });
    expect(await sync.syncNow()).toBe('ok');
    expect(Object.values(server.tables).map((t) => t.size)).toEqual(sizes);

    await wipePhone(); // a new phone
    expect(await sync.restore()).toBe('restored');
    attachShop((await shopsRepo.getMine())!.id);
    expect(await numbers()).toEqual(before);
    expect(await productsRepo.verify()).toEqual([]);
    expect(await statsRepo.verify((await shopsRepo.getMine())!.id)).toEqual([]);
  });

  it('the network dies in the middle of sending: the phone keeps everything, and the next round finishes with no duplicates', async () => {
    await theDay();
    const before = await numbers();
    let calls = 0;
    const real = server.upsert.bind(server);
    server.upsert = async (...args) => {
      if (++calls > 3) throw new RemoteError('network', 'Failed to fetch'); // shop, customers, entries... then the line drops
      return real(...args);
    };
    expect(await sync.syncNow()).toBe('offline');
    expect(await db.entries.count()).toBeGreaterThan(0);
    expect(getSyncState().pending).toBeGreaterThan(0); // the rest is still waiting on the phone
    expect(server.tables.stock_moves.size).toBeLessThan(await db.stock_moves.count());

    server.upsert = real;
    expect(await sync.syncNow()).toBe('ok');
    expect(server.tables.entries.size).toBe(await db.entries.count());
    expect(server.tables.stock_moves.size).toBe(await db.stock_moves.count());
    await wipePhone();
    await sync.restore();
    attachShop((await shopsRepo.getMine())!.id);
    expect(await numbers()).toEqual(before);
  });

  it('a save that fails half way saves nothing: no entry without its goods, no goods without their entry', async () => {
    const { biscuit } = await theDay();
    const entries = await db.entries.count();
    const moves = await db.stock_moves.count();
    const line = (qty: number) => ({ product_id: biscuit.id, unit: 'piece', qty_base: qty, unit_price: 20 });
    // the second line names a product that does not exist, so the whole bill must be refused
    await expect(tradeRepo.sale({ lines: [line(1), { product_id: 'nope', unit: 'piece', qty_base: 1, unit_price: 5 }] })).rejects.toThrow();
    expect(await db.entries.count()).toBe(entries);
    expect(await db.stock_moves.count()).toBe(moves);
  });
});
