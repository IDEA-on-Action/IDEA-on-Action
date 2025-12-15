/**
 * WordPress.com REST API Types
 * API Documentation: https://developer.wordpress.com/docs/api/
 */

export interface WordPressAuthor {
  ID: number
  login: string
  name: string
  email: string | false
  avatar_URL: string
  profile_URL: string
}

export interface WordPressCategory {
  [key: string]: {
    ID: number
    name: string
    slug: string
    description: string
    post_count: number
  }
}

export interface WordPressPost {
  ID: number
  site_ID: number
  title: string
  excerpt: string
  content: string
  date: string // ISO 8601 format
  modified: string
  status: 'publish' | 'draft' | 'pending' | 'private' | 'trash'
  type: 'post' | 'page'
  author: WordPressAuthor
  categories: WordPressCategory
  tags: { [key: string]: unknown }
  featured_image: string
  post_thumbnail: {
    ID: number
    URL: string
    width: number
    height: number
  } | null
  URL: string
  short_URL: string
  comment_count: number
  like_count: number
  discussion: {
    comments_open: boolean
    pings_open: boolean
  }
  attachments: {
    [key: number]: {
      ID: number
      URL: string
      mime_type: string
      width: number
      height: number
    }
  }
}

export interface WordPressResponse {
  found: number // Total posts found
  posts: WordPressPost[]
  meta?: {
    next_page?: string
    links?: {
      self: string
      help: string
      site: string
    }
  }
}

/**
 * Unified Blog Post Type (Supabase + WordPress)
 */
export interface UnifiedBlogPost {
  id: string // WordPress: `wp-${ID}`, Supabase: UUID
  source: 'wordpress' | 'supabase'
  title: string
  excerpt: string
  content: string
  publishedAt: Date
  author: {
    name: string
    avatar?: string
  }
  categories: string[]
  tags: string[]
  featuredImage?: string
  url: string
  commentCount?: number
  likeCount?: number
}

/**
 * HTML 엔티티 디코딩 헬퍼 함수
 * WordPress API가 반환하는 HTML 엔티티(&#8211;, &amp; 등)를 실제 문자로 변환
 */
function decodeHtmlEntities(text: string): string {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }
  // SSR 환경을 위한 기본 디코딩
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
}

/**
 * Helper function to convert WordPress post to unified format
 */
export function wordpressToUnified(wp: WordPressPost): UnifiedBlogPost {
  const categories = Object.values(wp.categories || {}).map(cat => decodeHtmlEntities(cat.name))
  const tags = Object.keys(wp.tags || {}).map(tag => decodeHtmlEntities(tag))

  return {
    id: `wp-${wp.ID}`,
    source: 'wordpress',
    title: decodeHtmlEntities(wp.title),
    excerpt: wp.excerpt,
    content: wp.content,
    publishedAt: new Date(wp.date),
    author: {
      name: decodeHtmlEntities(wp.author.name),
      avatar: wp.author.avatar_URL,
    },
    categories,
    tags,
    featuredImage: wp.featured_image || wp.post_thumbnail?.URL,
    url: wp.URL,
    commentCount: wp.comment_count,
    likeCount: wp.like_count,
  }
}
