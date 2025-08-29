-- Enable pgcrypto if not exists
create extension if not exists pgcrypto;

-- Products
create table if not exists products (
  id text primary key,
  name text not null,
  unit_price numeric not null,
  group_price numeric,
  group_min_qty int default 0,
  description text,
  content text,
  region text,
  image_urls jsonb default '[]'::jsonb,
  safe_stock int,
  updated_at timestamptz default now()
);
-- category for products (service/home/new)
alter table products add column if not exists category text;
-- product meta tables
create table if not exists product_modes (
  code text primary key,
  name text not null unique,
  has_inventory boolean not null default false,
  uses_used_items boolean not null default false,
  force_qty_one boolean not null default false,
  deduct_inventory boolean not null default false,
  visible_in_cart boolean not null default true,
  updated_at timestamptz default now()
);
create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  updated_at timestamptz default now()
);
alter table product_modes enable row level security;
alter table product_categories enable row level security;
-- reference columns in products
alter table products add column if not exists mode_code text references product_modes(code);
alter table products add column if not exists category_id uuid references product_categories(id);
alter table products add column if not exists default_quantity int not null default 1;
alter table products add column if not exists sold_count int not null default 0;

-- Inventory
create table if not exists inventory (
  id text primary key,
  name text not null,
  product_id text references products(id) on delete set null,
  quantity int not null default 0,
  description text,
  image_urls jsonb default '[]'::jsonb,
  safe_stock int,
  updated_at timestamptz default now()
);

-- Members
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  email text,
  phone text,
  addresses jsonb default '[]'::jsonb,
  referrer_type text check (referrer_type in ('member','technician','sales')),
  referrer_code text,
  points int default 0,
  updated_at timestamptz default now()
);

