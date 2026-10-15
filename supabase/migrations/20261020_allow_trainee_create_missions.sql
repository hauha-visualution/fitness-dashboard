-- Allow a trainee to create missions for their own account only.
-- Keep the creator explicit so coach-created and self-created missions remain distinguishable.

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'coach';

ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_created_by_check;

ALTER TABLE public.missions
  ADD CONSTRAINT missions_created_by_check
  CHECK (created_by IN ('coach', 'trainee'));

DROP POLICY IF EXISTS "Client create own missions" ON public.missions;

CREATE POLICY "Client create own missions"
  ON public.missions
  FOR INSERT
  WITH CHECK (
    created_by = 'trainee'
    AND coach_auth_user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.auth_user_id = auth.uid()
        AND c.coach_email = missions.coach_email
    )
  );
