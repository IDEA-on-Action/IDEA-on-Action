/**
 * Token Rotation Library Tests
 *
 * 토큰 로테이션 스케줄러 및 유틸리티 테스트
 *
 * @module tests/unit/lib/token-rotation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTokenMetadata,
  isRotationNeeded,
  calculateRetryStrategy,
  scheduleRotation,
  rotateToken,
  cancelRotation,
} from '@/lib/auth/token-rotation';
import {
  DEFAULT_ROTATION_CONFIG,
  RotationEvent,
} from '@/types/token-rotation.types';
import type {
  TokenRotationConfig,
  TokenRotationScheduler,
} from '@/types/token-rotation.types';
import type { StoredTokens, OAuthTokenResponse } from '@/types/auth/mcp-auth.types';

// ============================================================================
// Mock 데이터
// ============================================================================

const createMockToken = (overrides?: Partial<StoredTokens>): StoredTokens => ({
  access_token: 'mock_access_token',
  refresh_token: 'mock_refresh_token',
  expires_at: Date.now() + 3600000, // 1시간 후
  token_type: 'Bearer',
  scope: 'read write',
  created_at: Date.now(),
  ...overrides,
});

const createMockTokenResponse = (): OAuthTokenResponse => ({
  access_token: 'new_access_token',
  refresh_token: 'new_refresh_token',
  expires_in: 3600,
  token_type: 'Bearer',
  scope: 'read write',
});

// ============================================================================
// 유틸리티 함수 테스트
// ============================================================================

describe('getTokenMetadata', () => {
  it('토큰의 메타데이터를 올바르게 추출해야 함', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 1000,
      expires_at: now + 3600000,
    });

    const metadata = getTokenMetadata(token);

    expect(metadata.createdAt).toBe(token.created_at);
    expect(metadata.expiresAt).toBe(token.expires_at);
    expect(metadata.age).toBeGreaterThanOrEqual(1000);
    expect(metadata.remainingTime).toBeLessThanOrEqual(3600000);
  });

  it('로테이션이 필요한 경우를 올바르게 판단해야 함 (남은 시간 < 유예 기간)', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 3600000,
      expires_at: now + 60000, // 1분 후 만료 (유예 기간 5분 미만)
    });

    const metadata = getTokenMetadata(token);

    expect(metadata.needsRotation).toBe(true);
  });

  it('로테이션이 필요한 경우를 올바르게 판단해야 함 (토큰 나이 > 최대 수명)', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 25 * 60 * 60 * 1000, // 25시간 전
      expires_at: now + 3600000,
    });

    const metadata = getTokenMetadata(token);

    expect(metadata.needsRotation).toBe(true);
  });

  it('로테이션이 필요하지 않은 경우를 올바르게 판단해야 함', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 1000,
      expires_at: now + 3600000, // 1시간 후 만료
    });

    const metadata = getTokenMetadata(token);

    expect(metadata.needsRotation).toBe(false);
  });
});

describe('isRotationNeeded', () => {
  it('null 토큰인 경우 false를 반환해야 함', () => {
    expect(isRotationNeeded(null)).toBe(false);
  });

  it('로테이션이 필요한 토큰인 경우 true를 반환해야 함', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 3600000,
      expires_at: now + 60000, // 1분 후
    });

    expect(isRotationNeeded(token)).toBe(true);
  });

  it('로테이션이 필요하지 않은 토큰인 경우 false를 반환해야 함', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 1000,
      expires_at: now + 3600000, // 1시간 후
    });

    expect(isRotationNeeded(token)).toBe(false);
  });

  it('커스텀 설정을 사용할 수 있어야 함', () => {
    const now = Date.now();
    const token = createMockToken({
      created_at: now - 1000,
      expires_at: now + 600000, // 10분 후
    });

    const customConfig: TokenRotationConfig = {
      ...DEFAULT_ROTATION_CONFIG,
      gracePeriod: 15 * 60 * 1000, // 15분
    };

    expect(isRotationNeeded(token, customConfig)).toBe(true);
  });
});

describe('calculateRetryStrategy', () => {
  it('재시도 가능한 경우 올바른 전략을 반환해야 함', () => {
    const config = { ...DEFAULT_ROTATION_CONFIG };
    const strategy = calculateRetryStrategy(0, config);

    expect(strategy.attempt).toBe(0);
    expect(strategy.canRetry).toBe(true);
    expect(strategy.delay).toBe(1000); // initialRetryDelay
    expect(strategy.nextRetryAt).toBeGreaterThan(Date.now());
  });

  it('Exponential Backoff가 올바르게 작동해야 함', () => {
    const config = { ...DEFAULT_ROTATION_CONFIG };

    const strategy1 = calculateRetryStrategy(0, config);
    const strategy2 = calculateRetryStrategy(1, config);
    const strategy3 = calculateRetryStrategy(2, config);

    expect(strategy1.delay).toBe(1000); // 1 * 2^0
    expect(strategy2.delay).toBe(2000); // 1 * 2^1
    expect(strategy3.delay).toBe(4000); // 1 * 2^2
  });

  it('최대 재시도 횟수를 초과하면 재시도 불가능해야 함', () => {
    const config = { ...DEFAULT_ROTATION_CONFIG, maxRetries: 3 };
    const strategy = calculateRetryStrategy(3, config);

    expect(strategy.canRetry).toBe(false);
    expect(strategy.delay).toBe(0);
    expect(strategy.nextRetryAt).toBe(0);
  });

  it('커스텀 backoff multiplier가 작동해야 함', () => {
    const config = {
      ...DEFAULT_ROTATION_CONFIG,
      retryBackoffMultiplier: 3,
    };

    const strategy1 = calculateRetryStrategy(0, config);
    const strategy2 = calculateRetryStrategy(1, config);

    expect(strategy1.delay).toBe(1000); // 1 * 3^0
    expect(strategy2.delay).toBe(3000); // 1 * 3^1
  });
});

// ============================================================================
// 스케줄러 테스트
// ============================================================================

describe('scheduleRotation', () => {
  let scheduler: TokenRotationScheduler;
  let mockOnRotate: ReturnType<typeof vi.fn>;
  let originalLocalStorage: Storage;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();

    // localStorage mock 설정
    originalLocalStorage = window.localStorage;
    mockLocalStorage = {};
    const now = Date.now();
    mockLocalStorage['mcp_oauth_tokens'] = JSON.stringify(
      createMockToken({
        created_at: now - 60 * 60 * 1000, // 1시간 전 생성
        expires_at: now + 60 * 1000, // 1분 후 만료 (로테이션 필요)
      })
    );

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
        removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
        clear: vi.fn(() => { mockLocalStorage = {}; }),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockOnRotate = vi.fn().mockResolvedValue(createMockTokenResponse());
  });

  afterEach(() => {
    if (scheduler) {
      cancelRotation(scheduler);
    }
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('스케줄러를 생성하고 시작할 수 있어야 함', () => {
    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    expect(scheduler.getState().isActive).toBe(false);

    scheduler.start();

    expect(scheduler.getState().isActive).toBe(true);
    expect(scheduler.getState().nextRotationAt).toBeGreaterThan(Date.now());
  });

  it('스케줄러를 중지할 수 있어야 함', () => {
    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    scheduler.start();
    expect(scheduler.getState().isActive).toBe(true);

    scheduler.stop();
    expect(scheduler.getState().isActive).toBe(false);
    expect(scheduler.getState().nextRotationAt).toBe(null);
  });

  it('설정된 간격마다 로테이션을 실행해야 함', async () => {
    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    scheduler.start();

    // 1초 후
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockOnRotate).toHaveBeenCalledTimes(1);

    // 추가 1초 후
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockOnRotate).toHaveBeenCalledTimes(2);
  });

  it('즉시 로테이션을 실행할 수 있어야 함', async () => {
    scheduler = scheduleRotation({ rotationInterval: 10000 }, mockOnRotate);

    scheduler.start();

    expect(mockOnRotate).not.toHaveBeenCalled();

    await scheduler.rotateNow();

    expect(mockOnRotate).toHaveBeenCalledTimes(1);
  });

  it('로테이션 이벤트를 발행해야 함', async () => {
    const onScheduled = vi.fn();
    const onStarted = vi.fn();
    const onCompleted = vi.fn();

    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    scheduler.on(RotationEvent.SCHEDULED, onScheduled);
    scheduler.on(RotationEvent.STARTED, onStarted);
    scheduler.on(RotationEvent.COMPLETED, onCompleted);

    scheduler.start();

    expect(onScheduled).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('로테이션 실패 시 재시도해야 함', async () => {
    const mockError = new Error('Rotation failed');
    mockOnRotate = vi
      .fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(createMockTokenResponse());

    const onFailed = vi.fn();
    const onRetrying = vi.fn();
    const onCompleted = vi.fn();

    scheduler = scheduleRotation(
      {
        rotationInterval: 10000,
        autoRetry: true,
        maxRetries: 3,
        initialRetryDelay: 1000,
      },
      mockOnRotate
    );

    scheduler.on(RotationEvent.FAILED, onFailed);
    scheduler.on(RotationEvent.RETRYING, onRetrying);
    scheduler.on(RotationEvent.COMPLETED, onCompleted);

    scheduler.start();

    // 첫 실행 (실패)
    await vi.advanceTimersByTimeAsync(10000);

    expect(mockOnRotate).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onRetrying).toHaveBeenCalledTimes(1);

    // 재시도 (성공)
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockOnRotate).toHaveBeenCalledTimes(2);
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('최대 재시도 횟수를 초과하면 에러를 throw해야 함', async () => {
    const mockError = new Error('Persistent failure');
    mockOnRotate = vi.fn().mockRejectedValue(mockError);

    const onFailed = vi.fn();

    scheduler = scheduleRotation(
      {
        rotationInterval: 10000,
        autoRetry: true,
        maxRetries: 2,
        initialRetryDelay: 500,
      },
      mockOnRotate
    );

    scheduler.on(RotationEvent.FAILED, onFailed);

    scheduler.start();

    // 첫 실행 (실패)
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockOnRotate).toHaveBeenCalledTimes(1);

    // 재시도 1 (실패)
    await vi.advanceTimersByTimeAsync(500);
    expect(mockOnRotate).toHaveBeenCalledTimes(2);

    // 재시도 2 (실패)
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockOnRotate).toHaveBeenCalledTimes(3);

    // 최대 재시도 초과
    expect(onFailed).toHaveBeenCalledTimes(3);
    expect(scheduler.getState().retryCount).toBe(3);
  });

  it('이벤트 리스너를 해제할 수 있어야 함', async () => {
    const onCompleted = vi.fn();

    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    const unsubscribe = scheduler.on(RotationEvent.COMPLETED, onCompleted);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onCompleted).toHaveBeenCalledTimes(1);

    // 리스너 해제
    unsubscribe();

    await vi.advanceTimersByTimeAsync(1000);

    // 더 이상 호출되지 않아야 함
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('로테이션 히스토리를 기록해야 함', async () => {
    scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);

    const state = scheduler.getState();

    expect(state.history.length).toBe(1);
    expect(state.history[0].event).toBe(RotationEvent.COMPLETED);
    expect(state.history[0].success).toBe(true);
    expect(state.history[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('히스토리는 최대 10개까지만 유지되어야 함', async () => {
    scheduler = scheduleRotation({ rotationInterval: 100 }, mockOnRotate);

    scheduler.start();

    // 15번 로테이션 실행
    for (let i = 0; i < 15; i++) {
      await vi.advanceTimersByTimeAsync(100);
    }

    const state = scheduler.getState();

    expect(state.history.length).toBe(10);
  });
});

describe('rotateToken', () => {
  it('refresh token을 사용하여 새 토큰을 발급받아야 함', async () => {
    const currentToken = createMockToken();
    const mockRefreshFn = vi.fn().mockResolvedValue(createMockTokenResponse());

    const newToken = await rotateToken(currentToken, mockRefreshFn);

    expect(mockRefreshFn).toHaveBeenCalledWith(currentToken.refresh_token);
    expect(newToken.access_token).toBe('new_access_token');
  });

  it('refresh token이 없으면 에러를 throw해야 함', async () => {
    const currentToken = createMockToken({ refresh_token: undefined });
    const mockRefreshFn = vi.fn();

    await expect(rotateToken(currentToken, mockRefreshFn)).rejects.toThrow(
      'No refresh token available'
    );
  });
});

describe('cancelRotation', () => {
  it('스케줄러를 취소해야 함', () => {
    vi.useFakeTimers();

    const mockOnRotate = vi.fn().mockResolvedValue(createMockTokenResponse());
    const scheduler = scheduleRotation({ rotationInterval: 1000 }, mockOnRotate);

    scheduler.start();
    expect(scheduler.getState().isActive).toBe(true);

    cancelRotation(scheduler);
    expect(scheduler.getState().isActive).toBe(false);

    vi.useRealTimers();
  });
});
