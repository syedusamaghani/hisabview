-- HisabView: stock, purchases and suppliers (Phase 3)
-- Run in Supabase > SQL Editor AFTER 0001 to 0005. Safe on a khata that already has data: nothing is deleted or
-- changed in the money records. It only adds two tables (products, stock_moves) and widens what an entry may be.
--
-- What this adds:
--   1. products: name, category, barcode, SKU, base unit (piece / gram / ml), packings (carton = 144 piece),
--      cost and selling price, minimum stock, a small picture. Never deleted: "archived" hides a product.
--   2. stock_moves: every movement of stock (purchase, sale, return, damaged, lost, correction). ADD-ONLY:
--      no row can be changed or removed, a mistake is undone by another movement that points at it.
--      Stock of a product = the sum of its movements (view product_stock).
--   3. Entries: two new kinds, 'purchase' and 'purchase_return' (they belong to a supplier and change what
--      we owe), plus the supplier's bill number and a link from a payment to its purchase.
--   4. The server writes its own diary line when a product changes, like it does for people and entries.
-- The app also works WITHOUT this file (everything except Saman keeps syncing), so running it is safe at any time.

-- ---------------------------------------------------------------- entries: purchase kinds
-- The old rules are replaced by lookup (their names can differ between databases): every check that mentions 'mile'
-- is the kind list or the "a person is needed" rule, both are written again below with the two new kinds.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.entries'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%mile%' loop
    execute format('alter table public.entries drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.entries add constraint entries_kind_check
  check (kind in ('diye', 'mile', 'opening', 'kharcha', 'cash_sale', 'purchase', 'purchase_return'));
alter table public.entries add constraint entries_person_needed
  check (kind not in ('diye', 'mile', 'opening', 'purchase', 'purchase_return') or party_id is not null);

alter table public.entries add column invoice_no text check (invoice_no is null or char_length(invoice_no) <= 60);
-- A payment made together with a purchase (or the money a supplier hands back for a return) points at that entry.
-- No foreign key on purpose: both may arrive in the same batch, in any order.
alter table public.entries add column ref_id uuid;

-- Goods always belong to a supplier; and the new fields cannot be changed later
create function public.entries_supplier_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.kind in ('purchase', 'purchase_return')
       and not exists (select 1 from public.parties where id = new.party_id and shop_id = new.shop_id and type = 'supplier') then
      raise exception 'A purchase must be on a supplier''s account.';
    end if;
  elsif new.invoice_no is distinct from old.invoice_no or new.ref_id is distinct from old.ref_id then
    raise exception 'A saved entry cannot be changed. Cancel it and add a new one.';
  end if;
  return new;
end;
$$;
create trigger entries_supplier_guard_trg before insert or update on public.entries for each row execute function public.entries_supplier_guard();

-- The diary may now talk about products
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.audit_log'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%''party''%' loop
    execute format('alter table public.audit_log drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.audit_log add constraint audit_log_entity_check check (entity in ('shop', 'party', 'entry', 'product'));

-- ---------------------------------------------------------------- products
create table public.products (
  id         uuid primary key,  -- made on the phone, so it works offline
  shop_id    uuid not null references public.shops (id),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  category   text check (category is null or char_length(category) <= 40),
  barcode    text check (barcode is null or char_length(barcode) <= 64),
  sku        text check (sku is null or char_length(sku) <= 64),
  -- stock is counted in whole base units
  base_unit  text not null check (base_unit in ('piece', 'gram', 'ml')),
  -- packings the shopkeeper added: [{"name":"carton","factor":144}] (dozen, kg and litre are built in)
  units      jsonb not null default '[]'::jsonb check (jsonb_typeof(units) = 'array'),
  -- the unit the two prices below are per
  price_unit text not null check (char_length(price_unit) between 1 and 20),
  cost_price bigint not null default 0 check (cost_price between 0 and 10000000),
  sell_price bigint not null default 0 check (sell_price between 0 and 10000000),
  min_stock  bigint not null default 0 check (min_stock between 0 and 100000000),
  image      text check (image is null or (char_length(image) <= 60000 and image like 'data:image/%')),
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, shop_id)
);
create index products_shop_idx on public.products (shop_id, updated_at);

-- ---------------------------------------------------------------- stock movements (add-only)
create table public.stock_moves (
  id          uuid primary key,  -- made on the phone
  shop_id     uuid not null references public.shops (id),
  product_id  uuid not null,
  entry_id    uuid references public.entries (id),   -- the sale or purchase it belongs to
  party_id    uuid,                                  -- the supplier, or the customer of a sale on udhaar
  kind        text not null check (kind in ('opening', 'purchase', 'purchase_return', 'sale', 'adjust', 'damaged', 'lost', 'reversal')),
  qty_base    bigint not null check (qty_base <> 0 and abs(qty_base) <= 100000000),  -- + adds stock, - removes it
  unit        text not null check (char_length(unit) between 1 and 20),              -- the unit it was typed in
  unit_factor bigint not null check (unit_factor between 1 and 1000000),
  unit_price  bigint check (unit_price is null or unit_price between 0 and 10000000),
  line_total  bigint not null default 0 check (line_total between 0 and 999999999),
  reason      text check (reason is null or char_length(reason) <= 200),
  reverses    uuid,                                  -- a reversal points at the movement it undoes
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),    -- the phone's clock
  server_received_at timestamptz not null default now(), -- the server's clock
  foreign key (product_id, shop_id) references public.products (id, shop_id),
  foreign key (party_id, shop_id) references public.parties (id, shop_id),
  -- the direction of each kind: purchases add, sales and returns remove, corrections and reversals may do either
  check (kind in ('adjust', 'reversal')
         or (kind in ('opening', 'purchase') and qty_base > 0)
         or (kind in ('sale', 'purchase_return', 'damaged', 'lost') and qty_base < 0))
);
-- A movement can be undone only once
create unique index stock_moves_undone_once on public.stock_moves (reverses) where reverses is not null;
create index stock_moves_product_idx on public.stock_moves (product_id, created_at);
create index stock_moves_shop_idx on public.stock_moves (shop_id, created_at);
create index stock_moves_entry_idx on public.stock_moves (entry_id);

