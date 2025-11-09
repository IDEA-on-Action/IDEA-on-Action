/**
 * Supabase Database Types
 * Auto-generated from Supabase schema
 * Phase 11 Week 1: Blog System
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string
          featured_image: string | null
          author_id: string
          category_id: string | null
          status: 'draft' | 'published' | 'archived'
          published_at: string | null
          view_count: number
          read_time: number | null
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content: string
          featured_image?: string | null
          author_id: string
          category_id?: string | null
          status?: 'draft' | 'published' | 'archived'
          published_at?: string | null
          view_count?: number
          read_time?: number | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string
          featured_image?: string | null
          author_id?: string
          category_id?: string | null
          status?: 'draft' | 'published' | 'archived'
          published_at?: string | null
          view_count?: number
          read_time?: number | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      post_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      post_tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      post_tag_relations: {
        Row: {
          post_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      // Existing tables (placeholder - add actual types if needed)
      user_profiles: {
        Row: {
          id: string
          is_admin: boolean
          [key: string]: unknown
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      services: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
