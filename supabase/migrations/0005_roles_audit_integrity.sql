-- HisabView: roles, server-side audit, integrity guards (Phase 1)
-- Run in Supabase > SQL Editor AFTER 0001, 0002, 0003 and 0004. Safe to run on a khata that already has data:
-- nothing is deleted or changed in the money records, only new columns and tables are added.
--
-- What this adds:
--   1. Staff: shop_members (Owner / Manager / Cashier) and invitations by Google email. The rules are checked
--      HERE in the database, so a hidden button on the phone is not the only protection.
--   2. Branch: branches table and an empty branch_id on people and entries (ready for later; empty = main shop).
--   3. Entries: payment method, who cancelled and why, and the time the SERVER received the entry.
--   4. The server writes its own audit line and activity line for every change (it cannot be skipped by a phone).
--   5. Guards: a customer's type / old balance cannot change once entries exist; cashier cannot change records.
--   6. party_balances: balances worked out from entries on the server (to compare with the phone).

-- ---------------------------------------------------------------- new columns (before any new trigger exists)
create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);

alter table public.parties add column branch_id uuid;
alter table public.parties add constraint parties_branch_fk foreign key (branch_id, shop_id) references public.branches (id, shop_id);

alter table public.entries add column branch_id uuid;
alter table public.entries add constraint entries_branch_fk foreign key (branch_id, shop_id) references public.branches (id, shop_id);
alter table public.entries add column method text check (method is null or method in ('cash', 'jazzcash', 'easypaisa', 'bank', 'other'));
alter table public.entries add column cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200);
alter table public.entries add column cancelled_by uuid references auth.users (id);
-- When the server received the entry. created_at is the phone's clock (may be wrong); this one cannot be.
alter table public.entries add column server_received_at timestamptz;
update public.entries set server_received_at = created_at where server_received_at is null; -- old rows: best known time
alter table public.entries alter column server_received_at set default now();
alter table public.entries alter column server_received_at set not null;

alter table public.audit_log add column origin text not null default 'phone' check (origin in ('phone', 'server'));
alter table public.audit_log add column reason text check (reason is null or char_length(reason) <= 200);
alter table public.audit_log add column device text check (device is null or char_length(device) <= 200);

-- Small sanity checks that were missing
-- "not valid" = new and changed rows must follow the rule, old rows are not re-checked (so no old khata can block this file)
alter table public.entries add constraint entries_sale_has_no_person check (kind not in ('kharcha', 'cash_sale') or party_id is null) not valid;
alter table public.entries add constraint entries_promise_only_diye check (promise_date is null or kind = 'diye') not valid;

-- ---------------------------------------------------------------- staff
create table public.shop_members (
  shop_id    uuid not null references public.shops (id),
  user_id    uuid not null references auth.users (id),
  role       text not null check (role in ('owner', 'manager', 'cashier')),
  branch_id  uuid,
  active     boolean not null default true,
  email      text check (email is null or char_length(email) <= 200),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id),
  foreign key (branch_id, shop_id) references public.branches (id, shop_id)
);
-- One owner per shop, and one active shop per person (the app works with one shop per login)
create unique index shop_members_one_owner on public.shop_members (shop_id) where role = 'owner';
create unique index shop_members_one_shop  on public.shop_members (user_id) where active;

create table public.shop_invites (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id),
  email       text not null check (char_length(email) between 3 and 200 and email = lower(btrim(email))),
  role        text not null check (role in ('manager', 'cashier')),
  invited_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (shop_id, email)
);

create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id),
  user_id    uuid references auth.users (id),
  action     text not null check (char_length(action) <= 60),  -- for example entry.create, entry.cancel, party.edit
  entity     text not null check (char_length(entity) <= 30),
  entity_id  uuid,
  device     text check (device is null or char_length(device) <= 200),
  created_at timestamptz not null default now()
);
create index activity_shop_created_idx on public.activity_log (shop_id, created_at desc);

-- Every existing owner becomes the owner member
insert into public.shop_members (shop_id, user_id, role)
select id, owner_user_id, 'owner' from public.shops
on conflict do nothing;

