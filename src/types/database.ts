/**
 * Supabase Database Types
 *
 * 이 파일은 Supabase 데이터베이스 스키마를 기반으로 한 TypeScript 타입 정의입니다.
 * 마이그레이션: 001-schema-cleanup-and-improvement.sql
 *
 * @generated 2025-10-17
 * @version 1.0.0
 */

// ===================================================================
// Phase 8: Services & Categories
// ===================================================================

export interface Service {
  id: string
  title: string
  description: string | null
  category_id: string | null
  price: number
  image_url: string | null
  images: string[]
  features: ServiceFeature[]
  metrics: ServiceMetrics | null
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
}

export interface ServiceFeature {
  title: string
  description: string
}

export interface ServiceMetrics {
  users?: number
  satisfaction?: number
  time_saved_hours?: number
  reports_generated?: number
  avg_roi_increase?: number
  [key: string]: number | undefined
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description: string | null
  display_order: number
  icon: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

// ===================================================================
// Phase 9: E-commerce
// ===================================================================

export interface Cart {
  id: string
  user_id: string
  service_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string | null
  total_amount: number
  tax_amount: number
  discount_amount: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  shipping_address: ShippingAddress | null
  contact_info: ContactInfo | null
  shipping_note: string | null
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  recipient_name: string
  phone: string
  postal_code: string
  address: string
  address_detail: string
  delivery_request?: string
}

export interface ContactInfo {
  name: string
  email: string
  phone: string
}

export interface OrderItem {
  id: string
  order_id: string
  service_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
}

export interface Payment {
  id: string
  order_id: string | null
  provider: 'kakao' | 'toss' | 'stripe'
  provider_transaction_id: string | null
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method: string | null
  metadata: PaymentMetadata
  paid_at: string | null
  created_at: string
}

export interface PaymentMetadata {
  card_info?: {
    card_company: string
    card_number: string
    installment_month: number
  }
  virtual_account?: {
    bank_code: string
    account_number: string
    due_date: string
  }
  webhook_data?: Record<string, unknown>
  [key: string]: unknown
}

// ===================================================================
// Phase 10: Authentication & User Management
// ===================================================================

export interface UserProfile {
  id: string // FK to auth.users
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'user' | 'guest'
  created_at: string
}

// ===================================================================
// Phase 11: Content Management (Blog)
// ===================================================================

export interface Post {
  id: string
  author_id: string | null
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  excerpt: string | null
  featured_image_url: string | null
  tags: string[]
  categories: string[]
}

// ===================================================================
// Phase 12: Advanced Features
// ===================================================================

export interface ChatMessage {
  id: string
  user_id: string | null
  message: string
  response: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  event_name: string
  user_id: string | null
  properties: Record<string, unknown>
  created_at: string
}

// ===================================================================
// Utility Types
// ===================================================================

// 데이터베이스 전체 타입
export interface Database {
  public: {
    Tables: {
      services: Service
      service_categories: ServiceCategory
      carts: Cart
      orders: Order
      order_items: OrderItem
      payments: Payment
      user_profiles: UserProfile
      user_roles: UserRole
      posts: Post
      chat_messages: ChatMessage
      analytics_events: AnalyticsEvent
    }
  }
}

// INSERT용 타입 (자동 생성 필드 제외)
export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'updated_at'>
export type ServiceCategoryInsert = Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>
export type CartInsert = Omit<Cart, 'id' | 'created_at' | 'updated_at'>
export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at'>
export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'>
export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>
export type UserProfileInsert = Omit<UserProfile, 'created_at' | 'updated_at'>
export type UserRoleInsert = Omit<UserRole, 'id' | 'created_at'>
export type PostInsert = Omit<Post, 'id' | 'created_at' | 'updated_at'>

// UPDATE용 타입 (모든 필드 optional)
export type ServiceUpdate = Partial<Omit<Service, 'id' | 'created_at'>>
export type ServiceCategoryUpdate = Partial<Omit<ServiceCategory, 'id' | 'created_at'>>
export type CartUpdate = Partial<Omit<Cart, 'id' | 'created_at'>>
export type OrderUpdate = Partial<Omit<Order, 'id' | 'created_at'>>
export type OrderItemUpdate = Partial<Omit<OrderItem, 'id' | 'created_at'>>
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'created_at'>>
export type UserProfileUpdate = Partial<Omit<UserProfile, 'id' | 'created_at'>>
export type PostUpdate = Partial<Omit<Post, 'id' | 'created_at'>>

// JOIN용 확장 타입
export interface ServiceWithCategory extends Service {
  category: ServiceCategory | null
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { service: Service | null })[]
  payment: Payment | null
}

export interface PostWithAuthor extends Post {
  author: UserProfile | null
}
