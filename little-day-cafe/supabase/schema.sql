-- LITTLE DAY CAFE: schema, RLS, และ function สำหรับ Supabase (PostgreSQL)
-- รันตามลำดับใน SQL Editor หรือ `supabase db push` ถ้าใช้ Supabase CLI
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create sequence if not exists order_seq;

-- ---------- บัญชีพนักงาน ----------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner', 'manager', 'staff', 'kitchen')),
  display_name text,
  created_at   timestamptz not null default now()
);

-- ---------- สินค้า ----------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  station    text not null check (station in ('beverage', 'bakery')),
  emoji      text not null default '🍽️',
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id),
  name         text not null check (length(trim(name)) > 0),
  description  text not null default '',
  price        numeric(10,2) not null check (price >= 0),
  emoji        text not null default '🍽️',
  is_available boolean not null default true,
  is_featured  boolean not null default false,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists product_options (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('single', 'multi')),
  is_required boolean not null default false,
  sort        int not null default 0
);

create table if not exists product_option_values (
  id          uuid primary key default gen_random_uuid(),
  option_id   uuid not null references product_options(id) on delete cascade,
  name        text not null,
  price_delta numeric(10,2) not null default 0,
  sort        int not null default 0
);

-- ---------- โต๊ะและ QR ----------
create table if not exists tables (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- เก็บเฉพาะ hash ของ token โดย token ที่ยังใช้งานได้มีได้ไม่เกินหนึ่งอันต่อโต๊ะ
create table if not exists table_tokens (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references tables(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create unique index if not exists table_tokens_one_active on table_tokens(table_id) where revoked_at is null;

-- ---------- ออเดอร์และการชำระเงิน ----------
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       text not null unique,
  channel        text not null check (channel in ('dine_in', 'takeaway', 'counter')),
  table_id       uuid references tables(id),
  customer_name  text,
  note           text,
  status         text not null default 'new'
                 check (status in ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid')),
  payment_method text not null check (payment_method in ('cash', 'promptpay')),
  payment_ref    text,
  total          numeric(10,2) not null check (total >= 0),
  cost_total     numeric(10,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on orders(created_at);
create index if not exists orders_status_idx on orders(status);

create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_name text not null,
  category_id  uuid,
  station      text not null check (station in ('beverage', 'bakery')),
  qty          int not null check (qty between 1 and 20),
  unit_price   numeric(10,2) not null,
  unit_cost    numeric(10,2) not null default 0,
  line_total   numeric(10,2) not null,
  note         text
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists order_item_options (
  id           uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_name  text not null,
  value_name   text not null,
  price_delta  numeric(10,2) not null default 0
);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id),
  method       text not null check (method in ('cash', 'promptpay')),
  amount       numeric(10,2) not null check (amount > 0),
  status       text not null default 'confirmed' check (status in ('pending', 'confirmed')),
  reference    text,
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz not null default now()
);
-- ป้องกันการบันทึกการชำระซ้ำ: ออเดอร์หนึ่งมีการยืนยันได้ครั้งเดียว
create unique index if not exists payments_one_confirmed on payments(order_id) where status = 'confirmed';

-- ---------- วัตถุดิบ สูตร และรายจ่าย ----------
create table if not exists inventory (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  unit       text not null,
  qty        numeric(12,2) not null default 0 check (qty >= 0),
  min_qty    numeric(12,2) not null default 0 check (min_qty >= 0),
  unit_cost  numeric(10,4) not null default 0 check (unit_cost >= 0),
  supplier   text,
  updated_at timestamptz not null default now()
);

create table if not exists recipes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products(id) on delete cascade
);

create table if not exists recipe_items (
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references inventory(id) on delete cascade,
  qty           numeric(12,2) not null check (qty > 0),
  primary key (recipe_id, ingredient_id)
);

create table if not exists inventory_transactions (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references inventory(id),
  qty_change    numeric(12,2) not null,
  reason        text not null check (reason in ('purchase', 'order', 'adjust', 'waste', 'cancel')),
  order_id      uuid references orders(id),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  spent_on   date not null default current_date,
  category   text not null,
  amount     numeric(10,2) not null check (amount > 0),
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists shop_settings (
  id            int primary key default 1 check (id = 1),
  shop_name     text not null default 'LITTLE DAY CAFE',
  phone         text not null default '',
  address       text not null default '',
  promptpay_id  text not null default '',
  opening_hours text not null default '08:00 – 18:00',
  updated_at    timestamptz not null default now()
);
insert into shop_settings (id) values (1) on conflict do nothing;

-- ---------- ฟังก์ชันช่วยตรวจสิทธิ์ ----------
create or replace function current_role_name() returns text
language sql stable security definer set search_path = public, extensions
as $$ select role from profiles where id = auth.uid() $$;

create or replace function require_role(allowed text[]) returns void
language plpgsql stable security definer set search_path = public, extensions
as $$
begin
  if current_role_name() is null or not (current_role_name() = any (allowed)) then
    raise exception 'ไม่มีสิทธิ์ดำเนินการนี้' using errcode = '42501';
  end if;
end $$;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_options enable row level security;
alter table product_option_values enable row level security;
alter table tables enable row level security;
alter table table_tokens enable row level security; -- ไม่มี policy: เข้าถึงได้เฉพาะผ่าน function
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_options enable row level security;
alter table payments enable row level security;
alter table inventory enable row level security;
alter table recipes enable row level security;
alter table recipe_items enable row level security;
alter table inventory_transactions enable row level security;
alter table expenses enable row level security;
alter table shop_settings enable row level security;

create policy profiles_self_read on profiles for select to authenticated
  using (id = auth.uid() or current_role_name() in ('owner', 'manager'));

-- เมนูอ่านได้ทุกคน (ลูกค้าไม่ต้องล็อกอิน) แต่แก้ไขได้เฉพาะเจ้าของและพนักงาน
create policy categories_read on categories for select to anon, authenticated using (true);
create policy products_read on products for select to anon, authenticated using (true);
create policy options_read on product_options for select to anon, authenticated using (true);
create policy values_read on product_option_values for select to anon, authenticated using (true);
create policy categories_write on categories for all to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff')) with check (current_role_name() in ('owner', 'manager', 'staff'));
create policy products_write on products for all to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff')) with check (current_role_name() in ('owner', 'manager', 'staff'));
create policy options_write on product_options for all to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff')) with check (current_role_name() in ('owner', 'manager', 'staff'));
create policy values_write on product_option_values for all to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff')) with check (current_role_name() in ('owner', 'manager', 'staff'));

create policy tables_staff on tables for all to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff')) with check (current_role_name() in ('owner', 'manager', 'staff'));

-- ออเดอร์: ครัวและพนักงานเห็นได้ ลูกค้าอ่านผ่าน get_order_json เท่านั้น
-- การเขียนทั้งหมดทำผ่าน function ที่ตรวจสิทธิ์และ transaction แล้ว จึงไม่มี policy เขียนโดยตรง
create policy orders_staff_read on orders for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff', 'kitchen'));
create policy order_items_staff_read on order_items for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff', 'kitchen'));
create policy order_item_options_staff_read on order_item_options for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff', 'kitchen'));
create policy payments_staff_read on payments for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff'));

create policy inventory_read on inventory for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff'));
create policy inventory_owner_write on inventory for all to authenticated
  using (current_role_name() in ('owner', 'manager')) with check (current_role_name() in ('owner', 'manager'));
create policy recipes_read on recipes for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff'));
create policy recipes_owner_write on recipes for all to authenticated
  using (current_role_name() in ('owner', 'manager')) with check (current_role_name() in ('owner', 'manager'));
create policy recipe_items_read on recipe_items for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff'));
create policy recipe_items_owner_write on recipe_items for all to authenticated
  using (current_role_name() in ('owner', 'manager')) with check (current_role_name() in ('owner', 'manager'));
create policy inv_tx_read on inventory_transactions for select to authenticated
  using (current_role_name() in ('owner', 'manager', 'staff'));
create policy expenses_owner on expenses for all to authenticated
  using (current_role_name() in ('owner', 'manager')) with check (current_role_name() in ('owner', 'manager'));

-- ข้อมูลร้านอ่านได้ทุกคน (มีเบอร์ PromptPay ที่จะแสดงใน QR อยู่แล้ว) แก้ไขได้เฉพาะเจ้าของ
create policy settings_read on shop_settings for select to anon, authenticated using (true);
create policy settings_owner_write on shop_settings for update to authenticated
  using (current_role_name() in ('owner', 'manager')) with check (current_role_name() in ('owner', 'manager'));

-- ---------- Function: โต๊ะและ token ----------
create or replace function resolve_table_token(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions
as $$
  select jsonb_build_object('tableId', t.id, 'code', t.code)
  from table_tokens tt join tables t on t.id = tt.table_id
  where tt.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and tt.revoked_at is null and t.is_active
$$;
grant execute on function resolve_table_token(text) to anon, authenticated;

create or replace function rotate_table_token(p_table uuid) returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token text;
begin
  perform require_role(array['owner', 'manager', 'staff']);
  update table_tokens set revoked_at = now() where table_id = p_table and revoked_at is null;
  v_token := translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
  insert into table_tokens (table_id, token_hash)
  values (p_table, encode(digest(v_token, 'sha256'), 'hex'));
  return v_token; -- ส่งกลับครั้งเดียว ฐานข้อมูลเก็บแค่ hash
end $$;
grant execute on function rotate_table_token(uuid) to authenticated;

-- ---------- Function: สร้างออเดอร์ (ราคาและสต็อกคำนวณในฐานข้อมูล) ----------
create or replace function create_order(
  p_token text, p_channel text, p_customer text, p_note text, p_method text, p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_table_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product products;
  v_station text;
  v_qty int;
  v_unit_price numeric := 0;
  v_unit_cost numeric;
  v_item_id uuid;
  v_group product_options;
  v_ids uuid[];
  v_valid int;
  v_names text[];
  v_total numeric := 0;
  v_cost numeric := 0;
  v_sel jsonb;
  v_note text;
  v_short text;
begin
  if p_channel not in ('dine_in', 'takeaway', 'counter') then raise exception 'ช่องทางไม่ถูกต้อง'; end if;
  if p_method not in ('cash', 'promptpay') then raise exception 'วิธีชำระไม่ถูกต้อง'; end if;
  if p_channel = 'counter' then perform require_role(array['owner', 'manager', 'staff']); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ไม่มีรายการในออเดอร์';
  end if;

  if p_token is not null and p_token <> '' then
    select tt.table_id into v_table_id
    from table_tokens tt join tables t on t.id = tt.table_id
    where tt.token_hash = encode(digest(p_token, 'sha256'), 'hex') and tt.revoked_at is null and t.is_active;
    if v_table_id is null then raise exception 'QR ไม่ถูกต้องหรือโต๊ะถูกปิดใช้งาน'; end if;
  end if;
  if p_channel = 'dine_in' and v_table_id is null then raise exception 'ทานที่ร้านต้องสแกน QR ของโต๊ะ'; end if;
  if p_channel <> 'dine_in' and v_table_id is not null then raise exception 'เฉพาะออเดอร์ทานที่ร้านที่ผูกกับโต๊ะ'; end if;

  create temp table if not exists _need (ingredient_id uuid, qty numeric) on commit drop;
  delete from _need;

  insert into orders (id, order_no, channel, table_id, customer_name, note, payment_status, payment_method,
                      total, cost_total, status)
  values (v_order_id, 'A' || lpad(nextval('order_seq')::text, 3, '0'), p_channel, v_table_id,
          nullif(left(trim(coalesce(p_customer, '')), 40), ''), null,
          case when p_method = 'cash' then 'unpaid' else 'pending' end, p_method, 0, 0, 'new');

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'productId')::uuid;
    if not found then raise exception 'ไม่พบเมนูนี้'; end if;
    if not v_product.is_available then raise exception '% หมดชั่วคราว', v_product.name; end if;

    v_qty := coalesce((v_item->>'qty')::int, 0);
    if v_qty < 1 or v_qty > 20 then raise exception 'จำนวนต้องอยู่ระหว่าง 1–20'; end if;

    select station into v_station from categories where id = v_product.category_id;

    -- ตรวจว่าไม่มีกลุ่มตัวเลือกแปลกปลอม
    v_sel := coalesce(v_item->'selections', '[]'::jsonb);
    if exists (
      select 1 from jsonb_array_elements(v_sel) s
      where not exists (select 1 from product_options po
                        where po.id = (s->>'groupId')::uuid and po.product_id = v_product.id)
    ) then raise exception 'ตัวเลือกไม่ถูกต้อง'; end if;

    v_unit_price := v_product.price;
    v_names := '{}';
    v_item_id := gen_random_uuid();

    insert into order_items (id, order_id, product_id, product_name, category_id, station, qty,
                             unit_price, unit_cost, line_total, note)
    values (v_item_id, v_order_id, v_product.id, v_product.name, v_product.category_id, v_station, v_qty,
            0, 0, 0, nullif(left(trim(coalesce(v_item->>'note', '')), 200), ''));

    for v_group in select * from product_options where product_id = v_product.id order by sort loop
      select coalesce(array_agg(v::uuid), '{}') into v_ids
      from jsonb_array_elements(v_sel) s, jsonb_array_elements_text(coalesce(s->'valueIds', '[]'::jsonb)) v
      where s->>'groupId' = v_group.id::text;

      if v_group.type = 'single' and cardinality(v_ids) > 1 then
        raise exception 'เลือก%ได้เพียงอย่างเดียว', v_group.name;
      end if;
      if v_group.is_required and cardinality(v_ids) = 0 then
        raise exception 'กรุณาเลือก%', v_group.name;
      end if;
      select count(*) into v_valid from product_option_values
      where option_id = v_group.id and id = any (v_ids);
      if v_valid <> cardinality(v_ids) then raise exception 'ตัวเลือกไม่ถูกต้อง'; end if;

      insert into order_item_options (order_item_id, option_name, value_name, price_delta)
      select v_item_id, v_group.name, pv.name, pv.price_delta
      from product_option_values pv where pv.option_id = v_group.id and pv.id = any (v_ids);

      select v_unit_price + coalesce(sum(price_delta), 0) into v_unit_price
      from product_option_values where id = any (v_ids);
    end loop;

    -- ต้นทุนต่อชิ้นจากสูตร และปริมาณวัตถุดิบที่ต้องตัด
    select coalesce(sum(i.unit_cost * ri.qty), 0) into v_unit_cost
    from recipes r join recipe_items ri on ri.recipe_id = r.id
    join inventory i on i.id = ri.ingredient_id
    where r.product_id = v_product.id;

    insert into _need (ingredient_id, qty)
    select ri.ingredient_id, ri.qty * v_qty
    from recipes r join recipe_items ri on ri.recipe_id = r.id
    where r.product_id = v_product.id;

    update order_items set unit_price = v_unit_price, unit_cost = v_unit_cost,
           line_total = v_unit_price * v_qty
    where id = v_item_id;

    v_total := v_total + v_unit_price * v_qty;
    v_cost := v_cost + v_unit_cost * v_qty;
  end loop;

  -- ตรวจวัตถุดิบรวมทั้งออเดอร์ก่อนตัดสต็อก
  select string_agg(i.name, ', ') into v_short
  from (select ingredient_id, sum(qty) as need from _need group by ingredient_id) n
  join inventory i on i.id = n.ingredient_id
  where i.qty < n.need;
  if v_short is not null then raise exception 'วัตถุดิบไม่พอ: %', v_short; end if;

  update inventory i set qty = i.qty - n.need, updated_at = now()
  from (select ingredient_id, sum(qty) as need from _need group by ingredient_id) n
  where i.id = n.ingredient_id;

  insert into inventory_transactions (ingredient_id, qty_change, reason, order_id, created_by)
  select ingredient_id, -sum(qty), 'order', v_order_id, auth.uid() from _need group by ingredient_id;

  v_note := nullif(left(trim(coalesce(p_note, '')), 200), '');
  update orders set total = v_total, cost_total = v_cost, note = v_note where id = v_order_id;

  return jsonb_build_object('id', v_order_id);
end $$;
grant execute on function create_order(text, text, text, text, text, jsonb) to anon, authenticated;

-- ---------- Function: อ่านออเดอร์ (ลูกค้าใช้ id ที่ไม่สามารถเดาได้) ----------
create or replace function get_order_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', o.id, 'no', o.order_no, 'channel', o.channel, 'status', o.status,
    'paymentStatus', o.payment_status, 'method', o.payment_method, 'paymentRef', o.payment_ref,
    'table', t.code, 'tableId', o.table_id, 'customer', o.customer_name, 'note', o.note,
    'total', o.total, 'costTotal', o.cost_total, 'createdAt', o.created_at,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', oi.product_id, 'name', oi.product_name, 'categoryId', oi.category_id,
        'station', oi.station, 'qty', oi.qty, 'unitPrice', oi.unit_price, 'lineTotal', oi.line_total,
        'unitCost', oi.unit_cost, 'note', oi.note,
        'options', coalesce((select jsonb_agg(oo.value_name order by oo.option_name)
                             from order_item_options oo where oo.order_item_id = oi.id), '[]'::jsonb)
      ) order by oi.id)
      from order_items oi where oi.order_id = o.id), '[]'::jsonb)
  )
  from orders o left join tables t on t.id = o.table_id
  where o.id = p_id
