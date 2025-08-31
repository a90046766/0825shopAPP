-- Extend reservation_orders to mirror orders and enable confirmation flow

-- Add extended columns
alter table if exists public.reservation_orders
  add column if not exists order_number text;

alter table if exists public.reservation_orders
  add column if not exists customer_email text,
  add column if not exists customer_address text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time_start text,
  add column if not exists preferred_time_end text,
  add column if not exists referrer_code text,
  add column if not exists member_id uuid references public.members(id) on delete set null,
  add column if not exists notes text,
  add column if not exists category text,
  add column if not exists channel text;

-- Relax/replace status constraint to include 'converted'
do $$ begin
  begin
    alter table public.reservation_orders drop column status;
  exception when others then
    -- ignore if drop fails (e.g., used elsewhere); try to alter constraint name if known
    null;
  end;
end $$;

alter table if exists public.reservation_orders
  add column if not exists status text not null default 'pending'
    check (status in ('pending','confirmed','converted','canceled'));

-- Ensure unique order_number if present
create unique index if not exists ux_reservation_orders_order_number on public.reservation_orders (order_number) where order_number is not null;

-- RPC to convert reservation -> order with same order_number
create or replace function public.confirm_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  rid uuid := p_reservation_id;
  v_order_id uuid;
  v_order_number text;
  v_service_items jsonb := '[]'::jsonb;
  r record;
begin
  select * into r from public.reservation_orders where id = rid;
  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  -- Aggregate reservation items as service_items jsonb
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', i.name,
           'unitPrice', i.unit_price,
           'quantity', i.quantity
         )), '[]'::jsonb)
    into v_service_items
  from public.reservation_items i
  where i.reservation_id = rid;

  -- Ensure order number
  if r.order_number is null then
    v_order_number := public.generate_order_number();
    update public.reservation_orders
      set order_number = v_order_number, updated_at = now()
      where id = rid;
  else
    v_order_number := r.order_number;
  end if;

  -- Create order with same order_number
  insert into public.orders (
    order_number,
    customer_name, customer_phone, customer_email, customer_address,
    preferred_date, preferred_time_start, preferred_time_end,
    referrer_code, member_id,
    service_items, assigned_technicians, signatures,
    photos, photos_before, photos_after,
    payment_method, payment_status, points_used, points_deduct_amount,
    status, platform, category, channel,
    created_at, updated_at
  ) values (
    v_order_number,
    r.customer_name, r.customer_phone, r.customer_email, r.customer_address,
    r.preferred_date, r.preferred_time_start, r.preferred_time_end,
    r.referrer_code, r.member_id,
    v_service_items, '[]'::jsonb, '{}'::jsonb,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    null, 'pending', 0, 0,
    'pending', 'cart', r.category, coalesce(r.channel,'cart'),
    now(), now()
  ) returning id into v_order_id;

  -- Mark reservation as converted
  update public.reservation_orders
    set status = 'converted', updated_at = now()
    where id = rid;

  return v_order_id;
end $$;

grant execute on function public.confirm_reservation(uuid) to anon, authenticated;


