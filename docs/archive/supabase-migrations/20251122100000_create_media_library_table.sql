-- Migration: Media Library Table for CMS Phase 5
-- Created: 2025-11-22
-- Purpose: Create media_library table for useMediaLibrary hook
-- Note: This table name matches the frontend hook expectations

-- Drop existing table if exists
DROP TABLE IF EXISTS public.media_library CASCADE;

-- Create media_library table (matches useMediaLibrary hook schema)
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL, -- Generated unique filename
  original_filename TEXT NOT NULL, -- User's original filename
  file_size INTEGER NOT NULL CHECK (file_size > 0), -- File size in bytes
  mime_type TEXT NOT NULL, -- MIME type (e.g., image/jpeg)
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- Optional thumbnail path
  alt_text TEXT, -- Alt text for accessibility
  width INTEGER, -- Image width in pixels
  height INTEGER, -- Image height in pixels
  uploaded_by UUID NOT NULL, -- References auth.users
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- Create indexes for common queries
CREATE INDEX idx_media_library_uploaded_by ON public.media_library(uploaded_by);
CREATE INDEX idx_media_library_mime_type ON public.media_library(mime_type);
CREATE INDEX idx_media_library_created_at ON public.media_library(created_at DESC);
CREATE INDEX idx_media_library_filename ON public.media_library(filename);
CREATE INDEX idx_media_library_deleted_at ON public.media_library(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view all non-deleted media
CREATE POLICY select_media_public
  ON public.media_library
  FOR SELECT
  USING (deleted_at IS NULL);

-- INSERT: Authenticated users (admins checked in hook)
CREATE POLICY insert_media_authenticated
  ON public.media_library
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Admins only (for updating metadata)
CREATE POLICY update_media_admin
  ON public.media_library
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: Admins only (hard delete)
CREATE POLICY delete_media_admin
  ON public.media_library
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_media_library_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER media_library_updated_at
  BEFORE UPDATE ON public.media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_media_library_updated_at();

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Note: Supabase Storage bucket 'media-library' should be created manually
-- via Supabase Dashboard or API:
-- - Name: media-library
-- - Public: Yes
-- - Allowed MIME types: image/*
-- - Max file size: 10MB

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.media_library IS 'CMS Phase 5: Media asset storage with soft delete support';
COMMENT ON COLUMN public.media_library.filename IS 'Generated unique filename stored in storage';
COMMENT ON COLUMN public.media_library.original_filename IS 'Original filename uploaded by user';
COMMENT ON COLUMN public.media_library.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.media_library.mime_type IS 'MIME type (e.g., image/jpeg, image/png)';
COMMENT ON COLUMN public.media_library.storage_path IS 'Full path in Supabase Storage bucket';
COMMENT ON COLUMN public.media_library.thumbnail_path IS 'Optional thumbnail path in storage';
COMMENT ON COLUMN public.media_library.alt_text IS 'Alt text for accessibility (WCAG compliance)';
COMMENT ON COLUMN public.media_library.width IS 'Image width in pixels';
COMMENT ON COLUMN public.media_library.height IS 'Image height in pixels';
COMMENT ON COLUMN public.media_library.uploaded_by IS 'User ID who uploaded the file';
COMMENT ON COLUMN public.media_library.deleted_at IS 'Soft delete timestamp (NULL = active)';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users
GRANT SELECT ON public.media_library TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS filters)
GRANT INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
