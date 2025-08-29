# 資料模型（本機重構對照）

## 三表（核心）
- staff（客服/業務）
  - id text PK
  - name, short_name, email(lowered), phone, phone_norm, role(support|sales), status(active|suspended), updated_at
  - 唯一：lower(btrim(email))
- technician_applications（技師申請）
  - id text PK
  - name, short_name, email(lowered), phone, phone_norm, region, status(pending|approved|rejected), applied_at
  - 唯一：lower(btrim(email))（整表唯一）
- member_applications（會員申請）
  - id text PK
  - name, email(lowered), phone, phone_norm, status, referrer_id, referrer, applied_at
  - 唯一：lower(btrim(email)) 僅在 pending

## 訂單
- orders（接雲版以欄位化儲存，不再用單一 data 欄）
  - id uuid/text PK
  - customer_name, customer_phone, customer_address
  - preferred_date, preferred_time_start, preferred_time_end
  - platform, referrer_code, member_id
  - service_items jsonb, assigned_technicians jsonb
  - signatures jsonb, photos jsonb, photos_before jsonb, photos_after jsonb
  - payment_method, payment_status
  - points_used int, points_deduct_amount numeric
  - work_started_at, work_completed_at, service_finished_at
  - canceled_reason, closed_at
  - status, created_at, updated_at

## 其他
- products：id, name, unit_price, group_price, group_min_qty, description, image_urls, safe_stock, updated_at
- inventory：id, name, product_id, quantity, description, image_urls
- promotions：id, title, description, active, start_at, end_at, rules
- documents：id, title, url, tags
- models：id, category, brand, model, notes, blacklist, attention
- support_shifts：id, support_id, date, slot, reason, color
- technician_leaves：id, technician_email, date, full_day, start_time, end_time, reason, color
- technician_work：id, technician_email, date, start_time, end_time, order_id, quantity_label, color
- technician：id, name, short_name, email(lowered), phone, region, status, points, revenue_share_scheme, updated_at
- notifications：id, title, body, target, created_by, created_at
- notification_reads：id, notification_id, user_email, read_at

## 觸發器建議（接雲時）
- BEFORE INSERT/UPDATE：email → lower(btrim(email))；phone_norm → digits-only。
- AFTER UPDATE/INSERT（審核表）：若 approved，清理同 email 其它 pending（或改為 REJECTED）。
 - 技師唯一鍵：lower(btrim(email)) UNIQUE（避免重覆審核生成多筆技師）。
