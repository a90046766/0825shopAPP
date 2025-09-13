-- 添加 created_by 欄位到 orders 表
ALTER TABLE orders ADD COLUMN created_by TEXT;

-- 添加註解說明
COMMENT ON COLUMN orders.created_by IS '建單人姓名，記錄誰建立了此訂單或將訂單狀態改為已確認';

-- 可選：為現有訂單設定預設值（如果有需要的話）
-- UPDATE orders SET created_by = '系統' WHERE created_by IS NULL;


