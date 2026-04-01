-- ============================================================
-- AESTHETICS HUB - FEATURE V4 MIGRATIONS
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Bảng workout_templates (gói bài tập)
DROP TABLE IF EXISTS template_assignments CASCADE;
DROP TABLE IF EXISTS template_exercises CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;

CREATE TABLE workout_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_email     TEXT NOT NULL,
  name            TEXT NOT NULL,           -- "Full body A — Thứ 4"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng template_exercises (bài tập trong gói)
CREATE TABLE IF NOT EXISTS template_exercises (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,           -- "Squat"
  sets            INT NOT NULL DEFAULT 3,
  reps            INT NOT NULL DEFAULT 10,
  sort_order      INT NOT NULL DEFAULT 0,  -- thứ tự drag-drop
  video_url       TEXT,                    -- link video optional
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bổ sung cột cho sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS feeling       TEXT,     -- 'tired'|'ok'|'good'|'fire'
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,     -- lý do hủy
  ADD COLUMN IF NOT EXISTS workout_data  JSONB,    -- snapshot bài tập khi log
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ;

-- Chuẩn hóa status cũ 'done' thành 'completed'
UPDATE sessions SET status = 'completed' WHERE status = 'done';

-- 4. Bảng template_assignments (assign gói cho học viên)
CREATE TABLE IF NOT EXISTS template_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, client_id)
);

-- 5. Indexes cho hiệu suất
CREATE INDEX IF NOT EXISTS idx_workout_templates_coach ON workout_templates(coach_email);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_client ON template_assignments(client_id);