$$;
grant execute on function get_order_json(uuid) to anon, authenticated;

-- ---------- Function: เปลี่ยนสถานะ / ยืนยันการชำระ / ปรับสต็อก ----------
create or replace function set_order_status(p_id uuid, p_to text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_order orders;
  v_item record;
  v_ok boolean;
begin
  select * into v_order from orders where id = p_id for update;
  if not found then raise exception 'ไม่พบออเดอร์'; end if;

  if p_to = 'cancelled' then
    perform require_role(array['owner', 'manager', 'staff']);
    if v_order.status in ('completed', 'cancelled') then raise exception 'เปลี่ยนสถานะนี้ไม่ได้'; end if;
    if v_order.payment_status = 'paid' then raise exception 'ออเดอร์ที่ชำระแล้วยกเลิกไม่ได้ (ต้องคืนเงินก่อน)'; end if;

    for v_item in
      select ri.ingredient_id, ri.qty * oi.qty as back
      from order_items oi
      join recipes r on r.product_id = oi.product_id
      join recipe_items ri on ri.recipe_id = r.id
      where oi.order_id = p_id
    loop
      update inventory set qty = qty + v_item.back, updated_at = now() where id = v_item.ingredient_id;
      insert into inventory_transactions (ingredient_id, qty_change, reason, order_id, created_by)
      values (v_item.ingredient_id, v_item.back, 'cancel', p_id, auth.uid());
    end loop;
  else
    perform require_role(array['owner', 'manager', 'staff', 'kitchen']);
    v_ok := (v_order.status = 'new' and p_to = 'accepted')
         or (v_order.status = 'accepted' and p_to = 'preparing')
         or (v_order.status = 'preparing' and p_to = 'ready')
         or (v_order.status = 'ready' and p_to = 'completed');
    if not v_ok then raise exception 'เปลี่ยนสถานะนี้ไม่ได้'; end if;
  end if;

  update orders set status = p_to, updated_at = now() where id = p_id;
end $$;
grant execute on function set_order_status(uuid, text) to authenticated;

create or replace function confirm_payment(p_id uuid, p_method text, p_ref text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_order orders;
begin
  perform require_role(array['owner', 'manager', 'staff']);
  if p_method not in ('cash', 'promptpay') then raise exception 'วิธีชำระไม่ถูกต้อง'; end if;
  select * into v_order from orders where id = p_id for update;
  if not found then raise exception 'ไม่พบออเดอร์'; end if;
  -- ลูกค้ามักจ่ายหลังทานเสร็จ จึงรับเงินได้จนกว่าออเดอร์จะถูกยกเลิก
  if v_order.status = 'cancelled' then raise exception 'ออเดอร์นี้ถูกยกเลิกแล้ว'; end if;
  if v_order.payment_status = 'paid' then raise exception 'ออเดอร์นี้ชำระแล้ว (ป้องกันการบันทึกซ้ำ)'; end if;

  update orders set payment_status = 'paid', payment_method = p_method,
         payment_ref = nullif(trim(coalesce(p_ref, '')), ''), updated_at = now()
  where id = p_id;
  insert into payments (order_id, method, amount, status, reference, confirmed_by)
  values (p_id, p_method, v_order.total, 'confirmed', nullif(trim(coalesce(p_ref, '')), ''), auth.uid());
end $$;
grant execute on function confirm_payment(uuid, text, text) to authenticated;

create or replace function adjust_stock(p_id uuid, p_delta numeric, p_reason text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform require_role(array['owner', 'manager', 'staff']);
  if p_reason not in ('purchase', 'adjust', 'waste') then raise exception 'เหตุผลไม่ถูกต้อง'; end if;
  update inventory set qty = qty + p_delta, updated_at = now() where id = p_id;
  if not found then raise exception 'ไม่พบวัตถุดิบ'; end if;
  insert into inventory_transactions (ingredient_id, qty_change, reason, created_by)
  values (p_id, p_delta, p_reason, auth.uid());
end $$;
grant execute on function adjust_stock(uuid, numeric, text) to authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table tables;

-- ---------- แต่งตั้งบทบาท (เฉพาะเจ้าของ) ----------
-- ผู้จัดการมีสิทธิ์เท่าเจ้าของทุกอย่าง ยกเว้นการแต่งตั้งบทบาท
create or replace function set_user_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform require_role(array['owner']);
  if p_role not in ('owner', 'manager', 'staff', 'kitchen') then raise exception 'บทบาทไม่ถูกต้อง'; end if;
  insert into profiles (id, role) values (p_user, p_role)
  on conflict (id) do update set role = excluded.role;
end $$;
grant execute on function set_user_role(uuid, text) to authenticated;
