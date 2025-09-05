-- Create RPC: create_reservation_order
-- 用途：產生訂單編號 + 寫入 orders（含 items/金額欄位可先以 JSON 儲存），確保交易完整性
-- 參數：
--   p_member_id UUID (可為 NULL)
--   p_payload JSONB（預期鍵：customerName, customerPhone, customerEmail, customerAddress,
--                    preferredDate, preferredTimeStart, preferredTimeEnd,
--                    paymentMethod, pointsUsed, pointsDeductAmount, note, platform, status,
--                    serviceItems(ARRAY of { service_name, quantity, price, category })）
-- 回傳：orders 單筆 ROW

create or replace function public.create_reservation_order(
  p_member_id uuid,
  p_payload jsonb
) returns orders
language plpgsql
as $$
declare
  v_order_no text;
  v_id uuid := gen_random_uuid();
  v_row orders;
begin
  -- 產生訂單編號（依據既有 RPC）
  select public.generate_order_number() into v_order_no;

  insert into public.orders (
    id,
    order_number,
    member_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    preferred_date,
    preferred_time_start,
    preferred_time_end,
    payment_method,
    points_used,
    points_deduct_amount,
    note,
    platform,
    status,
    service_items,
    created_at,
    updated_at
  ) values (
    v_id,
    v_order_no,
    p_member_id,
    coalesce(p_payload->>'customerName',''),
    coalesce(p_payload->>'customerPhone',''),
    coalesce(p_payload->>'customerEmail',''),
    coalesce(p_payload->>'customerAddress',''),
    nullif(p_payload->>'preferredDate',''),
    nullif(p_payload->>'preferredTimeStart',''),
    nullif(p_payload->>'preferredTimeEnd',''),
    nullif(p_payload->>'paymentMethod',''),
    coalesce((p_payload->>'pointsUsed')::int,0),
    coalesce((p_payload->>'pointsDeductAmount')::int,0),
    nullif(p_payload->>'note',''),
    coalesce(p_payload->>'platform','商城'),
    coalesce(p_payload->>'status','pending'),
    coalesce(p_payload->'serviceItems','[]'::jsonb),
    now(),
    now()
  ) returning * into v_row;

  return v_row;
end$$;

-- 建議：設定安全性（僅服務端鍵可呼叫、或透過 RLS 控制）
-- revoke all on function public.create_reservation_order from public;

