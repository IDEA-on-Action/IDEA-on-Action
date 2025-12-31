/**
 * Services Platform Type Definitions
 * 서비스 플랫폼 타입 정의
 */

import { LucideIcon } from "lucide-react";

export type ServiceCategory = "development" | "compass";

export type ServiceSlug =
  | "mvp"
  | "fullstack"
  | "design"
  | "operations"
  | "navigator"
  | "cartographer"
  | "captain"
  | "harbor";

export interface Service {
  id: string;
  category: ServiceCategory;
  name: string;
  slug: ServiceSlug;
  title: string;
  subtitle: string;
  description: string;
  features: ServiceFeature[];
  techStack?: TechStack;
  pricing: Pricing;
  deliverables?: Deliverable[];
  faq?: FAQ[];
  process?: ProcessStep[];
  paymentMethod?: PaymentMethod;
  refundPolicy?: RefundPolicy;
  status?: "available" | "coming-soon";
  launchDate?: string; // 출시 예정일 (ISO 8601)
}

// 서비스 기능 타입 (아이콘 포함)
export interface ServiceFeature {
  icon?: LucideIcon;
  title: string;
  description: string;
}

// 결과물 타입 (아이콘 포함)
export interface Deliverable {
  icon?: LucideIcon;
  title: string;
  description: string;
  format?: string; // 파일 형식 (예: PDF, Figma, Code Repository)
}

export interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  deployment?: string[];
  infrastructure?: string[];
}

export interface Pricing {
  type: "package" | "hourly" | "monthly" | "project";
  packages?: Package[];
  hourly?: HourlyRate[];
  monthly?: MonthlyPlan[];
}

export interface Package {
  name: string;
  price: number;
  currency: "KRW" | "USD";
  features: string[];
  duration?: string;
  support?: string;
  recommended?: boolean;
}

export interface HourlyRate {
  role: string;
  rate: number;
  currency: "KRW" | "USD";
}

export interface MonthlyPlan {
  name: "Basic" | "Pro" | "Enterprise";
  price: number;
  currency: "KRW" | "USD";
  features: Record<string, string | boolean>;
  annualDiscount?: number; // percentage
  recommended?: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  duration?: string;
}

export interface PaymentMethod {
  type: "split" | "monthly" | "hourly";
  split?: {
    deposit: number; // percentage
    interim?: number; // percentage
    final: number; // percentage
  };
  monthly?: {
    billingDay: number; // 1-31
    autoRenewal: boolean;
  };
}

export interface RefundPolicy {
  beforeStart: string;
  inProgress: string;
  afterCompletion: string;
  specialCases?: string[];
}

// 가격 안내 페이지용 요약 타입
export interface ServicePricingSummary {
  category: ServiceCategory;
  name: string;
  slug: ServiceSlug;
  pricing: {
    type: string;
    range: string;
    unit?: string;
  };
  href: string;
}
