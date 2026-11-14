import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { setDataContext } from './context';
import { BackupError, backupFileName, exportShop, readBackup, restoreFromBackup } from './backupFile';
import { conflictsRepo, differences } from './conflicts';
import { db } from './db';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { shopsRepo } from './shopsRepo';
import { statsRepo } from './statsRepo';
import { tradeRepo } from './tradeRepo';
import { createSync } from './sync/engine';
import { createFakeServer } from './sync/fakeRemote';
import { resetSyncState } from './sync/status';

const USER = '00000000-0000-4000-8000-0000000000f9';
const TABLES = [db.shops, db.parties, db.entries, db.audit_log, db.sync_meta, db.party_stats, db.products, db.stock_moves, db.product_stats, db.cash_closings];

beforeEach(async () => {
  await Promise.all(TABLES.map((t) => t.clear()));
  setDataContext({ userId: USER, shopId: null });
  resetSyncState();
});

async function aShop() {
  const shop = await shopsRepo.create({ shop_name: 'Ahmed General Store', language: 'ro' });
  const { party: karim } = await partiesRepo.create({ name: 'Karim', type: 'supplier' });
  const { party: ali } = await partiesRepo.create({ name: 'Ali', credit_limit: 1000 });
  const p = await productsRepo.create({ name: 'Biscuit', base_unit: 'piece', price_unit: 'piece', cost_price: 10, sell_price: 20 });
  const line = (q: number, pr: number) => [{ product_id: p.id, unit: 'piece', qty_base: q, unit_price: pr }];
  await tradeRepo.purchase({ supplier_id: karim.id, lines: line(100, 10) });
  const sale = await tradeRepo.sale({ party_id: ali.id, lines: line(10, 20) });
  await entriesRepo.create({ kind: 'mile', party_id: ali.id, amount: 50 });
  return { shop, karim, ali, p, sale };
}
const state = async () => ({
  entries: await db.entries.count(),
  moves: await db.stock_moves.count(),
  balances: Object.fromEntries(Object.entries(await statsRepo.all()).map(([id, s]) => [id, s.balance])),
  stock: (await productsRepo.listStock()).map((r) => [r.product.id, r.stock, r.value]),
});

describe('the backup file', () => {
  it('lets a khata that was wiped come back exactly, and the restored records also go to the server', async () => {
    const { shop } = await aShop();
    const before = await state();
    const { text, count } = await exportShop();
    expect(count).toBeGreaterThan(10);
    expect(text).not.toContain('pending_sync');
    await Promise.all([db.parties, db.entries, db.audit_log, db.party_stats, db.products, db.stock_moves, db.product_stats].map((t) => t.clear())); // the data is gone, the shop is still there
    const r = await restoreFromBackup(text);
    expect(r.added).toBe(count);
    expect(r.alreadyHere).toBe(0);
    expect(await state()).toEqual(before);
    expect(await statsRepo.verify(shop.id)).toEqual([]);
    expect(await productsRepo.verify()).toEqual([]);
    expect(await db.entries.where('pending_sync').equals(1).count()).toBe(before.entries); // they will reach the server
  });

  it('restoring twice, or on a phone that has everything, changes nothing', async () => {
    await aShop();
    const { text } = await exportShop();
    const before = await state();
    const r = await restoreFromBackup(text);
    expect(r.added).toBe(0);
    expect(r.alreadyHere).toBeGreaterThan(0);
    expect(await state()).toEqual(before);
  });

  it('never overwrites a record that is already on the phone', async () => {
    const { ali } = await aShop();
    const { text } = await exportShop(); // the mile of Rs 50 is active in the file
    const mile = (await entriesRepo.listForParty(ali.id)).find((e) => e.kind === 'mile')!;
    await entriesRepo.cancel(mile.id, 'wrong_entry');
    await restoreFromBackup(text);
    expect((await db.entries.get(mile.id))!.status).toBe('cancelled'); // still cancelled: the file did not bring it back
    await partiesRepo.update(ali.id, { name: 'Ali Raza' });
    await restoreFromBackup(text);
    expect((await db.parties.get(ali.id))!.name).toBe('Ali Raza');
  });

  it('a file from another shop, a damaged file or a file that is not a backup adds nothing', async () => {
    await aShop();
    const before = await state();
    const { file } = await exportShop();
    const tampered = (fn: (f: typeof file) => void) => {
      const copy = JSON.parse(JSON.stringify(file)) as typeof file;
      fn(copy);
      return JSON.stringify(copy);
    };
    const reason = async (text: string) => restoreFromBackup(text).then(() => 'none', (e) => (e as BackupError).reason);
    expect(await reason('not json')).toBe('notBackup');
    expect(await reason('{"hello":1}')).toBe('notBackup');
    expect(await reason(tampered((f) => { f.version = 99; }))).toBe('tooNew');
    expect(await reason(tampered((f) => { f.tables.entries[0].amount = -5; }))).toBe('damaged'); // a money record that breaks the rules
    expect(await reason(tampered((f) => { f.tables.stock_moves[0].qty_base = 1.5; }))).toBe('damaged');
    expect(await reason(tampered((f) => { (f.tables as Record<string, unknown>).parties = 'oops'; }))).toBe('damaged');
    expect(await reason(tampered((f) => { f.tables.entries[0].shop_id = 'somebody-else'; }))).toBe('damaged');
    expect(await reason(tampered((f) => { f.shop.id = 'other'; f.tables.parties.forEach((r) => { r.shop_id = 'other'; }); f.tables.entries.forEach((r) => { r.shop_id = 'other'; }); f.tables.audit_log.forEach((r) => { r.shop_id = 'other'; }); f.tables.products.forEach((r) => { r.shop_id = 'other'; }); f.tables.stock_moves.forEach((r) => { r.shop_id = 'other'; }); f.tables.cash_closings.forEach((r) => { r.shop_id = 'other'; }); }))).toBe('otherShop');
    expect(() => readBackup(JSON.stringify(file))).not.toThrow();
    expect(await state()).toEqual(before);
  });

  it('is named with the shop and the date, with no strange letters', () => {
    expect(backupFileName('Ahmed / General *Store', new Date('2026-11-14T10:00:00Z'))).toBe('hisabview-backup-Ahmed-General-Store-2026-11-14.json');
    expect(backupFileName('???', new Date('2026-11-14T10:00:00Z'))).toBe('hisabview-backup-shop-2026-11-14.json');
  });
});