-- ---------------------------------------------------------------- who is who
create or replace function public.my_shop_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select shop_id from public.shop_members where user_id = (select auth.uid()) and active;
$$;

-- The role of the logged-in person in a shop: owner / manager / cashier, or null (not a member)
create function public.my_role(p_shop uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.shop_members where shop_id = p_shop and user_id = (select auth.uid()) and active;
$$;

revoke all on function public.my_role(uuid) from public, anon;
grant execute on function public.my_role(uuid) to authenticated;

-- A new shop makes its creator the owner member
create function public.shop_owner_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.shop_members (shop_id, user_id, role, email)
  values (new.id, new.owner_user_id, 'owner', (select auth.jwt() ->> 'email'))
  on conflict do nothing;
  return new;
end;
$$;
create trigger shops_owner_member_trg after insert on public.shops for each row execute function public.shop_owner_member();

-- ---------------------------------------------------------------- row-level security
alter table public.branches     enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_invites enable row level security;
alter table public.activity_log enable row level security;

revoke all on public.branches, public.shop_members, public.shop_invites, public.activity_log from anon;
-- Staff changes only go through the functions below; the log is written only by the database itself
revoke insert, update, delete on public.shop_members, public.shop_invites, public.activity_log from authenticated;
revoke delete on public.branches from authenticated;

drop policy shops_select on public.shops;
drop policy shops_update on public.shops;
create policy shops_select on public.shops for select to authenticated using (id in (select public.my_shop_ids()));
-- Only the owner changes the shop's settings
create policy shops_update on public.shops for update to authenticated
  using (public.my_role(id) = 'owner') with check (public.my_role(id) = 'owner');

-- People and entries: every member of the shop may read and add. Who may CHANGE them is decided by the
-- guard triggers below (a cashier can resend the same row, but cannot alter or cancel it).
drop policy parties_select on public.parties;
drop policy parties_insert on public.parties;
drop policy parties_update on public.parties;
create policy parties_select on public.parties for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy parties_insert on public.parties for insert to authenticated with check (shop_id in (select public.my_shop_ids()));
create policy parties_update on public.parties for update to authenticated
  using (shop_id in (select public.my_shop_ids())) with check (shop_id in (select public.my_shop_ids()));

drop policy entries_select on public.entries;
drop policy entries_insert on public.entries;
drop policy entries_update on public.entries;
create policy entries_select on public.entries for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy entries_insert on public.entries for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()) and created_by = (select auth.uid()));
create policy entries_update on public.entries for update to authenticated
  using (shop_id in (select public.my_shop_ids())) with check (shop_id in (select public.my_shop_ids()));

drop policy audit_select on public.audit_log;
drop policy audit_insert on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy audit_insert on public.audit_log for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()) and actor = (select auth.uid()) and origin = 'phone');

create policy branches_select on public.branches for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy branches_insert on public.branches for insert to authenticated with check (public.my_role(shop_id) = 'owner');
create policy branches_update on public.branches for update to authenticated
  using (public.my_role(shop_id) = 'owner') with check (public.my_role(shop_id) = 'owner');

-- A person sees their own membership; the owner sees the whole team and the invitations
create policy members_select on public.shop_members for select to authenticated
  using (user_id = (select auth.uid()) or public.my_role(shop_id) = 'owner');
create policy invites_select on public.shop_invites for select to authenticated using (public.my_role(shop_id) = 'owner');
-- The activity log is for the owner and managers
create policy activity_select on public.activity_log for select to authenticated using (public.my_role(shop_id) in ('owner', 'manager'));

