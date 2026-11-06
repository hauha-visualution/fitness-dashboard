-- Both coach and trainee may only complete a session after its scheduled start.

CREATE OR REPLACE FUNCTION public.complete_session_without_exercises(p_session_id UUID)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_client clients%ROWTYPE;
BEGIN
  SELECT s.* INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy buổi tập.';
  END IF;

  SELECT c.* INTO v_client
  FROM clients c
  WHERE c.id = v_session.client_id;

  IF v_client.auth_user_id IS DISTINCT FROM auth.uid()
    AND v_client.coach_email IS DISTINCT FROM (auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Bạn không có quyền hoàn thành buổi tập này.';
  END IF;

  IF NOW() < (
    (v_session.scheduled_date + COALESCE(v_session.scheduled_time, TIME '00:00'))
    AT TIME ZONE 'Asia/Ho_Chi_Minh'
  ) THEN
    RAISE EXCEPTION 'Chỉ có thể hoàn thành sau giờ tập đã lên lịch.';
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

CREATE OR REPLACE FUNCTION public.complete_own_session(p_session_id UUID)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.complete_session_without_exercises(p_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_session_without_exercises(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_own_session(UUID) TO authenticated;
