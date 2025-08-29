-- 建立 staff 表（如果不存在）
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'support', 'technician')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立 RLS 政策
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 管理員可以管理所有員工
CREATE POLICY "Admin can manage all staff" ON staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 員工可以查看自己的資料
CREATE POLICY "Staff can view own data" ON staff
  FOR SELECT USING (id = auth.uid());

-- 員工可以更新自己的資料（除了角色）
CREATE POLICY "Staff can update own data" ON staff
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND 
    role = (SELECT role FROM staff WHERE id = auth.uid())
  );

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_updated_at();

