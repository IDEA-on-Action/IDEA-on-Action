-- Migration: CMS Media Library Table
-- Created: 2025-11-20
-- Purpose: Centralized media asset management with metadata and tagging

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_media_library CASCADE;

-- Create cms_media_library table
CREATE TABLE public.cms_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL, -- Generated filename (UUID-based)
  original_filename TEXT NOT NULL, -- User's original filename
  file_size INTEGER NOT NULL CHECK (file_size > 0), -- File size in bytes
  mime_type TEXT NOT NULL, -- MIME type (e.g., image/jpeg, video/mp4)
  width INTEGER, -- Image/video width in pixels
  height INTEGER, -- Image/video height in pixels
  storage_path TEXT NOT NULL, -- Supabase Storage path (bucket/folder/filename)
  thumbnail_url TEXT, -- Thumbnail URL for images/videos
  alt_text TEXT, -- Alt text for accessibility
  caption TEXT, -- Caption or description
  tags TEXT[] DEFAULT '{}', -- Array of tag names for organization
  uploaded_by UUID NOT NULL, -- References auth.users (soft reference)
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX idx_cms_media_mime_type ON public.cms_media_library(mime_type);
CREATE INDEX idx_cms_media_uploaded_by ON public.cms_media_library(uploaded_by);
CREATE INDEX idx_cms_media_created_at ON public.cms_media_library(created_at DESC);
CREATE INDEX idx_cms_media_tags ON public.cms_media_library USING GIN (tags);
CREATE INDEX idx_cms_media_filename ON public.cms_media_library(filename);

-- Enable RLS
ALTER TABLE public.cms_media_library ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view all media (for displaying on public pages)
CREATE POLICY select_cms_media_public
  ON public.cms_media_library
  FOR SELECT
  USING (true);

-- INSERT: Admins only
CREATE POLICY insert_cms_media_admin
  ON public.cms_media_library
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only (for updating metadata)
CREATE POLICY update_cms_media_admin
  ON public.cms_media_library
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Admins only
CREATE POLICY delete_cms_media_admin
  ON public.cms_media_library
  FOR DELETE
  USING (
    public.is_admin_user(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_media_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_media_library_updated_at
  BEFORE UPDATE ON public.cms_media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_media_library_updated_at();

-- Set uploaded_by on insert
CREATE OR REPLACE FUNCTION set_cms_media_library_uploaded_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.uploaded_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_media_library_set_uploaded_by
  BEFORE INSERT ON public.cms_media_library
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_media_library_uploaded_by();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get media by MIME type category
CREATE OR REPLACE FUNCTION get_media_by_type_category(type_category TEXT)
RETURNS SETOF cms_media_library
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM cms_media_library
  WHERE mime_type LIKE type_category || '%'
  ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_media_by_type_category IS 'Get media files by MIME type category (e.g., "image", "video", "application")';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_media_library IS 'CMS: Centralized media asset management with metadata';
COMMENT ON COLUMN public.cms_media_library.filename IS 'Generated filename (UUID-based) stored in Supabase Storage';
COMMENT ON COLUMN public.cms_media_library.original_filename IS 'User''s original filename for reference';
COMMENT ON COLUMN public.cms_media_library.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.cms_media_library.mime_type IS 'MIME type (e.g., image/jpeg, video/mp4, application/pdf)';
COMMENT ON COLUMN public.cms_media_library.width IS 'Image/video width in pixels (NULL for non-visual files)';
COMMENT ON COLUMN public.cms_media_library.height IS 'Image/video height in pixels (NULL for non-visual files)';
COMMENT ON COLUMN public.cms_media_library.storage_path IS 'Full path in Supabase Storage (bucket/folder/filename)';
COMMENT ON COLUMN public.cms_media_library.thumbnail_url IS 'Thumbnail URL for images/videos (generated)';
COMMENT ON COLUMN public.cms_media_library.alt_text IS 'Alt text for accessibility (WCAG compliance)';
COMMENT ON COLUMN public.cms_media_library.caption IS 'Caption or description for media file';
COMMENT ON COLUMN public.cms_media_library.tags IS 'Array of tag names for organization and search';
COMMENT ON COLUMN public.cms_media_library.uploaded_by IS 'User who uploaded the file (auth.users)';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_media_library TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_media_library TO authenticated;
