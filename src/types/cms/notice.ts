/**
 * Notice System TypeScript Types
 * Phase 11 Week 2
 */

export interface Notice {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'urgent' | 'maintenance'
  status: 'draft' | 'published' | 'archived'
  author_id: string
  published_at: string | null
  expires_at: string | null
  is_pinned: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface NoticeWithAuthor extends Notice {
  author?: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export interface NoticeInsert {
  title: string
  content: string
  type?: 'info' | 'warning' | 'urgent' | 'maintenance'
  status?: 'draft' | 'published' | 'archived'
  author_id: string
  published_at?: string | null
  expires_at?: string | null
  is_pinned?: boolean
}

export interface NoticeUpdate {
  title?: string
  content?: string
  type?: 'info' | 'warning' | 'urgent' | 'maintenance'
  status?: 'draft' | 'published' | 'archived'
  published_at?: string | null
  expires_at?: string | null
  is_pinned?: boolean
}

export interface NoticeFilters {
  status?: 'draft' | 'published' | 'archived'
  type?: 'info' | 'warning' | 'urgent' | 'maintenance'
  author_id?: string
  is_pinned?: boolean
  include_expired?: boolean
}

export type NoticeSortBy = 'published_at' | 'created_at' | 'updated_at' | 'view_count'
export type NoticeSortOrder = 'asc' | 'desc'

// Helper function to check if notice is expired
export function isNoticeExpired(notice: Notice): boolean {
  if (!notice.expires_at) return false
  return new Date(notice.expires_at) < new Date()
}

// Helper function to get notice badge color
export function getNoticeTypeColor(type: Notice['type']): string {
  switch (type) {
    case 'info':
      return 'bg-blue-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'urgent':
      return 'bg-red-500'
    case 'maintenance':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}
