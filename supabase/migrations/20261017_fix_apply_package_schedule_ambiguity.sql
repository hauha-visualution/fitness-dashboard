-- Fix PL/pgSQL output-column ambiguity when replacing future session dates.

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

  DELETE FROM sessions AS s
  WHERE s.package_id = p_package_id
    AND s.status IN ('scheduled', 'in_progress');

  SELECT v_package.total_sessions - COUNT(*) INTO v_needed
  FROM sessions s
  WHERE s.package_id = p_package_id AND s.status = 'completed';
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

  IF (SELECT COUNT(*) FROM sessions s WHERE s.package_id = p_package_id AND s.status <> 'cancelled') < v_package.total_sessions THEN
    RAISE EXCEPTION 'Không thể tạo đủ lịch trong 2 năm tới.';
  END IF;

  PERFORM public.resequence_package_sessions(p_package_id);
  RETURN QUERY
  SELECT s.id, s.scheduled_date, s.scheduled_time
  FROM sessions s
  WHERE s.package_id = p_package_id AND s.status IN ('scheduled', 'in_progress')
  ORDER BY s.scheduled_date, s.scheduled_time;
END;
$$;
