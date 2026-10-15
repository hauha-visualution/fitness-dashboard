-- Coaches and the assigned trainee can complete a scheduled session without
-- creating an exercise log first.

CREATE OR REPLACE FUNCTION public.complete_session_without_exercises(p_session_id UUID)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions%ROWTYPE;
BEGIN
  SELECT s.* INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy buổi tập.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.id = v_session.client_id
      AND (
        c.auth_user_id = auth.uid()
        OR c.coach_email = (auth.jwt() ->> 'email')
      )
  ) THEN
    RAISE EXCEPTION 'Bạn không có quyền hoàn thành buổi tập này.';
  END IF;

  IF v_session.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Buổi tập này không thể hoàn thành.';
  END IF;

  UPDATE sessions
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_session_without_exercises(UUID) TO authenticated;
