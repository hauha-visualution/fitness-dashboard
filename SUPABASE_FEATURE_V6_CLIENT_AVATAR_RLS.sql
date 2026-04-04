-- ============================================================
-- SUPABASE FEATURE V6: Client avatar self-service
-- Cho phép học viên upload avatar của chính mình và cập nhật avatar_url
-- Chạy file này trong Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1) Cho học viên được update record của chính mình trong bảng clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Clients update own record'
  ) THEN
    CREATE POLICY "Clients update own record"
      ON public.clients
      FOR UPDATE
      USING (auth_user_id = auth.uid())
      WITH CHECK (auth_user_id = auth.uid());
  END IF;
END $$;

-- 2) Đảm bảo bucket client-avatars tồn tại
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Cho học viên upload avatar của chính mình vào bucket client-avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Clients upload own avatar object'
  ) THEN
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
            AND name = ('client-' || c.id::text || '-avatar')
        )
      );
  END IF;
END $$;

-- 4) Cho học viên cập nhật/ghi đè avatar của chính mình
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Clients update own avatar object'
  ) THEN
    CREATE POLICY "Clients update own avatar object"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'client-avatars'
        AND EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.auth_user_id = auth.uid()
            AND name = ('client-' || c.id::text || '-avatar')
        )
      )
      WITH CHECK (
        bucket_id = 'client-avatars'
        AND EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.auth_user_id = auth.uid()
            AND name = ('client-' || c.id::text || '-avatar')
        )
      );
  END IF;
END $$;

-- 5) Cho học viên xóa avatar cũ của chính mình nếu cần
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Clients delete own avatar object'
  ) THEN
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
            AND name = ('client-' || c.id::text || '-avatar')
        )
      );
  END IF;
END $$;

-- 6) Cho phép đọc public avatar nếu bucket không public hoặc cần policy rõ ràng
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read client avatars'
  ) THEN
    CREATE POLICY "Public read client avatars"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'client-avatars');
  END IF;
END $$;

