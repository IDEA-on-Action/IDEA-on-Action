/**
 * Token Rotation Types
 *
 * 토큰 자동 갱신(로테이션) 관련 타입 정의
 *
 * @module types/token-rotation
 */

import type { OAuthTokenResponse } from './mcp-auth.types';

// ============================================================================
// 로테이션 설정
// ============================================================================

/**
 * 토큰 로테이션 설정
 */
export interface TokenRotationConfig {
  /** 로테이션 간격 (밀리초, 기본: 1시간) */
  rotationInterval: number;

  /** 토큰 최대 수명 (밀리초, 기본: 24시간) */
  maxTokenAge: number;

  /** 갱신 유예 기간 (밀리초, 기본: 5분) */
  gracePeriod: number;

  /** 자동 재시도 활성화 여부 (기본: true) */
  autoRetry?: boolean;

  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number;

  /** 재시도 지연 배수 (exponential backoff, 기본: 2) */
  retryBackoffMultiplier?: number;

  /** 초기 재시도 지연 (밀리초, 기본: 1000) */
  initialRetryDelay?: number;
}

/**
 * 기본 로테이션 설정
 */
export const DEFAULT_ROTATION_CONFIG: Required<TokenRotationConfig> = {
  rotationInterval: 60 * 60 * 1000, // 1시간
  maxTokenAge: 24 * 60 * 60 * 1000, // 24시간
  gracePeriod: 5 * 60 * 1000, // 5분
  autoRetry: true,
  maxRetries: 3,
  retryBackoffMultiplier: 2,
  initialRetryDelay: 1000,
};

// ============================================================================
// 로테이션 상태
// ============================================================================

/**
 * 로테이션 이벤트 타입
 */
export enum RotationEvent {
  /** 로테이션 스케줄링됨 */
  SCHEDULED = 'scheduled',

  /** 로테이션 시작됨 */
  STARTED = 'started',

  /** 로테이션 완료됨 */
  COMPLETED = 'completed',

  /** 로테이션 실패함 */
  FAILED = 'failed',

  /** 로테이션 취소됨 */
  CANCELLED = 'cancelled',

  /** 재시도 중 */
  RETRYING = 'retrying',

  /** 토큰 검증 실패 */
  VALIDATION_FAILED = 'validation_failed',
}

/**
 * 로테이션 상태
 */
export interface RotationState {
  /** 로테이션 활성화 여부 */
  isActive: boolean;

  /** 현재 로테이션 진행 중 여부 */
  isRotating: boolean;

  /** 마지막 로테이션 시간 */
  lastRotationAt: number | null;

  /** 다음 로테이션 예정 시간 */
  nextRotationAt: number | null;

  /** 현재 재시도 횟수 */
  retryCount: number;

  /** 마지막 에러 */
  lastError: Error | null;

  /** 로테이션 히스토리 (최근 10개) */
  history: RotationHistoryEntry[];
}

/**
 * 로테이션 히스토리 엔트리
 */
export interface RotationHistoryEntry {
  /** 타임스탬프 */
  timestamp: number;

  /** 이벤트 타입 */
  event: RotationEvent;

  /** 성공 여부 */
  success: boolean;

  /** 에러 메시지 (실패 시) */
  error?: string;

  /** 재시도 횟수 */
  retryCount?: number;

  /** 소요 시간 (밀리초) */
  duration?: number;
}

// ============================================================================
// 콜백 타입
// ============================================================================

/**
 * 로테이션 이벤트 콜백
 */
export type RotationCallback = (
  event: RotationEvent,
  data?: RotationCallbackData
) => void | Promise<void>;

/**
 * 로테이션 콜백 데이터
 */
export interface RotationCallbackData {
  /** 새 토큰 (성공 시) */
  newToken?: OAuthTokenResponse;

  /** 에러 (실패 시) */
  error?: Error;

  /** 재시도 횟수 */
  retryCount?: number;

  /** 다음 재시도까지 대기 시간 (밀리초) */
  retryDelay?: number;

  /** 이벤트 타임스탬프 */
  timestamp?: number;
}

// ============================================================================
// 스케줄러 타입
// ============================================================================

/**
 * 토큰 로테이션 스케줄러
 */
export interface TokenRotationScheduler {
  /** 스케줄러 시작 */
  start: () => void;

  /** 스케줄러 중지 */
  stop: () => void;

  /** 즉시 로테이션 실행 */
  rotateNow: () => Promise<void>;

  /** 현재 상태 조회 */
  getState: () => RotationState;

  /** 로테이션 필요 여부 확인 */
  needsRotation: () => boolean;

  /** 이벤트 리스너 등록 */
  on: (event: RotationEvent, callback: RotationCallback) => () => void;
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

/**
 * 토큰 메타데이터
 */
export interface TokenMetadata {
  /** 생성 시간 */
  createdAt: number;

  /** 만료 시간 */
  expiresAt: number;

  /** 토큰 나이 (밀리초) */
  age: number;

  /** 남은 시간 (밀리초) */
  remainingTime: number;

  /** 로테이션 필요 여부 */
  needsRotation: boolean;
}

/**
 * 재시도 전략
 */
export interface RetryStrategy {
  /** 현재 재시도 횟수 */
  attempt: number;

  /** 다음 재시도까지 대기 시간 (밀리초) */
  delay: number;

  /** 재시도 가능 여부 */
  canRetry: boolean;

  /** 다음 재시도 시간 */
  nextRetryAt: number;
}
