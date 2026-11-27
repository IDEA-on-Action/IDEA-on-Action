/**
 * 제품 문의 공용 로직
 * - 입력 검증
 * - 메일 본문 작성
 */

export const PRODUCT_IDS = ['kfde-studio'] as const;
export const ROLES = ['business', 'planning', 'data_it', 'purchasing', 'other'] as const;
export const DEPLOYMENTS = ['customer_cloud', 'on_premise', 'undecided'] as const;
export const TIMELINES = ['within_3_months', 'within_6_months', 'undecided'] as const;
export const STATUSES = ['received', 'contacted', 'in_progress', 'closed'] as const;

export type ProductInquiryStatus = (typeof STATUSES)[number];

export const PRODUCT_NAMES: Record<(typeof PRODUCT_IDS)[number], string> = {
  'kfde-studio': 'K-FDE Studio',
};

export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  business: '현업',
  planning: '기획',
  data_it: '데이터·IT',
  purchasing: '구매',
  other: '기타',
};

export const DEPLOYMENT_LABELS: Record<(typeof DEPLOYMENTS)[number], string> = {
  customer_cloud: '고객 클라우드',
  on_premise: '자체 서버',
  undecided: '미정',
};

export const TIMELINE_LABELS: Record<(typeof TIMELINES)[number], string> = {
  within_3_months: '3개월 안',
  within_6_months: '6개월 안',
  undecided: '미정',
};

export const USE_CASE_MIN_LENGTH = 20;

const LIMITS = { company: 200, name: 100, email: 254, phone: 40, use_case: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProductInquiryInput {
  product_id: (typeof PRODUCT_IDS)[number];
  company: string;
  name: string;
  email: string;
  phone: string | null;
  role: (typeof ROLES)[number] | null;
  use_case: string;
  deployment: (typeof DEPLOYMENTS)[number];
  timeline: (typeof TIMELINES)[number] | null;
}

export type ValidationResult =
  | { ok: true; value: ProductInquiryInput }
  | { ok: false; errors: Record<string, string> };

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** 제품 문의 입력을 검증한다. 동의 체크가 없으면 저장하지 않는다. */
export function validateProductInquiry(body: unknown): ValidationResult {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const productId = oneOf(input.product_id, PRODUCT_IDS);
  if (!productId) errors.product_id = '문의할 제품을 확인할 수 없습니다.';

  const company = text(input.company);
  if (!company) errors.company = '회사 또는 기관명을 입력해야 합니다.';
  else if (company.length > LIMITS.company) errors.company = '회사 또는 기관명이 너무 깁니다.';

  const name = text(input.name);
  if (!name) errors.name = '이름을 입력해야 합니다.';
  else if (name.length > LIMITS.name) errors.name = '이름이 너무 깁니다.';

  const email = text(input.email).toLowerCase();
  if (!email || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    errors.email = '업무 메일 주소의 형식이 올바르지 않습니다.';
  }

  const phone = text(input.phone);
  if (phone.length > LIMITS.phone) errors.phone = '연락처가 너무 깁니다.';

  const rawRole = text(input.role);
  const role = oneOf(rawRole, ROLES);
  if (rawRole && !role) errors.role = '역할 값이 올바르지 않습니다.';

  const useCase = text(input.use_case);
  if (useCase.length < USE_CASE_MIN_LENGTH) {
    errors.use_case = `적용하려는 업무를 ${USE_CASE_MIN_LENGTH}자 이상 입력해야 합니다.`;
  } else if (useCase.length > LIMITS.use_case) {
    errors.use_case = '적용하려는 업무의 내용이 너무 깁니다.';
  }

  const deployment = oneOf(input.deployment, DEPLOYMENTS);
  if (!deployment) errors.deployment = '설치 환경을 선택해야 합니다.';

  const rawTimeline = text(input.timeline);
  const timeline = oneOf(rawTimeline, TIMELINES);
  if (rawTimeline && !timeline) errors.timeline = '희망 시기 값이 올바르지 않습니다.';

  if (input.consent !== true) errors.consent = '개인정보 수집·이용에 동의해야 합니다.';

  if (Object.keys(errors).length > 0 || !productId || !deployment) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      product_id: productId,
      company,
      name,
      email,
      phone: phone || null,
      role,
      use_case: useCase,
      deployment,
      timeline,
    },
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const row = (label: string, value: string) =>
  `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>${label}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(value)}</td></tr>`;

/** 수신자에게 보내는 알림 메일 */
export function buildNotificationEmail(inquiry: ProductInquiryInput, id: string) {
  const product = PRODUCT_NAMES[inquiry.product_id];
  const rows = [
    row('제품', product),
    row('회사 또는 기관명', inquiry.company),
    row('이름', inquiry.name),
    row('업무 메일', inquiry.email),
    inquiry.phone ? row('연락처', inquiry.phone) : '',
    inquiry.role ? row('역할', ROLE_LABELS[inquiry.role]) : '',
    row('설치 환경', DEPLOYMENT_LABELS[inquiry.deployment]),
    inquiry.timeline ? row('희망 시기', TIMELINE_LABELS[inquiry.timeline]) : '',
    row('접수 번호', id),
  ];

  return {
    subject: `[제품 문의] ${product} - ${inquiry.company}`,
    html: `
    <h2>새 제품 문의가 접수되었습니다</h2>
    <table style="border-collapse: collapse; width: 100%;">${rows.join('')}</table>
    <h3>적용하려는 업무</h3>
    <p style="white-space: pre-wrap;">${escapeHtml(inquiry.use_case)}</p>
    <hr>
    <p style="color: #666; font-size: 12px;">이 메일은 IDEA on Action 웹사이트의 제품 문의 양식에서 자동 발송되었습니다.</p>
  `,
  };
}

/**
 * 문의자에게 보내는 접수 확인 메일.
 * 응답 목표 시간은 정해지지 않았으므로 적지 않는다.
 */
export function buildConfirmationEmail(inquiry: ProductInquiryInput) {
  const product = PRODUCT_NAMES[inquiry.product_id];

  return {
    subject: `[${product}] 도입 문의가 접수되었습니다`,
    html: `
    <p>${escapeHtml(inquiry.name)} 님, ${product} 도입 문의가 접수되었습니다.</p>
    <p>남겨 주신 내용을 확인한 뒤 담당자가 연락드리겠습니다.</p>
    <h3>접수 내용</h3>
    <table style="border-collapse: collapse; width: 100%;">${[
      row('회사 또는 기관명', inquiry.company),
      row('설치 환경', DEPLOYMENT_LABELS[inquiry.deployment]),
    ].join('')}</table>
    <p style="white-space: pre-wrap;">${escapeHtml(inquiry.use_case)}</p>
    <hr>
    <p style="color: #666; font-size: 12px;">이 메일은 발신 전용입니다. 문의하신 적이 없다면 이 메일을 무시하셔도 됩니다.</p>
  `,
  };
}
