/**
 * Newsletter Types
 *
 * 뉴스레터 구독 및 관리를 위한 TypeScript 타입 정의
 *
 * @module newsletter.types
 */

/**
 * 뉴스레터 구독자 인터페이스
 *
 * DB 테이블: newsletter_subscriptions
 */
export interface NewsletterSubscriber {
  /** 구독자 고유 ID (UUID) */
  id: string;

  /** 구독자 이메일 주소 */
  email: string;

  /** 구독 상태 */
  status: NewsletterStatus;

  /** 구독 신청일 */
  subscribed_at: string;

  /** 이메일 확인일 (pending → confirmed) */
  confirmed_at: string | null;

  /** 구독 취소일 (confirmed → unsubscribed) */
  unsubscribed_at: string | null;

  /** 구독자 선호 설정 */
  preferences: NewsletterPreferences;

  /** 메타데이터 (구독 경로, IP 주소 등) */
  metadata: NewsletterMetadata;
}

/**
 * 뉴스레터 구독 상태
 */
export type NewsletterStatus = 'pending' | 'confirmed' | 'unsubscribed';

/**
 * 구독자 선호 설정
 */
export interface NewsletterPreferences {
  /** 관심 주제 */
  topics?: string[];

  /** 발송 빈도 */
  frequency?: 'daily' | 'weekly' | 'monthly';

  /** 언어 설정 */
  language?: 'ko' | 'en';
}

/**
 * 구독 메타데이터
 */
export interface NewsletterMetadata {
  /** 구독 경로 (footer, popup, website, api) */
  source?: SubscriptionSource;

  /** 구독 발생 URL 경로 */
  subscribed_from?: string;

  /** User Agent 정보 */
  user_agent?: string;

  /** IP 주소 (익명화 처리) */
  ip_address?: string;

  /** UTM 파라미터 */
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * 구독 경로 타입
 */
export type SubscriptionSource = 'footer' | 'popup' | 'website' | 'api' | 'manual';

/**
 * 뉴스레터 통계 인터페이스
 *
 * 관리자 대시보드용 통계 데이터
 */
export interface NewsletterStats {
  /** 전체 구독자 수 */
  total: number;

  /** 이메일 확인 대기 중 (pending) */
  pending: number;

  /** 이메일 확인 완료 (confirmed) */
  confirmed: number;

  /** 구독 취소 (unsubscribed) */
  unsubscribed: number;

  /** 성장률 (일간/주간/월간 신규 구독자) */
  growth: {
    /** 오늘 신규 구독자 수 */
    daily: number;

    /** 최근 7일 신규 구독자 수 */
    weekly: number;

    /** 최근 30일 신규 구독자 수 */
    monthly: number;
  };

  /** 구독 취소율 (%) */
  churn_rate: number;
}

/**
 * 구독자 목록 필터 인터페이스
 *
 * useNewsletterSubscribers 훅에서 사용
 */
export interface NewsletterFilters {
  /** 상태 필터 */
  status?: NewsletterStatus | 'all';

  /** 이메일 검색어 (부분 일치) */
  search?: string;

  /** 구독일 시작 날짜 */
  dateFrom?: string;

  /** 구독일 종료 날짜 */
  dateTo?: string;

  /** 페이지당 항목 수 */
  limit?: number;

  /** 오프셋 (페이지네이션) */
  offset?: number;

  /** 정렬 필드 */
  orderBy?: 'subscribed_at' | 'email';

  /** 정렬 방향 */
  orderDirection?: 'asc' | 'desc';
}

/**
 * 구독자 목록 응답 인터페이스
 */
export interface NewsletterSubscribersResponse {
  /** 구독자 목록 */
  data: NewsletterSubscriber[];

  /** 전체 구독자 수 (페이지네이션용) */
  count: number | null;
}

/**
 * 구독자 상태 변경 요청
 */
export interface UpdateSubscriberStatusRequest {
  /** 구독자 ID */
  id: string;

  /** 변경할 상태 */
  status: NewsletterStatus;
}

/**
 * 구독자 상태 Badge 색상 매핑
 */
export const NEWSLETTER_STATUS_COLORS: Record<NewsletterStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  unsubscribed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

/**
 * 구독자 상태 레이블 매핑
 */
export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  pending: '확인 대기',
  confirmed: '확인 완료',
  unsubscribed: '구독 취소',
};

/**
 * 구독 경로 레이블 매핑
 */
export const SUBSCRIPTION_SOURCE_LABELS: Record<SubscriptionSource, string> = {
  footer: 'Footer',
  popup: 'Popup',
  website: 'Website',
  api: 'API',
  manual: '수동 추가',
};
