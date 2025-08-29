-- 修復訂單表結構和函數
-- 2025-08-26

-- 1. 確保 orders 表有 order_number 欄位
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;

-- 2. 創建生成訂單編號的函數
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
    next_number integer;
    order_num text;
BEGIN
    -- 獲取下一個訂單編號（從 11362 開始）
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS integer)), 11361) + 1
    INTO next_number
    FROM orders 
    WHERE order_number ~ '^OD[0-9]+$';
    
    -- 格式化為 OD + 5位數字
    order_num := 'OD' || LPAD(next_number::text, 5, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- 3. 創建觸發器函數，自動生成訂單編號
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS trigger AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建觸發器
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- 5. 為現有訂單生成編號（如果沒有）
UPDATE orders 
SET order_number = generate_order_number()
WHERE order_number IS NULL OR order_number = '';

-- 6. 確保 order_number 是唯一的
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL;

-- 7. 添加一些測試數據（如果需要）
INSERT INTO product_categories (name, sort_order) VALUES 
    ('專業清洗服務', 1),
    ('家電服務', 2),
    ('二手家電服務', 3),
    ('居家清潔/消毒服務', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_modes (code, name, has_inventory, uses_used_items, force_qty_one, deduct_inventory, visible_in_cart) VALUES 
    ('service', '服務', false, false, true, false, true),
    ('product', '商品', true, false, false, true, true),
    ('used', '二手', false, true, false, false, true)
ON CONFLICT (code) DO NOTHING;
