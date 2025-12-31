/**
 * Services Platform TypeScript Type Definitions
 *
 * Database schema types for Toss Payments integration
 * Created: 2025-11-19
 * Related migrations:
 * - 20251118000000_extend_services_table.sql
 * - 20251118000001_create_service_packages_table.sql
 * - 20251118000002_create_subscription_plans_table.sql
 * - 20251118000003_add_services_content_data.sql
 */

// ============================================================================
// Feature Types (reusable across packages and plans)
// ============================================================================

/**
 * Feature item with optional icon
 * Used in: service_packages.features, subscription_plans.features
 */
export interface Feature {
  /** Lucide icon name (optional) */
  icon?: string;
  /** Feature description text */
  text: string;
}

// ============================================================================
// Pricing Data Types (services.pricing_data JSONB)
// ============================================================================

/**
 * Individual pricing tier/package
 * Used in: services.pricing_data array
 */
export interface PricingTier {
  /** Package name (e.g., "스탠다드", "프로", "엔터프라이즈") */
  name: string;
  /** Price in KRW (e.g., 8000000 for ₩8M) */
  price: number;
  /** Estimated duration (e.g., "6-8주", "3개월", "12개월") */
  duration: string;
  /** List of features included in this tier */
  features: string[];
  /** Target customer description */
  ideal_for: string;
}

// ============================================================================
// Deliverables Types (services.deliverables JSONB)
// ============================================================================

/**
 * Deliverable item (what customer receives)
 * Used in: services.deliverables array
 */
export interface Deliverable {
  /** Lucide icon name (optional) */
  icon?: string;
  /** Deliverable title */
  title: string;
  /** Detailed description */
  description: string;
}

// ============================================================================
// Process Steps Types (services.process_steps JSONB)
// ============================================================================

/**
 * Project process step
 * Used in: services.process_steps array
 */
export interface ProcessStep {
  /** Step number (1-indexed) */
  step: number;
  /** Step title (e.g., "요구사항 분석", "디자인", "개발") */
  title: string;
  /** Estimated duration for this step */
  duration: string;
  /** Activities performed in this step */
  activities: string[];
}

// ============================================================================
// FAQ Types (services.faq JSONB)
// ============================================================================

/**
 * Frequently Asked Question
 * Used in: services.faq array
 */
export interface FAQ {
  /** Question text */
  question: string;
  /** Answer text (may contain markdown) */
  answer: string;
}

// ============================================================================
// Service Packages Types (service_packages table)
// ============================================================================

/**
 * One-time project package (e.g., MVP Standard, MVP Pro)
 * Table: service_packages
 */
export interface ServicePackage {
  /** UUID primary key */
  id: string;
  /** Foreign key to services.id */
  service_id: string;
  /** Package name (e.g., "스탠다드", "프로", "엔터프라이즈") */
  name: string;
  /** Price in KRW (numeric, 2 decimal places) */
  price: number;
  /** Features included in this package */
  features: Feature[];
  /** Whether this package is marked as popular */
  is_popular: boolean;
  /** Display order for sorting (lower = higher priority) */
  display_order: number;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Insert payload for creating a service package
 */
export interface ServicePackageInsert {
  service_id: string;
  name: string;
  price: number;
  features?: Feature[];
  is_popular?: boolean;
  display_order?: number;
}

/**
 * Update payload for modifying a service package
 */
export interface ServicePackageUpdate {
  name?: string;
  price?: number;
  features?: Feature[];
  is_popular?: boolean;
  display_order?: number;
}

// ============================================================================
// Subscription Plans Types (subscription_plans table)
// ============================================================================

/**
 * Billing cycle options for subscription plans
 */
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

/**
 * Recurring subscription plan (e.g., 풀스택 월간, 운영 관리 분기)
 * Table: subscription_plans
 */
export interface SubscriptionPlan {
  /** UUID primary key */
  id: string;
  /** Foreign key to services.id */
  service_id: string;
  /** Plan name (e.g., "월간 플랜", "분기 플랜") */
  plan_name: string;
  /** Billing cycle (monthly, quarterly, yearly) */
  billing_cycle: BillingCycle;
  /** Price in KRW per billing cycle */
  price: number;
  /** Features included in this plan */
  features: Feature[];
  /** Whether this plan is marked as popular */
  is_popular: boolean;
  /** Display order for sorting */
  display_order: number;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Insert payload for creating a subscription plan
 */
export interface SubscriptionPlanInsert {
  service_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  price: number;
  features?: Feature[];
  is_popular?: boolean;
  display_order?: number;
}

/**
 * Update payload for modifying a subscription plan
 */
export interface SubscriptionPlanUpdate {
  plan_name?: string;
  billing_cycle?: BillingCycle;
  price?: number;
  features?: Feature[];
  is_popular?: boolean;
  display_order?: number;
}

// ============================================================================
// Extended Service Types (services table with new JSONB columns)
// ============================================================================

/**
 * Service with extended content data
 * Extends the base Service type with new JSONB columns
 */
export interface ServiceWithContent {
  /** UUID primary key */
  id: string;
  /** Service title (e.g., "MVP 개발", "풀스택 개발") */
  title: string;
  /** Service slug (e.g., "mvp", "fullstack") */
  slug: string;
  /** Short description (markdown) */
  description: string | null;
  /** Hero image URL */
  image_url: string | null;
  /** Service category */
  category: string | null;
  /** Service tags (JSONB array) */
  tags: string[] | null;
  /** Whether service is active */
  is_active: boolean;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;

