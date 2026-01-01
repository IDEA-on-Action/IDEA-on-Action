/**
 * Token Rotation Hook
 *
 * 토큰 자동 갱신 React Hook
 *
 * @module hooks/useTokenRotation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { scheduleRotation, cancelRotation } from '@/lib/auth/token-rotation';
import type {
  TokenRotationConfig,
  TokenRotationScheduler,
  RotationState,
  RotationEvent,
  RotationCallback,
  RotationCallbackData,
} from '@/types/auth/token-rotation.types';
import { RotationEvent as RotationEventEnum } from '@/types/auth/token-rotation.types';
import type { OAuthTokenResponse, StoredTokens } from '@/types/mcp-auth.types';

// ============================================================================
// Hook 타입
// ============================================================================

/**
 * useTokenRotation Hook 옵션
 */
export interface UseTokenRotationOptions {
  /** 로테이션 설정 */
  config?: Partial<TokenRotationConfig>;

  /** 토큰 갱신 함수 */
  onRefresh: (currentToken: StoredTokens) => Promise<OAuthTokenResponse>;

  /** 자동 시작 여부 (기본: true) */
  autoStart?: boolean;

  /** 로테이션 완료 콜백 */
  onRotationComplete?: (newToken: OAuthTokenResponse) => void;

  /** 로테이션 실패 콜백 */
  onRotationError?: (error: Error) => void;

  /** 로테이션 이벤트 콜백 */
  onRotationEvent?: RotationCallback;
}

/**
 * useTokenRotation Hook 반환 타입
 */
export interface UseTokenRotationReturn {
  /** 로테이션 상태 */
  state: RotationState;

  /** 로테이션 진행 중 여부 */
  isRotating: boolean;

  /** 스케줄러 활성화 여부 */
  isActive: boolean;

  /** 마지막 에러 */
  error: Error | null;

  /** 스케줄러 시작 */
  start: () => void;

  /** 스케줄러 중지 */
  stop: () => void;

  /** 즉시 로테이션 실행 */
  rotateNow: () => Promise<void>;

  /** 로테이션 필요 여부 */
  needsRotation: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * 토큰 자동 갱신 Hook
 *
 * 백그라운드에서 토큰을 자동으로 갱신하는 React Hook입니다.
 * 사용자 인터럽트 없이 토큰을 갱신하고, 실패 시 자동 재시도합니다.
 *
 * @param options - Hook 옵션
 * @returns UseTokenRotationReturn
 *
 * @example
 * ```tsx
 * function App() {
 *   const { refreshToken } = useMCPToken();
 *
 *   const rotation = useTokenRotation({
 *     config: {
 *       rotationInterval: 3600000, // 1시간
 *       gracePeriod: 300000, // 5분
 *     },
 *     onRefresh: async (currentToken) => {
 *       return await refreshToken(currentToken.refresh_token);
 *     },
 *     onRotationComplete: (newToken) => {
 *       console.log('Token rotated successfully:', newToken);
 *     },
 *     onRotationError: (error) => {
 *       console.error('Token rotation failed:', error);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <p>Rotation active: {rotation.isActive}</p>
 *       <p>Rotating: {rotation.isRotating}</p>
 *       <button onClick={rotation.start}>Start</button>
 *       <button onClick={rotation.stop}>Stop</button>
 *       <button onClick={rotation.rotateNow}>Rotate Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTokenRotation(options: UseTokenRotationOptions): UseTokenRotationReturn {
  const {
    config,
    onRefresh,
    autoStart = true,
    onRotationComplete,
    onRotationError,
    onRotationEvent,
  } = options;

  // 스케줄러 참조 (메모리 누수 방지)
  const schedulerRef = useRef<TokenRotationScheduler | null>(null);

  // 상태
  const [state, setState] = useState<RotationState>({
    isActive: false,
    isRotating: false,
    lastRotationAt: null,
    nextRotationAt: null,
    retryCount: 0,
    lastError: null,
    history: [],
  });

  // 이벤트 핸들러
  const handleRotationEvent = useCallback(
    (event: RotationEvent, data?: RotationCallbackData): void => {
      // 상태 업데이트
      if (schedulerRef.current) {
        setState(schedulerRef.current.getState());
      }

      // 외부 콜백 호출
      onRotationEvent?.(event, data);

      // 특정 이벤트 처리
      switch (event) {
        case RotationEventEnum.COMPLETED:
          if (data?.newToken) {
            onRotationComplete?.(data.newToken);
          }
          break;

        case RotationEventEnum.FAILED:
          if (data?.error) {
            onRotationError?.(data.error);
          }
          break;
      }
    },
    [onRotationComplete, onRotationError, onRotationEvent]
  );

  // 스케줄러 초기화
  useEffect(() => {
    // 스케줄러 생성
    const scheduler = scheduleRotation(config || {}, onRefresh);

    // 이벤트 리스너 등록
    const unsubscribers = [
      scheduler.on(RotationEventEnum.SCHEDULED, handleRotationEvent),
      scheduler.on(RotationEventEnum.STARTED, handleRotationEvent),
      scheduler.on(RotationEventEnum.COMPLETED, handleRotationEvent),
      scheduler.on(RotationEventEnum.FAILED, handleRotationEvent),
      scheduler.on(RotationEventEnum.CANCELLED, handleRotationEvent),
      scheduler.on(RotationEventEnum.RETRYING, handleRotationEvent),
      scheduler.on(RotationEventEnum.VALIDATION_FAILED, handleRotationEvent),
    ];

    schedulerRef.current = scheduler;

    // 자동 시작
    if (autoStart) {
      scheduler.start();
      setState(scheduler.getState());
    }

    // Cleanup: 스케줄러 중지 및 리스너 제거
    return () => {
      if (schedulerRef.current) {
        cancelRotation(schedulerRef.current);
        schedulerRef.current = null;
      }

      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // 스케줄러 제어 함수
  const start = useCallback(() => {
    if (!schedulerRef.current) {
      console.warn('[useTokenRotation] Scheduler not initialized');
      return;
    }

    schedulerRef.current.start();
    setState(schedulerRef.current.getState());
  }, []);

  const stop = useCallback(() => {
    if (!schedulerRef.current) {
      console.warn('[useTokenRotation] Scheduler not initialized');
      return;
    }

    schedulerRef.current.stop();
    setState(schedulerRef.current.getState());
  }, []);

  const rotateNow = useCallback(async () => {
    if (!schedulerRef.current) {
      throw new Error('Scheduler not initialized');
    }

    await schedulerRef.current.rotateNow();
    setState(schedulerRef.current.getState());
  }, []);

  // 파생 상태
  const isRotating = state.isRotating;
  const isActive = state.isActive;
  const error = state.lastError;
  const needsRotation = schedulerRef.current?.needsRotation() || false;

  return {
    state,
    isRotating,
    isActive,
    error,
    start,
    stop,
    rotateNow,
    needsRotation,
  };
}

export default useTokenRotation;
