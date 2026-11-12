// Runs ALL the SQL files (0001 to 0007) in a small in-memory Postgres (PGlite) and checks the Phase 4 rules:
// the cash drawer entries, expense categories, the add-only daily closing, who may do what, and that the
// server's cashbook rule (view cash_movements) gives the same totals as the app (src/lib/cashbook.ts).
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { cashDay } from '../../src/lib/cashbook';

const sql = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');

const OWNER = '00000000-0000-0000-0000-0000000000c1';
const MANAGER = '00000000-0000-0000-0000-0000000000c2';
const CASHIER = '00000000-0000-0000-0000-0000000000c3';
const STRANGER = '00000000-0000-0000-0000-0000000000c4';
const SHOP = '10000000-0000-0000-0000-0000000000c1';
const OTHER_SHOP = '10000000-0000-0000-0000-0000000000c2';
const ALI = '20000000-0000-0000-0000-0000000000c1';
const SUPPLIER = '20000000-0000-0000-0000-0000000000c5';
const OLD_ENTRY = '30000000-0000-0000-0000-0000000000c1';

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

type E = { kind: string; amount: number; party?: string | null; user: string; method?: string | null; category?: string | null; at?: string; status?: string };
const entry = (e: E & { id?: string }) =>
  `insert into entries (id, shop_id, party_id, kind, amount, method, category, created_by, created_at, status, cancelled_at)
   values ('${e.id ?? id()}', '${SHOP}', ${e.party ? `'${e.party}'` : 'null'}, '${e.kind}', ${e.amount}, ${e.method ? `'${e.method}'` : 'null'},
           ${e.category ? `'${e.category}'` : 'null'}, '${e.user}', '${e.at ?? '2026-11-12T05:00:00Z'}', '${e.status ?? 'active'}', ${e.status === 'cancelled' ? "'2026-11-12T06:00:00Z'" : 'null'})`;

const closing = (c: { id?: string; user: string; day?: string; opening?: number; expected?: number; counted?: number; diff?: number; shop?: string }) =>
  `insert into cash_closings (id, shop_id, day, opening_cash, expected_cash, counted_cash, difference, created_by)
   values ('${c.id ?? id()}', '${c.shop ?? SHOP}', '${c.day ?? '2026-11-12'}', ${c.opening ?? 1000}, ${c.expected ?? 1000}, ${c.counted ?? 990}, ${c.diff ?? -10}, '${c.user}')`;

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
  // the khata as it was before this phase (files 0001 to 0006), with real data in it
  for (const f of ['0001_tables.sql', '0002_security.sql', '0003_sync.sql', '0004_feedback_errors.sql', '0005_roles_audit_integrity.sql', '0006_stock_purchases.sql']) await db.exec(sql(f));
  await db.exec(`
    insert into shops (id, owner_user_id, shop_name) values ('${SHOP}', '${OWNER}', 'Ahmed General Store'), ('${OTHER_SHOP}', '${STRANGER}', 'Other Store');
    insert into shop_members (shop_id, user_id, role) values ('${SHOP}', '${MANAGER}', 'manager'), ('${SHOP}', '${CASHIER}', 'cashier');
    insert into parties (id, shop_id, name) values ('${ALI}', '${SHOP}', 'Ali');
    insert into parties (id, shop_id, name, type) values ('${SUPPLIER}', '${SHOP}', 'Karim Traders', 'supplier');
    insert into entries (id, shop_id, party_id, kind, amount, created_by, created_at) values ('${OLD_ENTRY}', '${SHOP}', '${ALI}', 'diye', 1000, '${OWNER}', '2026-10-01T10:00:00Z');
  `);
  await db.exec(sql('0007_cashbook_expenses.sql'));
}, 60000);

describe('migration 0007 on a khata with data', () => {
  test('old entries are untouched', async () => {
    const old = await db.query<{ amount: string; kind: string; category: string | null }>(`select amount::text, kind, category from entries where id = '${OLD_ENTRY}'`);
    expect(old.rows[0]).toEqual({ amount: '1000', kind: 'diye', category: null });
  });

  test('running it again on the same database is refused cleanly', async () => {
    await expect(db.exec(sql('0007_cashbook_expenses.sql'))).rejects.toThrow(/already exists/);
  });
});

describe('expenses with a category', () => {
  test('a kharcha keeps its category; no other kind may have one; a saved category cannot change', async () => {
    const rent = id();
    await asManager(() => db.exec(entry({ id: rent, kind: 'kharcha', amount: 5000, user: MANAGER, category: 'rent', method: 'bank' })));
    await fails(() => asManager(() => db.exec(entry({ kind: 'cash_sale', amount: 10, user: MANAGER, category: 'rent' }))), /check/i);
    await fails(() => asManager(() => db.exec(entry({ kind: 'kharcha', amount: 10, user: MANAGER, category: ' ' }))), /check/i);
    await fails(() => asManager(() => db.exec(entry({ kind: 'kharcha', amount: 10, user: MANAGER, category: 'x'.repeat(41) }))), /check/i);
    await fails(() => asManager(() => db.exec(`update entries set category = 'electricity' where id = '${rent}'`)), /cannot be changed/);
    // a cashier may write a kharcha with a category (they write expenses at the counter)
    await asCashier(() => db.exec(entry({ kind: 'kharcha', amount: 60, user: CASHIER, category: 'Chai pani' })));
  });
});

