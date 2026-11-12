import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { toBase } from '../../lib/stock';
import { attachShop, setDataContext } from '../context';
import { db } from '../db';
import { partiesRepo } from '../partiesRepo';
import { productsRepo } from '../productsRepo';
import { shopsRepo } from '../shopsRepo';
import { statsRepo } from '../statsRepo';
import { tradeRepo } from '../tradeRepo';
import { entriesRepo } from '../entriesRepo';
import { createSync } from './engine';
import { createFakeServer, type FakeServer } from './fakeRemote';
import { getSyncState, resetSyncState } from './status';

const USER = '00000000-0000-4000-8000-0000000000bb';

let server: FakeServer;
let sync: ReturnType<typeof createSync>;

async function wipePhone() {
  await Promise.all([db.shops.clear(), db.parties.clear(), db.entries.clear(), db.audit_log.clear(), db.sync_meta.clear(), db.party_stats.clear(), db.products.clear(), db.stock_moves.clear(), db.product_stats.clear()]);
  setDataContext({ userId: USER, shopId: null });
}

beforeEach(async () => {
  await wipePhone();
  resetSyncState();
  server = createFakeServer(USER);
  sync = createSync(async () => server);
});

// Biscuit bought by the carton from a supplier, then 30 pieces sold
async function stockedShop() {
  await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const { party: karim } = await partiesRepo.create({ name: 'Karim Traders', type: 'supplier' });
  const biscuit = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', units: [{ name: 'carton', factor: 144 }], price_unit: 'piece', cost_price: 10, sell_price: 12 });
  const bought = await tradeRepo.purchase({ supplier_id: karim.id, paid: 1000, lines: [{ product_id: biscuit.id, unit: 'carton', qty_base: toBase('2', 144)!, unit_price: 1440 }] });
  const sold = await tradeRepo.sale({ lines: [{ product_id: biscuit.id, unit: 'piece', qty_base: 30, unit_price: 12 }] });
  return { karim, biscuit, bought, sold };
}

const pendingStock = async () => (await db.products.where('pending_sync').equals(1).count()) + (await db.stock_moves.where('pending_sync').equals(1).count());

describe('stock goes to the server and comes back', () => {
  it('sends products, purchases and movements, and marks them sent', async () => {
    const { biscuit, bought } = await stockedShop();
    expect(await pendingStock()).toBeGreaterThan(0);
    expect(await sync.syncNow()).toBe('ok');
    expect(await pendingStock()).toBe(0);
    expect(server.tables.products.get(biscuit.id)?.name).toBe('Biscuit');
    expect(server.tables.products.get(biscuit.id)?.units).toEqual([{ name: 'carton', factor: 144 }]);
    expect(server.tables.stock_moves.size).toBe(2);
    expect(server.tables.entries.get(bought.entry.id)).toMatchObject({ kind: 'purchase', amount: 2880 });
    expect([...server.tables.stock_moves.values()].reduce((sum, m) => sum + Number(m.qty_base), 0)).toBe(258);
    expect(getSyncState().pending).toBe(0);
  });

  it('a new phone with the same login gets the same stock, value and supplier balance', async () => {
    const { biscuit, karim } = await stockedShop();
    await sync.syncNow();
    await wipePhone();
    expect(await sync.restore()).toBe('restored');
    attachShop((await shopsRepo.getMine())!.id); // the app does this once the shop appears
    const row = (await productsRepo.listStock()).find((r) => r.product.id === biscuit.id)!;
    expect(row.stock).toBe(258);
    expect(row.value).toBe(2580);
    expect((await statsRepo.all())[karim.id].balance).toBe(-1880);
    expect(await productsRepo.verify()).toEqual([]);
  });

  it('stock from another phone arrives with a pull, and the totals follow', async () => {
    const { biscuit } = await stockedShop();
    await sync.syncNow();
    // the other phone sells 10 more
    const m = await db.stock_moves.toCollection().first();
    server.tables.stock_moves.set('77777777-7777-4777-8777-777777777777', {
      ...server.tables.stock_moves.get(m!.id)!, id: '77777777-7777-4777-8777-777777777777', kind: 'sale', qty_base: -10, entry_id: null, party_id: null, reverses: null, created_at: '2026-11-05T10:00:00+00:00',
    });
    expect(await sync.syncNow({ pull: true })).toBe('ok');
    expect((await productsRepo.listStock()).find((r) => r.product.id === biscuit.id)!.stock).toBe(248);
  });

  it('a cancelled sale sends its reversal too, so another phone puts the stock back', async () => {
    const { biscuit, sold } = await stockedShop();
    await sync.syncNow();
    await entriesRepo.cancel(sold.entry.id, 'wrong_entry');
    await sync.syncNow();
    expect([...server.tables.stock_moves.values()].filter((m) => m.kind === 'reversal')).toHaveLength(1);
    await wipePhone();
    await sync.restore();
    attachShop((await shopsRepo.getMine())!.id);
    expect((await productsRepo.listStock()).find((r) => r.product.id === biscuit.id)!.stock).toBe(288);
  });

  it('sending a movement twice does not double the stock', async () => {
    const { biscuit } = await stockedShop();
    await sync.syncNow();
    await db.stock_moves.toCollection().modify({ pending_sync: 1 });
    await sync.syncNow();
    expect(server.tables.stock_moves.size).toBe(2);
    expect([...server.tables.stock_moves.values()].reduce((sum, m) => sum + Number(m.qty_base), 0)).toBe(258);
    expect((await productsRepo.listStock()).find((r) => r.product.id === biscuit.id)!.stock).toBe(258);
  });

  it('a product edited on this phone is not overwritten by an older copy from the server', async () => {
    const { biscuit } = await stockedShop();
    await sync.syncNow();
    await productsRepo.update(biscuit.id, { sell_price: 15 });
    await sync.syncNow({ pull: true });
    expect((await productsRepo.get(biscuit.id))?.sell_price).toBe(15);
    expect(server.tables.products.get(biscuit.id)?.sell_price).toBe(15);
  });
});

describe('a server that has not run migration 0006 yet', () => {
  it('the rest of the khata still syncs, and stock waits quietly', async () => {
    server.supportsStock = false;
    const { biscuit, karim } = await stockedShop();
    // the purchase and the sale are money entries: they are refused by an old server only if their kind is unknown;
    // the fake accepts them, like a server whose entries table already knows them
    const result = await sync.syncNow();
    expect(result).toBe('ok');
    expect(server.tables.shops.size).toBe(1);
    expect(server.tables.parties.get(karim.id)).toBeDefined();
    expect(await db.products.get(biscuit.id).then((p) => p?.pending_sync)).toBe(1); // still waiting, nothing lost
    expect(getSyncState().pending).toBe(0); // and not counted as a problem on Home
  });

  it('after the server is ready, the waiting stock goes', async () => {
    server.supportsStock = false;
    await stockedShop();
    await sync.syncNow();
    server.supportsStock = true;
    sync = createSync(async () => server); // the next time the app opens
    expect(await sync.syncNow()).toBe('ok');
    expect(await pendingStock()).toBe(0);
    expect(server.tables.stock_moves.size).toBe(2);
  });
});
