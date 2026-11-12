// Runs ALL the SQL files (0001 to 0006) in a small in-memory Postgres (PGlite) and checks the Phase 3 rules:
// products, add-only stock movements, purchases on a supplier's account, roles, and the khata from before surviving.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';

const sql = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');

const OWNER = '00000000-0000-0000-0000-0000000000b1';
const MANAGER = '00000000-0000-0000-0000-0000000000b2';
const CASHIER = '00000000-0000-0000-0000-0000000000b3';
const STRANGER = '00000000-0000-0000-0000-0000000000b4';
const SHOP = '10000000-0000-0000-0000-0000000000b1';
const OTHER_SHOP = '10000000-0000-0000-0000-0000000000b2';
const ALI = '20000000-0000-0000-0000-0000000000b1';
const SUPPLIER = '20000000-0000-0000-0000-0000000000b5';
const OLD_ENTRY = '30000000-0000-0000-0000-0000000000b1';
const PRODUCT = '60000000-0000-0000-0000-0000000000b1';

let db: PGlite;
let n = 0;
const id = () => `40000000-0000-0000-0000-${String(++n).padStart(12, '0')}`;

async function as<T>(user: string, email: string, run: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false); select set_config('request.jwt.claims', '{"sub":"${user}","email":"${email}"}', false);`);
  try {
    return await run();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`);
  }
}
const asOwner = <T>(run: () => Promise<T>) => as(OWNER, 'owner@shop.pk', run);
const asManager = <T>(run: () => Promise<T>) => as(MANAGER, 'manager@shop.pk', run);
const asCashier = <T>(run: () => Promise<T>) => as(CASHIER, 'cashier@shop.pk', run);
const asStranger = <T>(run: () => Promise<T>) => as(STRANGER, 'stranger@x.pk', run);

const fails = async (run: () => Promise<unknown>, pattern: RegExp) => {
  await expect(run()).rejects.toThrow(pattern);
};

const moveSql = (m: { id: string; kind: string; qty: number; user: string; product?: string; entry?: string | null; reverses?: string | null; total?: number }) =>
  `insert into stock_moves (id, shop_id, product_id, entry_id, kind, qty_base, unit, unit_factor, unit_price, line_total, reverses, created_by)
   values ('${m.id}', '${SHOP}', '${m.product ?? PRODUCT}', ${m.entry ? `'${m.entry}'` : 'null'}, '${m.kind}', ${m.qty}, 'piece', 1, 10, ${m.total ?? 0}, ${m.reverses ? `'${m.reverses}'` : 'null'}, '${m.user}')
   on conflict (id) do nothing`;