-- ---------------------------------------------------------------- staff functions (the only way to change the team)
create function public.invite_member(p_email text, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_shop  uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select shop_id into v_shop from public.shop_members where user_id = (select auth.uid()) and active and role = 'owner';
  if v_shop is null then raise exception 'Only the owner can add staff' using errcode = '42501'; end if;
  if p_role not in ('manager', 'cashier') then raise exception 'Role must be manager or cashier' using errcode = '22023'; end if;
  if v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' or char_length(v_email) > 200 then raise exception 'Email is not valid' using errcode = '22023'; end if;
  insert into public.shop_invites (shop_id, email, role, invited_by)
  values (v_shop, v_email, p_role, (select auth.uid()))
  on conflict (shop_id, email) do update set role = excluded.role, accepted_at = null;
  insert into public.activity_log (shop_id, user_id, action, entity, device)
  values (v_shop, (select auth.uid()), 'member.invite', 'member', public.request_device());
end;
$$;

-- Owner changes a team member's role, or switches them off (never deleted: their old entries keep their name)
create function public.set_member(p_user uuid, p_role text, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_shop uuid;
begin
  select shop_id into v_shop from public.shop_members where user_id = (select auth.uid()) and active and role = 'owner';
  if v_shop is null then raise exception 'Only the owner can change staff' using errcode = '42501'; end if;
  if p_role not in ('manager', 'cashier') then raise exception 'Role must be manager or cashier' using errcode = '22023'; end if;
  update public.shop_members set role = p_role, active = p_active
   where shop_id = v_shop and user_id = p_user and role <> 'owner';
  if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;
  insert into public.activity_log (shop_id, user_id, action, entity, device)
  values (v_shop, (select auth.uid()), case when p_active then 'member.change' else 'member.off' end, 'member', public.request_device());
end;
$$;

-- Called at login: an invited email becomes a member (the owner never needs to know passwords or ids)
create function public.accept_my_invites()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  r public.shop_invites;
begin
  if (select auth.uid()) is null or v_email = '' then return; end if;
  for r in select * from public.shop_invites where email = v_email and accepted_at is null order by created_at loop
    -- someone who already works in another shop is not moved
    if exists (select 1 from public.shop_members where user_id = (select auth.uid()) and active and shop_id <> r.shop_id) then continue; end if;
    insert into public.shop_members (shop_id, user_id, role, email) values (r.shop_id, (select auth.uid()), r.role, v_email)
    on conflict (shop_id, user_id) do update set role = excluded.role, active = true;
    update public.shop_invites set accepted_at = now() where id = r.id;
    insert into public.activity_log (shop_id, user_id, action, entity, device)
    values (r.shop_id, (select auth.uid()), 'member.join', 'member', public.request_device());
  end loop;
end;
$$;

revoke all on function public.invite_member(text, text), public.set_member(uuid, text, boolean), public.accept_my_invites() from public, anon;
grant execute on function public.invite_member(text, text), public.set_member(uuid, text, boolean), public.accept_my_invites() to authenticated;

-- ---------------------------------------------------------------- guards
-- The phone model the request came from (for the activity log). Empty when not known.
create function public.request_device()
returns text
language plpgsql stable
as $$
begin
  return left(nullif(current_setting('request.headers', true)::json ->> 'user-agent', ''), 200);
exception when others then
  return null;
end;
$$;

-- The row without the "last changed" time, to tell a real change from a harmless resend
create function public.same_row(a jsonb, b jsonb)
returns boolean
language sql immutable
as $$ select (a - 'updated_at') = (b - 'updated_at'); $$;

create or replace function public.entries_guard()
returns trigger
language plpgsql
as $$
begin
  if new.id           is distinct from old.id
  or new.shop_id      is distinct from old.shop_id
  or new.party_id     is distinct from old.party_id
  or new.kind         is distinct from old.kind
  or new.amount       is distinct from old.amount
  or new.created_by   is distinct from old.created_by
  or new.created_at   is distinct from old.created_at
  or new.branch_id    is distinct from old.branch_id
  or new.method       is distinct from old.method
  or new.server_received_at is distinct from old.server_received_at then
    raise exception 'A saved entry cannot be changed. Cancel it and add a new one.';
  end if;

  if old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    raise exception 'A cancelled entry cannot be brought back. Add a new entry.';
  end if;
  if old.status = 'cancelled' and not public.same_row(to_jsonb(new), to_jsonb(old)) then
    raise exception 'A cancelled entry cannot be changed.';
  end if;

  -- A cashier can add entries. They can take back ("Wapas lo") their OWN entry within 10 minutes of writing it,
  -- and nothing else: later corrections are for a manager or the owner.
  if public.my_role(new.shop_id) = 'cashier' and not public.same_row(to_jsonb(new), to_jsonb(old)) then
    if not (
      new.status = 'cancelled' and old.status = 'active'
      and old.created_by = (select auth.uid())
      and new.cancelled_at <= old.created_at + interval '10 minutes'
      and (to_jsonb(new) - 'updated_at' - 'status' - 'cancelled_at' - 'cancel_reason' - 'cancelled_by')
        = (to_jsonb(old) - 'updated_at' - 'status' - 'cancelled_at' - 'cancel_reason' - 'cancelled_by')
    ) then
      raise exception 'A cashier cannot cancel or change this entry' using errcode = '42501';
    end if;
  end if;

  -- Who cancelled it is always the logged-in person, whatever the phone says
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_by := coalesce((select auth.uid()), new.cancelled_by);
  elsif new.cancel_reason is distinct from old.cancel_reason or new.cancelled_by is distinct from old.cancelled_by then
    raise exception 'The cancel details can only be set when the entry is cancelled.';
  end if;

  return new;
end;
$$;

create function public.parties_guard()
returns trigger
language plpgsql
as $$
begin
  if new.shop_id is distinct from old.shop_id then
    raise exception 'A customer cannot move to another shop.';
  end if;
  if public.my_role(new.shop_id) = 'cashier' and not public.same_row(to_jsonb(new), to_jsonb(old)) then
    raise exception 'A cashier cannot change a customer' using errcode = '42501';
  end if;
  -- Changing these would silently change the balance. Old balance is an entry ('opening'), not an edit.
  if (new.type is distinct from old.type or new.opening_balance is distinct from old.opening_balance)
     and exists (select 1 from public.entries where party_id = new.id) then
    raise exception 'Type and old balance cannot change after entries exist. Add an entry instead.';
  end if;
  return new;
end;
$$;
create trigger parties_guard_trg before update on public.parties for each row execute function public.parties_guard();

create function public.shops_guard()
returns trigger
language plpgsql
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'The owner of a shop cannot be changed here.';
  end if;
  return new;
end;
$$;
create trigger shops_guard_trg before update on public.shops for each row execute function public.shops_guard();

-- ---------------------------------------------------------------- the server's own diary
-- Written by the database for every create / edit / cancel, so it exists even if the phone never sent its own line.
-- origin = 'server'. The phone's own lines (origin = 'phone') carry the reason and stay as they are.
create function public.record_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_entity text := case tg_table_name when 'entries' then 'entry' when 'parties' then 'party' else 'shop' end;
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
create trigger entries_record_trg after insert or update on public.entries for each row execute function public.record_change();
create trigger parties_record_trg after insert or update on public.parties for each row execute function public.record_change();
create trigger shops_record_trg   after insert or update on public.shops   for each row execute function public.record_change();

-- ---------------------------------------------------------------- balances worked out on the server
-- Same rule as the app (src/lib/balance.ts): old balance + diye - mile, active entries only.
-- Use it to check the phone's numbers, for example: select * from party_balances where shop_id = '...';
create view public.party_balances with (security_invoker = true) as
select p.shop_id,
       p.id as party_id,
       p.opening_balance + coalesce(sum(
         case when e.status <> 'active' then 0
              when e.kind = 'diye' then e.amount
              when e.kind = 'mile' then -e.amount
              when e.kind = 'opening' then case when p.type = 'supplier' then -e.amount else e.amount end
              else 0 end), 0) as balance
  from public.parties p
  left join public.entries e on e.party_id = p.id
 group by p.shop_id, p.id, p.opening_balance, p.type;

grant select on public.party_balances to authenticated;

-- ---------------------------------------------------------------- the server's clock
-- The phone asks this to find out if its own date and time are wrong (a wrong clock puts entries on the wrong day).
create function public.server_time()
returns timestamptz
language sql stable
as $$ select now(); $$;

grant execute on function public.server_time() to authenticated;
