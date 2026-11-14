import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { dayKeyOf } from '../lib/cashbook';
import { alertsRepo, getAlertPrefs, setAlertPrefs } from './alertsRepo';
import { setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { shopsRepo } from './shopsRepo';
import { teamRepo } from './teamRepo';
import { tradeRepo } from './tradeRepo';

const OWNER = '00000000-0000-4000-8000-0000000000a1';
const SARA = '00000000-0000-4000-8000-0000000000a2';
let shopId = '';

beforeEach(async () => {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear(), db.cash_closings.clear(), db.sync_meta.clear()]);
  setDataContext({ userId: OWNER, shopId: null });
  shopId = (await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' })).id;
});

const as = (userId: string) => setDataContext({ userId, shopId });
const today = () => {
  const d = dayKeyOf(new Date());
  return { from: d, to: d };
};

describe('who did what, from real records', () => {
  it('the owner sees a cashier sale, who cancelled it and why', async () => {
    const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20, opening_qty_base: 50 });
    as(SARA);
    const sale = await tradeRepo.sale({ lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 5, unit_price: 20 }] });
    const plain = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 300 });
    as(OWNER);
    await entriesRepo.cancel(plain.id, 'wrong_entry');

    const feed = await teamRepo.feed({ user: null, action: null, what: null });
    const saved = feed.find((r) => r.action === 'create' && r.amount === 300);
    expect(saved?.actor).toBe(SARA);
    const cancel = feed.find((r) => r.action === 'cancel');
    expect(cancel).toMatchObject({ actor: OWNER, what: 'sale', amount: 300, reason: 'wrong_entry' });

    // filter by person and by action
    expect((await teamRepo.feed({ user: SARA, action: null, what: null })).every((r) => r.actor === SARA)).toBe(true);
    expect(await teamRepo.feed({ user: null, action: 'cancel', what: null })).toHaveLength(1);

    // staff-wise sales: Sara's goods sale (100) counts; the cancelled plain sale does not
    const work = await teamRepo.staffWork(today());
    const sara = work.stats.find((s) => s.user_id === SARA)!;
    expect(sara.sales).toBe(sale.entry.amount);
    expect(sara.salesCount).toBe(1);
    expect(work.stats.find((s) => s.user_id === OWNER)?.cancelled).toBe(1);
    // cashier-wise history keeps the cancelled entry, marked
    expect(work.entries.filter((e) => e.created_by === SARA).map((e) => e.status).sort()).toEqual(['active', 'cancelled']);
  });

  it('a stock correction is in the feed with the person and the reason', async () => {
    const p = await productsRepo.create({ name: 'Soap', base_unit: 'piece', price_unit: 'piece', cost_price: 30, sell_price: 40, opening_qty_base: 10 });
    as(SARA);
    await productsRepo.adjust(p.id, 'damaged', 2, 'toot gaye');
    const feed = await teamRepo.feed({ user: SARA, action: null, what: 'stock' });
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ actor: SARA, what: 'stock', reason: 'toot gaye' });
  });
});

describe('alerts from real records', () => {
  it('low stock, a large discount and a cancelled entry by someone else are found; switching a kind off hides it', async () => {
    const p = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20, min_stock: 10, opening_qty_base: 12 });
    as(SARA);
    await tradeRepo.sale({ lines: [{ product_id: p.id, unit: 'piece', qty_base: 5, unit_price: 12 }] }); // 40% under 20, leaves 7 (low)
    const plain = await entriesRepo.create({ kind: 'cash_sale', party_id: null, amount: 80 });
    await entriesRepo.cancel(plain.id, 'wrong_entry');
    as(OWNER);

    const { alerts } = await alertsRepo.load({ sales: 60, expenses: 0, profit: 10 });
    expect(alerts.map((a) => a.kind)).toEqual(['lowStock', 'discount', 'cancelled', 'summary']);
    expect(alerts.find((a) => a.kind === 'discount')).toMatchObject({ pct: 40, actor: SARA });
    expect(alerts.find((a) => a.kind === 'cancelled')).toMatchObject({ actor: SARA, amount: 80, reason: 'wrong_entry' });

    await setAlertPrefs(OWNER, { ...(await getAlertPrefs(OWNER)), discount: false, summary: false });
    expect((await alertsRepo.load(null)).alerts.map((a) => a.kind)).toEqual(['lowStock', 'cancelled']);
    // the choice belongs to the login: the cashier's phone still has everything on
    expect((await getAlertPrefs(SARA)).discount).toBe(true);
  });

  it('an unpaid promise that has passed is an alert, and goes away once the customer has paid', async () => {
    const { party } = await partiesRepo.create({ name: 'Ali' });
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    await entriesRepo.create({ kind: 'diye', party_id: party.id, amount: 450, promise_date: past });
    expect((await alertsRepo.load(null)).alerts).toMatchObject([{ kind: 'overdue', party: 'Ali', amount: 450 }]);
    await entriesRepo.create({ kind: 'mile', party_id: party.id, amount: 450 });
    expect((await alertsRepo.load(null)).alerts).toHaveLength(0);
  });
});
