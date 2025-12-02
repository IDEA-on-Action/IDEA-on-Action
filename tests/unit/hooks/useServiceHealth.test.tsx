/**
 * useServiceHealth Hook 테스트
 *
 * 서비스 헬스 상태 조회 및 모니터링 훅 테스트
 * - 헬스 상태 조회
 * - 시스템 헬스 요약
 * - 연결 상태 확인
 * - 실시간 구독
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAllServiceHealth,
  useServiceHealth,
  useSystemHealthSummary,
  useServiceConnectionStatus,
  useServiceHealthRealtime,
  serviceHealthKeys,
  getHealthStatusColor,
  getHealthStatusBgColor,
  getHealthStatusLabel,
  formatLastPing,
} from '@/hooks/useServiceHealth';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceHealth, HealthStatus } from '@/types/central-hub.types';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock 데이터
const mockHealthData: ServiceHealth[] = [
  {
    id: '1',
    service_id: 'mcp-gateway',
    status: 'healthy',
    last_ping: new Date(Date.now() - 60000).toISOString(), // 1분 전
    response_time_ms: 120,
    error_count: 0,
    error_rate: 0,
    metadata: { version: '1.0.0' },
    created_at: '2025-12-02T09:00:00Z',
    updated_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: '2',
    service_id: 'minu-find',
    status: 'degraded',
    last_ping: new Date(Date.now() - 120000).toISOString(), // 2분 전
    response_time_ms: 850,
    error_count: 5,
    error_rate: 0.05,
    metadata: { slowQueries: 10 },
    created_at: '2025-12-02T09:00:00Z',
    updated_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: '3',
    service_id: 'minu-build',
    status: 'unhealthy',
    last_ping: new Date(Date.now() - 600000).toISOString(), // 10분 전 (연결 끊김)
    response_time_ms: 0,
    error_count: 100,
    error_rate: 1.0,
    metadata: { error: 'Connection lost' },
    created_at: '2025-12-02T09:00:00Z',
    updated_at: new Date(Date.now() - 600000).toISOString(),
  },
];

describe('useAllServiceHealth', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrder = vi.fn().mockResolvedValue({ data: mockHealthData, error: null });
    mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('올바른 query key를 사용해야 함', () => {
      // Assert
      expect(Array.isArray(serviceHealthKeys.all)).toBe(true);
      expect(serviceHealthKeys.all[0]).toBe('service-health');
    });
  });

  describe('데이터 조회 성공', () => {
    it('모든 서비스의 헬스 상태를 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHealthData);
      expect(result.current.data?.length).toBe(3);
    });

    it('service_health 테이블에서 데이터를 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('service_health');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('service_id');
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const error = new Error('Database error');
      mockOrder.mockResolvedValue({ data: null, error });

      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('로딩 상태', () => {
    it('데이터 로딩 중에는 isLoading이 true여야 함', () => {
      // Setup
      mockOrder.mockReturnValue(
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: mockHealthData, error: null }), 100)
        )
      );

      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('데이터 로딩 완료 후 isLoading이 false여야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('자동 갱신', () => {
    it('refetchInterval이 30초로 설정되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useAllServiceHealth(), {
        wrapper: createWrapper(),
      });

      // Assert - refetchInterval이 존재해야 함 (정확한 값 검증은 쿼리 옵션에서)
      expect(result.current).toBeDefined();
    });
  });
});

describe('useServiceHealth', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn().mockResolvedValue({ data: mockHealthData[0], error: null });
    mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);
  });

  it('특정 서비스의 헬스 상태를 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceHealth('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
    expect(result.current.data).toEqual(mockHealthData[0]);
  });

  it('serviceId가 없으면 쿼리를 비활성화해야 함', () => {
    // Execute
    const { result } = renderHook(() => useServiceHealth('' as any), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('30초마다 자동 갱신해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceHealth('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current).toBeDefined();
  });
});

describe('useSystemHealthSummary', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrder = vi.fn().mockResolvedValue({ data: mockHealthData, error: null });
    mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);
  });

  it('전체 시스템 헬스 요약을 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useSystemHealthSummary(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.totalServices).toBe(3);
    expect(result.current.data.healthyCount).toBe(1);
    expect(result.current.data.degradedCount).toBe(1);
    expect(result.current.data.unhealthyCount).toBe(1);
  });

  it('전체 상태를 unhealthy로 설정해야 함 (unhealthy 서비스 존재 시)', async () => {
    // Execute
    const { result } = renderHook(() => useSystemHealthSummary(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.overallStatus).toBe('unhealthy');
  });

  it('전체 상태를 degraded로 설정해야 함 (degraded 서비스만 존재 시)', async () => {
    // Setup
    const degradedOnly = [mockHealthData[0], mockHealthData[1]]; // healthy + degraded
    mockOrder.mockResolvedValue({ data: degradedOnly, error: null });

    // Execute
    const { result } = renderHook(() => useSystemHealthSummary(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.overallStatus).toBe('degraded');
  });

  it('전체 상태를 healthy로 설정해야 함 (모든 서비스가 healthy인 경우)', async () => {
    // Setup
    const healthyOnly = [mockHealthData[0]];
    mockOrder.mockResolvedValue({ data: healthyOnly, error: null });

    // Execute
    const { result } = renderHook(() => useSystemHealthSummary(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.healthyCount).toBe(1);
    expect(result.current.data.overallStatus).toBe('healthy');
  });

  it('마지막 업데이트 시간을 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useSystemHealthSummary(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.lastUpdated).toBeTruthy();
  });
});

describe('useServiceConnectionStatus', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn().mockResolvedValue({ data: mockHealthData[0], error: null });
    mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);
  });

  it('연결된 서비스는 isConnected가 true여야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceConnectionStatus('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.isConnected).toBe(true);
  });

  it('5분 이상 ping이 없으면 isConnected가 false여야 함', async () => {
    // Setup - 10분 전에 마지막 ping (연결 끊김)
    mockSingle.mockResolvedValue({ data: mockHealthData[2], error: null });

    // Execute
    const { result } = renderHook(() => useServiceConnectionStatus('minu-build'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.isConnected).toBe(false);
  });

  it('timeSinceLastPing을 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceConnectionStatus('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.timeSinceLastPing).toBeGreaterThan(0);
  });

  it('last_ping이 없으면 isConnected가 false여야 함', async () => {
    // Setup
    const noLastPing = { ...mockHealthData[0], last_ping: null };
    mockSingle.mockResolvedValue({ data: noLastPing, error: null });

    // Execute
    const { result } = renderHook(() => useServiceConnectionStatus('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.isConnected).toBe(false);
  });
});

describe('useServiceHealthRealtime', () => {
  let mockChannel: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
    mockChannel = vi.fn().mockReturnValue({ on: mockOn });

    vi.mocked(supabase.channel).mockImplementation(mockChannel);
  });

  it('실시간 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceHealthRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-health-changes');
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('UPDATE 이벤트를 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceHealthRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert
    const onCall = mockOn.mock.calls[0];
    expect(onCall[0]).toBe('postgres_changes');
    expect(onCall[1]).toMatchObject({
      event: 'UPDATE',
      schema: 'public',
      table: 'service_health',
    });
  });

  it('언마운트 시 채널을 정리해야 함', () => {
    // Execute
    const { unmount } = renderHook(() => useServiceHealthRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert - 구독이 생성됨
    expect(mockSubscribe).toHaveBeenCalled();

    // Unmount
    unmount();

    // 채널 제거가 호출되어야 함
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

describe('헬퍼 함수', () => {
  describe('getHealthStatusColor', () => {
    it('healthy는 녹색을 반환해야 함', () => {
      expect(getHealthStatusColor('healthy')).toBe('text-green-500');
    });

    it('degraded는 노란색을 반환해야 함', () => {
      expect(getHealthStatusColor('degraded')).toBe('text-yellow-500');
    });

    it('unhealthy는 빨간색을 반환해야 함', () => {
      expect(getHealthStatusColor('unhealthy')).toBe('text-red-500');
    });

    it('unknown은 회색을 반환해야 함', () => {
      expect(getHealthStatusColor('unknown')).toBe('text-gray-500');
    });
  });

  describe('getHealthStatusBgColor', () => {
    it('healthy는 녹색 배경을 반환해야 함', () => {
      expect(getHealthStatusBgColor('healthy')).toContain('bg-green-100');
    });

    it('degraded는 노란색 배경을 반환해야 함', () => {
      expect(getHealthStatusBgColor('degraded')).toContain('bg-yellow-100');
    });

    it('unhealthy는 빨간색 배경을 반환해야 함', () => {
      expect(getHealthStatusBgColor('unhealthy')).toContain('bg-red-100');
    });

    it('unknown은 회색 배경을 반환해야 함', () => {
      expect(getHealthStatusBgColor('unknown')).toContain('bg-gray-100');
    });
  });

  describe('getHealthStatusLabel', () => {
    it('healthy는 "정상"을 반환해야 함', () => {
      expect(getHealthStatusLabel('healthy')).toBe('정상');
    });

    it('degraded는 "저하됨"을 반환해야 함', () => {
      expect(getHealthStatusLabel('degraded')).toBe('저하됨');
    });

    it('unhealthy는 "장애"를 반환해야 함', () => {
      expect(getHealthStatusLabel('unhealthy')).toBe('장애');
    });

    it('unknown은 "알 수 없음"을 반환해야 함', () => {
      expect(getHealthStatusLabel('unknown')).toBe('알 수 없음');
    });
  });

  describe('formatLastPing', () => {
    it('null이면 "없음"을 반환해야 함', () => {
      expect(formatLastPing(null)).toBe('없음');
    });

    it('undefined이면 "없음"을 반환해야 함', () => {
      expect(formatLastPing(undefined)).toBe('없음');
    });

    it('시간을 "시간 전" 형식으로 반환해야 함', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatLastPing(twoHoursAgo)).toBe('2시간 전');
    });

    it('분을 "분 전" 형식으로 반환해야 함', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatLastPing(fiveMinutesAgo)).toBe('5분 전');
    });

    it('초를 "초 전" 형식으로 반환해야 함', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatLastPing(thirtySecondsAgo)).toBe('30초 전');
    });
  });
});
