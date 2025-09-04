-- Supabase 會員系統表格結構
-- 執行此腳本以確保所有必要的表格和欄位都存在

-- 1. 會員申請表格
CREATE TABLE IF NOT EXISTS member_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  referrer_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 正式會員表格
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  addresses JSONB DEFAULT '[]',
  referrer_type TEXT,
  referrer_code TEXT,
  points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 客戶積分表格
CREATE TABLE IF NOT EXISTS customer_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 積分歷史記錄表格
CREATE TABLE IF NOT EXISTS point_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 推播通知表格
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_member_applications_status ON member_applications(status);
CREATE INDEX IF NOT EXISTS idx_member_applications_applied_at ON member_applications(applied_at);
CREATE INDEX IF NOT EXISTS idx_members_code ON members(code);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 7. 啟用 Row Level Security (RLS)
ALTER TABLE member_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8. 創建 RLS 策略
-- 會員申請：任何人都可以提交，管理員可以查看所有
CREATE POLICY "Anyone can submit member applications" ON member_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all applications" ON member_applications
  FOR SELECT USING (auth.role() = 'authenticated');

-- 會員資料：會員只能查看自己的資料，管理員可以查看所有
CREATE POLICY "Members can view own profile" ON members
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all members" ON members
  FOR SELECT USING (auth.role() = 'authenticated');

-- 積分：會員只能查看自己的積分
CREATE POLICY "Members can view own points" ON customer_points
  FOR SELECT USING (auth.uid()::text = customer_id::text);

-- 通知：用戶只能查看自己的通知
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 9. 創建觸發器函數來更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. 創建觸發器
CREATE TRIGGER update_member_applications_updated_at 
  BEFORE UPDATE ON member_applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at 
  BEFORE UPDATE ON members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_points_updated_at 
  BEFORE UPDATE ON customer_points 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 插入一些測試資料（可選）
-- INSERT INTO member_applications (name, email, phone, referrer_code) VALUES 
--   ('測試用戶1', 'test1@example.com', '0912345678', 'SR001'),
--   ('測試用戶2', 'test2@example.com', '0987654321', 'SE001');

-- 12. 創建會員編號生成函數
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    new_code := 'MO' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    
    -- 檢查編號是否已存在
    IF NOT EXISTS (SELECT 1 FROM members WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
    
    counter := counter + 1;
    -- 防止無限循環
    IF counter > 100 THEN
      RAISE EXCEPTION '無法生成唯一會員編號';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 13. 創建會員申請審核通過後自動創建正式會員的函數
CREATE OR REPLACE FUNCTION approve_member_application()
RETURNS TRIGGER AS $$
BEGIN
  -- 當申請狀態變更為 approved 時
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- 插入正式會員資料
    INSERT INTO members (code, name, email, phone, referrer_code, referrer_type)
    VALUES (
      generate_member_code(),
      NEW.name,
      NEW.email,
      NEW.phone,
      NEW.referrer_code,
      CASE 
        WHEN NEW.referrer_code LIKE 'MO%' THEN 'member'
        WHEN NEW.referrer_code LIKE 'SR%' THEN 'technician'
        WHEN NEW.referrer_code LIKE 'SE%' THEN 'sales'
        ELSE 'other'
      END
    );
    
    -- 創建積分記錄
    INSERT INTO customer_points (customer_id, points)
    SELECT id, 0 FROM members WHERE email = NEW.email LIMIT 1;
    
    -- 發送歡迎通知
    INSERT INTO notifications (user_id, user_type, title, message)
    SELECT 
      id,
      'member',
      '歡迎加入會員！',
      '親愛的 ' || NEW.name || ' 會員您好，熱切歡迎您的加入！您現在可以享受完整的購物服務和積分回饋。',
      FALSE
    FROM members WHERE email = NEW.email LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. 創建觸發器來監聽申請狀態變更
CREATE TRIGGER trigger_approve_member_application
  AFTER UPDATE ON member_applications
  FOR EACH ROW EXECUTE FUNCTION approve_member_application();

-- 完成！
SELECT 'Supabase 會員系統表格結構創建完成！' as status;
