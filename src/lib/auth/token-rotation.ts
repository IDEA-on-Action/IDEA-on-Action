/**
 * Token Rotation Library
 *
 * 토큰 자동 갱신(로테이션) 스케줄러 및 유틸리티
 *
 * @module lib/auth/token-rotation
 */

import type { OAuthTokenResponse, StoredTokens } from '@/types/mcp-auth.types';
import type {
  TokenRotationConfig,
  TokenRotationScheduler,
  RotationState,
  RotationEvent,
  RotationCallback,
  RotationHistoryEntry,
  RotationCallbackData,
  TokenMetadata,
  RetryStrategy,
} from '@/types/auth/token-rotation.types';
import { DEFAULT_ROTATION_CONFIG } from '@/types/auth/token-rotation.types';
import { RotationEvent as RotationEventEnum } from '@/types/auth/token-rotation.types';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 토큰 메타데이터 추출
 */
export function getTokenMetadata(
  token: StoredTokens,
  config: TokenRotationConfig = DEFAULT_ROTATION_CONFIG
): TokenMetadata {
  const now = Date.now();
  const createdAt = token.created_at;
  const expiresAt = token.expires_at;
  const age = now - createdAt;
  const remainingTime = expiresAt - now;
  const needsRotation = remainingTime <= config.gracePeriod || age >= config.maxTokenAge;

  return {
    createdAt,
    expiresAt,
    age,
    remainingTime,
    needsRotation,
  };
}

/**
 * 로테이션 필요 여부 확인
 */
export function isRotationNeeded(
  token: StoredTokens | null,
  config: TokenRotationConfig = DEFAULT_ROTATION_CONFIG
): boolean {
  if (!token) return false;

  const metadata = getTokenMetadata(token, config);
  return metadata.needsRotation;
}

/**
 * 재시도 전략 계산 (Exponential Backoff)
 */
export function calculateRetryStrategy(
  attempt: number,
  config: Required<TokenRotationConfig>
): RetryStrategy {
  const canRetry = attempt < config.maxRetries;
  const delay = canRetry
    ? config.initialRetryDelay * Math.pow(config.retryBackoffMultiplier, attempt)
    : 0;
  const nextRetryAt = canRetry ? Date.now() + delay : 0;

  return {
    attempt,
    delay,
    canRetry,
    nextRetryAt,
  };
}

// ============================================================================
// 토큰 로테이션 스케줄러
// ============================================================================

/**
 * 토큰 로테이션 스케줄러 생성
 *
 * @param config - 로테이션 설정
 * @param onRotate - 로테이션 실행 함수 (현재 토큰을 받아 새 토큰 반환)
 * @returns TokenRotationScheduler
 *
 * @example
 * ```ts
 * const scheduler = scheduleRotation(
 *   { rotationInterval: 3600000 },
 *   async (currentToken) => {
 *     const response = await fetch('/refresh', {
 *       method: 'POST',
 *       body: JSON.stringify({ refresh_token: currentToken.refresh_token }),
 *     });
 *     return response.json();
 *   }
 * );
 *
 * scheduler.start();
 * ```
 */
