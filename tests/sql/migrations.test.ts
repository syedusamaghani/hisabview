// Runs the real SQL files (supabase/migrations) in a small in-memory Postgres (PGlite) and checks the rules
// that protect the khata: roles, duplicates, cancel-only, the server's own diary, and old data surviving.
// Supabase's own pieces (auth.users, auth.uid(), the anon and authenticated roles) are imitated at the top.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';

const sql = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');

const OWNER = '00000000-0000-0000-0000-0000000000a1';
const MANAGER = '00000000-0000-0000-0000-0000000000a2';
const CASHIER = '00000000-0000-0000-0000-0000000000a3';
const STRANGER = '00000000-0000-0000-0000-0000000000a4';
const SHOP = '10000000-0000-0000-0000-000000000001';
const OTHER_SHOP = '10000000-0000-0000-0000-000000000002';
const ALI = '20000000-0000-0000-0000-000000000001';
const OLD_ENTRY = '30000000-0000-0000-0000-000000000001';

let db: PGlite;
let n = 0;
const id = () => `40000000-0000-0000-0000-${String(++n).padStart(12, '0')}`;

// Run something as a logged-in person (like the phone does through Supabase), then go back to the admin
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

const entrySql = (e: { id: string; kind: string; amount: number; party?: string | null; user: string; extra?: string }) =>
  `insert into entries (id, shop_id, party_id, kind, amount, created_by, created_at ${e.extra ? ', ' + e.extra.split('=')[0] : ''})
   values ('${e.id}', '${SHOP}', ${e.party === null ? 'null' : `'${e.party ?? ALI}'`}, '${e.kind}', ${e.amount}, '${e.user}', now() ${e.extra ? ', ' + e.extra.split('=')[1] : ''})
   on conflict (id) do update set amount = excluded.amount, kind = excluded.kind`;

const fails = async (run: () => Promise<unknown>, pattern: RegExp) => {
  await expect(run()).rejects.toThrow(pattern);
};

beforeAll(async () => {
  db = new PGlite();
  // ---- an imitation of what Supabase provides
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
  // ---- the khata as it was BEFORE this phase: files 0001 to 0004, with real data in it
  for (const f of ['0001_tables.sql', '0002_security.sql', '0003_sync.sql', '0004_feedback_errors.sql']) await db.exec(sql(f));
  await db.exec(`
    insert into shops (id, owner_user_id, shop_name) values ('${SHOP}', '${OWNER}', 'Ahmed General Store'), ('${OTHER_SHOP}', '${STRANGER}', 'Other Store');
    insert into parties (id, shop_id, name, opening_balance) values ('${ALI}', '${SHOP}', 'Ali', 0);
    insert into entries (id, shop_id, party_id, kind, amount, created_by, created_at) values ('${OLD_ENTRY}', '${SHOP}', '${ALI}', 'diye', 1000, '${OWNER}', '2026-10-01T10:00:00Z');
    insert into audit_log (id, shop_id, entity, entity_id, action, after_value, actor) values ('50000000-0000-0000-0000-000000000001', '${SHOP}', 'entry', '${OLD_ENTRY}', 'create', '{"amount":1000}', '${OWNER}');
  `);
  await db.exec(sql('0005_roles_audit_integrity.sql'));
}, 60000);

describe('existing data survives the migration', () => {
  test('the old owner becomes the owner member, entries keep their values, no fake diary lines are made', async () => {
    const members = await db.query<{ user_id: string; role: string }>(`select user_id, role from shop_members where shop_id = '${SHOP}'`);
    expect(members.rows).toEqual([{ user_id: OWNER, role: 'owner' }]);
    const old = await db.query<{ amount: string; created: string; got: string }>(
      `select amount::text, created_at::text as created, server_received_at::text as got from entries where id = '${OLD_ENTRY}'`);
    expect(old.rows[0].amount).toBe('1000');
    expect(old.rows[0].got).toBe(old.rows[0].created); // best known time for old rows
    const audit = await db.query(`select id from audit_log where shop_id = '${SHOP}'`);
    expect(audit.rows).toHaveLength(1); // only the one that already existed
  });
});

