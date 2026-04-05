-- ============================================================
-- NOTIFICATIONS SYSTEM
-- Chạy trong Supabase Dashboard → SQL Editor
-- Idempotent: có thể chạy lại nhiều lần mà không bị lỗi
-- ============================================================

-- 0. Thêm auth_user_id vào bảng coaches (để trainee notify coach)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS auth_user_id UUID;
CREATE INDEX IF NOT EXISTS idx_coaches_auth_user_id ON coaches(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- 1. Bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  body              TEXT        NOT NULL,
  metadata          JSONB       DEFAULT '{}',
  is_read           BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index cho query nhanh
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON notifications(recipient_user_id, is_read, created_at DESC);

-- 3. Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop trước để idempotent (chạy lại không bị lỗi "already exists")
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

-- User đọc notification của chính mình
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Authenticated user có thể tạo notification (coach → trainee, trainee → coach)
CREATE POLICY "Authenticated users insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- User cập nhật (mark read) notification của chính mình
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid());
