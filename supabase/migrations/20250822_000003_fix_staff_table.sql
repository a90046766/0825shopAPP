-- 修復 staff 表格缺少 created_at 欄位
alter table staff add column if not exists created_at timestamptz default now();

-- 為現有的 staff 記錄設定 created_at
update staff set created_at = updated_at where created_at is null;

-- 確保 created_at 欄位不為空
alter table staff alter column created_at set not null;

-- 重新整理 schema cache
notify pgrst, 'reload schema';
