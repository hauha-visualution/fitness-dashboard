-- A trainee may delete only missions they created themselves.

DROP POLICY IF EXISTS "Client delete own self-created missions" ON public.missions;

CREATE POLICY "Client delete own self-created missions"
  ON public.missions
  FOR DELETE
  USING (
    created_by = 'trainee'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