describe('owner', () => {
  test('adds an entry: the server writes its own diary and activity line', async () => {
    const e = id();
    await asOwner(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 500, user: OWNER })));
    const audit = await db.query<{ origin: string; action: string; actor: string }>(`select origin, action, actor from audit_log where entity_id = '${e}'`);
    expect(audit.rows).toEqual([{ origin: 'server', action: 'create', actor: OWNER }]);
    const act = await db.query<{ action: string }>(`select action from activity_log where entity_id = '${e}'`);
    expect(act.rows.map((r) => r.action)).toEqual(['entry.create']);
  });

  test('sending the same entry twice makes one entry and one diary line (double tap, retry)', async () => {
    const e = id();
    await asOwner(() => db.exec(entrySql({ id: e, kind: 'mile', amount: 250, user: OWNER })));
    await asOwner(() => db.exec(entrySql({ id: e, kind: 'mile', amount: 250, user: OWNER })));
    expect((await db.query(`select 1 from entries where id = '${e}'`)).rows).toHaveLength(1);
    expect((await db.query(`select 1 from audit_log where entity_id = '${e}'`)).rows).toHaveLength(1);
  });

  test('the same id with a different amount is refused (a saved entry never changes)', async () => {
    const e = id();
    await asOwner(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 100, user: OWNER })));
    await fails(() => asOwner(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 999, user: OWNER }))), /cannot be changed/);
  });

  test('amount rules: zero, negative, too big, and a person-less Diye are refused', async () => {
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: 0, user: OWNER }))), /check/i);
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: -5, user: OWNER }))), /check/i);
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: 1000000000, user: OWNER }))), /check/i);
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: 10, party: null, user: OWNER }))), /check/i);
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'kharcha', amount: 10, party: ALI, user: OWNER }))), /entries_sale_has_no_person|check/i);
  });

  test('cannot write an entry in somebody else\'s name', async () => {
    await fails(() => asOwner(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: 10, user: MANAGER }))), /row-level security/);
  });

  test('delete is not possible on any money table', async () => {
    await fails(() => asOwner(() => db.exec(`delete from entries where id = '${OLD_ENTRY}'`)), /permission denied/);
    await fails(() => asOwner(() => db.exec(`delete from parties where id = '${ALI}'`)), /permission denied/);
    await fails(() => asOwner(() => db.exec(`delete from audit_log`)), /permission denied/);
    await fails(() => asOwner(() => db.exec(`update audit_log set action = 'edit'`)), /permission denied/);
  });

  test('a customer\'s type and old balance cannot change once entries exist', async () => {
    await fails(() => asOwner(() => db.exec(`update parties set type = 'supplier' where id = '${ALI}'`)), /cannot change after entries exist/);
    await fails(() => asOwner(() => db.exec(`update parties set opening_balance = 50 where id = '${ALI}'`)), /cannot change after entries exist/);
    // name and hiding are fine, and are written to the server diary
    await asOwner(() => db.exec(`update parties set name = 'Ali Khan' where id = '${ALI}'`));
    const edit = await db.query<{ action: string }>(`select action from audit_log where entity_id = '${ALI}' and origin = 'server'`);
    expect(edit.rows.map((r) => r.action)).toContain('edit');
  });

  test('cancelling keeps the entry, records who and why, and cannot be undone', async () => {
    const e = id();
    await asOwner(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 300, user: OWNER })));
    await asOwner(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now(), cancel_reason = 'galat entry' where id = '${e}'`));
    const row = await db.query<{ status: string; cancelled_by: string; cancel_reason: string }>(`select status, cancelled_by, cancel_reason from entries where id = '${e}'`);
    expect(row.rows[0]).toEqual({ status: 'cancelled', cancelled_by: OWNER, cancel_reason: 'galat entry' });
    const audit = await db.query<{ action: string; reason: string | null }>(`select action, reason from audit_log where entity_id = '${e}' and action = 'cancel'`);
    expect(audit.rows).toEqual([{ action: 'cancel', reason: 'galat entry' }]);
    await fails(() => asOwner(() => db.exec(`update entries set status = 'active', cancelled_at = null where id = '${e}'`)), /cannot be brought back/);
  });

  test('the server balance view matches the app rule (diye minus mile, cancelled ignored)', async () => {
    const b = await db.query<{ balance: string }>(`select balance::text from party_balances where party_id = '${ALI}'`);
    const expected = await db.query<{ total: string }>(
      `select (coalesce(sum(case kind when 'diye' then amount when 'mile' then -amount else 0 end), 0))::text as total from entries where party_id = '${ALI}' and status = 'active'`);
    expect(b.rows[0].balance).toBe(expected.rows[0].total);
  });
});

describe('staff and roles (enforced by the database)', () => {
  test('only the owner can invite; a stranger cannot', async () => {
    await fails(() => asCashier(() => db.exec(`select invite_member('cashier@shop.pk', 'cashier')`)), /Only the owner/); // not a member of any shop yet
    await asOwner(() => db.exec(`select invite_member(' Cashier@Shop.pk ', 'cashier'); select invite_member('manager@shop.pk', 'manager')`));
    await fails(() => asOwner(() => db.exec(`select invite_member('bad', 'cashier')`)), /Email is not valid/);
    await fails(() => asOwner(() => db.exec(`select invite_member('x@y.pk', 'owner')`)), /manager or cashier/);
  });

  test('an invited person becomes a member at login; an uninvited one does not', async () => {
    await asCashier(() => db.exec(`select accept_my_invites()`));
    await asManager(() => db.exec(`select accept_my_invites()`));
    await as(STRANGER, 'stranger@x.pk', () => db.exec(`select accept_my_invites()`));
    const m = await db.query<{ user_id: string; role: string }>(`select user_id, role from shop_members where shop_id = '${SHOP}' order by role`);
    expect(m.rows).toEqual([
      { user_id: CASHIER, role: 'cashier' },
      { user_id: MANAGER, role: 'manager' },
      { user_id: OWNER, role: 'owner' },
    ]);
  });

  test('a cashier sees the khata and can add customers and entries', async () => {
    const seen = await asCashier(() => db.query(`select id from entries where shop_id = '${SHOP}'`));
    expect(seen.rows.length).toBeGreaterThan(0);
    const e = id();
    await asCashier(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 120, user: CASHIER })));
    await asCashier(() => db.exec(`insert into parties (id, shop_id, name) values ('${id()}', '${SHOP}', 'Naya Customer')`));
    // a retry of the same entry is harmless
    await asCashier(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 120, user: CASHIER })));
  });

  test('a cashier cannot cancel, change a customer, change settings, or read the activity log', async () => {
    const e = id();
    await asCashier(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 77, user: CASHIER })));
    // someone else's entry: no
    await fails(() => asCashier(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now() where id = '${OLD_ENTRY}'`)), /cashier cannot/i);
    // their own entry, but later than 10 minutes after writing it: no
    await fails(() => asCashier(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now() + interval '11 minutes' where id = '${e}'`)), /cashier cannot/i);
    // changing anything else while cancelling: no
    await fails(() => asCashier(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now(), amount = 1 where id = '${e}'`)), /cannot be changed|cashier cannot/i);
    await fails(() => asCashier(() => db.exec(`update parties set name = 'Hacked' where id = '${ALI}'`)), /cashier cannot/i);
    const shopChange = await asCashier(() => db.query(`update shops set shop_name = 'Mine now' where id = '${SHOP}' returning id`));
    expect(shopChange.rows).toHaveLength(0); // the database does not even find the row for a cashier
    const log = await asCashier(() => db.query(`select id from activity_log`));
    expect(log.rows).toHaveLength(0);
    await fails(() => asCashier(() => db.exec(`select invite_member('a@b.pk', 'cashier')`)), /Only the owner/);
    await fails(() => asCashier(() => db.exec(`insert into shop_members (shop_id, user_id, role) values ('${SHOP}', '${STRANGER}', 'owner')`)), /permission denied/);
  });

  test('a cashier can take back their own fresh entry (Wapas lo), and the diary says who', async () => {
    const e = id();
    await asCashier(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 40, user: CASHIER })));
    await asCashier(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now(), cancel_reason = 'undo' where id = '${e}'`));
    const row = await db.query<{ status: string; cancelled_by: string }>(`select status, cancelled_by from entries where id = '${e}'`);
    expect(row.rows[0]).toEqual({ status: 'cancelled', cancelled_by: CASHIER });
  });

  test('a manager can cancel (and it says who), but cannot change settings or staff', async () => {
    const e = id();
    await asCashier(() => db.exec(entrySql({ id: e, kind: 'diye', amount: 60, user: CASHIER })));
    await asManager(() => db.exec(`update entries set status = 'cancelled', cancelled_at = now(), cancel_reason = 'ghalat' where id = '${e}'`));
    const row = await db.query<{ cancelled_by: string }>(`select cancelled_by from entries where id = '${e}'`);
    expect(row.rows[0].cancelled_by).toBe(MANAGER);
    const shopChange = await asManager(() => db.query(`update shops set shop_name = 'Mine now' where id = '${SHOP}' returning id`));
    expect(shopChange.rows).toHaveLength(0);
    await fails(() => asManager(() => db.exec(`select set_member('${CASHIER}', 'manager', true)`)), /Only the owner/);
    const log = await asManager(() => db.query(`select id from activity_log`));
    expect(log.rows.length).toBeGreaterThan(0); // managers may read it
  });

  test('the owner changes the shop name; the owner of a shop cannot be swapped', async () => {
    const ok = await asOwner(() => db.query(`update shops set shop_name = 'Ahmed Store' where id = '${SHOP}' returning id`));
    expect(ok.rows).toHaveLength(1);
    await fails(() => asOwner(() => db.exec(`update shops set owner_user_id = '${CASHIER}' where id = '${SHOP}'`)), /cannot be changed/);
  });

  test('another shop\'s people see nothing of this shop', async () => {
    const e = await as(STRANGER, 'stranger@x.pk', () => db.query(`select id from entries`));
    expect(e.rows).toHaveLength(0);
    const p = await as(STRANGER, 'stranger@x.pk', () => db.query(`select id from parties`));
    expect(p.rows).toHaveLength(0);
    await fails(() => as(STRANGER, 'stranger@x.pk', () => db.exec(entrySql({ id: id(), kind: 'diye', amount: 5, user: STRANGER }))), /row-level security|foreign key/);
  });

  test('switching a cashier off removes their access at once but keeps their entries', async () => {
    await asOwner(() => db.exec(`select set_member('${CASHIER}', 'cashier', false)`));
    const seen = await asCashier(() => db.query(`select id from entries`));
    expect(seen.rows).toHaveLength(0);
    await fails(() => asCashier(() => db.exec(entrySql({ id: id(), kind: 'diye', amount: 5, user: CASHIER }))), /row-level security/);
    const theirs = await db.query(`select id from entries where created_by = '${CASHIER}'`);
    expect(theirs.rows.length).toBeGreaterThan(0);
  });

  test('every staff change is in the activity log', async () => {
    const log = await db.query<{ action: string }>(`select distinct action from activity_log where entity = 'member'`);
    expect(log.rows.map((r) => r.action).sort()).toEqual(['member.invite', 'member.join', 'member.off']);
  });
});
