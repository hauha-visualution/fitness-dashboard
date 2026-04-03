-- ============================================================
-- AESTHETICS HUB - FEATURE V6
-- Public coach account request intake
-- Run in Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'main_login',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_access_requests_status
  ON coach_access_requests(status, created_at DESC);

ALTER TABLE coach_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create coach access requests" ON coach_access_requests;
CREATE POLICY "Anyone can create coach access requests"
  ON coach_access_requests
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read coach access requests" ON coach_access_requests;
CREATE POLICY "Authenticated users can read coach access requests"
  ON coach_access_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');
