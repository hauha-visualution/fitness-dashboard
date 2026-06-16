-- ============================================================
-- AESTHETICS HUB - WORKOUT PROGRAM FIELDS
-- Adds Google Sheet style exercise grouping and programming fields.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS exercise_group TEXT NOT NULL DEFAULT 'chest',
  ADD COLUMN IF NOT EXISTS tempo TEXT NOT NULL DEFAULT '2-0-X-0',
  ADD COLUMN IF NOT EXISTS rir TEXT,
  ADD COLUMN IF NOT EXISTS rest_seconds INT;

ALTER TABLE public.template_exercises
  DROP CONSTRAINT IF EXISTS template_exercises_exercise_group_check;

ALTER TABLE public.template_exercises
  ADD CONSTRAINT template_exercises_exercise_group_check
  CHECK (
    exercise_group IN (
      'chest',
      'back',
      'legs',
      'shoulders',
      'arms',
      'core',
      'cardio',
      'recovery',
      'other'
    )
  );

ALTER TABLE public.template_exercises
  DROP CONSTRAINT IF EXISTS template_exercises_rest_seconds_check;

ALTER TABLE public.template_exercises
  ADD CONSTRAINT template_exercises_rest_seconds_check
  CHECK (rest_seconds IS NULL OR rest_seconds >= 0);

CREATE INDEX IF NOT EXISTS idx_template_exercises_group
  ON public.template_exercises(template_id, exercise_group, sort_order);

UPDATE public.template_exercises
SET
  exercise_group = COALESCE(NULLIF(exercise_group, ''), 'chest'),
  tempo = COALESCE(NULLIF(tempo, ''), '2-0-X-0')
WHERE exercise_group IS NULL
   OR exercise_group = ''
   OR tempo IS NULL
   OR tempo = '';
