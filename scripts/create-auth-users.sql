-- 為現有的 staff 用戶建立 Auth 帳號
-- 請在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 注意：此腳本需要在 Supabase Dashboard 中手動執行
-- 因為 createUser 需要管理員權限

-- 為 y518258@gmail.com 建立 Auth 用戶
-- 密碼：a123123
-- 請在 Supabase Dashboard > Authentication > Users 中手動新增

-- 為 aa860929@gmail.com 建立 Auth 用戶  
-- 密碼：a123123
-- 請在 Supabase Dashboard > Authentication > Users 中手動新增

-- 為 qyome168@gmail.com 建立 Auth 用戶
-- 密碼：a123123
-- 請在 Supabase Dashboard > Authentication > Users 中手動新增

-- 或者使用以下 SQL 來建立用戶（需要 service role key）：
/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'y518258@gmail.com',
  crypt('a123123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);
*/
