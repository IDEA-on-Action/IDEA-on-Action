/**
 * Rate Limiting 타입 정의
 * @module types/rate-limit
 * @description API 호출 제한을 위한 타입 및 인터페이스
 */

/**
 * Rate Limit 전략
 * @description 다양한 속도 제한 알고리즘
 */
export enum RateLimitStrategy {
  /** 고정 윈도우: 시간 창마다 고정된 요청 수 허용 */
  FIXED_WINDOW = 'fixed-window',
  /** 슬라이딩 윈도우: 시간에 따라 움직이는 윈도우 */
  SLIDING_WINDOW = 'sliding-window',
  /** 토큰 버킷: 일정 속도로 토큰 보충, 버스트 허용 */
  TOKEN_BUCKET = 'token-bucket',
}

/**
 * Rate Limit 키 타입
 * @description 제한을 적용할 대상
 */
export type RateLimitKey = 'user' | 'ip' | 'endpoint';

/**
 * Rate Limit 설정
 * @interface RateLimitConfig
 */
export interface RateLimitConfig {
  /** 최대 요청 수 (기본: 100) */
  maxRequests: number;

  /** 시간 창 (밀리초) (기본: 60000 = 1분) */
  windowMs: number;

  /** 키 접두사 (Redis 키 구분용) */
  keyPrefix?: string;

  /** Rate Limit 전략 (기본: FIXED_WINDOW) */
  strategy?: RateLimitStrategy;

  /** 토큰 버킷용: 토큰 보충 속도 (초당 토큰 수) */
  refillRate?: number;

  /** 토큰 버킷용: 최대 버킷 크기 */
  bucketSize?: number;

  /** 슬라이딩 윈도우용: 윈도우 세그먼트 수 */
  segments?: number;

  /** Redis 사용 여부 (기본: false, 메모리 사용) */
  useRedis?: boolean;

  /** Redis 연결 정보 */
  redisUrl?: string;

  /** 에러 메시지 커스터마이징 */
  errorMessage?: string;

  /** 헤더에 제한 정보 포함 여부 (기본: true) */
  includeHeaders?: boolean;

  /** IP 기반 제한 활성화 (기본: false) */
  enableIpLimit?: boolean;

  /** 사용자 기반 제한 활성화 (기본: true) */
  enableUserLimit?: boolean;

  /** 엔드포인트 기반 제한 활성화 (기본: false) */
  enableEndpointLimit?: false;
}

/**
 * Rate Limit 확인 결과
 * @interface RateLimitResult
 */
export interface RateLimitResult {
  /** 요청 허용 여부 */
  allowed: boolean;

  /** 남은 요청 수 */
  remaining: number;

  /** 제한 초기화 시간 (Unix timestamp) */
  resetAt: number;

  /** 현재 요청 수 */
  current?: number;

  /** 최대 허용 요청 수 */
  limit?: number;

  /** 다음 요청까지 대기 시간 (밀리초) */
  retryAfter?: number;
}

/**
 * Rate Limit 상태 정보
 * @interface RateLimitStatus
 */
export interface RateLimitStatus {
  /** 키 (user_id, ip, endpoint 등) */
  key: string;

  /** 키 타입 */
  keyType: RateLimitKey;

  /** 현재 요청 수 */
  count: number;

  /** 최대 허용 요청 수 */
  limit: number;

  /** 윈도우 시작 시간 (Unix timestamp) */
  windowStart: number;

  /** 윈도우 종료 시간 (Unix timestamp) */
  windowEnd: number;

  /** 첫 요청 시간 (Unix timestamp) */
  firstRequestAt?: number;

  /** 마지막 요청 시간 (Unix timestamp) */
  lastRequestAt?: number;
}

/**
 * Rate Limit 에러
 * @interface RateLimitError
 */
export interface RateLimitError extends Error {
  /** HTTP 상태 코드 (429) */
  statusCode: 429;

  /** 에러 타입 */
  type: 'RATE_LIMIT_EXCEEDED';

  /** Rate Limit 상태 정보 */
  status: RateLimitStatus;

  /** 재시도 가능 시간 (Unix timestamp) */
  retryAfter: number;
}

/**
 * Rate Limit 메트릭
 * @interface RateLimitMetrics
 */
export interface RateLimitMetrics {
  /** 총 요청 수 */
  totalRequests: number;

  /** 허용된 요청 수 */
  allowedRequests: number;

  /** 차단된 요청 수 */
  blockedRequests: number;

  /** 차단률 (0-1) */
  blockRate: number;

  /** 키별 통계 */
  byKey: Record<string, {
    requests: number;
    blocked: number;
    lastRequestAt: number;
  }>;

  /** 수집 시작 시간 (Unix timestamp) */
  collectionStartedAt: number;

  /** 마지막 업데이트 시간 (Unix timestamp) */
  lastUpdatedAt: number;
}

/**
 * Rate Limit 미들웨어 옵션
 * @interface RateLimitMiddlewareOptions
 */
export interface RateLimitMiddlewareOptions extends RateLimitConfig {
  /** 키 추출 함수 */
  keyGenerator?: (request: Request) => string | Promise<string>;

  /** Skip 조건 함수 */
  skip?: (request: Request) => boolean | Promise<boolean>;

  /** 제한 초과 시 핸들러 */
  onLimitExceeded?: (request: Request, status: RateLimitStatus) => void | Promise<void>;

  /** 요청 성공 시 핸들러 */
  onRequest?: (request: Request, status: RateLimitStatus) => void | Promise<void>;
}

/**
 * Rate Limit 저장소 인터페이스
 * @description 메모리 또는 Redis 저장소 추상화
 */
export interface RateLimitStore {
  /** 요청 카운트 증가 */
  increment(key: string, windowMs: number): Promise<RateLimitStatus>;

  /** 상태 조회 */
  get(key: string): Promise<RateLimitStatus | null>;

  /** 상태 초기화 */
  reset(key: string): Promise<void>;

  /** 만료된 데이터 정리 */
  cleanup(): Promise<void>;
}
