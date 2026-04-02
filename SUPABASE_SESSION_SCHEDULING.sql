-- ============================================================
-- SESSION SCHEDULING LOGIC
-- Chạy file này trong Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_kind TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS source_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

UPDATE sessions
SET session_kind = 'fixed'
WHERE session_kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_package_kind_status_number
  ON sessions(package_id, session_kind, status, session_number);

CREATE OR REPLACE FUNCTION public.resequence_package_sessions(
  p_package_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session RECORD;
  v_next_number INT := 1;
BEGIN
  SELECT COALESCE(MAX(s.session_number), 0) + 1
  INTO v_next_number
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status = 'completed';

  FOR v_session IN
    SELECT s.id
    FROM sessions s
    WHERE s.package_id = p_package_id
      AND s.status IN ('scheduled', 'in_progress')
    ORDER BY
      s.scheduled_date ASC,
      COALESCE(s.scheduled_time, '00:00'::TIME) ASC,
      s.session_number ASC,
      s.id ASC
  LOOP
    UPDATE sessions
    SET session_number = v_next_number
    WHERE id = v_session.id;

    v_next_number := v_next_number + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_package_schedule(
  p_package_id UUID
)
RETURNS TABLE(package_id UUID, active_sessions INT, cancelled_sessions INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_active_count INT := 0;
  v_cancelled_count INT := 0;
  v_last_fixed_date DATE;
  v_last_fixed_time TIME WITHOUT TIME ZONE;
  v_next_slot_date DATE;
  v_next_slot_time TIME WITHOUT TIME ZONE;
  v_overflow_id UUID;
BEGIN
  SELECT *
  INTO v_package
  FROM packages
  WHERE id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package % không tồn tại.', p_package_id;
  END IF;

  PERFORM public.resequence_package_sessions(p_package_id);

  SELECT COUNT(*)
  INTO v_active_count
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status <> 'cancelled';

  WHILE v_active_count > v_package.total_sessions LOOP
    SELECT s.id
    INTO v_overflow_id
    FROM sessions s
    WHERE s.package_id = p_package_id
      AND s.status <> 'cancelled'
      AND COALESCE(s.session_kind, 'fixed') = 'fixed'
    ORDER BY s.session_number DESC, s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC
    LIMIT 1
    FOR UPDATE;

    IF v_overflow_id IS NULL THEN
      SELECT s.id
      INTO v_overflow_id
      FROM sessions s
      WHERE s.package_id = p_package_id
        AND s.status <> 'cancelled'
      ORDER BY s.session_number DESC, s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_overflow_id IS NULL THEN
      EXIT;
    END IF;

    UPDATE sessions
    SET
      status = 'cancelled',
      cancel_reason = COALESCE(cancel_reason, 'repair_overflow_session'),
      cancelled_at = COALESCE(cancelled_at, NOW())
    WHERE id = v_overflow_id;

    v_active_count := v_active_count - 1;
  END LOOP;

  WHILE v_active_count < v_package.total_sessions LOOP
    IF COALESCE(jsonb_array_length(v_package.weekly_schedule), 0) = 0 THEN
      RAISE EXCEPTION 'Package % chưa có weekly_schedule hợp lệ.', p_package_id;
    END IF;

    SELECT s.scheduled_date, s.scheduled_time
    INTO v_last_fixed_date, v_last_fixed_time
    FROM sessions s
    WHERE s.package_id = p_package_id
      AND s.status <> 'cancelled'
      AND COALESCE(s.session_kind, 'fixed') = 'fixed'
    ORDER BY s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC
    LIMIT 1;

    IF v_last_fixed_date IS NULL THEN
      SELECT s.scheduled_date, s.scheduled_time
      INTO v_last_fixed_date, v_last_fixed_time
      FROM sessions s
      WHERE s.package_id = p_package_id
        AND s.status <> 'cancelled'
      ORDER BY s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC
      LIMIT 1;
    END IF;

    IF v_last_fixed_date IS NULL THEN
      v_last_fixed_date := CURRENT_DATE;
      v_last_fixed_time := '07:00'::TIME;
    END IF;

    SELECT slot_date, slot_time
    INTO v_next_slot_date, v_next_slot_time
    FROM public.list_future_fixed_slots(
      v_package.weekly_schedule,
      (v_last_fixed_date + COALESCE(v_last_fixed_time, '00:00'::TIME)),
      1
    );

    IF v_next_slot_date IS NULL THEN
      RAISE EXCEPTION 'Không tìm được slot lịch cố định tiếp theo cho package %.', p_package_id;
    END IF;

    INSERT INTO sessions (
      client_id,
      package_id,
      session_number,
      scheduled_date,
      scheduled_time,
      status,
      notes,
      session_kind
    )
    VALUES (
      v_package.client_id,
      p_package_id,
      v_active_count + 1,
      v_next_slot_date,
      v_next_slot_time,
      'scheduled',
      NULL,
      'fixed'
    );

    v_active_count := v_active_count + 1;
  END LOOP;

  PERFORM public.resequence_package_sessions(p_package_id);

  SELECT COUNT(*)
  INTO v_active_count
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status <> 'cancelled';

  SELECT COUNT(*)
  INTO v_cancelled_count
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status = 'cancelled';

  RETURN QUERY
  SELECT p_package_id, v_active_count, v_cancelled_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_future_fixed_slots(
  p_weekly_schedule JSONB,
  p_after_timestamp TIMESTAMP WITHOUT TIME ZONE,
  p_limit INT
)
RETURNS TABLE(slot_date DATE, slot_time TIME WITHOUT TIME ZONE)
LANGUAGE SQL
STABLE
AS $$
  WITH schedule_slots AS (
    SELECT
      (item->>'day')::INT AS day_of_week,
      (item->>'time')::TIME AS slot_time
    FROM jsonb_array_elements(COALESCE(p_weekly_schedule, '[]'::jsonb)) item
  ),
  candidate_slots AS (
    SELECT
      day_series.day::DATE AS slot_date,
      schedule_slots.slot_time,
      (day_series.day::DATE + schedule_slots.slot_time) AS slot_timestamp
    FROM generate_series(
      p_after_timestamp::DATE,
      (p_after_timestamp::DATE + INTERVAL '3650 days')::DATE,
      INTERVAL '1 day'
    ) AS day_series(day)
    JOIN schedule_slots
      ON EXTRACT(DOW FROM day_series.day) = schedule_slots.day_of_week
  )
  SELECT slot_date, slot_time
  FROM candidate_slots
  WHERE slot_timestamp > p_after_timestamp
  ORDER BY slot_timestamp
  LIMIT GREATEST(COALESCE(p_limit, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.cancel_and_shift_fixed_session(
  p_session_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS TABLE(new_session_id UUID, package_id UUID, session_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target sessions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_target
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % không tồn tại.', p_session_id;
  END IF;

  IF COALESCE(v_target.session_kind, 'fixed') <> 'fixed' THEN
    RAISE EXCEPTION 'Chỉ session cố định mới dùng được logic hủy + dời lịch.';
  END IF;

  IF v_target.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Chỉ session scheduled/in_progress mới có thể dời lịch.';
  END IF;

  UPDATE sessions
  SET
    status = 'cancelled',
    cancel_reason = COALESCE(p_cancel_reason, 'rescheduled_to_next_fixed_slot'),
    cancelled_at = COALESCE(cancelled_at, NOW())
  WHERE id = v_target.id;

  PERFORM public.resequence_package_sessions(v_target.package_id);

  RETURN QUERY
  SELECT NULL::UUID, v_target.package_id, 0;
END;
$$;

DROP FUNCTION IF EXISTS public.insert_extra_package_session(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT);

CREATE OR REPLACE FUNCTION public.insert_extra_package_session(
  p_package_id UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME WITHOUT TIME ZONE,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(new_session_id UUID, package_id UUID, session_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_previous_session_id UUID;
  v_extra_id UUID;
  v_overflow_id UUID;
  v_active_non_cancelled_count INT := 0;
  v_extra_session_number INT := 0;
BEGIN
  SELECT *
  INTO v_package
  FROM packages
  WHERE id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package % không tồn tại.', p_package_id;
  END IF;

  IF COALESCE(v_package.total_sessions, 0) <= 0 THEN
    RAISE EXCEPTION 'Package % chưa có total_sessions hợp lệ.', p_package_id;
  END IF;

  SELECT s.id
  INTO v_previous_session_id
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status <> 'cancelled'
    AND (
      s.scheduled_date < p_scheduled_date
      OR (
        s.scheduled_date = p_scheduled_date
        AND COALESCE(s.scheduled_time, '00:00'::TIME) <= p_scheduled_time
      )
    )
  ORDER BY s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC, s.session_number DESC
  LIMIT 1
  FOR UPDATE;

  INSERT INTO sessions (
    client_id,
    package_id,
    session_number,
    scheduled_date,
    scheduled_time,
    status,
    notes,
    session_kind,
    source_session_id
  )
  VALUES (
    v_package.client_id,
    p_package_id,
    COALESCE(v_package.total_sessions, 0) + 1,
    p_scheduled_date,
    p_scheduled_time,
    'scheduled',
    NULLIF(TRIM(p_notes), ''),
    'extra',
    v_previous_session_id
  )
  RETURNING id INTO v_extra_id;

  PERFORM public.resequence_package_sessions(p_package_id);

  SELECT s.session_number
  INTO v_extra_session_number
  FROM sessions s
  WHERE s.id = v_extra_id;

  SELECT COUNT(*)
  INTO v_active_non_cancelled_count
  FROM sessions s
  WHERE s.package_id = p_package_id
    AND s.status <> 'cancelled';

  WHILE v_active_non_cancelled_count > v_package.total_sessions LOOP
    SELECT s.id
    INTO v_overflow_id
    FROM sessions s
    WHERE s.package_id = p_package_id
      AND s.status <> 'cancelled'
      AND COALESCE(s.session_kind, 'fixed') = 'fixed'
    ORDER BY s.session_number DESC, s.scheduled_date DESC, COALESCE(s.scheduled_time, '00:00'::TIME) DESC
    LIMIT 1
    FOR UPDATE;

    IF v_overflow_id IS NULL THEN
      EXIT;
    END IF;

    UPDATE sessions
    SET
      status = 'cancelled',
      cancel_reason = 'overflow_by_extra_session',
      cancelled_at = COALESCE(cancelled_at, NOW())
    WHERE id = v_overflow_id;

    v_active_non_cancelled_count := v_active_non_cancelled_count - 1;
  END LOOP;

  PERFORM public.resequence_package_sessions(p_package_id);

  RETURN QUERY
  SELECT v_extra_id, p_package_id, COALESCE(v_extra_session_number, 0);
END;
$$;
