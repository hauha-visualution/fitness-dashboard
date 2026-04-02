-- ============================================================
-- NUTRITION FEATURES
-- Chạy file này trong Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Mở rộng bảng clients cho nutrition workspace
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS nutrition_targets JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrition_plan JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrition_prep JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrition_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nutrition_profile_synced_at TIMESTAMPTZ;

-- 2. Lịch sử nutrition check-in
CREATE TABLE IF NOT EXISTS nutrition_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_email TEXT,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_weight NUMERIC,
  adherence_score INT CHECK (adherence_score BETWEEN 1 AND 5),
  calories_avg INT,
  protein_avg INT,
  steps_avg INT,
  water_liters NUMERIC,
  hunger_score INT CHECK (hunger_score BETWEEN 1 AND 5),
  energy_score INT CHECK (energy_score BETWEEN 1 AND 5),
  digestion_score INT CHECK (digestion_score BETWEEN 1 AND 5),
  sleep_score INT CHECK (sleep_score BETWEEN 1 AND 5),
  wins TEXT,
  blockers TEXT,
  coach_adjustments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_checkins_client_id ON nutrition_checkins(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_checkins_date ON nutrition_checkins(checkin_date DESC);

-- 3. RLS cho nutrition_checkins
ALTER TABLE nutrition_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches access own nutrition checkins" ON nutrition_checkins;
CREATE POLICY "Coaches access own nutrition checkins"
  ON nutrition_checkins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM clients
      WHERE clients.id = nutrition_checkins.client_id
        AND clients.coach_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients
      WHERE clients.id = nutrition_checkins.client_id
        AND clients.coach_email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Clients read own nutrition checkins" ON nutrition_checkins;
CREATE POLICY "Clients read own nutrition checkins"
  ON nutrition_checkins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM clients
      WHERE clients.id = nutrition_checkins.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

-- 4. Seed JSON rỗng cho client cũ (nếu cần nhìn dễ trong dashboard)
UPDATE clients
SET
  nutrition_targets = COALESCE(nutrition_targets, '{}'::jsonb),
  nutrition_plan = COALESCE(nutrition_plan, '{}'::jsonb),
  nutrition_prep = COALESCE(nutrition_prep, '{}'::jsonb)
WHERE nutrition_targets IS NULL
   OR nutrition_plan IS NULL
   OR nutrition_prep IS NULL;
