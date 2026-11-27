/**
 * 제품 문의 양식의 선택 값, 표시 이름, 개인정보 동의 안내
 *
 * 선택 값의 코드는 Workers API(`cloudflare-workers/src/lib/product-inquiry.ts`)와 같아야 합니다.
 */

import { features } from '@/config/features';
import { KFDE_STUDIO_PRODUCT_ID } from './kfde-studio';

export const PRODUCT_INQUIRY_PRODUCTS = {
  [KFDE_STUDIO_PRODUCT_ID]: { name: 'K-FDE Studio', backTo: '/services/kfde-studio' },
} as const;

export type ProductInquiryProductId = keyof typeof PRODUCT_INQUIRY_PRODUCTS;

export const isProductInquiryProduct = (value: string | null): value is ProductInquiryProductId =>
  value !== null && value in PRODUCT_INQUIRY_PRODUCTS;

export const ROLE_OPTIONS = [
  { value: 'business', label: '현업' },
  { value: 'planning', label: '기획' },
  { value: 'data_it', label: '데이터·IT' },
  { value: 'purchasing', label: '구매' },
  { value: 'other', label: '기타' },
] as const;

export const DEPLOYMENT_OPTIONS = [
  { value: 'customer_cloud', label: '고객 클라우드' },
  { value: 'on_premise', label: '자체 서버' },
  { value: 'undecided', label: '미정' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'within_3_months', label: '3개월 안' },
  { value: 'within_6_months', label: '6개월 안' },
  { value: 'undecided', label: '미정' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'received', label: '접수' },
  { value: 'contacted', label: '연락함' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'closed', label: '종료' },
] as const;

export type ProductInquiryStatus = (typeof STATUS_OPTIONS)[number]['value'];

export const USE_CASE_MIN_LENGTH = 20;

export const labelOf = (options: readonly { value: string; label: string }[], value: string | null | undefined) =>
  options.find((option) => option.value === value)?.label ?? '';

/**
 * 개인정보 수집·이용 동의 안내
 *
 * 처리 주체와 보유 기간은 2026-11-27 에 정했습니다 (처리 주체: 생각과행동, 보유 기간: 접수 뒤 1년).
 * 세 값 가운데 하나라도 null 이면 운영 빌드에서 문의 양식이 열리지 않습니다.
 */
export const PRODUCT_INQUIRY_CONSENT: {
  controller: string | null;
  purpose: string | null;
  retention: string | null;
  items: readonly string[];
} = {
  controller: '생각과행동 (IDEA on Action)',
  purpose: '도입 문의의 확인과 회신',
  retention: '접수한 날부터 1년 동안 보유한 뒤 삭제합니다',
  items: ['회사 또는 기관명', '이름', '업무 메일', '연락처', '역할', '적용하려는 업무', '설치 환경', '희망 시기'],
};

export const isConsentNoticeReady = (consent = PRODUCT_INQUIRY_CONSENT): boolean =>
  Boolean(consent.controller && consent.purpose && consent.retention);

/**
 * 문의 양식을 열어도 되는지 판단합니다.
 * 공개 설정이 켜져 있어야 하고, 운영 빌드에서는 동의 안내까지 확정되어 있어야 합니다.
 */
export function isProductInquiryOpen({
  enabled = features.productInquiry,
  consentReady = isConsentNoticeReady(),
  dev = import.meta.env.DEV,
}: { enabled?: boolean; consentReady?: boolean; dev?: boolean } = {}): boolean {
  return enabled && (consentReady || dev);
}