describe('cash put in and taken out', () => {
  test('owner and manager can; a cashier cannot; it has no customer and is always cash', async () => {
    await asOwner(() => db.exec(entry({ kind: 'withdrawal', amount: 400, user: OWNER })));
    await asManager(() => db.exec(entry({ kind: 'deposit', amount: 1000, user: MANAGER })));
    await fails(() => asCashier(() => db.exec(entry({ kind: 'withdrawal', amount: 50, user: CASHIER }))), /cashier cannot take cash/i);
    await fails(() => asCashier(() => db.exec(entry({ kind: 'deposit', amount: 50, user: CASHIER }))), /cashier cannot take cash/i);
    await fails(() => asOwner(() => db.exec(entry({ kind: 'withdrawal', amount: 50, user: OWNER, party: ALI }))), /check/i);
    await fails(() => asOwner(() => db.exec(entry({ kind: 'deposit', amount: 50, user: OWNER, method: 'bank' }))), /check/i);
    await fails(() => asOwner(() => db.exec(entry({ kind: 'deposit', amount: 0, user: OWNER }))), /check/i);
  });

  test('they are written in the server diary, and can be cancelled by an owner', async () => {
    const w = id();
    await asOwner(() => db.exec(entry({ id: w, kind: 'withdrawal', amount: 75, user: OWNER })));
    await asOwner(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now(), cancel_reason = 'wrong_entry' where id = '${w}'`));
    const diary = await db.query<{ action: string }>(`select action from audit_log where entity_id = '${w}' and origin = 'server' order by created_at`);
    expect(diary.rows.map((r) => r.action)).toEqual(['create', 'cancel']);
  });
});

describe('the daily cash closing', () => {
  test('owner and manager close the day; the difference must be counted - expected', async () => {
    await asOwner(() => db.exec(closing({ user: OWNER, day: '2026-11-10' })));
    await asManager(() => db.exec(closing({ user: MANAGER, day: '2026-11-10', counted: 1000, diff: 0 })));
    await fails(() => asOwner(() => db.exec(closing({ user: OWNER, day: '2026-11-11', counted: 900, expected: 1000, diff: -50 }))), /check/i);
    await fails(() => asOwner(() => db.exec(closing({ user: OWNER, day: '2026-11-11', counted: -5, diff: -1005 }))), /check/i);
  });

  test('a cashier and a stranger cannot make or see closings', async () => {
    await fails(() => asCashier(() => db.exec(closing({ user: CASHIER }))), /row-level security/);
    await fails(() => asStranger(() => db.exec(closing({ user: STRANGER }))), /row-level security/);
    await fails(() => asOwner(() => db.exec(closing({ user: OWNER, shop: OTHER_SHOP }))), /row-level security/);
    expect((await asCashier(() => db.query(`select 1 from cash_closings`))).rows).toHaveLength(0);
    expect((await asStranger(() => db.query(`select 1 from cash_closings`))).rows).toHaveLength(0);
    expect((await asManager(() => db.query(`select 1 from cash_closings`))).rows.length).toBeGreaterThan(0);
  });

  test('a closing cannot be changed or removed; counting again adds a new one', async () => {
    const first = id();
    await asOwner(() => db.exec(closing({ id: first, user: OWNER, day: '2026-11-09' })));
    await fails(() => asOwner(() => db.exec(`update cash_closings set counted_cash = 1000, difference = 0 where id = '${first}'`)), /permission denied|cannot be changed/);
    await fails(() => asOwner(() => db.exec(`delete from cash_closings where id = '${first}'`)), /permission denied|cannot be changed/);
    await asOwner(() => db.exec(closing({ user: OWNER, day: '2026-11-09', counted: 1000, diff: 0 })));
    expect((await db.query(`select 1 from cash_closings where day = '2026-11-09'`)).rows).toHaveLength(2);
  });

  test('a closing is in the server diary', async () => {
    const c = id();
    await asOwner(() => db.exec(closing({ id: c, user: OWNER, day: '2026-11-08' })));
    const diary = await db.query<{ entity: string; action: string }>(`select entity, action from audit_log where entity_id = '${c}' and origin = 'server'`);
    expect(diary.rows).toEqual([{ entity: 'cash_closing', action: 'create' }]);
  });

  test('the phone can write its own diary line for a closing', async () => {
    await asOwner(() => db.exec(`insert into audit_log (id, shop_id, entity, entity_id, action, actor) values ('${id()}', '${SHOP}', 'cash_closing', '${id()}', 'create', '${OWNER}')`));
  });
});

describe('the server cashbook rule gives the same totals as the app', () => {
  test('cash_movements add up to the app numbers for a busy day, method by method', async () => {
    const day = '2031-03-03'; // a day no other test used. In Pakistan it runs from 2 Mar 19:00 UTC to 3 Mar 18:59 UTC.
    const at = (h: number) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
    const rows: (E & { id: string; at: string })[] = [
      { id: id(), kind: 'cash_sale', amount: 360, user: OWNER, at: at(5) },
      { id: id(), kind: 'cash_sale', amount: 250, user: OWNER, at: at(6), method: 'jazzcash' },
      { id: id(), kind: 'diye', amount: 900, party: ALI, user: OWNER, at: at(6) }, // udhaar: no cash
      { id: id(), kind: 'mile', amount: 300, party: ALI, user: OWNER, at: at(7) },
      { id: id(), kind: 'mile', amount: 200, party: ALI, user: OWNER, at: at(7), method: 'easypaisa' },
      { id: id(), kind: 'purchase', amount: 2880, party: SUPPLIER, user: OWNER, at: at(8) }, // on credit: no cash
      { id: id(), kind: 'diye', amount: 1000, party: SUPPLIER, user: OWNER, at: at(8) },
      { id: id(), kind: 'diye', amount: 400, party: SUPPLIER, user: OWNER, at: at(8), method: 'bank' },
      { id: id(), kind: 'kharcha', amount: 150, user: OWNER, at: at(9), category: 'transport' },
      { id: id(), kind: 'withdrawal', amount: 100, user: OWNER, at: at(10) },
      { id: id(), kind: 'deposit', amount: 40, user: OWNER, at: at(11) },
      { id: id(), kind: 'cash_sale', amount: 999, user: OWNER, at: at(12), status: 'cancelled' },
      { id: id(), kind: 'cash_sale', amount: 111, user: OWNER, at: `${day}T19:30:00Z` }, // the next day in Pakistan
    ];
    for (const r of rows) await asOwner(() => db.exec(entry(r)));

    const server = await db.query<{ method: string; money_in: string; money_out: string }>(
      `select method, sum(money_in)::text as money_in, sum(money_out)::text as money_out from cash_movements where shop_id = '${SHOP}' and day = '${day}' group by method`,
    );
    const byServer = Object.fromEntries(server.rows.map((r) => [r.method, { in: Number(r.money_in), out: Number(r.money_out) }]));

    const app = cashDay(
      rows.map((r) => ({ kind: r.kind, amount: r.amount, status: r.status ?? 'active', method: r.method ?? null, party_id: r.party ?? null, created_at: r.at })),
      new Map([[ALI, 'customer'], [SUPPLIER, 'supplier']]),
      day,
      0,
    );
    for (const method of ['cash', 'jazzcash', 'easypaisa', 'bank'] as const) {
      expect(byServer[method] ?? { in: 0, out: 0 }).toEqual(app.byMethod[method]);
    }
    expect(byServer.other).toBeUndefined();
    // and the headline: closing cash = opening + inflows - outflows
    expect(app.closing).toBe(360 + 300 + 40 - 1000 - 150 - 100);
    expect(app.byMethod.cash).toEqual({ in: 700, out: 1250 });
  });

  test('the view counts exactly the entries that move money, per Pakistan day', async () => {
    const day = '2030-01-05'; // a day no other test used
    const at = (h: number) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
    await asOwner(() => db.exec(entry({ kind: 'cash_sale', amount: 500, user: OWNER, at: at(6) })));
    await asOwner(() => db.exec(entry({ kind: 'diye', amount: 700, party: ALI, user: OWNER, at: at(6) })));
    await asOwner(() => db.exec(entry({ kind: 'diye', amount: 300, party: SUPPLIER, user: OWNER, at: at(7), method: 'bank' })));
    await asOwner(() => db.exec(entry({ kind: 'cash_sale', amount: 100, user: OWNER, at: `${day}T20:00:00Z` }))); // 6 Jan in Pakistan
    const rows = await asOwner(() =>
      db.query<{ method: string; money_in: string; money_out: string }>(
        `select method, sum(money_in)::text as money_in, sum(money_out)::text as money_out from cash_movements where shop_id = '${SHOP}' and day = '${day}' group by method order by method`,
      ),
    );
    expect(rows.rows).toEqual([
      { method: 'bank', money_in: '0', money_out: '300' },
      { method: 'cash', money_in: '500', money_out: '0' },
    ]);
    const next = await db.query<{ money_in: string }>(`select sum(money_in)::text as money_in from cash_movements where shop_id = '${SHOP}' and day = '2030-01-06'`);
    expect(next.rows[0].money_in).toBe('100');
  });
});
