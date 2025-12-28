-- Database Cleanup Migration
-- Created at: 2025-11-29
-- Purpose: Remove unused tables identified in schema analysis

-- Drop unused tables
DROP TABLE IF EXISTS public.gallery;
DROP TABLE IF EXISTS public.metrics;

-- Note: post_tags and post_tag_relations are KEPT because they are used
-- in a hybrid pattern (denormalized tags array in blog_posts + normalized relations)
-- for both read performance and tag management flexibility.
