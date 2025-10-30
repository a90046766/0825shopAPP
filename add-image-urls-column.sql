-- 添加 image_urls 欄位到 inventory 表
ALTER TABLE inventory ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;

-- 添加註解說明
COMMENT ON COLUMN inventory.image_urls IS '工具設備圖片URL陣列，儲存多張圖片連結';

















