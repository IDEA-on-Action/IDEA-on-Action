/**
 * Services Data Index
 * 서비스 데이터 인덱스
 */

import { Service, ServicePricingSummary } from "@/types/services";
import { mvpDevelopmentService } from "./mvp-development";
import { minuFindService } from "./minu-find";
import { minuFrameService } from "./minu-frame";
import { minuBuildService } from "./minu-build";
import { minuKeepService } from "./minu-keep";
import { fullstackDevelopmentService } from "./fullstack-development";
import { designSystemService } from "./design-system";
import { operationsManagementService } from "./operations-management";

// 전체 서비스 목록
export const allServices: Service[] = [
  // Development Services
  mvpDevelopmentService,
  fullstackDevelopmentService,
  designSystemService,
  operationsManagementService,
  // Minu Platform (구 COMPASS)
  minuFindService,
  minuFrameService,
  minuBuildService,
  minuKeepService,
];

// 카테고리별 서비스
export const developmentServices = allServices.filter(
  (s) => s.category === "development"
);

export const minuServices = allServices.filter(
  (s) => s.category === "minu"
);

// 하위 호환성을 위한 별칭 (deprecated)
/** @deprecated Use minuServices instead */
export const compassServices = minuServices;

// 슬러그로 서비스 찾기
export function getServiceBySlug(slug: string): Service | undefined {
  return allServices.find((s) => s.slug === slug);
}

// 가격 안내 페이지용 요약 데이터
export const servicePricingSummary: ServicePricingSummary[] = [
  {
    category: "development",
    name: "MVP 개발",
    slug: "mvp",
    pricing: {
      type: "패키지",
      range: "₩5,000,000 ~ ₩12,000,000",
      unit: "프로젝트",
    },
    href: "/services/development/mvp",
  },
  {
    category: "development",
    name: "풀스택 개발",
    slug: "fullstack",
    pricing: {
      type: "시간/월 단위",
      range: "₩50,000 ~ ₩80,000/시간",
      unit: "시간",
    },
    href: "/services/development/fullstack",
  },
  {
    category: "development",
    name: "디자인 시스템",
    slug: "design",
    pricing: {
      type: "패키지",
      range: "₩300,000 ~ ₩2,000,000",
      unit: "프로젝트",
    },
    href: "/services/development/design",
  },
  {
    category: "development",
    name: "시스템 운영 관리",
    slug: "operations",
    pricing: {
      type: "월 구독",
      range: "₩500,000 ~ ₩2,000,000",
      unit: "월",
    },
    href: "/services/development/operations",
  },
  {
    category: "minu",
    name: "Minu Find",
    slug: "find",
    pricing: {
      type: "월 구독",
      range: "₩29,000 ~ ₩299,000",
      unit: "월",
    },
    href: "/services/minu/find",
  },
  {
    category: "minu",
    name: "Minu Frame",
    slug: "frame",
    pricing: {
      type: "월 구독",
      range: "₩39,000 ~ ₩349,000",
      unit: "월",
    },
    href: "/services/minu/frame",
  },
  {
    category: "minu",
    name: "Minu Build",
    slug: "build",
    pricing: {
      type: "월 구독",
      range: "₩49,000 ~ ₩399,000",
      unit: "월",
    },
    href: "/services/minu/build",
  },
  {
    category: "minu",
    name: "Minu Keep",
    slug: "keep",
    pricing: {
      type: "월 구독",
      range: "₩59,000 ~ ₩499,000",
      unit: "월",
    },
    href: "/services/minu/keep",
  },
];
