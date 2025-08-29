-- 初始化預設產品分類
INSERT INTO product_categories (id, name, sort_order, active, updated_at)
VALUES 
  (gen_random_uuid(), '專業清洗服務', 1, true, now()),
  (gen_random_uuid(), '家電服務', 2, true, now()),
  (gen_random_uuid(), '二手家電服務', 3, true, now()),
  (gen_random_uuid(), '居家清潔/消毒服務', 4, true, now())
ON CONFLICT (name) DO NOTHING;

-- 為現有訂單生成訂單編號
DO $$
DECLARE
  order_record RECORD;
  counter INTEGER := 11362;
BEGIN
  FOR order_record IN 
    SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET order_number = 'OD' || lpad(counter::text, 5, '0')
    WHERE id = order_record.id;
    counter := counter + 1;
  END LOOP;
END $$;


