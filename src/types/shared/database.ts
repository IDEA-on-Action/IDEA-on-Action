/**
 * Database Types
 *
 * 이 파일은 자동 생성된 데이터베이스 스키마 타입(database-schema.types.ts)을 래핑하여
 * 애플리케이션에서 사용하기 편리한 형태로 제공합니다.
 * JSON 컬럼에 대한 구체적인 타입 정의를 포함합니다.
 *
 * @version 2.1.0 (D1 마이그레이션)
 */

import { Database as DatabaseSchema, Json } from './database-schema.types';

// 데이터베이스 테이블 타입 단축 접근자
type Tables = DatabaseSchema['public']['Tables'];
type Enums = DatabaseSchema['public']['Enums'];

// ===================================================================
// Phase 8: Services & Categories
// ===================================================================

export interface ServiceFeature {
  title: string;
  description: string;
}

export interface ServiceMetrics {
  users?: number;
  satisfaction?: number;
  time_saved_hours?: number;
  reports_generated?: number;
  avg_roi_increase?: number;
  [key: string]: number | undefined;
}

// Service 타입: JSON 필드 구체화
export interface Service extends Omit<Tables['services']['Row'], 'features' | 'images' | 'metrics' | 'status'> {
  features: ServiceFeature[] | null;
  images: string[] | null; // JSONB 배열을 문자열 배열로 매핑
  metrics: ServiceMetrics | null;
  status: 'active' | 'draft' | 'archived'; // string -> union type
}

export type ServiceCategory = Tables['service_categories']['Row'];

// ===================================================================
// Phase 9: E-commerce
// ===================================================================

export type Cart = Tables['carts']['Row'];

export type CartItem = Tables['cart_items']['Row'];

export interface Order extends Omit<Tables['orders']['Row'], 'status' | 'shipping_address'> {
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  shipping_address: ShippingAddress | null;
}

export interface ShippingAddress {
  postcode: string;
  address: string;
  addressDetail: string;
  city?: string;
  state?: string;
}

export interface OrderItem extends Omit<Tables['order_items']['Row'], 'service_snapshot'> {
  service_snapshot: Record<string, unknown> | null;
}

export interface Payment extends Omit<Tables['payments']['Row'], 'status' | 'card_info' | 'metadata' | 'provider'> {
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  provider: 'kakao' | 'toss' | 'stripe' | 'paypal' | null;
  card_info: CardInfo | null;
  metadata: Record<string, unknown> | null;
}

export interface CardInfo {
  cardType?: string;
  cardNumber?: string;
  issuer?: string;
}

// ===================================================================
// Phase 10: Authentication & User Management
// ===================================================================

export interface UserProfile extends Omit<Tables['user_profiles']['Row'], 'location' | 'preferences'> {
  location: UserLocation | null;
  preferences: UserPreferences | null;
}

export interface UserLocation {
  country?: string;
  city?: string;
  timezone?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: boolean;
}

export interface ConnectedAccount extends Omit<Tables['connected_accounts']['Row'], 'provider'> {
  provider: 'google' | 'github' | 'kakao' | 'microsoft' | 'apple';
}

export type TwoFactorAuth = Tables['two_factor_auth']['Row'];

export type LoginAttempt = Tables['login_attempts']['Row'];

export interface Role extends Omit<Tables['roles']['Row'], 'name'> {
  name: 'admin' | 'manager' | 'user' | 'viewer';
}

export interface Permission extends Omit<Tables['permissions']['Row'], 'action'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export type UserRole = Tables['user_roles']['Row'];

export type RolePermission = Tables['role_permissions']['Row'];

export interface AuditLog extends Omit<Tables['audit_logs']['Row'], 'details'> {
  details: Record<string, unknown> | null;
}

// ===================================================================
// Phase 11: Content Management (Blog)
// ===================================================================

// Post 타입은 blog_posts 테이블에 매핑
export interface Post extends Omit<Tables['blog_posts']['Row'], 'status' | 'tags'> {
  status: 'draft' | 'published';
  tags: string[] | null; // blog_posts.tags is text[] | null in supabase.ts? No, it's string[] | null.
}

// ===================================================================
// Phase 12: Advanced Features
// ===================================================================

export interface ChatMessage extends Omit<Tables['chat_messages']['Row'], 'metadata'> {
  metadata: Record<string, unknown>;
}

export interface AnalyticsEvent extends Omit<Tables['analytics_events']['Row'], 'event_params'> {
  properties: Record<string, unknown>; // event_params -> properties 매핑
}

// ===================================================================
// Utility Types
// ===================================================================

// 데이터베이스 전체 타입 (호환성 유지)
export interface Database {
  public: {
    Tables: {
      services: Service;
      service_categories: ServiceCategory;
      carts: Cart;
      cart_items: CartItem;
      orders: Order;
      order_items: OrderItem;
      payments: Payment;
      user_profiles: UserProfile;
      connected_accounts: ConnectedAccount;
      two_factor_auth: TwoFactorAuth;
      login_attempts: LoginAttempt;
      roles: Role;
      permissions: Permission;
      user_roles: UserRole;
      role_permissions: RolePermission;
      audit_logs: AuditLog;
      posts: Post; // Mapped to blog_posts
      blog_posts: Post;
      chat_messages: ChatMessage;
      analytics_events: AnalyticsEvent;
    }
  }
}

// INSERT용 타입 (자동 생성 필드 제외) - Supabase Insert 타입 활용
export type ServiceInsert = Tables['services']['Insert'];
export type ServiceCategoryInsert = Tables['service_categories']['Insert'];
export type CartInsert = Tables['carts']['Insert'];
export type CartItemInsert = Tables['cart_items']['Insert'];
export type OrderInsert = Tables['orders']['Insert'];
export type OrderItemInsert = Tables['order_items']['Insert'];
export type PaymentInsert = Tables['payments']['Insert'];
export type UserProfileInsert = Tables['user_profiles']['Insert'];
export type ConnectedAccountInsert = Tables['connected_accounts']['Insert'];
export type TwoFactorAuthInsert = Tables['two_factor_auth']['Insert'];
export type LoginAttemptInsert = Tables['login_attempts']['Insert'];
export type UserRoleInsert = Tables['user_roles']['Insert'];
export type AuditLogInsert = Tables['audit_logs']['Insert'];
export type PostInsert = Tables['blog_posts']['Insert'];

// UPDATE용 타입 - Supabase Update 타입 활용
export type ServiceUpdate = Tables['services']['Update'];
export type ServiceCategoryUpdate = Tables['service_categories']['Update'];
export type CartUpdate = Tables['carts']['Update'];
export type CartItemUpdate = Tables['cart_items']['Update'];
export type OrderUpdate = Tables['orders']['Update'];
export type OrderItemUpdate = Tables['order_items']['Update'];
export type PaymentUpdate = Tables['payments']['Update'];
export type UserProfileUpdate = Tables['user_profiles']['Update'];
export type ConnectedAccountUpdate = Tables['connected_accounts']['Update'];
export type TwoFactorAuthUpdate = Tables['two_factor_auth']['Update'];
export type PostUpdate = Tables['blog_posts']['Update'];

// JOIN용 확장 타입
export interface ServiceWithCategory extends Service {
  category: ServiceCategory | null;
}

export interface CartWithItems extends Cart {
  items: (CartItem & { service: Service | null })[];
}

export interface CartItemWithService extends CartItem {
  service: Service | null;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { service: Service | null })[];
  payment: Payment | null;
}

export interface OrderItemWithService extends OrderItem {
  service: Service | null;
}

export interface PostWithAuthor extends Post {
  author: UserProfile | null;
}
