-- Remove Security Advisor warnings without changing the product's signed-in flows.

-- Pin the search path on every function reported by the advisor.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_push_subscriptions_updated_at',
        'set_missions_updated_at',
        'is_allowed_admin_email',
        'resequence_package_sessions',
        'repair_package_schedule',
        'list_future_fixed_slots',
        'cancel_and_shift_fixed_session',
        'insert_extra_package_session'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f);
  END LOOP;
END;
$$;

-- SECURITY DEFINER RPCs must never be executable by anonymous callers.
REVOKE EXECUTE ON FUNCTION public.apply_package_schedule(UUID, DATE, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_and_shift_fixed_session(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.client_submit_payment(BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_own_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_session_without_exercises(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_extra_package_session(UUID, DATE, TIME, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.repair_package_schedule(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_session_reschedule(UUID, DATE, TIME) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_session_reschedule_request(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_package_schedule(UUID, DATE, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_and_shift_fixed_session(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.client_submit_payment(BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_own_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_session_without_exercises(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_extra_package_session(UUID, DATE, TIME, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.repair_package_schedule(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_session_reschedule(UUID, DATE, TIME) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_session_reschedule_request(UUID, TEXT) FROM anon;

-- Signed-in users require these RPCs; every function also verifies the
-- caller's coach/trainee ownership before mutating data.
GRANT EXECUTE ON FUNCTION public.apply_package_schedule(UUID, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_and_shift_fixed_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_submit_payment(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_own_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_without_exercises(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_extra_package_session(UUID, DATE, TIME, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_package_schedule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_session_reschedule(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_session_reschedule_request(UUID, TEXT) TO authenticated;

-- `events` is not used by the application. Remove its unrestricted write
-- policy rather than leaving an anonymous data-ingestion endpoint exposed.
DROP POLICY IF EXISTS "public read events" ON public.events;
DROP POLICY IF EXISTS "public write events" ON public.events;

-- These are public buckets, so public URLs still work. Removing broad SELECT
-- policies prevents callers from listing object names through the Storage API.
DROP POLICY IF EXISTS "Public read client avatars" ON storage.objects;
DROP POLICY IF EXISTS "allow_all 99xhyw_0" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "client_progress_select" ON storage.objects;
