-- Flexible training schedules and trainee self-completion.
-- A coach can replace every uncompleted session from an effective date onward.

CREATE OR REPLACE FUNCTION public.apply_package_schedule(
  p_package_id UUID,
  p_effective_date DATE,
  p_weekly_schedule JSONB
)
RETURNS TABLE(session_id UUID, scheduled_date DATE, scheduled_time TIME WITHOUT TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_client clients%ROWTYPE;
  v_needed INT;
  v_slot RECORD;
  v_existing_id UUID;
BEGIN
  IF p_effective_date IS NULL OR COALESCE(jsonb_array_length(p_weekly_schedule), 0) = 0 THEN
    RAISE EXCEPTION 'Cần chọn ngày hiệu lực và ít nhất một lịch tập mỗi tuần.';
  END IF;
  IF p_effective_date < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE THEN
    RAISE EXCEPTION 'Ngày hiệu lực không thể ở trong quá khứ.';
  END IF;

  SELECT p.* INTO v_package FROM packages p WHERE p.id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy gói tập.'; END IF;

  SELECT c.* INTO v_client FROM clients c WHERE c.id = v_package.client_id;
  IF v_client.coach_email IS DISTINCT FROM (auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Chỉ coach quản lý trainee này có thể cập nhật lịch.';
  END IF;

  -- Keep completed records intact. Every unfinished session is regenerated from
  -- the effective date, including missed sessions left in the past.
  DELETE FROM sessions AS s
  WHERE s.package_id = p_package_id
    AND s.status IN ('scheduled', 'in_progress');

  SELECT v_package.total_sessions - COUNT(*) INTO v_needed
  FROM sessions
  WHERE package_id = p_package_id AND status = 'completed';
  v_needed := GREATEST(v_needed, 0);

  UPDATE packages
  SET weekly_schedule = p_weekly_schedule,
      start_date = COALESCE(start_date, p_effective_date)
  WHERE id = p_package_id;

  FOR v_slot IN
    WITH slots AS (
      SELECT (item ->> 'day')::INT AS day_of_week, (item ->> 'time')::TIME AS slot_time
      FROM jsonb_array_elements(p_weekly_schedule) item
    ), dates AS (
      SELECT day::DATE AS day
      FROM generate_series(p_effective_date, p_effective_date + 730, INTERVAL '1 day') day
    )
    SELECT dates.day, slots.slot_time
    FROM dates JOIN slots ON EXTRACT(DOW FROM dates.day) = slots.day_of_week
    ORDER BY dates.day, slots.slot_time
    LIMIT v_needed
  LOOP
    INSERT INTO sessions (client_id, package_id, session_number, scheduled_date, scheduled_time, status, session_kind)
    VALUES (v_package.client_id, p_package_id, 0, v_slot.day, v_slot.slot_time, 'scheduled', 'fixed')
    RETURNING id INTO v_existing_id;
  END LOOP;

  IF (SELECT COUNT(*) FROM sessions WHERE package_id = p_package_id AND status <> 'cancelled') < v_package.total_sessions THEN
    RAISE EXCEPTION 'Không thể tạo đủ lịch trong 2 năm tới.';
  END IF;

  PERFORM public.resequence_package_sessions(p_package_id);
  RETURN QUERY SELECT s.id, s.scheduled_date, s.scheduled_time
  FROM sessions s WHERE s.package_id = p_package_id AND s.status IN ('scheduled', 'in_progress')
  ORDER BY s.scheduled_date, s.scheduled_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_own_session(p_session_id UUID)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_session sessions%ROWTYPE;
BEGIN
  SELECT s.* INTO v_session FROM sessions s WHERE s.id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy buổi tập.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = v_session.client_id AND c.auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bạn không có quyền hoàn thành buổi tập này.';
  END IF;
  IF v_session.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Buổi tập này không thể hoàn thành.';
  END IF;
  UPDATE sessions SET status = 'completed', completed_at = NOW() WHERE id = p_session_id RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_package_schedule(UUID, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_own_session(UUID) TO authenticated;
