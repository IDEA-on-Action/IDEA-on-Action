/**
 * Supabase Database Types
 *
 * 이 파일은 Supabase 데이터베이스 스키마를 기반으로 한 TypeScript 타입 정의입니다.
 * 마이그레이션:
 * - 001-schema-cleanup-and-improvement.sql
 * - 002-phase-9-ecommerce-schema.sql
 *
 * @generated 2025-10-18
 * @version 1.1.0 (Phase 9 E-commerce)
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

/**
 * Cart - 장바구니 (메타데이터만, 사용자당 하나)
 */
export interface Cart {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

/**
 * CartItem - 장바구니 항목 (각 서비스)
 */
export interface CartItem {
  id: string
  cart_id: string
  service_id: string
  quantity: number
  price: number // 담을 당시 가격 스냅샷
  created_at: string
  updated_at: string
}

/**
 * Order - 주문 헤더
 */
export interface Order {
  id: string
  user_id: string | null

  // 주문 금액
  subtotal: number
  tax_amount: number | null
  discount_amount: number | null
  shipping_fee: number | null
  total_amount: number

  // 주문 상태
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

  // 배송 정보
  shipping_address: ShippingAddress | null
  shipping_name: string | null
  shipping_phone: string | null
  shipping_note: string | null

  // 연락처 정보
  contact_email: string | null
  contact_phone: string | null

  // 메타데이터
  order_number: string // ORD-YYYYMMDD-XXXX
  payment_id: string | null

  // 타임스탬프
  created_at: string
  updated_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

/**
 * ShippingAddress - 배송지 정보
 */
export interface ShippingAddress {
  postcode: string
  address: string
  addressDetail: string
  city?: string
  state?: string
}

/**
 * OrderItem - 주문 항목 (각 서비스)
 */
export interface OrderItem {
  id: string
  order_id: string
  service_id: string | null // 서비스 삭제 후에도 주문 기록 보존

  // 스냅샷 정보
  service_title: string
  service_description: string | null
  quantity: number
  unit_price: number
  subtotal: number

  // 전체 서비스 스냅샷
  service_snapshot: Record<string, unknown> | null

  created_at: string
}

/**
 * Payment - 결제 정보
 */
export interface Payment {
  id: string
  order_id: string | null

  // 결제 정보
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'

  // 결제 게이트웨이
  provider: 'kakao' | 'toss' | 'stripe' | 'paypal' | null
  provider_transaction_id: string | null
  payment_method: string | null

  // 카드 정보 (마스킹)
  card_info: CardInfo | null

  // 메타데이터
  metadata: Record<string, unknown>
  failure_reason: string | null

  // 타임스탬프
  created_at: string
  paid_at: string | null
  failed_at: string | null
  refunded_at: string | null
}

/**
 * CardInfo - 마스킹된 카드 정보
 */
export interface CardInfo {
  cardType?: string
  cardNumber?: string // "**** **** **** 1234"
  issuer?: string
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
      cart_items: CartItem
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
export type CartItemInsert = Omit<CartItem, 'id' | 'created_at' | 'updated_at'>
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
export type CartItemUpdate = Partial<Omit<CartItem, 'id' | 'created_at'>>
export type OrderUpdate = Partial<Omit<Order, 'id' | 'created_at'>>
export type OrderItemUpdate = Partial<Omit<OrderItem, 'id' | 'created_at'>>
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'created_at'>>
export type UserProfileUpdate = Partial<Omit<UserProfile, 'id' | 'created_at'>>
export type PostUpdate = Partial<Omit<Post, 'id' | 'created_at'>>

// JOIN용 확장 타입
export interface ServiceWithCategory extends Service {
  category: ServiceCategory | null
}

export interface CartWithItems extends Cart {
  items: (CartItem & { service: Service | null })[]
}

export interface CartItemWithService extends CartItem {
  service: Service | null
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { service: Service | null })[]
  payment: Payment | null
}

export interface OrderItemWithService extends OrderItem {
  service: Service | null
}

export interface PostWithAuthor extends Post {
  author: UserProfile | null
}
