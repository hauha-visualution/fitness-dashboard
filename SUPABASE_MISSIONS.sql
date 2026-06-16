-- ============================================================
-- MISSIONS SYSTEM
-- Chạy trong Supabase Dashboard → SQL Editor
-- Idempotent: có thể chạy lại nhiều lần, dùng chung cho mọi coach/trainee
-- Không ràng buộc account/trainee cụ thể nào.
--
-- Ghi chú: client_id được tạo cùng kiểu dữ liệu với clients.id
-- để tương thích cả database dùng BIGINT lẫn UUID.
-- ============================================================

-- 1. Bảng missions: coach giao bài tập để trainee tự hoàn thành
DO $$
DECLARE
  v_client_id_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO v_client_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'clients'
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_client_id_type IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy public.clients.id. Hãy chạy migration clients trước.';
  END IF;

  IF to_regclass('public.missions') IS NULL THEN
    EXECUTE format($create$
      CREATE TABLE public.missions (
        id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
        coach_email         TEXT        NOT NULL,
        coach_auth_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
        client_id           %s          NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        exercise_type       TEXT        NOT NULL,
        title               TEXT        NOT NULL,
        duration_minutes    INT         NOT NULL,
        duration_unit       TEXT        NOT NULL DEFAULT 'phút',
        perform_time        TIME,
        start_date          DATE        NOT NULL,
        end_date            DATE        NOT NULL,
        status              TEXT        NOT NULL DEFAULT 'assigned',
        started_at          TIMESTAMPTZ,
        paused_at           TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ,
        elapsed_seconds     INT         NOT NULL DEFAULT 0,
        last_reminded_on    DATE,
        completion_note     TEXT,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      )
    $create$, v_client_id_type);
  END IF;
END;
$$;

-- 2. Bổ sung cột khi chạy trên database đã có bảng missions từ bản cũ
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS coach_email TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS coach_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS exercise_type TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS duration_unit TEXT NOT NULL DEFAULT 'phút';
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS perform_time TIME;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'assigned';
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS elapsed_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS last_reminded_on DATE;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS completion_note TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- client_id cần cùng type với clients.id; nếu bảng missions từng được tạo sai type
-- thì xoá bảng missions cũ trước khi chạy lại migration này.
DO $$
DECLARE
  v_mission_client_type TEXT;
  v_client_id_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO v_mission_client_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'missions'
    AND a.attname = 'client_id'
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO v_client_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'clients'
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_mission_client_type IS NULL THEN
    EXECUTE format(
      'ALTER TABLE public.missions ADD COLUMN client_id %s REFERENCES public.clients(id) ON DELETE CASCADE',
      v_client_id_type
    );
  ELSIF v_mission_client_type <> v_client_id_type THEN
    RAISE EXCEPTION 'public.missions.client_id type (%) không khớp public.clients.id type (%). Nếu bảng missions chưa có dữ liệu thật, chạy: DROP TABLE public.missions CASCADE; rồi chạy lại SQL này.', v_mission_client_type, v_client_id_type;
  END IF;
END;
$$;

ALTER TABLE public.missions ALTER COLUMN coach_email SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN exercise_type SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN duration_unit SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN end_date SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.missions ALTER COLUMN elapsed_seconds SET NOT NULL;

-- 3. Constraints chuẩn hoá dữ liệu
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_duration_minutes_check;
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_duration_positive_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_duration_positive_check
  CHECK (duration_minutes > 0);

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_elapsed_seconds_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_elapsed_seconds_check
  CHECK (elapsed_seconds >= 0);

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_duration_unit_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_duration_unit_check
  CHECK (duration_unit IN ('phút', 'km', 'rep', 'set'));

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_status_check
  CHECK (status IN ('assigned', 'in_progress', 'paused', 'completed'));

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_date_range_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_date_range_check
  CHECK (end_date >= start_date);

-- 4. Index cho calendar, tab Mission và daily reminder
CREATE INDEX IF NOT EXISTS idx_missions_client_dates
  ON public.missions(client_id, start_date, end_date, status);

CREATE INDEX IF NOT EXISTS idx_missions_coach_email
  ON public.missions(coach_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missions_reminder
  ON public.missions(status, start_date, end_date, last_reminded_on);

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_missions_updated_at ON public.missions;

CREATE TRIGGER trg_set_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.set_missions_updated_at();

-- 6. Row Level Security
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach access own missions" ON public.missions;
DROP POLICY IF EXISTS "Client read own missions" ON public.missions;
DROP POLICY IF EXISTS "Client update own mission status" ON public.missions;

-- Coach chỉ xem/tạo/sửa/xoá mission của các trainee thuộc coach_email của mình.
CREATE POLICY "Coach access own missions"
  ON public.missions
  FOR ALL
  USING (
    coach_email = (auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    coach_email = (auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  );

-- Trainee chỉ đọc mission của chính mình.
CREATE POLICY "Client read own missions"
  ON public.missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.auth_user_id = auth.uid()
    )
  );

-- Trainee cập nhật trạng thái mission của chính mình: start/pause/done.
CREATE POLICY "Client update own mission status"
  ON public.missions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = missions.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
