-- HisabView: expenses, cashbook and daily cash closing (Phase 4)
-- Run in Supabase > SQL Editor AFTER 0001 to 0006. Safe on a khata that already has data: nothing is deleted or
-- changed in the money records. It only widens what an entry may be and adds one new table.
--
-- What this adds:
--   1. Two new entry kinds for the cash drawer: 'withdrawal' (cash taken out) and 'deposit' (cash put in).
--      They belong to no customer and are always cash. Only the owner and a manager may write them.
--   2. entries.category: what a kharcha (expense) was for (rent, electricity, ... or a name the shopkeeper typed).
--   3. cash_closings: the end-of-day count of the drawer (what the app expected, what was really counted, the
--      difference). ADD-ONLY: a closing is never edited or removed, a second count of the same day is a new row.
--   4. View cash_movements: the cashbook rule on the server (the same rule as src/lib/cashbook.ts), so the totals
--      of the app can be compared with the database.
-- The app also works WITHOUT this file (everything else keeps syncing), so running it is safe at any time.

-- ---------------------------------------------------------------- entries: drawer kinds, category
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.entries'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%mile%' loop
    execute format('alter table public.entries drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.entries add constraint entries_kind_check
  check (kind in ('diye', 'mile', 'opening', 'kharcha', 'cash_sale', 'purchase', 'purchase_return', 'withdrawal', 'deposit'));
alter table public.entries add constraint entries_person_needed
  check (kind not in ('diye', 'mile', 'opening', 'purchase', 'purchase_return') or party_id is not null);
-- the cash drawer has no customer, and is always cash
alter table public.entries add constraint entries_drawer_rules
  check (kind not in ('withdrawal', 'deposit') or (party_id is null and coalesce(method, 'cash') = 'cash'));

alter table public.entries add column category text check (category is null or char_length(btrim(category)) between 1 and 40);
alter table public.entries add constraint entries_category_only_kharcha check (category is null or kind = 'kharcha');

-- A cashier cannot take cash out or put it in; the category of a saved entry cannot change
create function public.entries_cash_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.kind in ('withdrawal', 'deposit') and public.my_role(new.shop_id) = 'cashier' then
      raise exception 'A cashier cannot take cash out or put it in' using errcode = '42501';
    end if;
  elsif new.category is distinct from old.category then
    raise exception 'A saved entry cannot be changed. Cancel it and add a new one.';
  end if;
  return new;
end;
$$;
create trigger entries_cash_guard_trg before insert or update on public.entries for each row execute function public.entries_cash_guard();

-- The diary may now talk about closings
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.audit_log'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%''party''%' loop
    execute format('alter table public.audit_log drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.audit_log add constraint audit_log_entity_check check (entity in ('shop', 'party', 'entry', 'product', 'cash_closing'));

-- ---------------------------------------------------------------- daily cash closing (add-only)
create table public.cash_closings (
  id            uuid primary key,  -- made on the phone, so it works offline
  shop_id       uuid not null references public.shops (id),
  day           date not null,     -- the Pakistan day that was closed
  opening_cash  bigint not null check (opening_cash between 0 and 999999999),          -- in the drawer when the day began
  expected_cash bigint not null check (expected_cash between -999999999 and 999999999), -- opening + cash in - cash out, as the app worked it out
  counted_cash  bigint not null check (counted_cash between 0 and 999999999),          -- what the shopkeeper really counted
  difference    bigint not null,                                                       -- counted - expected (below 0 = cash is missing)
  note          text check (note is null or char_length(note) <= 300),
  created_by    uuid not null references auth.users (id),
  created_at    timestamptz not null default now(),    -- the phone's clock
  server_received_at timestamptz not null default now(), -- the server's clock
  check (difference = counted_cash - expected_cash)
);
create index cash_closings_shop_day_idx on public.cash_closings (shop_id, day, created_at);

create function public.cash_closings_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'A cash closing cannot be changed or removed. Count again and add a new closing.';
  end if;
  return new;
end;
$$;
create trigger cash_closings_guard_trg before insert or update or delete on public.cash_closings for each row execute function public.cash_closings_guard();

-- The server's own diary line for a closing (same function as before, with one more name)
create or replace function public.record_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_entity text := case tg_table_name when 'entries' then 'entry' when 'parties' then 'party' when 'products' then 'product' when 'cash_closings' then 'cash_closing' else 'shop' end;
  v_new    jsonb := to_jsonb(new);
  v_old    jsonb;
  v_shop   uuid;
  v_action text;
  v_actor  uuid;
  v_reason text;
begin
  v_shop := case tg_table_name when 'shops' then new.id else (v_new ->> 'shop_id')::uuid end;
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    if public.same_row(v_new, v_old) then return new; end if; -- a resend changed nothing
    v_action := case when tg_table_name = 'entries' and v_new ->> 'status' = 'cancelled' and v_old ->> 'status' <> 'cancelled' then 'cancel' else 'edit' end;
  else
    v_action := 'create';
  end if;
  if v_action = 'cancel' then v_reason := v_new ->> 'cancel_reason'; end if;
  v_actor := coalesce((select auth.uid()), (select owner_user_id from public.shops where id = v_shop));

  insert into public.audit_log (id, shop_id, entity, entity_id, action, before_value, after_value, actor, origin, reason, device)
  values (gen_random_uuid(), v_shop, v_entity, new.id, v_action,
          v_old, v_new, v_actor, 'server', v_reason, public.request_device());
  insert into public.activity_log (shop_id, user_id, action, entity, entity_id, device)
  values (v_shop, v_actor, v_entity || '.' || v_action, v_entity, new.id, public.request_device());
  return new;
end;
$$;
create trigger cash_closings_record_trg after insert on public.cash_closings for each row execute function public.record_change();

-- ---------------------------------------------------------------- row-level security
alter table public.cash_closings enable row level security;
revoke all on public.cash_closings from anon;
revoke update, delete on public.cash_closings from authenticated;

-- Only the owner and a manager see and make closings (a closing shows the whole day's cash)
create policy cash_closings_select on public.cash_closings for select to authenticated
  using (public.my_role(shop_id) in ('owner', 'manager'));
create policy cash_closings_insert on public.cash_closings for insert to authenticated
  with check (public.my_role(shop_id) in ('owner', 'manager') and created_by = (select auth.uid()));

-- ---------------------------------------------------------------- the cashbook rule, on the server
-- Same rule as the app (src/lib/cashbook.ts). One row per entry that moves money in or out of the drawer or a
-- digital account, with the Pakistan day (always UTC + 5 hours, no daylight saving) and how it was paid.
--   money in : cash sale, money received (customer, or a supplier's refund), cash put in the drawer
--   money out: payment to a supplier, expense, cash taken out
-- Udhaar given to a customer (diye) and goods bought on credit (purchase) move no money, so they are not here.
create view public.cash_movements with (security_invoker = true) as
select e.shop_id,
       ((e.created_at at time zone 'UTC') + interval '5 hours')::date as day,
       coalesce(e.method, 'cash') as method,
       case when e.kind in ('cash_sale', 'mile', 'deposit') then e.amount else 0 end as money_in,
       case when e.kind in ('kharcha', 'withdrawal', 'diye') then e.amount else 0 end as money_out
  from public.entries e
  left join public.parties p on p.id = e.party_id
 where e.status = 'active'
   and (e.kind in ('cash_sale', 'mile', 'deposit', 'kharcha', 'withdrawal')
        or (e.kind = 'diye' and p.type = 'supplier'));

grant select on public.cash_movements to authenticated;
