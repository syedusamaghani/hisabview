-- HisabView: security (Row Level Security) and entry protection
-- Run this file second, after 0001_tables.sql.

-- 1. Which shops belong to the logged-in person?
create function public.my_shop_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.shops where owner_user_id = (select auth.uid());
$$;

revoke all on function public.my_shop_ids() from public, anon;
grant execute on function public.my_shop_ids() to authenticated;

-- 2. Turn the locks on. With no rule, nobody gets in.
alter table public.shops     enable row level security;
alter table public.parties   enable row level security;
alter table public.entries   enable row level security;
alter table public.audit_log enable row level security;

-- 3. Take away powers we never want, even before the rules are checked.
revoke all on public.shops, public.parties, public.entries, public.audit_log from anon;
revoke delete on public.shops, public.parties, public.entries, public.audit_log from authenticated;
revoke update on public.audit_log from authenticated;

-- 4. Shops: only your own
create policy shops_select on public.shops for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy shops_insert on public.shops for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy shops_update on public.shops for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- 5. Parties: only in your own shop
create policy parties_select on public.parties for select to authenticated
  using (shop_id in (select public.my_shop_ids()));
create policy parties_insert on public.parties for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()));
create policy parties_update on public.parties for update to authenticated
  using (shop_id in (select public.my_shop_ids()))
  with check (shop_id in (select public.my_shop_ids()));

-- 6. Entries: read and add in your own shop, and cancel. No delete rule exists.
create policy entries_select on public.entries for select to authenticated
  using (shop_id in (select public.my_shop_ids()));
create policy entries_insert on public.entries for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()) and created_by = (select auth.uid()));
create policy entries_update on public.entries for update to authenticated
  using (shop_id in (select public.my_shop_ids()))
  with check (shop_id in (select public.my_shop_ids()));

-- 7. Audit log: read and add only. No update, no delete.
create policy audit_select on public.audit_log for select to authenticated
  using (shop_id in (select public.my_shop_ids()));
create policy audit_insert on public.audit_log for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()) and actor = (select auth.uid()));

-- 8. A saved entry can only be cancelled. Its amount, person, type and date are frozen.
create function public.entries_guard()
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
  or new.created_at   is distinct from old.created_at then
    raise exception 'A saved entry cannot be changed. Cancel it and add a new one.';
  end if;

  -- cancelled is final
  if old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    raise exception 'A cancelled entry cannot be brought back. Add a new entry.';
  end if;
  if old.status = 'cancelled' and new.cancelled_at is distinct from old.cancelled_at then
    raise exception 'A cancelled entry cannot be changed.';
  end if;

  return new;
end;
$$;

create trigger entries_guard_trg
  before update on public.entries
  for each row execute function public.entries_guard();