-- ---------------------------------------------------------------- guards
create function public.products_guard()
returns trigger
language plpgsql
as $$
begin
  if new.shop_id is distinct from old.shop_id then
    raise exception 'A product cannot move to another shop.';
  end if;
  -- Counting in another base unit would silently change the meaning of every stored quantity
  if new.base_unit is distinct from old.base_unit and exists (select 1 from public.stock_moves where product_id = new.id) then
    raise exception 'The unit cannot change after stock was recorded.';
  end if;
  return new;
end;
$$;
create trigger products_guard_trg before update on public.products for each row execute function public.products_guard();

create function public.stock_moves_guard()
returns trigger
language plpgsql
as $$
declare undone record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'A stock movement cannot be changed or removed. Add another movement instead.';
  end if;
  -- A cashier only sells (and takes back a sale). Buying, returning and corrections are for a manager or the owner.
  if public.my_role(new.shop_id) = 'cashier' and new.kind not in ('sale', 'reversal') then
    raise exception 'A cashier cannot make this stock movement' using errcode = '42501';
  end if;
  if new.reverses is not null then
    select product_id, shop_id, qty_base into undone from public.stock_moves where id = new.reverses;
    if not found or undone.product_id <> new.product_id or undone.shop_id <> new.shop_id or undone.qty_base <> -new.qty_base then
      raise exception 'A reversal must undo exactly one earlier movement.';
    end if;
  elsif new.kind = 'reversal' then
    raise exception 'A reversal must say which movement it undoes.';
  end if;
  return new;
end;
$$;
create trigger stock_moves_guard_trg before insert or update or delete on public.stock_moves for each row execute function public.stock_moves_guard();

-- updated_at, so a phone only downloads what changed (stock_moves are add-only: created_at is enough)
create trigger products_touch_trg before insert or update on public.products for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- the server's own diary for products
-- Same function as in 0005, with one more name: a changed product is written to audit_log and activity_log by the database.
create or replace function public.record_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_entity text := case tg_table_name when 'entries' then 'entry' when 'parties' then 'party' when 'products' then 'product' else 'shop' end;
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
create trigger products_record_trg after insert or update on public.products for each row execute function public.record_change();

-- ---------------------------------------------------------------- row-level security
alter table public.products    enable row level security;
alter table public.stock_moves enable row level security;

revoke all on public.products, public.stock_moves from anon;
revoke delete on public.products from authenticated;
revoke update, delete on public.stock_moves from authenticated;

-- Everyone in the shop reads. Only the owner and a manager make or change products. Any member adds a movement
-- as themselves (the guard above limits a cashier to selling).
create policy products_select on public.products for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy products_insert on public.products for insert to authenticated
  with check (public.my_role(shop_id) in ('owner', 'manager'));
create policy products_update on public.products for update to authenticated
  using (public.my_role(shop_id) in ('owner', 'manager')) with check (public.my_role(shop_id) in ('owner', 'manager'));

create policy stock_moves_select on public.stock_moves for select to authenticated using (shop_id in (select public.my_shop_ids()));
create policy stock_moves_insert on public.stock_moves for insert to authenticated
  with check (shop_id in (select public.my_shop_ids()) and created_by = (select auth.uid()));

-- ---------------------------------------------------------------- stock worked out on the server
-- Stock = the sum of the movements. Compare it with the phone: select * from product_stock where shop_id = '...';
create view public.product_stock with (security_invoker = true) as
select p.shop_id,
       p.id as product_id,
       coalesce(sum(m.qty_base), 0) as stock_base
  from public.products p
  left join public.stock_moves m on m.product_id = p.id
 group by p.shop_id, p.id;

grant select on public.product_stock to authenticated;

-- ---------------------------------------------------------------- balances: purchases count too
-- Same rule as the app (src/lib/balance.ts). Goods bought on a supplier's account: we owe more (negative).
-- Goods sent back: we owe less.
create or replace view public.party_balances with (security_invoker = true) as
select p.shop_id,
       p.id as party_id,
       p.opening_balance + coalesce(sum(
         case when e.status <> 'active' then 0
              when e.kind = 'diye' then e.amount
              when e.kind = 'mile' then -e.amount
              when e.kind = 'purchase' then -e.amount
              when e.kind = 'purchase_return' then e.amount
              when e.kind = 'opening' then case when p.type = 'supplier' then -e.amount else e.amount end
              else 0 end), 0) as balance
  from public.parties p
  left join public.entries e on e.party_id = p.id
 group by p.shop_id, p.id, p.opening_balance, p.type;
