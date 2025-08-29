-- 修改 Supabase Auth 設定，讓 email 確認變成可選
-- 請在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 1. 檢查當前的 Auth 設定
SELECT * FROM auth.config;

-- 2. 修改設定，讓 email 確認變成可選（如果需要的話）
-- 注意：這需要在 Supabase Dashboard > Authentication > Settings 中手動設定

-- 3. 為現有的 staff 用戶建立 Auth 帳號（使用更簡單的方法）
-- 先檢查哪些 staff 用戶還沒有 Auth 帳號
SELECT s.email, s.name, s.role 
FROM staff s 
LEFT JOIN auth.users au ON s.email = au.email 
WHERE au.email IS NULL;

-- 4. 建立 Auth 用戶（需要 service role key）
-- 請在 Supabase Dashboard > Authentication > Users 中手動新增以下用戶：

-- Email: y518258@gmail.com, 密碼: a123123
-- Email: aa860929@gmail.com, 密碼: a123123  
-- Email: qyome168@gmail.com, 密碼: a123123

-- 5. 或者使用以下 SQL（需要 service role key）：
/*
-- 為 y518258@gmail.com 建立 Auth 用戶
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
  (SELECT id FROM staff WHERE email = 'y518258@gmail.com'),
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

-- 為 aa860929@gmail.com 建立 Auth 用戶
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
  (SELECT id FROM staff WHERE email = 'aa860929@gmail.com'),
  'authenticated',
  'authenticated',
  'aa860929@gmail.com',
  crypt('a123123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 為 qyome168@gmail.com 建立 Auth 用戶
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
  (SELECT id FROM staff WHERE email = 'qyome168@gmail.com'),
  'authenticated',
  'authenticated',
  'qyome168@gmail.com',
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
