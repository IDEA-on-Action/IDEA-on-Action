/**
 * Blog System TypeScript Types
 * Phase 11 Week 1
 */

import type { Database } from '../shared/database-schema.types'

// Extract types from Supabase schema
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert']
export type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update']

export type PostCategory = Database['public']['Tables']['post_categories']['Row']
export type PostCategoryInsert = Database['public']['Tables']['post_categories']['Insert']

export type PostTag = Database['public']['Tables']['post_tags']['Row']
export type PostTagInsert = Database['public']['Tables']['post_tags']['Insert']

export type PostTagRelation = Database['public']['Tables']['post_tag_relations']['Row']

// Post type enumeration
export type BlogPostType = 'blog' | 'changelog' | 'devlog' | 'announcement'

// Extended types with relations
export interface BlogPostWithRelations extends BlogPost {
  author?: {
    user_id: string
    display_name?: string | null
    avatar_url?: string | null
  }
  category?: PostCategory
  tags?: PostTag[]
}

// Form data types
export interface BlogPostFormData {
  title: string
  slug: string
  excerpt?: string
  content: string
  featured_image?: string
  category_id?: string
  tag_ids?: string[]
  status: 'draft' | 'published' | 'archived'
  published_at?: string
  meta_title?: string
  meta_description?: string
}

// Filter/Sort types
export interface BlogPostFilters {
  status?: 'draft' | 'published' | 'archived'
  post_type?: BlogPostType
  category_id?: string
  tag_id?: string
  author_id?: string
  search?: string // Search in title, excerpt, content
}

export type BlogPostSortBy = 'published_at' | 'created_at' | 'updated_at' | 'view_count' | 'title'
export type BlogPostSortOrder = 'asc' | 'desc'

// Reading time calculation (approximate)
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

// Slug generation from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim()
}
