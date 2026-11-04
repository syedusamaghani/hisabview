-- HisabView: sync support
-- Run this file third, after 0001_tables.sql and 0002_security.sql.
--
-- It adds an "updated_at" time to shops, parties and entries, set by the server itself.
-- With it, a phone only has to download what changed since its last visit (fast, small),
-- instead of the whole khata every time. The app also works without this file (it then
-- downloads everything once per session), so running it is safe at any time.

alter table public.shops   add column if not exists updated_at timestamptz not null default now();
alter table public.parties add column if not exists updated_at timestamptz not null default now();
alter table public.entries add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shops_touch_trg   on public.shops;
drop trigger if exists parties_touch_trg on public.parties;
drop trigger if exists entries_touch_trg on public.entries;

create trigger shops_touch_trg   before insert or update on public.shops   for each row execute function public.touch_updated_at();
create trigger parties_touch_trg before insert or update on public.parties for each row execute function public.touch_updated_at();
create trigger entries_touch_trg before insert or update on public.entries for each row execute function public.touch_updated_at();

create index if not exists parties_updated_idx on public.parties (shop_id, updated_at);
create index if not exists entries_updated_idx on public.entries (shop_id, updated_at);