const stockNow = async () => Number((await db.query<{ stock_base: string }>(`select stock_base::text from product_stock where product_id = '${PRODUCT}'`)).rows[0].stock_base);
const balanceOf = async (party: string) => (await db.query<{ balance: string }>(`select balance::text from party_balances where party_id = '${party}'`)).rows[0].balance;
const entry = (e: { id: string; kind: string; amount: number; party?: string | null; user: string; invoice?: string; ref?: string }) =>
  `insert into entries (id, shop_id, party_id, kind, amount, invoice_no, ref_id, created_by) values ('${e.id}', '${SHOP}', ${e.party ? `'${e.party}'` : 'null'}, '${e.kind}', ${e.amount}, ${e.invoice ? `'${e.invoice}'` : 'null'}, ${e.ref ? `'${e.ref}'` : 'null'}, '${e.user}')`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    insert into auth.users values ('${OWNER}', 'owner@shop.pk'), ('${MANAGER}', 'manager@shop.pk'), ('${CASHIER}', 'cashier@shop.pk'), ('${STRANGER}', 'stranger@x.pk');
  `);
  // the khata as it was before this phase (files 0001 to 0005), with real data in it
  for (const f of ['0001_tables.sql', '0002_security.sql', '0003_sync.sql', '0004_feedback_errors.sql', '0005_roles_audit_integrity.sql']) await db.exec(sql(f));
  await db.exec(`
    insert into shops (id, owner_user_id, shop_name) values ('${SHOP}', '${OWNER}', 'Ahmed General Store'), ('${OTHER_SHOP}', '${STRANGER}', 'Other Store');
    insert into shop_members (shop_id, user_id, role) values ('${SHOP}', '${MANAGER}', 'manager'), ('${SHOP}', '${CASHIER}', 'cashier');
    insert into parties (id, shop_id, name) values ('${ALI}', '${SHOP}', 'Ali');
    insert into parties (id, shop_id, name, type) values ('${SUPPLIER}', '${SHOP}', 'Karim Traders', 'supplier');
    insert into entries (id, shop_id, party_id, kind, amount, created_by, created_at) values ('${OLD_ENTRY}', '${SHOP}', '${ALI}', 'diye', 1000, '${OWNER}', '2026-10-01T10:00:00Z');
  `);
  await db.exec(sql('0006_stock_purchases.sql'));
}, 60000);

describe('migration 0006 on a khata with data', () => {
  test('old entries and balances are untouched', async () => {
    const old = await db.query<{ amount: string; kind: string }>(`select amount::text, kind from entries where id = '${OLD_ENTRY}'`);
    expect(old.rows[0]).toEqual({ amount: '1000', kind: 'diye' });
    expect(await balanceOf(ALI)).toBe('1000');
  });

  test('running it again on the same database is refused cleanly, not half applied', async () => {
    await expect(db.exec(sql('0006_stock_purchases.sql'))).rejects.toThrow(/already exists/);
    expect(await balanceOf(ALI)).toBe('1000');
  });
});

describe('products', () => {
  const make = `insert into products (id, shop_id, name, base_unit, units, price_unit, cost_price, sell_price, min_stock)
                values ('${PRODUCT}', '${SHOP}', 'Biscuit', 'piece', '[{"name":"carton","factor":144}]', 'piece', 10, 12, 20)`;

  test('a manager makes a product, a cashier cannot, and the server writes the diary', async () => {
    await fails(() => asCashier(() => db.exec(make)), /row-level security/);
    await asManager(() => db.exec(make));
    const diary = await db.query<{ entity: string; action: string }>(`select entity, action from audit_log where entity_id = '${PRODUCT}' and origin = 'server'`);
    expect(diary.rows).toEqual([{ entity: 'product', action: 'create' }]);
    await asManager(() => db.exec(`update products set sell_price = 13 where id = '${PRODUCT}'`));
    expect((await db.query(`select 1 from audit_log where entity_id = '${PRODUCT}' and action = 'edit'`)).rows).toHaveLength(1);
    await fails(() => asOwner(() => db.exec(`delete from products where id = '${PRODUCT}'`)), /permission denied/);
    await fails(() => asCashier(() => db.exec(`update products set sell_price = 1 where id = '${PRODUCT}'`)), /row-level security|0 rows|cannot/i).catch(async () => {
      // an update that RLS hides changes nothing: the price is still 13
      expect((await db.query<{ sell_price: string }>(`select sell_price::text from products where id = '${PRODUCT}'`)).rows[0].sell_price).toBe('13');
    });
  });

  test('bad products are refused (name, unit, price, picture)', async () => {
    const bad = (cols: string, vals: string) => db.exec(`insert into products (id, shop_id, ${cols}) values ('${id()}', '${SHOP}', ${vals})`);
    await fails(() => asOwner(() => bad('name, base_unit, price_unit', `'', 'piece', 'piece'`)), /check/i);
    await fails(() => asOwner(() => bad('name, base_unit, price_unit', `'x', 'litre', 'piece'`)), /check/i);
    await fails(() => asOwner(() => bad('name, base_unit, price_unit, cost_price', `'x', 'piece', 'piece', -1`)), /check/i);
    await fails(() => asOwner(() => bad('name, base_unit, price_unit, image', `'x', 'piece', 'piece', 'http://evil'`)), /check/i);
  });
});

describe('purchases and sales', () => {
  test('buying 2 cartons and selling 30 pieces leaves 258; the supplier balance follows', async () => {
    const bill = id();
    await asManager(() => db.exec(entry({ id: bill, kind: 'purchase', amount: 2880, party: SUPPLIER, user: MANAGER, invoice: 'A-17' })));
    await asManager(() => db.exec(entry({ id: id(), kind: 'diye', amount: 1000, party: SUPPLIER, user: MANAGER, ref: bill })));
    await asManager(() => db.exec(moveSql({ id: id(), kind: 'purchase', qty: 288, user: MANAGER, entry: bill, total: 2880 })));
    const sale = id();
    await asCashier(() => db.exec(entry({ id: sale, kind: 'cash_sale', amount: 360, user: CASHIER })));
    await asCashier(() => db.exec(moveSql({ id: id(), kind: 'sale', qty: -30, user: CASHIER, entry: sale, total: 360 })));
    expect(await stockNow()).toBe(258);
    expect(await balanceOf(SUPPLIER)).toBe('-1880'); // -2,880 for the goods, +1,000 paid
    await asManager(() => db.exec(entry({ id: id(), kind: 'purchase_return', amount: 1440, party: SUPPLIER, user: MANAGER })));
    expect(await balanceOf(SUPPLIER)).toBe('-440');
  });

  test('a cancelled purchase no longer counts in the balance', async () => {
    const e = id();
    await asManager(() => db.exec(entry({ id: e, kind: 'purchase', amount: 500, party: SUPPLIER, user: MANAGER })));
    expect(await balanceOf(SUPPLIER)).toBe('-940');
    await asManager(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now() where id = '${e}'`));
    expect(await balanceOf(SUPPLIER)).toBe('-440');
  });

  test('a purchase needs a supplier, and only real kinds are accepted', async () => {
    await fails(() => asManager(() => db.exec(entry({ id: id(), kind: 'purchase', amount: 10, party: ALI, user: MANAGER }))), /supplier/);
    await fails(() => asManager(() => db.exec(entry({ id: id(), kind: 'purchase', amount: 10, user: MANAGER }))), /check|supplier/i);
    await fails(() => asManager(() => db.exec(entry({ id: id(), kind: 'nonsense', amount: 10, party: SUPPLIER, user: MANAGER }))), /check/i);
  });

  test('a saved purchase keeps its bill number and link', async () => {
    const e = id();
    await asManager(() => db.exec(entry({ id: e, kind: 'purchase', amount: 50, party: SUPPLIER, user: MANAGER, invoice: 'X-1' })));
    await fails(() => asManager(() => db.exec(`update entries set invoice_no = 'X-2' where id = '${e}'`)), /cannot be changed/);
    await fails(() => asManager(() => db.exec(`update entries set ref_id = '${e}' where id = '${e}'`)), /cannot be changed/);
  });
});

