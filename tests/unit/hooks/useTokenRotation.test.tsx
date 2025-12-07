/**
 * useTokenRotation Hook Tests
 *
 * 토큰 자동 갱신 Hook 테스트
 *
 * @module tests/unit/hooks/useTokenRotation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTokenRotation } from '@/hooks/useTokenRotation';
import type { StoredTokens, OAuthTokenResponse } from '@/types/mcp-auth.types';

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
// Hook 테스트
// ============================================================================

describe('useTokenRotation', () => {
  let mockOnRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    // localStorage mock - 로테이션이 필요한 토큰 반환
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'mcp_oauth_tokens') {
        const now = Date.now();
        return JSON.stringify(
          createMockToken({
            created_at: now - 60 * 60 * 1000, // 1시간 전 생성
            expires_at: now + 60 * 1000, // 1분 후 만료 (로테이션 필요)
          })
        );
      }
      return null;
    });

    mockOnRefresh = vi.fn().mockResolvedValue(createMockTokenResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('기본 옵션으로 Hook을 초기화할 수 있어야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.isRotating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('autoStart가 true이면 자동으로 시작해야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: true,
      })
    );

    expect(result.current.isActive).toBe(true);
  });

  it('스케줄러를 수동으로 시작할 수 있어야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.start();
    });

    expect(result.current.isActive).toBe(true);
  });

  it('스케줄러를 중지할 수 있어야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: true,
      })
    );

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('즉시 로테이션을 실행할 수 있어야 함', async () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    act(() => {
      result.current.start();
    });

    await act(async () => {
      await result.current.rotateNow();
    });

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.state.lastRotationAt).toBeGreaterThan(0);
  });

  it('로테이션 완료 시 콜백을 호출해야 함', async () => {
    const onRotationComplete = vi.fn();

    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        onRotationComplete,
        autoStart: false,
      })
    );

    act(() => {
      result.current.start();
    });

    await act(async () => {
      await result.current.rotateNow();
    });

    expect(onRotationComplete).toHaveBeenCalledTimes(1);
  });

  it('로테이션 실패 시 에러 콜백을 호출해야 함', async () => {
    const mockError = new Error('Rotation failed');
    const onRotationError = vi.fn();
    const mockFailingRefresh = vi.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useTokenRotation({
        config: {
          autoRetry: false,
        },
        onRefresh: mockFailingRefresh,
        onRotationError,
        autoStart: false,
      })
    );

    act(() => {
      result.current.start();
    });

    await act(async () => {
      try {
        await result.current.rotateNow();
      } catch {
        // 에러 무시 (콜백 호출 확인이 목적)
      }
    });

    expect(onRotationError).toHaveBeenCalledTimes(1);
  });

  it('언마운트 시 스케줄러를 정리해야 함 (메모리 누수 방지)', () => {
    const { result, unmount } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: true,
      })
    );

    expect(result.current.isActive).toBe(true);

    // 언마운트
    unmount();

    // 스케줄러가 중지되었는지 확인 (타이머가 더 이상 실행되지 않아야 함)
    const callCountBefore = mockOnRefresh.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockOnRefresh.mock.calls.length).toBe(callCountBefore);
  });

  it('needsRotation 플래그를 올바르게 계산해야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    act(() => {
      result.current.start();
    });

    // localStorage mock이 로테이션 필요한 토큰을 반환하므로 true여야 함
    expect(result.current.needsRotation).toBe(true);
  });

  it('커스텀 설정을 사용할 수 있어야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        config: {
          rotationInterval: 500,
          gracePeriod: 60000,
          maxRetries: 5,
        },
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    // 설정이 적용되었는지 확인 (스케줄러가 정상 초기화됨)
    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.start();
    });

    expect(result.current.isActive).toBe(true);
  });

  it('상태를 올바르게 반환해야 함', () => {
    const { result } = renderHook(() =>
      useTokenRotation({
        onRefresh: mockOnRefresh,
        autoStart: false,
      })
    );

    // 초기 상태 확인
    expect(result.current.state).toMatchObject({
      isActive: false,
      isRotating: false,
      lastRotationAt: null,
      retryCount: 0,
      lastError: null,
    });
  });

  it('에러를 상태로 노출해야 함', async () => {
    const mockError = new Error('Test error');
    const mockFailingRefresh = vi.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useTokenRotation({
        config: {
          autoRetry: false,
        },
        onRefresh: mockFailingRefresh,
        autoStart: false,
      })
    );

    act(() => {
      result.current.start();
    });

    await act(async () => {
      try {
        await result.current.rotateNow();
      } catch {
        // 에러 무시
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Test error');
  });
});
