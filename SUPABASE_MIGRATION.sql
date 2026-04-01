-- ============================================================
-- SUPABASE MIGRATION v2: Multi-coach + Coach-managed passwords
-- Chạy file này trong Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Thêm các cột cần thiết vào bảng clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS username TEXT,        -- = SĐT học viên (dùng để đăng nhập)
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,    -- UUID từ Supabase Auth
  ADD COLUMN IF NOT EXISTS coach_email TEXT;     -- Email coach quản lý học viên này

-- 2. Index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
CREATE INDEX IF NOT EXISTS idx_clients_coach_email ON clients(coach_email);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Đảm bảo mỗi coach chỉ thấy client của mình
-- ============================================================

-- Bật RLS trên bảng clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy 1: Coach chỉ xem/sửa/xóa clients thuộc về mình (theo coach_email)
CREATE POLICY "Coaches access own clients"
  ON clients
  FOR ALL
  USING (
    coach_email = (auth.jwt() ->> 'email')
  );

-- Policy 2: Client chỉ xem được record của chính mình
CREATE POLICY "Clients read own record"
  ON clients
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- ============================================================
-- GHI CHÚ QUAN TRỌNG
-- ============================================================
-- ① Mỗi coach đăng nhập sẽ chỉ thấy clients có coach_email = email của họ
-- ② Khi coach tạo client, app sẽ tự động gán coach_email = email coach hiện tại
-- ③ Username học viên = SĐT (vd: 0901234567)
-- ④ Password do COACH tạo và cấp cho học viên (không phải học viên tự đặt)
-- ⑤ App tạo tài khoản auth ngay khi coach nhấn Save (không cần học viên làm gì)

-- KIỂM TRA sau khi chạy:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'clients'
-- AND column_name IN ('username', 'auth_user_id', 'coach_email');

-- ============================================================
-- MIGRATION v3: Thêm cột note vào packages
-- Coach ghi chú mục đích gói (VD: Chapter 1, Cutting, Bulking)
-- ============================================================
ALTER TABLE packages ADD COLUMN IF NOT EXISTS note TEXT;