describe('two phones changed the same customer', () => {
  it('this phone keeps its change, and the other version is written down for the owner (never silent)', async () => {
    const { ali } = await aShop();
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    expect(await sync.syncNow()).toBe('ok');
    // another phone raised Ali's limit to 9,000 on the server...
    const row = server.tables.parties.get(ali.id)!;
    row.credit_limit = 9000;
    row.updated_at = '2999-01-01T00:00:00+00:00';
    // ...while this phone, offline, set it to 2,000
    await partiesRepo.update(ali.id, { credit_limit: 2000 });
    const shopId = (await shopsRepo.getMine())!.id;
    expect(await sync.syncNow({ pull: true })).toBe('ok');
    const list = await conflictsRepo.list(shopId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Ali', table: 'parties' });
    expect(list[0].fields).toEqual([{ field: 'credit_limit', mine: 2000, theirs: 9000 }]);
    expect((await db.parties.get(ali.id))!.credit_limit).toBe(2000);
    expect(server.tables.parties.get(ali.id)!.credit_limit).toBe(2000); // this phone's change went up
    await conflictsRepo.dismiss(shopId, list[0].id);
    expect(await conflictsRepo.count(shopId)).toBe(0);
  });

  it('only real differences are noted, and the same record is noted once', async () => {
    expect(differences('products', { id: 'p', name: 'A', cost_price: 10, sell_price: 20 }, { id: 'p', name: 'A', cost_price: 10, sell_price: 20 })).toEqual([]);
    expect(differences('products', { id: 'p', cost_price: 10, barcode: null }, { id: 'p', cost_price: 12, barcode: undefined }).map((f) => f.field)).toEqual(['cost_price']);
    const shop = 's1';
    await conflictsRepo.record(shop, 'products', { id: 'p', name: 'A', sell_price: 20 }, { id: 'p', name: 'A', sell_price: 25 });
    await conflictsRepo.record(shop, 'products', { id: 'p', name: 'A', sell_price: 20 }, { id: 'p', name: 'A', sell_price: 30 });
    const list = await conflictsRepo.list(shop);
    expect(list).toHaveLength(1);
    expect(list[0].fields[0].theirs).toBe(30);
    expect(await conflictsRepo.record(shop, 'products', { id: 'q', name: 'B' }, { id: 'q', name: 'B' })).toBe(false);
  });
});
