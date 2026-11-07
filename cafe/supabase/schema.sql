-- ตารางและกฎความปลอดภัยสำหรับแอปคาเฟ่ (รันใน SQL Editor ของ Supabase)

create extension if not exists pgcrypto;

create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in ('drink', 'cake', 'bread')),
  price       numeric(10,2) not null check (price >= 0),
  cost        numeric(10,2) not null default 0 check (cost >= 0),
  emoji       text default '🍽️',
  options     jsonb not null default '[]'::jsonb,
  available   boolean not null default true,
  sort        int not null default 0
);

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  table_code      text,
  customer_name   text,
  note            text,
  items           jsonb not null,
  total           numeric(10,2) not null,
  cost_total      numeric(10,2) not null default 0,
  status          text not null default 'new'
                  check (status in ('new', 'preparing', 'ready', 'served', 'cancelled')),
  paid            boolean not null default false,
  payment_method  text check (payment_method in ('cash', 'transfer')),
  created_at      timestamptz not null default now()
);

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  spent_on    date not null default current_date,
  category    text not null,
  amount      numeric(10,2) not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now()
);

alter table menu_items enable row level security;
alter table orders     enable row level security;
alter table expenses   enable row level security;

-- ลูกค้า (anon) อ่านได้เฉพาะเมนู
create policy "menu: public read" on menu_items
  for select to anon, authenticated using (true);

-- พนักงานที่ล็อกอินแล้วจัดการได้ทั้งหมด
create policy "menu: staff write" on menu_items
  for all to authenticated using (true) with check (true);
create policy "orders: staff" on orders
  for all to authenticated using (true) with check (true);
create policy "expenses: staff" on expenses
  for all to authenticated using (true) with check (true);

-- ลูกค้าสร้างออเดอร์ผ่านฟังก์ชันนี้เท่านั้น ราคาคำนวณจากฐานข้อมูล ไม่เชื่อราคาจากหน้าเว็บ
create or replace function place_order(p_table text, p_customer text, p_note text, p_items jsonb)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  it     jsonb;
  m      menu_items;
  qty    int;
  total  numeric := 0;
  cost   numeric := 0;
  lines  jsonb := '[]'::jsonb;
  result orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'ไม่มีรายการในออเดอร์';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into m from menu_items where id = (it->>'id')::uuid;
    if not found or not m.available then
      raise exception 'เมนูนี้หมดแล้ว: %', coalesce(m.name, it->>'id');
    end if;
    qty   := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    total := total + m.price * qty;
    cost  := cost + m.cost * qty;
    lines := lines || jsonb_build_object(
      'id', m.id, 'name', m.name, 'price', m.price,
      'qty', qty, 'option', coalesce(it->>'option', '')
    );
  end loop;

  insert into orders (table_code, customer_name, note, items, total, cost_total)
  values (
    nullif(left(p_table, 20), ''),
    nullif(left(p_customer, 40), ''),
    nullif(left(p_note, 200), ''),
    lines, total, cost
  )
  returning * into result;

  return result;
end;
$$;

grant execute on function place_order(text, text, text, jsonb) to anon, authenticated;

-- ลูกค้าติดตามสถานะออเดอร์ของตัวเองด้วย id (uuid เดาไม่ได้)
create or replace function get_order(p_id uuid)
returns orders
language sql
security definer
set search_path = public
as $$
  select * from orders where id = p_id;
$$;

grant execute on function get_order(uuid) to anon, authenticated;

-- ให้ realtime ส่งการเปลี่ยนแปลงของตารางไปยังหน้าพนักงาน
alter publication supabase_realtime add table orders, menu_items, expenses;
