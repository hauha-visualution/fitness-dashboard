-- Trainees may request a new slot, but only the assigned coach can apply it.

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
    RAISE EXCEPTION 'Không tìm thấy public.clients.id.';
  END IF;

  IF to_regclass('public.session_reschedule_requests') IS NULL THEN
    EXECUTE format($create$
      CREATE TABLE public.session_reschedule_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
        client_id %s NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        requested_date DATE NOT NULL,
        requested_time TIME NOT NULL,
        previous_date DATE NOT NULL,
        previous_time TIME,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
        requested_by UUID NOT NULL REFERENCES auth.users(id),
        responded_by UUID REFERENCES auth.users(id),
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    $create$, v_client_id_type);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS session_reschedule_requests_one_pending_per_session
  ON public.session_reschedule_requests(session_id)
  WHERE status = 'pending';

ALTER TABLE public.session_reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainees and coaches view own session reschedule requests" ON public.session_reschedule_requests;
CREATE POLICY "Trainees and coaches view own session reschedule requests"
  ON public.session_reschedule_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = session_reschedule_requests.client_id
        AND (c.auth_user_id = auth.uid() OR c.coach_email = (auth.jwt() ->> 'email'))
    )
  );

CREATE OR REPLACE FUNCTION public.request_session_reschedule(
  p_session_id UUID,
  p_requested_date DATE,
  p_requested_time TIME
)
RETURNS public.session_reschedule_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_request public.session_reschedule_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy buổi tập.';
  END IF;

  IF v_session.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Chỉ có thể yêu cầu dời buổi đang được đặt lịch.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = v_session.client_id AND c.auth_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bạn không có quyền yêu cầu dời buổi này.';
  END IF;

  IF p_requested_date IS NULL OR p_requested_time IS NULL THEN
    RAISE EXCEPTION 'Vui lòng chọn ngày và giờ mới.';
  END IF;

  INSERT INTO public.session_reschedule_requests (
    session_id, client_id, requested_date, requested_time,
    previous_date, previous_time, requested_by
  ) VALUES (
    v_session.id, v_session.client_id, p_requested_date, p_requested_time,
    v_session.scheduled_date, v_session.scheduled_time, auth.uid()
  )
  RETURNING * INTO v_request;

  RETURN v_request;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Yêu cầu dời buổi này đang chờ coach xác nhận.';
END;
$$;

CREATE OR REPLACE FUNCTION public.review_session_reschedule_request(
  p_request_id UUID,
  p_decision TEXT
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.session_reschedule_requests%ROWTYPE;
  v_session public.sessions%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Quyết định không hợp lệ.';
  END IF;

  SELECT * INTO v_request
  FROM public.session_reschedule_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Yêu cầu này không còn chờ xác nhận.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = v_request.client_id
      AND c.coach_email = (auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Bạn không có quyền xác nhận yêu cầu này.';
  END IF;

  UPDATE public.session_reschedule_requests
  SET status = p_decision,
      responded_by = auth.uid(),
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = v_request.id;

  SELECT * INTO v_session FROM public.sessions WHERE id = v_request.session_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Buổi tập không còn có thể dời.';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.sessions
    SET scheduled_date = v_request.requested_date,
        scheduled_time = v_request.requested_time,
        status = 'scheduled'
    WHERE id = v_session.id
    RETURNING * INTO v_session;
  END IF;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_session_reschedule(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_session_reschedule_request(UUID, TEXT) TO authenticated;
