import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { attachShop, setDataContext } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { adoptGuestData, entryCount } from './guestRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { shopsRepo } from './shopsRepo';
import { ensureSimpleMode, hiddenInSimple, setSimpleMode, usesMoreThanKhata } from './simpleMode';
import { statsRepo } from './statsRepo';
import { createSync } from './sync/engine';
import { createFakeServer } from './sync/fakeRemote';
import { resetSyncState } from './sync/status';
import { parseAmount } from '../voice/amount';

// The tests run without a browser: a small stand-in for the phone's localStorage
const store = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
} as unknown as Storage;

const GUEST ='11111111-1111-4111-8111-111111111111';
const USER = '00000000-0000-4000-8000-0000000000aa';
const TABLES = [db.shops, db.parties, db.entries, db.audit_log, db.sync_meta, db.party_stats, db.products, db.stock_moves, db.product_stats, db.cash_closings];

beforeEach(async () => {
  await Promise.all(TABLES.map((t) => t.clear()));
  localStorage.clear();
  resetSyncState();
});

async function guestKhata() {
  setDataContext({ userId: GUEST, shopId: null });
  const shop = await shopsRepo.create({ shop_name: 'Ahmed Store', language: 'ro' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali' });
  await entriesRepo.create({ kind: 'diye', party_id: ali.id, amount: 500 });
  await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 200 });
  return { shop, ali };
}

describe('working without a login', () => {
  it('after login the guest khata belongs to the real login and goes to the server with nothing lost', async () => {
    const { shop, ali } = await guestKhata();
    expect(await entryCount()).toBe(2);
    expect(await adoptGuestData(GUEST, USER)).toBe(true);
    setDataContext({ userId: USER, shopId: null });
    expect((await shopsRepo.getMine())!.id).toBe(shop.id);
    attachShop(shop.id);
    expect((await db.entries.toArray()).every((e) => e.created_by === USER)).toBe(true);
    expect((await db.audit_log.toArray()).every((a) => a.actor === USER)).toBe(true);

    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    expect(await sync.syncNow({ pull: true })).toBe('ok');
    expect(server.tables.shops.get(shop.id)!.owner_user_id).toBe(USER);
    expect(server.tables.entries.size).toBe(2);
    expect(server.tables.parties.get(ali.id)!.name).toBe('Ali');
    expect((await statsRepo.all())[ali.id].balance).toBe(300);
  });

  it('a login that already has a shop on the server takes the guest records into it', async () => {
    // the login's shop lives on the server (made on another phone)
    setDataContext({ userId: USER, shopId: null });
    const other = await shopsRepo.create({ shop_name: 'Ahmed Store', language: 'ro' });
    const { party: sara } = await partiesRepo.create({ name: 'Sara' });
    await entriesRepo.create({ kind: 'diye', party_id: sara.id, amount: 100 });
    const server = createFakeServer(USER);
    expect(await createSync(async () => server).syncNow({ pull: true })).toBe('ok');
    await Promise.all(TABLES.map((t) => t.clear())); // a phone that has never seen that shop

    const { ali } = await guestKhata();
    await adoptGuestData(GUEST, USER);
    setDataContext({ userId: USER, shopId: null });
    expect(await createSync(async () => server).syncNow({ pull: true })).toBe('ok');
    const mine = (await shopsRepo.getMine())!;
    expect(mine.id).toBe(other.id); // the server's shop wins, the guest records moved into it
    expect(server.tables.parties.get(ali.id)!.shop_id).toBe(other.id);
    expect(server.tables.parties.get(sara.id)).toBeTruthy();
    expect(server.tables.entries.size).toBe(3);
  });

  it('adopting twice, or with nothing to adopt, changes nothing', async () => {
    await guestKhata();
    await adoptGuestData(GUEST, USER);
    expect(await adoptGuestData(GUEST, USER)).toBe(false);
    expect(await db.shops.count()).toBe(1);
  });
});

describe('simple mode', () => {
  it('a new shop starts simple; a shop that already uses stock, sales or the cashbook keeps everything on', async () => {
    const { shop } = await guestKhata();
    expect(await usesMoreThanKhata(shop.id)).toBe(false);
    expect(await ensureSimpleMode(shop.id)).toBe(true);

    await Promise.all(TABLES.map((t) => t.clear()));
    localStorage.clear();
    const a = await guestKhata();
    await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20 });
    expect(await ensureSimpleMode(a.shop.id)).toBe(false);

    await Promise.all(TABLES.map((t) => t.clear()));
    localStorage.clear();
    const b = await guestKhata();
    await entriesRepo.create({ kind: 'kharcha', party_id: null, amount: 50 });
    expect(await ensureSimpleMode(b.shop.id)).toBe(false);
  });

  it('the saved choice wins, and the switch turns the other screens on again', async () => {
    const { shop } = await guestKhata();
    expect(await ensureSimpleMode(shop.id)).toBe(true);
    setSimpleMode(shop.id, false);
    expect(await ensureSimpleMode(shop.id)).toBe(false);
  });

  it('the hidden screens are the stock, cash, profit, team, alerts and report screens', () => {
    for (const p of ['/stock', '/stock/buy', '/cashbook', '/cashbook/close', '/expenses', '/team', '/activity', '/alerts', '/dashboard', '/profit', '/movers', '/reports', '/today', '/today/sale', '/today/kharcha']) expect(hiddenInSimple(p), p).toBe(true);
    for (const p of ['/', '/customers', '/settings', '/party/new', '/party/abc', '/party/abc/diye', '/party/abc/remind', '/entry/diye', '/voice', '/privacy']) expect(hiddenInSimple(p), p).toBe(false);
  });
});

describe('the small mic: a number said aloud', () => {
  it('reads digits and number words in Roman Urdu, Urdu and English', async () => {
    expect(await parseAmount('500')).toBe(500);
    expect(await parseAmount('Rs 1,500')).toBe(1500);
    expect(await parseAmount('۲۵۰')).toBe(250);
    expect(await parseAmount('paanch sau')).toBe(500);
    expect(await parseAmount('five hundred')).toBe(500);
    expect(await parseAmount('پانچ سو')).toBe(500);
    expect(await parseAmount('dhai hazar')).toBe(2500);
  });
  it('gives nothing when no number was said', async () => {
    expect(await parseAmount('')).toBeNull();
    expect(await parseAmount('hello')).toBeNull();
    expect(await parseAmount('0')).toBeNull();
  });
});