-- Technicians
create table if not exists technicians (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_name text,
  email text not null unique,
  phone text,
  region text not null check (region in ('north','central','south','all')),
  status text not null check (status in ('active','suspended')) default 'active',
  points int default 0,
  revenue_share_scheme text,
  skills jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer_name text,
  customer_phone text,
  customer_address text,
  preferred_date date,
  preferred_time_start text,
  preferred_time_end text,
  platform text default '日',
  referrer_code text,
  member_id uuid references members(id) on delete set null,
  service_items jsonb not null default '[]'::jsonb,
  assigned_technicians jsonb not null default '[]'::jsonb,
  signature_technician text,
  signatures jsonb not null default '{}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  photos_before jsonb not null default '[]'::jsonb,
  photos_after jsonb not null default '[]'::jsonb,
  payment_method text,
  payment_status text,
  points_used int default 0,
  points_deduct_amount numeric default 0,
  category text,
  channel text,
  used_item_id uuid,
  work_started_at timestamptz,
  work_completed_at timestamptz,
  service_finished_at timestamptz,
  canceled_reason text,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Support shifts
create table if not exists support_shifts (
  id text primary key,
  support_email text not null,
  date date not null,
  slot text not null check (slot in ('am','pm','full')),
  reason text,
  color text,
  updated_at timestamptz default now()
);

-- Technician leaves
create table if not exists technician_leaves (
  id text primary key,
  technician_email text not null,
  date date not null,
  full_day boolean not null default true,
  start_time text,
  end_time text,
  reason text,
  color text,
  updated_at timestamptz default now()
);

-- Technician work (assignments)
create table if not exists technician_work (
  id text primary key,
  technician_email text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  order_id uuid references orders(id) on delete cascade,
  quantity_label text,
  color text,
  updated_at timestamptz default now()
);

-- RLS minimal
alter table products enable row level security;
alter table inventory enable row level security;
alter table members enable row level security;
alter table technicians enable row level security;
alter table orders enable row level security;
alter table support_shifts enable row level security;
alter table technician_leaves enable row level security;
alter table technician_work enable row level security;

-- Report center
create table if not exists report_threads (
  id uuid primary key default gen_random_uuid(),
  subject text,
  body text,
  category text not null check (category in ('complaint','announce','reminder','other')),
  level text not null check (level in ('normal','urgent','critical')),
  target text not null default 'all',
  target_emails jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','closed')),
  order_id uuid references orders(id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,
  read_by_emails jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists report_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references report_threads(id) on delete cascade,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table report_threads enable row level security;
alter table report_messages enable row level security;

-- Payroll
create table if not exists payroll_records (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  month text not null,
  base_salary numeric,
  bonus numeric,
  revenue_share_rate numeric,
  total numeric,
  breakdown jsonb,
  updated_at timestamptz default now()
);
alter table payroll_records enable row level security;

-- Reservations
create table if not exists reservation_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table reservation_orders enable row level security;

create table if not exists reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservation_orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  unit_price numeric not null,
  quantity int not null default 1,
  updated_at timestamptz not null default now()
);
alter table reservation_items enable row level security;

-- Used items (二手)
create table if not exists used_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null,
  image_urls jsonb not null default '[]'::jsonb,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  reserved_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table used_items enable row level security;

-- backfill foreign keys created after referenced tables exist
alter table orders
  add constraint if not exists fk_orders_used_items
  foreign key (used_item_id) references used_items(id) on delete set null;

-- App settings
create table if not exists app_settings (
  id text primary key,
  bulletin text,
  bulletin_updated_at timestamptz,
  bulletin_updated_by text,
  countdown_enabled boolean,
  countdown_minutes int
);
alter table app_settings enable row level security;

-- Staff & applications
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  email text not null unique,
  phone text,
  role text not null check (role in ('support','sales')),
  status text not null default 'active' check (status in ('active','suspended')),
  ref_code text,
  points int default 0,
  permission_overrides jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table staff enable row level security;

create table if not exists staff_applications (
  id text primary key,
  name text not null,
  short_name text,
  email text not null,
  phone text,
  role text not null check (role in ('support','sales')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_at timestamptz not null default now()
);
alter table staff_applications enable row level security;

create table if not exists technician_applications (
  id text primary key,
  name text not null,
  short_name text,
  email text not null,
  phone text not null,
  region text not null check (region in ('north','central','south','all')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_at timestamptz not null default now()
);
alter table technician_applications enable row level security;

create table if not exists member_applications (
  id text primary key,
  name text not null,
  email text,
  phone text,
  referrer_code text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_at timestamptz not null default now()
);
alter table member_applications enable row level security;
-- Policies (idempotent via drop/create)
-- products
drop policy if exists products_select on products;
drop policy if exists products_insert on products;
drop policy if exists products_update on products;
create policy products_select on products for select using (true);
create policy products_insert on products for insert with check (true);
create policy products_update on products for update using (true) with check (true);

-- product meta policies
drop policy if exists product_modes_select on product_modes;
drop policy if exists product_modes_insert on product_modes;
drop policy if exists product_modes_update on product_modes;
drop policy if exists product_modes_delete on product_modes;
create policy product_modes_select on product_modes for select using (true);
create policy product_modes_insert on product_modes for insert with check (true);
create policy product_modes_update on product_modes for update using (true) with check (true);
create policy product_modes_delete on product_modes for delete using (true);

drop policy if exists product_categories_select on product_categories;
drop policy if exists product_categories_insert on product_categories;
drop policy if exists product_categories_update on product_categories;
drop policy if exists product_categories_delete on product_categories;
create policy product_categories_select on product_categories for select using (true);
create policy product_categories_insert on product_categories for insert with check (true);
create policy product_categories_update on product_categories for update using (true) with check (true);
create policy product_categories_delete on product_categories for delete using (true);

-- seed default modes if empty
insert into product_modes (code, name, has_inventory, uses_used_items, force_qty_one, deduct_inventory, visible_in_cart)
select 'svc','服務', false, false, false, false, true where not exists (select 1 from product_modes where code='svc');
insert into product_modes (code, name, has_inventory, uses_used_items, force_qty_one, deduct_inventory, visible_in_cart)
select 'home','居家', false, false, false, false, true where not exists (select 1 from product_modes where code='home');
insert into product_modes (code, name, has_inventory, uses_used_items, force_qty_one, deduct_inventory, visible_in_cart)
select 'new','新品', false, false, false, false, true where not exists (select 1 from product_modes where code='new');
insert into product_modes (code, name, has_inventory, uses_used_items, force_qty_one, deduct_inventory, visible_in_cart)
select 'used','二手', false, true, true, false, true where not exists (select 1 from product_modes where code='used');

-- inventory
drop policy if exists inventory_select on inventory;
drop policy if exists inventory_insert on inventory;
drop policy if exists inventory_update on inventory;
create policy inventory_select on inventory for select using (true);
create policy inventory_insert on inventory for insert with check (true);
create policy inventory_update on inventory for update using (true) with check (true);

-- members
drop policy if exists members_select on members;
drop policy if exists members_insert on members;
drop policy if exists members_update on members;
create policy members_select on members for select using (true);
create policy members_insert on members for insert with check (true);
create policy members_update on members for update using (true) with check (true);

-- technicians
drop policy if exists technicians_select on technicians;
drop policy if exists technicians_insert on technicians;
drop policy if exists technicians_update on technicians;
create policy technicians_select on technicians for select using (true);
create policy technicians_insert on technicians for insert with check (true);
create policy technicians_update on technicians for update using (true) with check (true);

-- orders
drop policy if exists orders_select on orders;
drop policy if exists orders_insert on orders;
drop policy if exists orders_update on orders;
create policy orders_select on orders for select using (true);
create policy orders_insert on orders for insert with check (true);
create policy orders_update on orders for update using (true) with check (true);

-- support_shifts
drop policy if exists support_shifts_select on support_shifts;
drop policy if exists support_shifts_insert on support_shifts;
drop policy if exists support_shifts_update on support_shifts;
create policy support_shifts_select on support_shifts for select using (true);
create policy support_shifts_insert on support_shifts for insert with check (true);
create policy support_shifts_update on support_shifts for update using (true) with check (true);

-- technician_leaves
drop policy if exists technician_leaves_select on technician_leaves;
drop policy if exists technician_leaves_insert on technician_leaves;
drop policy if exists technician_leaves_update on technician_leaves;
create policy technician_leaves_select on technician_leaves for select using (true);
create policy technician_leaves_insert on technician_leaves for insert with check (true);
create policy technician_leaves_update on technician_leaves for update using (true) with check (true);

-- technician_work
drop policy if exists technician_work_select on technician_work;
drop policy if exists technician_work_insert on technician_work;
drop policy if exists technician_work_update on technician_work;
drop policy if exists technician_work_delete on technician_work;
create policy technician_work_select on technician_work for select using (true);
create policy technician_work_insert on technician_work for insert with check (true);
create policy technician_work_update on technician_work for update using (true) with check (true);
create policy technician_work_delete on technician_work for delete using (true);

-- report center
drop policy if exists report_threads_select on report_threads;
drop policy if exists report_threads_insert on report_threads;
drop policy if exists report_threads_update on report_threads;
drop policy if exists report_threads_delete on report_threads;
create policy report_threads_select on report_threads for select using (true);
create policy report_threads_insert on report_threads for insert with check (true);
create policy report_threads_update on report_threads for update using (true) with check (true);
create policy report_threads_delete on report_threads for delete using (true);

drop policy if exists report_messages_select on report_messages;
drop policy if exists report_messages_insert on report_messages;
drop policy if exists report_messages_update on report_messages;
drop policy if exists report_messages_delete on report_messages;
create policy report_messages_select on report_messages for select using (true);
create policy report_messages_insert on report_messages for insert with check (true);
create policy report_messages_update on report_messages for update using (true) with check (true);
create policy report_messages_delete on report_messages for delete using (true);

-- payroll
drop policy if exists payroll_records_select on payroll_records;
drop policy if exists payroll_records_insert on payroll_records;
drop policy if exists payroll_records_update on payroll_records;
drop policy if exists payroll_records_delete on payroll_records;
create policy payroll_records_select on payroll_records for select using (true);
create policy payroll_records_insert on payroll_records for insert with check (true);
create policy payroll_records_update on payroll_records for update using (true) with check (true);
create policy payroll_records_delete on payroll_records for delete using (true);

-- reservations
drop policy if exists reservation_orders_select on reservation_orders;
drop policy if exists reservation_orders_insert on reservation_orders;
drop policy if exists reservation_orders_update on reservation_orders;
drop policy if exists reservation_orders_delete on reservation_orders;
create policy reservation_orders_select on reservation_orders for select using (true);
create policy reservation_orders_insert on reservation_orders for insert with check (true);
create policy reservation_orders_update on reservation_orders for update using (true) with check (true);
create policy reservation_orders_delete on reservation_orders for delete using (true);

drop policy if exists reservation_items_select on reservation_items;
drop policy if exists reservation_items_insert on reservation_items;
drop policy if exists reservation_items_update on reservation_items;
drop policy if exists reservation_items_delete on reservation_items;
create policy reservation_items_select on reservation_items for select using (true);
create policy reservation_items_insert on reservation_items for insert with check (true);
create policy reservation_items_update on reservation_items for update using (true) with check (true);
create policy reservation_items_delete on reservation_items for delete using (true);

-- used items
drop policy if exists used_items_select on used_items;
drop policy if exists used_items_insert on used_items;
drop policy if exists used_items_update on used_items;
drop policy if exists used_items_delete on used_items;
create policy used_items_select on used_items for select using (true);
create policy used_items_insert on used_items for insert with check (true);
create policy used_items_update on used_items for update using (true) with check (true);
create policy used_items_delete on used_items for delete using (true);

-- helper function for 二手下單（唯一件鎖貨）
create or replace function public.place_used_order(p_used_id uuid, p_order jsonb)
returns uuid
language plpgsql
security definer
as $$
declare oid uuid;
begin
  -- 嘗試把二手狀態從 available -> sold（若已售或保留，會更新不到）
  update public.used_items
    set status = 'sold', updated_at = now()
    where id = p_used_id and status = 'available'
    returning id into p_used_id;
  if p_used_id is null then
    raise exception 'USED_ITEM_UNAVAILABLE';
  end if;

  -- 建立訂單（分類=used、來源=cart、關聯 used_item_id）
  insert into public.orders (
    id, customer_name, customer_phone, customer_address,
    preferred_date, preferred_time_start, preferred_time_end,
    referrer_code, member_id,
    service_items, assigned_technicians, signatures,
    photos, photos_before, photos_after,
    payment_method, payment_status, points_used, points_deduct_amount,
    status, platform, created_at, updated_at,
    used_item_id, category, channel
  )
  values (
    coalesce((p_order->>'id')::uuid, gen_random_uuid()),
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_address',
    (p_order->>'preferred_date')::date, p_order->>'preferred_time_start', p_order->>'preferred_time_end',
    p_order->>'referrer_code', (p_order->>'member_id')::uuid,
    coalesce(p_order->'service_items','[]'::jsonb), '[]'::jsonb, '{}'::jsonb,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    p_order->>'payment_method', p_order->>'payment_status',
    coalesce((p_order->>'points_used')::int,0), coalesce((p_order->>'points_deduct_amount')::int,0),
    coalesce(p_order->>'status','confirmed'), coalesce(p_order->>'platform','日'),
    now(), now(),
    p_used_id, 'used', coalesce(p_order->>'channel','cart')
  )
  returning id into oid;

  return oid;
end $$;

grant execute on function public.place_used_order(uuid, jsonb) to anon, authenticated;

-- app settings
drop policy if exists app_settings_select on app_settings;
drop policy if exists app_settings_insert on app_settings;
drop policy if exists app_settings_update on app_settings;
create policy app_settings_select on app_settings for select using (true);
create policy app_settings_insert on app_settings for insert with check (true);
create policy app_settings_update on app_settings for update using (true) with check (true);

-- staff
drop policy if exists staff_select on staff;
drop policy if exists staff_insert on staff;
drop policy if exists staff_update on staff;
drop policy if exists staff_delete on staff;
create policy staff_select on staff for select using (true);
create policy staff_insert on staff for insert with check (true);
create policy staff_update on staff for update using (true) with check (true);
create policy staff_delete on staff for delete using (true);

-- staff applications
drop policy if exists staff_applications_select on staff_applications;
drop policy if exists staff_applications_insert on staff_applications;
drop policy if exists staff_applications_update on staff_applications;
drop policy if exists staff_applications_delete on staff_applications;
create policy staff_applications_select on staff_applications for select using (true);
create policy staff_applications_insert on staff_applications for insert with check (true);
create policy staff_applications_update on staff_applications for update using (true) with check (true);
create policy staff_applications_delete on staff_applications for delete using (true);

-- technician applications
drop policy if exists technician_applications_select on technician_applications;
drop policy if exists technician_applications_insert on technician_applications;
drop policy if exists technician_applications_update on technician_applications;
drop policy if exists technician_applications_delete on technician_applications;
create policy technician_applications_select on technician_applications for select using (true);
create policy technician_applications_insert on technician_applications for insert with check (true);
create policy technician_applications_update on technician_applications for update using (true) with check (true);
create policy technician_applications_delete on technician_applications for delete using (true);

-- member applications
drop policy if exists member_applications_select on member_applications;
drop policy if exists member_applications_insert on member_applications;
drop policy if exists member_applications_update on member_applications;
drop policy if exists member_applications_delete on member_applications;
create policy member_applications_select on member_applications for select using (true);
create policy member_applications_insert on member_applications for insert with check (true);
create policy member_applications_update on member_applications for update using (true) with check (true);

-- Customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  addresses jsonb not null default '[]'::jsonb,
  notes text,
  blacklisted boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table customers enable row level security;
drop policy if exists customers_select on customers;
drop policy if exists customers_insert on customers;
drop policy if exists customers_update on customers;
drop policy if exists customers_delete on customers;
create policy customers_select on customers for select using (true);
create policy customers_insert on customers for insert with check (true);
create policy customers_update on customers for update using (true) with check (true);
create policy customers_delete on customers for delete using (true);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table documents enable row level security;
drop policy if exists documents_select on documents;
drop policy if exists documents_insert on documents;
drop policy if exists documents_update on documents;
drop policy if exists documents_delete on documents;
create policy documents_select on documents for select using (true);
create policy documents_insert on documents for insert with check (true);
create policy documents_update on documents for update using (true) with check (true);
create policy documents_delete on documents for delete using (true);

-- Models
create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  brand text not null,
  model text not null,
  notes text,
  blacklist boolean,
  attention text,
  updated_at timestamptz not null default now()
);
alter table models enable row level security;
drop policy if exists models_select on models;
drop policy if exists models_insert on models;
drop policy if exists models_update on models;
drop policy if exists models_delete on models;
create policy models_select on models for select using (true);
create policy models_insert on models for insert with check (true);
create policy models_update on models for update using (true) with check (true);
create policy models_delete on models for delete using (true);

-- Promotions
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  active boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  rules jsonb,
  cover_url text,
  updated_at timestamptz not null default now()
);
alter table promotions enable row level security;
drop policy if exists promotions_select on promotions;
drop policy if exists promotions_insert on promotions;
drop policy if exists promotions_update on promotions;
drop policy if exists promotions_delete on promotions;
create policy promotions_select on promotions for select using (true);
create policy promotions_insert on promotions for insert with check (true);
create policy promotions_update on promotions for update using (true) with check (true);
create policy promotions_delete on promotions for delete using (true);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text,
  target text not null,
  target_user_email text,
  scheduled_at timestamptz,
  expires_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
drop policy if exists notifications_select on notifications;
drop policy if exists notifications_insert on notifications;
drop policy if exists notifications_update on notifications;
drop policy if exists notifications_delete on notifications;
create policy notifications_select on notifications for select using (true);
create policy notifications_insert on notifications for insert with check (true);
create policy notifications_update on notifications for update using (true) with check (true);
create policy notifications_delete on notifications for delete using (true);

-- Notifications read (已讀紀錄)
create table if not exists notifications_read (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  user_email text not null,
  read_at timestamptz not null default now()
);
alter table notifications_read enable row level security;
drop policy if exists notifications_read_select on notifications_read;
drop policy if exists notifications_read_insert on notifications_read;
drop policy if exists notifications_read_update on notifications_read;
drop policy if exists notifications_read_delete on notifications_read;
create policy notifications_read_select on notifications_read for select using (true);
create policy notifications_read_insert on notifications_read for insert with check (true);
create policy notifications_read_update on notifications_read for update using (true) with check (true);
create policy notifications_read_delete on notifications_read for delete using (true);
create unique index if not exists ux_notifications_read_unique on notifications_read (notification_id, lower(user_email));

-- 自動生成訂單編號的函數
create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
as $$
declare
  next_num int;
  order_num text;
begin
  -- 獲取當前最大編號，如果沒有則從 11362 開始
  select coalesce(max(cast(substring(order_number from 3) as int)), 11361) + 1
  into next_num
  from orders
  where order_number ~ '^OD[0-9]+$';
  
  -- 格式化為 OD + 5位數字
  order_num := 'OD' || lpad(next_num::text, 5, '0');
  
  return order_num;
end $$;

grant execute on function public.generate_order_number() to anon, authenticated;

-- Promotion products mapping
create table if not exists promotion_products (
  promotion_id uuid not null references promotions(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (promotion_id, product_id)
);
alter table promotion_products enable row level security;
drop policy if exists promotion_products_select on promotion_products;
drop policy if exists promotion_products_insert on promotion_products;
drop policy if exists promotion_products_delete on promotion_products;
create policy promotion_products_select on promotion_products for select using (true);
create policy promotion_products_insert on promotion_products for insert with check (true);
create policy promotion_products_delete on promotion_products for delete using (true);

-- Monthly order stats（簡易彙總表；可由排程重算）
create table if not exists monthly_order_stats (
  month text primary key,
  completed_count int not null default 0,
  revenue_sum numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table monthly_order_stats enable row level security;
drop policy if exists monthly_order_stats_select on monthly_order_stats;
drop policy if exists monthly_order_stats_upsert on monthly_order_stats;
create policy monthly_order_stats_select on monthly_order_stats for select using (true);
create policy monthly_order_stats_upsert on monthly_order_stats for insert with check (true);
create policy monthly_order_stats_update on monthly_order_stats for update using (true) with check (true);

-- 重算函式（完成訂單的月度彙總）
create or replace function public.recompute_monthly_order_stats()
returns void
language plpgsql
security definer
as $$
begin
  delete from monthly_order_stats;
  insert into monthly_order_stats (month, completed_count, revenue_sum, updated_at)
  select to_char(coalesce(work_completed_at, updated_at), 'YYYY-MM') as ym,
         count(*) as cnt,
         coalesce(sum((select coalesce(sum(((it->>'unitPrice')::numeric) * ((it->>'quantity')::int)),0) from jsonb_array_elements(service_items) it)),0) as rev,
         now()
  from orders
  where status = 'completed'
  group by ym
  order by ym;
end $$;
grant execute on function public.recompute_monthly_order_stats() to anon, authenticated;

-- Useful indexes
create index if not exists idx_orders_status_created on orders (status, created_at desc);
create index if not exists idx_technician_work_date on technician_work (date);
create index if not exists idx_support_shifts_date on support_shifts (date);
create index if not exists idx_technician_leaves_date on technician_leaves (date);
create index if not exists idx_reservation_items_reservation on reservation_items (reservation_id);
create index if not exists idx_used_items_status on used_items (status);
create index if not exists idx_notifications_target_created on notifications (target, created_at desc);
create index if not exists idx_product_categories_active_sort on product_categories (active, sort_order);

-- Daily order stats by platform/region/technician
create table if not exists daily_order_stats (
  day date not null,
  platform text,
  region text,
  technician_email text,
  completed_count int not null default 0,
  revenue_sum numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, coalesce(platform,''), coalesce(region,''), coalesce(technician_email,''))
);
alter table daily_order_stats enable row level security;
drop policy if exists daily_order_stats_select on daily_order_stats;
drop policy if exists daily_order_stats_upsert on daily_order_stats;
create policy daily_order_stats_select on daily_order_stats for select using (true);
create policy daily_order_stats_upsert on daily_order_stats for insert with check (true);
create policy daily_order_stats_update on daily_order_stats for update using (true) with check (true);

create or replace function public.recompute_daily_order_stats()
returns void
language plpgsql
security definer
as $$
begin
  delete from daily_order_stats;
  insert into daily_order_stats (day, platform, region, technician_email, completed_count, revenue_sum, updated_at)
  select
    date_trunc('day', coalesce(o.work_completed_at, o.updated_at))::date as d,
    o.platform,
    (select t.region from technicians t where lower(t.email) = lower(tw.technician_email) limit 1) as region,
    tw.technician_email,
    count(distinct o.id) as cnt,
    coalesce(sum((select coalesce(sum(((it->>'unitPrice')::numeric) * ((it->>'quantity')::int)),0) from jsonb_array_elements(o.service_items) it)),0) as rev,
    now()
  from orders o
  join technician_work tw on tw.order_id = o.id
  where o.status = 'completed'
  group by d, o.platform, region, tw.technician_email
  order by d;
end $$;
grant execute on function public.recompute_daily_order_stats() to anon, authenticated;

-- Updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

-- Attach updated_at triggers
do $$ begin
  if to_regclass('public.products') is not null then
    begin execute 'drop trigger if exists tg_products_updated on products'; exception when others then end; execute 'create trigger tg_products_updated before update on products for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.inventory') is not null then
    begin execute 'drop trigger if exists tg_inventory_updated on inventory'; exception when others then end; execute 'create trigger tg_inventory_updated before update on inventory for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.members') is not null then
    begin execute 'drop trigger if exists tg_members_updated on members'; exception when others then end; execute 'create trigger tg_members_updated before update on members for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.technicians') is not null then
    begin execute 'drop trigger if exists tg_technicians_updated on technicians'; exception when others then end; execute 'create trigger tg_technicians_updated before update on technicians for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.orders') is not null then
    begin execute 'drop trigger if exists tg_orders_updated on orders'; exception when others then end; execute 'create trigger tg_orders_updated before update on orders for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.support_shifts') is not null then
    begin execute 'drop trigger if exists tg_support_shifts_updated on support_shifts'; exception when others then end; execute 'create trigger tg_support_shifts_updated before update on support_shifts for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.technician_leaves') is not null then
    begin execute 'drop trigger if exists tg_technician_leaves_updated on technician_leaves'; exception when others then end; execute 'create trigger tg_technician_leaves_updated before update on technician_leaves for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.technician_work') is not null then
    begin execute 'drop trigger if exists tg_technician_work_updated on technician_work'; exception when others then end; execute 'create trigger tg_technician_work_updated before update on technician_work for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.report_threads') is not null then
    begin execute 'drop trigger if exists tg_report_threads_updated on report_threads'; exception when others then end; execute 'create trigger tg_report_threads_updated before update on report_threads for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.payroll_records') is not null then
    begin execute 'drop trigger if exists tg_payroll_records_updated on payroll_records'; exception when others then end; execute 'create trigger tg_payroll_records_updated before update on payroll_records for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.reservation_orders') is not null then
    begin execute 'drop trigger if exists tg_reservation_orders_updated on reservation_orders'; exception when others then end; execute 'create trigger tg_reservation_orders_updated before update on reservation_orders for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.reservation_items') is not null then
    begin execute 'drop trigger if exists tg_reservation_items_updated on reservation_items'; exception when others then end; execute 'create trigger tg_reservation_items_updated before update on reservation_items for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.used_items') is not null then
    begin execute 'drop trigger if exists tg_used_items_updated on used_items'; exception when others then end; execute 'create trigger tg_used_items_updated before update on used_items for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.staff') is not null then
    begin execute 'drop trigger if exists tg_staff_updated on staff'; exception when others then end; execute 'create trigger tg_staff_updated before update on staff for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.customers') is not null then
    begin execute 'drop trigger if exists tg_customers_updated on customers'; exception when others then end; execute 'create trigger tg_customers_updated before update on customers for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.documents') is not null then
    begin execute 'drop trigger if exists tg_documents_updated on documents'; exception when others then end; execute 'create trigger tg_documents_updated before update on documents for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.models') is not null then
    begin execute 'drop trigger if exists tg_models_updated on models'; exception when others then end; execute 'create trigger tg_models_updated before update on models for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.promotions') is not null then
    begin execute 'drop trigger if exists tg_promotions_updated on promotions'; exception when others then end; execute 'create trigger tg_promotions_updated before update on promotions for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.product_categories') is not null then
    begin execute 'drop trigger if exists tg_product_categories_updated on product_categories'; exception when others then end; execute 'create trigger tg_product_categories_updated before update on product_categories for each row execute function public.set_updated_at()';
  end if;
  if to_regclass('public.product_modes') is not null then
    begin execute 'drop trigger if exists tg_product_modes_updated on product_modes'; exception when others then end; execute 'create trigger tg_product_modes_updated before update on product_modes for each row execute function public.set_updated_at()';
  end if;
end $$;

-- Flattened order items view (for BI)
create or replace view public.v_order_items_flat as
select
  o.id as order_id,
  o.platform,
  o.category,
  o.channel,
  o.member_id,
  (it->>'name') as item_name,
  ((it->>'unitPrice')::numeric) as unit_price,
  ((it->>'quantity')::int) as quantity,
  ((it->>'unitPrice')::numeric) * ((it->>'quantity')::int) as line_total,
  o.created_at,
  o.updated_at,
  o.work_completed_at
from orders o,
  lateral jsonb_array_elements(o.service_items) as it;
create policy member_applications_delete on member_applications for delete using (true);
