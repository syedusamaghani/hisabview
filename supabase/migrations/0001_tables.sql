-- HisabView: tables (shops, parties, entries, audit_log)
-- Run this file first in Supabase > SQL Editor.
-- Money is stored as whole rupees (bigint). Balances are never stored: they are always
-- worked out from entries.

create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  -- one shop per login for now
  owner_user_id uuid not null unique references auth.users (id),
  shop_name     text not null check (char_length(btrim(shop_name)) between 1 and 80),
  language      text not null default 'ro' check (language in ('ro', 'ur')),
  created_at    timestamptz not null default now()
);

create table public.parties (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id),
  name            text not null check (char_length(btrim(name)) between 1 and 80),
  -- tells apart same-name people, for example "Gali no 4" or "Bakery wala"
  identifier      text check (identifier is null or char_length(identifier) <= 80),
  phone           text check (phone is null or char_length(phone) <= 20),
  type            text not null default 'customer' check (type in ('customer', 'supplier')),
  credit_limit    bigint check (credit_limit is null or credit_limit > 0),
  -- what the customer already owed before using the app (negative = they paid in advance)
  opening_balance bigint not null default 0 check (abs(opening_balance) <= 999999999),
  created_at      timestamptz not null default now(),
  archived        boolean not null default false,
  -- lets entries prove a party belongs to the same shop
  unique (id, shop_id)
);

create table public.entries (
  id           uuid primary key,  -- made on the phone, so it works offline
  shop_id      uuid not null references public.shops (id),
  party_id     uuid,
  kind         text not null check (kind in ('diye', 'mile', 'opening', 'kharcha', 'cash_sale')),
  amount       bigint not null check (amount > 0 and amount <= 999999999),
  note         text check (note is null or char_length(note) <= 300),
  transcript   text check (transcript is null or char_length(transcript) <= 500),
  source       text not null default 'manual' check (source in ('voice', 'manual', 'import')),
  status       text not null default 'active' check (status in ('active', 'cancelled', 'draft')),
  promise_date date,
  created_by   uuid not null references auth.users (id),
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  -- party must belong to the same shop (skipped when party_id is empty)
  foreign key (party_id, shop_id) references public.parties (id, shop_id),
  -- diye / mile / opening always belong to a person
  check (kind not in ('diye', 'mile', 'opening') or party_id is not null),
  -- a cancelled entry always says when it was cancelled
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.audit_log (
  id           uuid primary key,  -- made on the phone
  shop_id      uuid not null references public.shops (id),
  entity       text not null check (entity in ('shop', 'party', 'entry')),
  entity_id    uuid not null,
  action       text not null check (action in ('create', 'edit', 'cancel')),
  before_value jsonb,
  after_value  jsonb,
  actor        uuid not null references auth.users (id),
  created_at   timestamptz not null default now()
);

-- Indexes: they keep lists fast on a big khata
create index parties_shop_idx          on public.parties (shop_id, archived);
create index entries_shop_created_idx  on public.entries (shop_id, created_at desc);
create index entries_party_idx         on public.entries (party_id, status);
create index audit_shop_created_idx    on public.audit_log (shop_id, created_at desc);
create index audit_entity_idx          on public.audit_log (entity_id, created_at);
