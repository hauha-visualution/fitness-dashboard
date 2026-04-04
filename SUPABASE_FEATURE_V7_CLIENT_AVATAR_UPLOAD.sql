-- ============================================================
-- SUPABASE FEATURE V7: Stable client avatar upload
-- Allows a client to upload avatar files for their own client record.
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1) Make sure clients can update their own row
DROP POLICY IF EXISTS "Clients update own record" ON public.clients;

CREATE POLICY "Clients update own record"
  ON public.clients
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 2) Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Reset buggy avatar storage policies
DROP POLICY IF EXISTS "Clients upload own avatar object" ON storage.objects;
DROP POLICY IF EXISTS "Clients update own avatar object" ON storage.objects;
DROP POLICY IF EXISTS "Clients delete own avatar object" ON storage.objects;
DROP POLICY IF EXISTS "Public read client avatars" ON storage.objects;

-- 4) Public read for avatar images
CREATE POLICY "Public read client avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'client-avatars');

-- 5) Clients can insert avatar files with their own prefix
CREATE POLICY "Clients upload own avatar object"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.auth_user_id = auth.uid()
        AND storage.objects.name LIKE ('client-' || c.id::text || '-avatar%')
    )
  );

-- 6) Clients can delete avatar files with their own prefix
CREATE POLICY "Clients delete own avatar object"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.auth_user_id = auth.uid()
        AND storage.objects.name LIKE ('client-' || c.id::text || '-avatar%')
    )
  );

