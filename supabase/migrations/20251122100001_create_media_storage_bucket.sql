-- Migration: Media Library Storage Bucket Setup
-- Created: 2025-11-22
-- Purpose: Create media-library storage bucket with RLS policies
-- Note: Supabase Storage bucket creation requires admin privileges

-- =====================================================
-- STORAGE BUCKET RLS POLICIES
-- =====================================================

-- Note: Storage buckets cannot be created via SQL migrations directly.
-- The bucket 'media-library' must be created via:
--   1. Supabase Dashboard (Settings > Storage > Create Bucket)
--   2. Supabase Management API
--   3. Supabase CLI (supabase storage create)
--
-- This migration sets up the RLS policies for the bucket.

-- =====================================================
-- DROP EXISTING POLICIES (if any)
-- =====================================================

DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update media files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media files" ON storage.objects;

-- =====================================================
-- SELECT POLICY - Public Read Access
-- =====================================================

-- Anyone can view/download files from media-library bucket
CREATE POLICY "Public can view media files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-library');

-- =====================================================
-- INSERT POLICY - Authenticated Users Can Upload
-- =====================================================

-- Authenticated users can upload files to media-library bucket
-- Additional admin checks happen at the application layer (useMediaLibrary hook)
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-library'
  AND (
    -- MIME type validation: only images allowed
    (storage.foldername(name))[1] IS NOT NULL
    AND (
      -- Allow common image formats
      RIGHT(LOWER(name), 4) IN ('.jpg', '.png', '.gif', '.svg')
      OR RIGHT(LOWER(name), 5) IN ('.jpeg', '.webp', '.avif')
    )
  )
);

-- =====================================================
-- UPDATE POLICY - Admins Only
-- =====================================================

-- Only admins can update file metadata
CREATE POLICY "Admins can update media files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-library'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- DELETE POLICY - Admins Only
-- =====================================================

-- Only admins can delete files from media-library bucket
CREATE POLICY "Admins can delete media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-library'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- COMMENTS (Skipped - requires storage object ownership)
-- =====================================================
-- Note: COMMENT ON POLICY for storage.objects requires superuser or
-- storage schema owner privileges, which are not available in local dev.
-- The comments are provided here for documentation purposes only:
--
-- "Public can view media files": Allow anyone to view/download files from media-library bucket
-- "Authenticated users can upload media": Allow authenticated users to upload image files
-- "Admins can update media files": Only admins can update file metadata
-- "Admins can delete media files": Only admins can delete files

-- =====================================================
-- BUCKET CONFIGURATION (Reference Only)
-- =====================================================

-- This SQL cannot create buckets directly. Use Supabase Dashboard or API.
--
-- Bucket Configuration:
-- ---------------------
-- Name: media-library
-- Public: Yes (public access for reading)
-- Allowed MIME Types: image/*
-- Max File Size: 10MB (10485760 bytes)
--
-- Manual Setup Required:
-- 1. Supabase Dashboard > Storage > Create Bucket
-- 2. Name: media-library
-- 3. Check "Public bucket"
-- 4. File size limit: 10MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/gif, image/svg+xml, image/webp, image/avif

-- =====================================================
-- HELPER FUNCTION: Get Media Public URL
-- =====================================================

-- Function to get the public URL of a media file
CREATE OR REPLACE FUNCTION get_media_public_url(file_path TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CONCAT(
      current_setting('app.settings.supabase_url', true),
      '/storage/v1/object/public/media-library/',
      file_path
    );
$$;

COMMENT ON FUNCTION get_media_public_url IS
  'Get the public URL for a file in the media-library bucket';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this query to verify policies are created:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%media%'
ORDER BY policyname;
*/
