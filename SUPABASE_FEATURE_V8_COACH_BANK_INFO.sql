-- ============================================================
-- COACH BANK INFO
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS bank_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