export function scheduleRotation(
  config: Partial<TokenRotationConfig>,
  onRotate: (currentToken: StoredTokens) => Promise<OAuthTokenResponse>
): TokenRotationScheduler {
  // 설정 병합
  const mergedConfig: Required<TokenRotationConfig> = {
    ...DEFAULT_ROTATION_CONFIG,
    ...config,
  };

  // 상태
  const state: RotationState = {
    isActive: false,
    isRotating: false,
    lastRotationAt: null,
    nextRotationAt: null,
    retryCount: 0,
    lastError: null,
    history: [],
  };

  // 이벤트 리스너
  const listeners = new Map<RotationEvent, Set<RotationCallback>>();

  // 타이머 ID
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let retryTimerId: ReturnType<typeof setTimeout> | null = null;

  // 이벤트 발행
  const emit = (event: RotationEvent, data?: RotationCallbackData): void => {
    const callbacks = listeners.get(event);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[TokenRotation] Event callback error:', error);
      }
    });
  };

  // 히스토리 추가
  const addHistory = (entry: RotationHistoryEntry): void => {
    state.history.unshift(entry);
    if (state.history.length > 10) {
      state.history = state.history.slice(0, 10);
    }
  };

  // 로테이션 실행
  const executeRotation = async (currentToken: StoredTokens): Promise<void> => {
    if (state.isRotating) {
      console.warn('[TokenRotation] Rotation already in progress');
      return;
    }

    state.isRotating = true;
    const startTime = Date.now();

    emit(RotationEventEnum.STARTED, { timestamp: startTime });

    try {
      // 토큰 갱신 실행
      const newToken = await onRotate(currentToken);

      // 성공
      state.lastRotationAt = Date.now();
      state.retryCount = 0;
      state.lastError = null;

      const duration = Date.now() - startTime;

      addHistory({
        timestamp: state.lastRotationAt,
        event: RotationEventEnum.COMPLETED,
        success: true,
        duration,
      });

      emit(RotationEventEnum.COMPLETED, {
        newToken,
        timestamp: state.lastRotationAt,
      });
    } catch (error) {
      // 실패
      const err = error instanceof Error ? error : new Error(String(error));
      state.lastError = err;
      state.retryCount++;

      const duration = Date.now() - startTime;

      addHistory({
        timestamp: Date.now(),
        event: RotationEventEnum.FAILED,
        success: false,
        error: err.message,
        retryCount: state.retryCount,
        duration,
      });

      emit(RotationEventEnum.FAILED, {
        error: err,
        retryCount: state.retryCount,
        timestamp: Date.now(),
      });

      // 재시도 전략 계산
      if (mergedConfig.autoRetry) {
        const strategy = calculateRetryStrategy(state.retryCount - 1, mergedConfig);

        if (strategy.canRetry) {
          emit(RotationEventEnum.RETRYING, {
            retryCount: state.retryCount,
            retryDelay: strategy.delay,
            timestamp: Date.now(),
          });

          // 재시도 스케줄링
          retryTimerId = setTimeout(async () => {
            try {
              await executeRotation(currentToken);
            } catch (error) {
              // 최종 재시도 실패, 이벤트는 이미 발행됨
              console.error('[TokenRotation] Final retry failed:', error);
            }
          }, strategy.delay);

          return;
        }
      }

      throw err;
    } finally {
      state.isRotating = false;
    }
  };

  // 로테이션 체크 및 실행
  const checkAndRotate = async (currentToken: StoredTokens | null): Promise<void> => {
    if (!currentToken) {
      console.warn('[TokenRotation] No token available for rotation');
      return;
    }

    if (isRotationNeeded(currentToken, mergedConfig)) {
      await executeRotation(currentToken);
    }
  };

  // 다음 로테이션 스케줄링
  const scheduleNext = (getCurrentToken: () => StoredTokens | null): void => {
    if (!state.isActive) return;

    // 기존 타이머 취소
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }

    state.nextRotationAt = Date.now() + mergedConfig.rotationInterval;

    emit(RotationEventEnum.SCHEDULED, {
      timestamp: state.nextRotationAt,
    });

    timerId = setTimeout(async () => {
      const token = getCurrentToken();
      try {
        await checkAndRotate(token);
      } catch (error) {
        // 에러는 이미 이벤트로 발행됨, 로깅만 수행
        console.error('[TokenRotation] Rotation failed:', error);
      }
      scheduleNext(getCurrentToken);
    }, mergedConfig.rotationInterval);
  };

  // 스케줄러 시작 (현재 토큰을 가져오는 함수를 내부에서 정의)
  let getToken: (() => StoredTokens | null) | null = null;

  const scheduler: TokenRotationScheduler = {
    start: () => {
      if (state.isActive) {
        console.warn('[TokenRotation] Scheduler already active');
        return;
      }

      state.isActive = true;

      // 토큰을 가져오는 함수 (외부에서 주입 필요)
      // 실제로는 localStorage에서 읽거나 상태에서 가져옴
      getToken = (): StoredTokens | null => {
        try {
          const stored = localStorage.getItem('mcp_oauth_tokens');
          if (!stored) return null;
          return JSON.parse(stored) as StoredTokens;
        } catch {
          return null;
        }
      };

      scheduleNext(getToken);
    },

    stop: () => {
      if (!state.isActive) {
        console.warn('[TokenRotation] Scheduler not active');
        return;
      }

      state.isActive = false;

      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      if (retryTimerId !== null) {
        clearTimeout(retryTimerId);
        retryTimerId = null;
      }

      state.nextRotationAt = null;

      emit(RotationEventEnum.CANCELLED, {
        timestamp: Date.now(),
      });
    },

    rotateNow: async () => {
      const token = getToken ? getToken() : null;

      if (!token) {
        throw new Error('No token available for immediate rotation');
      }

      await executeRotation(token);

      // 다음 로테이션 재스케줄링
      if (state.isActive && getToken) {
        scheduleNext(getToken);
      }
    },

    getState: () => ({ ...state }),

    needsRotation: () => {
      const token = getToken ? getToken() : null;
      return isRotationNeeded(token, mergedConfig);
    },

    on: (event: RotationEvent, callback: RotationCallback) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)!.add(callback);

      // 리스너 제거 함수 반환
      return () => {
        listeners.get(event)?.delete(callback);
      };
    },
  };

  return scheduler;
}

/**
 * 토큰 로테이션 실행 (단일 실행)
 *
 * @param currentToken - 현재 토큰
 * @param refreshFn - 토큰 갱신 함수
 * @returns 새 토큰
 */
export async function rotateToken(
  currentToken: StoredTokens,
  refreshFn: (refreshToken: string) => Promise<OAuthTokenResponse>
): Promise<OAuthTokenResponse> {
  if (!currentToken.refresh_token) {
    throw new Error('No refresh token available');
  }

  return refreshFn(currentToken.refresh_token);
}

/**
 * 스케줄러 취소
 *
 * @param scheduler - 취소할 스케줄러
 */
export function cancelRotation(scheduler: TokenRotationScheduler): void {
  scheduler.stop();
}
