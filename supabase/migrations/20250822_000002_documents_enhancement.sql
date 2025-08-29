-- 增強 documents 表結構
-- 添加分類、描述和訪問權限欄位

-- 添加新欄位到 documents 表
alter table documents add column if not exists category text default 'forms';
alter table documents add column if not exists description text;
alter table documents add column if not exists access_level text default 'all' check (access_level in ('all', 'admin', 'tech', 'support'));

-- 創建索引以提高查詢性能
create index if not exists idx_documents_category on documents(category);
create index if not exists idx_documents_access_level on documents(access_level);
create index if not exists idx_documents_tags on documents using gin(tags);

-- 添加一些示例文件數據
insert into documents (title, url, tags, category, description, access_level) values
  ('驗收單範本', 'https://drive.google.com/file/d/example1/view', 
   '["驗收單", "範本"]'::jsonb, 'forms', '標準驗收單範本，用於服務完成後的客戶簽收', 'all'),
  ('技術手冊 - 冷氣清洗', 'https://drive.google.com/file/d/example2/view', 
   '["技術手冊", "冷氣", "SOP"]'::jsonb, 'manuals', '冷氣清洗標準作業程序', 'tech'),
  ('員工手冊', 'https://drive.google.com/file/d/example3/view', 
   '["員工手冊", "政策"]'::jsonb, 'policies', '公司員工手冊及相關政策', 'all'),
  ('報價單範本', 'https://drive.google.com/file/d/example4/view', 
   '["報價單", "範本"]'::jsonb, 'templates', '標準報價單範本', 'support'),
  ('安全規範', 'https://drive.google.com/file/d/example5/view', 
   '["安全規範", "SOP"]'::jsonb, 'policies', '工作安全規範及注意事項', 'all'),
  ('品質標準', 'https://drive.google.com/file/d/example6/view', 
   '["品質標準", "SOP"]'::jsonb, 'policies', '服務品質標準及檢查項目', 'tech')
on conflict do nothing;
