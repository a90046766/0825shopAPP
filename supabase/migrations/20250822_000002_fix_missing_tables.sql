-- 確保 orders 表格有 order_number 欄位
alter table orders add column if not exists order_number text unique;

-- 確保 models 表格存在
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

-- 確保 generate_order_number 函數存在
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

-- 確保 RLS 和 policies 存在
alter table models enable row level security;

drop policy if exists models_select on models;
drop policy if exists models_insert on models;
drop policy if exists models_update on models;
drop policy if exists models_delete on models;

create policy models_select on models for select using (true);
create policy models_insert on models for insert with check (true);
create policy models_update on models for update using (true) with check (true);
create policy models_delete on models for delete using (true);