describe('stock movements', () => {
  test('every kind has its direction, a size, and an honest author', async () => {
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'sale', qty: 5, user: MANAGER }))), /check/i);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'purchase', qty: -5, user: MANAGER }))), /check/i);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'adjust', qty: 0, user: MANAGER }))), /check/i);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'adjust', qty: 200000000, user: MANAGER }))), /check/i);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'sale', qty: -1, user: OWNER }))), /row-level security/);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'sale', qty: -1, user: MANAGER, product: '60000000-0000-0000-0000-0000000000ff' }))), /foreign key/);
  });

  test('a cashier can only sell and take back a sale', async () => {
    await fails(() => asCashier(() => db.exec(moveSql({ id: id(), kind: 'purchase', qty: 10, user: CASHIER }))), /cashier cannot/i);
    await fails(() => asCashier(() => db.exec(moveSql({ id: id(), kind: 'adjust', qty: -1, user: CASHIER }))), /cashier cannot/i);
    await fails(() => asCashier(() => db.exec(moveSql({ id: id(), kind: 'damaged', qty: -1, user: CASHIER }))), /cashier cannot/i);
  });

  test('add-only: no change and no delete, even for the owner or the database admin', async () => {
    const m = id();
    await asManager(() => db.exec(moveSql({ id: m, kind: 'adjust', qty: 4, user: MANAGER })));
    await fails(() => asOwner(() => db.exec(`update stock_moves set qty_base = 400 where id = '${m}'`)), /permission denied/);
    await fails(() => asOwner(() => db.exec(`delete from stock_moves where id = '${m}'`)), /permission denied/);
    await fails(() => db.exec(`update stock_moves set qty_base = 400 where id = '${m}'`), /cannot be changed or removed/);
    await fails(() => db.exec(`delete from stock_moves where id = '${m}'`), /cannot be changed or removed/);
    await asManager(() => db.exec(moveSql({ id: m, kind: 'adjust', qty: 4, user: MANAGER }))); // the same movement sent again (a retry)
    expect((await db.query(`select 1 from stock_moves where id = '${m}'`)).rows).toHaveLength(1);
  });

  test('a reversal undoes exactly one movement, once', async () => {
    const m = id();
    const before = await stockNow();
    await asManager(() => db.exec(moveSql({ id: m, kind: 'sale', qty: -7, user: MANAGER })));
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'reversal', qty: 8, user: MANAGER, reverses: m }))), /exactly one/);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'reversal', qty: 7, user: MANAGER }))), /must say/);
    await asManager(() => db.exec(moveSql({ id: id(), kind: 'reversal', qty: 7, user: MANAGER, reverses: m })));
    expect(await stockNow()).toBe(before);
    await fails(() => asManager(() => db.exec(moveSql({ id: id(), kind: 'reversal', qty: 7, user: MANAGER, reverses: m }))), /duplicate key|unique/i);
  });

  test('the unit of a product cannot change after stock exists', async () => {
    await fails(() => asManager(() => db.exec(`update products set base_unit = 'gram' where id = '${PRODUCT}'`)), /cannot change after stock/);
  });

  test('another shop sees none of the products or movements', async () => {
    expect((await asStranger(() => db.query(`select id from products`))).rows).toHaveLength(0);
    expect((await asStranger(() => db.query(`select id from stock_moves`))).rows).toHaveLength(0);
    await fails(() => asStranger(() => db.exec(moveSql({ id: id(), kind: 'sale', qty: -1, user: STRANGER }))), /row-level security|foreign key/);
  });
});
