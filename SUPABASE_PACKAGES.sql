-- ============================================================
-- SUPABASE PACKAGES + SESSIONS MIGRATION
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

-- Kiểm tra kiểu dữ liệu id của bảng clients trước khi chạy:
-- SELECT pg_typeof(id) FROM clients LIMIT 1;
-- Nếu kết quả là "bigint" → dùng file này (BIGINT).
-- Nếu kết quả là "uuid"   → đổi BIGINT thành UUID ở 2 dòng client_id bên dưới.

-- 1. BẢNG PACKAGES (Gói tập)
CREATE TABLE IF NOT EXISTS packages (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       BIGINT  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_number  INT     NOT NULL,            -- Số thứ tự gói: 01, 02, 03...
  session_count   INT     NOT NULL,            -- Số buổi mua (tính tiền)
  bonus_sessions  INT     NOT NULL DEFAULT 0,  -- Số buổi tặng thêm
  total_sessions  INT     NOT NULL,            -- = session_count + bonus_sessions
  price           BIGINT  NOT NULL DEFAULT 0,  -- Giá tiền (VNĐ)
  start_date      DATE,                        -- Ngày bắt đầu gói
  weekly_schedule JSONB,                       -- [{"day":1,"time":"07:00"},...]
  note            TEXT,                        -- Ghi chú coach (VD: Chapter 1, Cutting, Bulking)
  status          TEXT    NOT NULL DEFAULT 'active', -- 'active' | 'completed'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG SESSIONS (Từng buổi tập)
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       BIGINT  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id      UUID    NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  session_number  INT     NOT NULL,            -- Số thứ tự buổi trong gói (1, 2, 3...)
  scheduled_date  DATE    NOT NULL,
  scheduled_time  TIME    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_packages_client_id ON packages(client_id);
CREATE INDEX IF NOT EXISTS idx_packages_status    ON packages(status);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_package_id ON sessions(package_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date      ON sessions(scheduled_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Coach xem/sửa packages của client mình quản lý
CREATE POLICY "Coach access packages" ON packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = packages.client_id
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  );

-- Client chỉ xem packages của mình
CREATE POLICY "Client read own packages" ON packages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = packages.client_id
        AND c.auth_user_id = auth.uid()
    )
  );

-- Coach xem/sửa sessions của client mình quản lý
CREATE POLICY "Coach access sessions" ON sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = sessions.client_id
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  );

-- Client chỉ xem sessions của mình
CREATE POLICY "Client read own sessions" ON sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = sessions.client_id
        AND c.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- KIỂM TRA
-- ============================================================
-- SELECT * FROM packages LIMIT 5;
-- SELECT * FROM sessions LIMIT 5;
