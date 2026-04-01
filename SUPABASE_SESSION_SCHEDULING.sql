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
  v_package packages%ROWTYPE;
  v_replacement_id UUID;
  v_slot_dates DATE[];
  v_slot_times TIME[];
  v_slot_count INT := 0;
  v_index INT := 2;
  v_future RECORD;
  v_slot RECORD;
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

  SELECT *
  INTO v_package
  FROM packages
  WHERE id = v_target.package_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(jsonb_array_length(v_package.weekly_schedule), 0) = 0 THEN
    RAISE EXCEPTION 'Package % chưa có weekly_schedule hợp lệ.', v_target.package_id;
  END IF;

  SELECT COUNT(*)
  INTO v_slot_count
  FROM sessions s
  WHERE s.package_id = v_target.package_id
    AND s.status IN ('scheduled', 'in_progress')
    AND COALESCE(s.session_kind, 'fixed') = 'fixed'
    AND s.session_number > v_target.session_number;

  v_slot_count := v_slot_count + 1;

  FOR v_slot IN
    SELECT *
    FROM public.list_future_fixed_slots(
      v_package.weekly_schedule,
      (v_target.scheduled_date + v_target.scheduled_time),
      v_slot_count
    )
  LOOP
    v_slot_dates := array_append(v_slot_dates, v_slot.slot_date);
    v_slot_times := array_append(v_slot_times, v_slot.slot_time);
  END LOOP;

  IF COALESCE(array_length(v_slot_dates, 1), 0) < v_slot_count THEN
    RAISE EXCEPTION 'Không đủ slot lịch cố định để dời session %.', p_session_id;
  END IF;

  UPDATE sessions
  SET
    status = 'cancelled',
    cancel_reason = COALESCE(p_cancel_reason, 'rescheduled_to_next_fixed_slot'),
    cancelled_at = COALESCE(cancelled_at, NOW())
  WHERE id = v_target.id;

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
    v_target.client_id,
    v_target.package_id,
    v_target.session_number,
    v_slot_dates[1],
    v_slot_times[1],
    'scheduled',
    v_target.notes,
    'fixed',
    v_target.id
  )
  RETURNING id INTO v_replacement_id;

  FOR v_future IN
    SELECT id
    FROM sessions s
    WHERE s.package_id = v_target.package_id
      AND s.status IN ('scheduled', 'in_progress')
      AND COALESCE(s.session_kind, 'fixed') = 'fixed'
      AND s.session_number > v_target.session_number
    ORDER BY s.session_number
  LOOP
    UPDATE sessions
    SET
      scheduled_date = v_slot_dates[v_index],
      scheduled_time = v_slot_times[v_index]
    WHERE id = v_future.id;

    v_index := v_index + 1;
  END LOOP;

  RETURN QUERY
  SELECT v_replacement_id, v_target.package_id, v_target.session_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_extra_package_session(
  p_anchor_session_id UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME WITHOUT TIME ZONE,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(new_session_id UUID, package_id UUID, session_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anchor sessions%ROWTYPE;
  v_overflow_id UUID;
  v_extra_id UUID;
BEGIN
  SELECT *
  INTO v_anchor
  FROM sessions
  WHERE id = p_anchor_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session anchor % không tồn tại.', p_anchor_session_id;
  END IF;

  IF COALESCE(v_anchor.session_kind, 'fixed') <> 'fixed' THEN
    RAISE EXCEPTION 'Chỉ session cố định mới có thể làm anchor cho buổi phát sinh.';
  END IF;

  IF v_anchor.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Anchor phải là session scheduled/in_progress.';
  END IF;

  SELECT id
  INTO v_overflow_id
  FROM sessions s
  WHERE s.package_id = v_anchor.package_id
    AND s.status IN ('scheduled', 'in_progress')
    AND COALESCE(s.session_kind, 'fixed') = 'fixed'
  ORDER BY s.session_number DESC, s.scheduled_date DESC, s.scheduled_time DESC
  LIMIT 1
  FOR UPDATE;

  IF v_overflow_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy session cố định để dời sau khi thêm buổi phát sinh.';
  END IF;

  UPDATE sessions
  SET session_number = sessions.session_number + 1
  WHERE sessions.package_id = v_anchor.package_id
    AND sessions.status IN ('scheduled', 'in_progress')
    AND COALESCE(sessions.session_kind, 'fixed') = 'fixed'
    AND sessions.session_number >= v_anchor.session_number;

  UPDATE sessions
  SET
    status = 'cancelled',
    cancel_reason = 'overflow_by_extra_session',
    cancelled_at = COALESCE(cancelled_at, NOW())
  WHERE id = v_overflow_id;

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
    v_anchor.client_id,
    v_anchor.package_id,
    v_anchor.session_number,
    p_scheduled_date,
    p_scheduled_time,
    'scheduled',
    NULLIF(TRIM(p_notes), ''),
    'extra',
    v_anchor.id
  )
  RETURNING id INTO v_extra_id;

  RETURN QUERY
  SELECT v_extra_id, v_anchor.package_id, v_anchor.session_number;
END;
$$;
