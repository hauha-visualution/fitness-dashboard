-- Security hardening: protect tables previously exposed through the public API.
-- The policies intentionally follow the existing coach / trainee ownership model.
-- Service-role jobs (imports, Edge Functions) bypass RLS and continue to work.

-- ---------------------------------------------------------------------------
-- coaches
-- A coach can only see and maintain their own profile. The insert policy keeps
-- the existing self-sign-up flow working after Supabase Auth has issued a JWT.
-- ---------------------------------------------------------------------------
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach reads own profile" ON public.coaches;
DROP POLICY IF EXISTS "Coach creates own profile" ON public.coaches;
DROP POLICY IF EXISTS "Coach updates own profile" ON public.coaches;

CREATE POLICY "Coach reads own profile"
  ON public.coaches FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Coach creates own profile"
  ON public.coaches FOR INSERT TO authenticated
  WITH CHECK (
    email = (auth.jwt() ->> 'email')
    AND (auth_user_id IS NULL OR auth_user_id = auth.uid())
  );

CREATE POLICY "Coach updates own profile"
  ON public.coaches FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (
    email = (auth.jwt() ->> 'email')
    AND (auth_user_id IS NULL OR auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- InBody records
-- Both the assigned coach and the matching authenticated trainee can read and
-- maintain a record. Neither can access another trainee's measurements.
-- ---------------------------------------------------------------------------
ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach and trainee access own InBody records" ON public.inbody_records;

CREATE POLICY "Coach and trainee access own InBody records"
  ON public.inbody_records FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = inbody_records.client_id
        AND (
          c.coach_email = (auth.jwt() ->> 'email')
          OR c.auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = inbody_records.client_id
        AND (
          c.coach_email = (auth.jwt() ->> 'email')
          OR c.auth_user_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Workout templates and their child rows
-- Templates are coach-owned. Child access is always derived from the parent
-- template rather than trusting a client-provided template_id.
-- ---------------------------------------------------------------------------
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach manages own workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Coach manages exercises in own templates" ON public.template_exercises;
DROP POLICY IF EXISTS "Coach manages assignments in own templates" ON public.template_assignments;

CREATE POLICY "Coach manages own workout templates"
  ON public.workout_templates FOR ALL TO authenticated
  USING (coach_email = (auth.jwt() ->> 'email'))
  WITH CHECK (coach_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Coach manages exercises in own templates"
  ON public.template_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_templates wt
      WHERE wt.id = template_exercises.template_id
        AND wt.coach_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_templates wt
      WHERE wt.id = template_exercises.template_id
        AND wt.coach_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Coach manages assignments in own templates"
  ON public.template_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_templates wt
      JOIN public.clients c ON c.id = template_assignments.client_id
      WHERE wt.id = template_assignments.template_id
        AND wt.coach_email = (auth.jwt() ->> 'email')
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_templates wt
      JOIN public.clients c ON c.id = template_assignments.client_id
      WHERE wt.id = template_assignments.template_id
        AND wt.coach_email = (auth.jwt() ->> 'email')
        AND c.coach_email = (auth.jwt() ->> 'email')
    )
  );

-- The app currently has no browser-side write path for the global exercise
-- catalogue. Signed-in users may read it; changes remain server/admin-only.
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read workout exercise catalogue" ON public.workout_exercises;

CREATE POLICY "Authenticated users read workout exercise catalogue"
  ON public.workout_exercises FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Survey intake responses
-- Responses are only searchable by signed-in coaches; trainees cannot browse
-- everyone’s answers. Intake imports run with the service role, so browser
-- clients are deliberately not granted direct write access.
-- ---------------------------------------------------------------------------
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public submits survey response" ON public.survey_responses;
DROP POLICY IF EXISTS "Coaches read survey responses" ON public.survey_responses;

CREATE POLICY "Coaches read survey responses"
  ON public.survey_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.email = (auth.jwt() ->> 'email')
    )
  );
