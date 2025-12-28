-- Migration: Media Storage Bucket Creation
-- Created: 2025-11-23
-- Purpose: Create media storage bucket with full configuration and RLS policies
-- CMS Phase 5 - Sprint 1: DB/Storage Setup
--
-- Note: This migration supersedes 20251122100001_create_media_storage_bucket.sql
-- by providing a more complete bucket configuration

-- =====================================================
-- DROP EXISTING POLICIES (prevent conflicts)
-- =====================================================

DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update media files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media files" ON storage.objects;

-- =====================================================
-- STORAGE BUCKET CREATION
-- =====================================================

-- Note: Bucket creation via SQL is supported in Supabase
-- This creates the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  true,
  10485760, -- 10MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- RLS POLICIES FOR STORAGE
-- =====================================================

-- Policy 1: Public Read Access
-- Anyone can view/download files from media-library bucket
CREATE POLICY "Public media access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-library');

-- Policy 2: Authenticated Users Can Upload
-- Only authenticated users can upload to media-library bucket
-- Application layer enforces additional admin checks via useMediaLibrary hook
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-library'
  AND auth.role() = 'authenticated'
);

-- Policy 3: Admins Can Update
-- Only admin users can update file metadata
CREATE POLICY "Admins can update media"
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

-- Policy 4: Admins Can Delete
-- Only admin users can delete files from media-library bucket
CREATE POLICY "Admins can delete media"
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
-- POLICY COMMENTS (Skipped - requires storage object ownership)
-- =====================================================
-- Note: COMMENT ON POLICY for storage.objects requires superuser or
-- storage schema owner privileges, which are not available in local dev.
-- The comments are provided here for documentation purposes only:
--
-- "Public media access": CMS Phase 5 - Allow public read access to media-library bucket
-- "Authenticated users can upload": CMS Phase 5 - Allow authenticated users to upload media files
-- "Admins can update media": CMS Phase 5 - Allow admins to update media file metadata
-- "Admins can delete media": CMS Phase 5 - Allow admins to delete media files

-- =====================================================
-- HELPER FUNCTION: Get Media Public URL
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_media_public_url(TEXT);

-- Function to construct public URL for media files
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

COMMENT ON FUNCTION get_media_public_url(TEXT) IS
  'CMS Phase 5: Get the public URL for a file in the media-library bucket';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Run this query to verify bucket creation:
/*
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'media-library';
*/

-- Run this query to verify policies:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%media%'
ORDER BY policyname;
*/