  // New JSONB columns (nullable)
  /** Pricing tiers for this service */
  pricing_data: PricingTier[] | null;
  /** Deliverables for this service */
  deliverables: Deliverable[] | null;
  /** Process steps for this service */
  process_steps: ProcessStep[] | null;
  /** FAQs for this service */
  faq: FAQ[] | null;
}

/**
 * Complete service detail with packages and plans
 * Used in: ServiceDetail page, useServiceDetail hook
 */
export interface ServiceDetail extends ServiceWithContent {
  /** One-time project packages for this service */
  packages: ServicePackage[];
  /** Recurring subscription plans for this service */
  plans: SubscriptionPlan[];
}

/**
 * Service detail query result (for React Query)
 */
export interface ServiceDetailQueryResult {
  service: ServiceWithContent | null;
  packages: ServicePackage[];
  plans: SubscriptionPlan[];
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Props for PricingCard component
 */
export interface PricingCardProps {
  /** Package or plan data */
  item: ServicePackage | SubscriptionPlan;
  /** Whether this is a one-time package (true) or subscription (false) */
  isPackage: boolean;
  /** Click handler for selection */
  onSelect: (item: ServicePackage | SubscriptionPlan) => void;
}

/**
 * Props for ServiceHero component
 */
export interface ServiceHeroProps {
  /** Service title */
  title: string;
  /** Service description (markdown) */
  description: string;
  /** Hero image URL */
  image_url: string | null;
  /** Service category */
  category: string | null;
  /** Service tags */
  tags: string[] | null;
}

/**
 * Props for ProcessTimeline component
 */
export interface ProcessTimelineProps {
  /** Process steps to display */
  steps: ProcessStep[];
}

/**
 * Props for DeliverablesGrid component
 */
export interface DeliverablesGridProps {
  /** Deliverables to display */
  deliverables: Deliverable[];
}

/**
 * Props for FAQSection component
 */
export interface FAQSectionProps {
  /** FAQs to display */
  faqs: FAQ[];
}

// ============================================================================
// Cart Integration Types
// ============================================================================

/**
 * Cart item for service package or subscription plan
 */
export interface ServiceCartItem {
  /** Item type discriminator */
  type: 'package' | 'plan';
  /** Service ID */
  service_id: string;
  /** Service title (for display) */
  service_title: string;
  /** Package or plan ID */
  item_id: string;
  /** Package or plan name */
  item_name: string;
  /** Price in KRW */
  price: number;
  /** Quantity (default: 1) */
  quantity: number;
  /** Billing cycle (only for plans) */
  billing_cycle?: BillingCycle;
}

/**
 * Add to cart payload
 */
export interface AddToCartPayload {
  service: ServiceWithContent;
  item: ServicePackage | SubscriptionPlan;
  type: 'package' | 'plan';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if item is ServicePackage
 */
export function isServicePackage(item: ServicePackage | SubscriptionPlan): item is ServicePackage {
  return !('billing_cycle' in item);
}

/**
 * Type guard to check if item is SubscriptionPlan
 */
export function isSubscriptionPlan(item: ServicePackage | SubscriptionPlan): item is SubscriptionPlan {
  return 'billing_cycle' in item;
}

/**
 * Type guard to check if service has content data
 */
export function hasContentData(service: ServiceWithContent): boolean {
  return !!(
    service.pricing_data?.length ||
    service.deliverables?.length ||
    service.process_steps?.length ||
    service.faq?.length
  );
}
