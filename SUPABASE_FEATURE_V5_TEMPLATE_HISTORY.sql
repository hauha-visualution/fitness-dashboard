-- ============================================================
-- AESTHETICS HUB - FEATURE V5
-- Persist selected workout template on each session so draft/history
-- can restore the latest completed log for the same template.
-- Run in Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS workout_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_workout_template_id
  ON sessions(workout_template_id);

CREATE INDEX IF NOT EXISTS idx_sessions_client_template_completed
  ON sessions(client_id, workout_template_id, status, scheduled_date, scheduled_time);
