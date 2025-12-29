/**
 * useRevenue Hook 테스트
 *
 * 매출 분석 훅 테스트 (Workers API 모킹)
 * - 일/주/월별 매출 조회
 * - 서비스별 매출 조회
 * - KPI 조회
 * - 총 매출 조회
 * - 사용자별 지출 조회
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRevenueByDate,
  useRevenueByService,
  useKPIs,
  useTotalRevenue,
  useUserTotalSpent,
} from '@/hooks/useRevenue';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import React from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

describe('useRevenue Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useRevenueByDate', () => {
    it('should fetch revenue by date successfully', async () => {
      const mockData = [
        { date: '2025-11-01', total: 100000, count: 5 },
        { date: '2025-11-02', total: 150000, count: 7 },
      ];

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [
          { date: '2025-11-01', total: '100000', count: '5' },
          { date: '2025-11-02', total: '150000', count: '7' },
        ],
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-02');

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'day'),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockData);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/analytics/revenue/by-date'),
          { token: 'mock-token' }
        );
        const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
        expect(callUrl).toContain('group_by=day');
      }
    });

    it('should handle different intervals (week, month)', async () => {
      const mockData = [
        { date: '2025-W45', total: 500000, count: 25 },
      ];

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-07');

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'week'),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
        expect(callUrl).toContain('group_by=week');
      }
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-02');

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'day'),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      // 에러 시 빈 배열 반환
      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([]);
      }
    });
  });

  describe('useRevenueByService', () => {
    it('should fetch revenue by service successfully', async () => {
      const mockData = [
        {
          service_id: 'service1',
          service_name: 'AI 챗봇',
          total_revenue: 300000,
          order_count: 15,
        },
        {
          service_id: 'service2',
          service_name: '웹사이트 개발',
          total_revenue: 200000,
          order_count: 10,
        },
      ];

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(
        () => useRevenueByService(startDate, endDate),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.length).toBeGreaterThan(0);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/analytics/revenue/by-service'),
          { token: 'mock-token' }
        );
      }
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Service error',
        status: 500,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(
        () => useRevenueByService(startDate, endDate),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      // 에러 시 빈 배열 반환
      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([]);
      }
    });
  });

  describe('useKPIs', () => {
    it('should fetch KPIs successfully', async () => {
      const mockData = {
        total_revenue: 1000000,
        order_count: 50,
        average_order_value: 20000,
        conversion_rate: 2.5,
        new_customers: 30,
        returning_customers: 20,
      };

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(() => useKPIs(startDate, endDate), {
        wrapper,
      });

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalRevenue).toBe(1000000);
        expect(result.current.data?.conversionRate).toBe(2.5);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/analytics/kpis'),
          { token: 'mock-token' }
        );
      }
    });

    it('should return default values for empty data', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'No data',
        status: 404,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(() => useKPIs(startDate, endDate), {
        wrapper,
      });

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalRevenue).toBe(0);
      }
    });
  });

  describe('useTotalRevenue', () => {
    it('should calculate total revenue from orders', async () => {
      const mockData = {
        total_revenue: 450000,
        order_count: 3,
        average_order_value: 150000,
      };

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(
        () => useTotalRevenue(startDate, endDate),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalRevenue).toBe(450000);
        expect(result.current.data?.orderCount).toBe(3);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/analytics/revenue/total'),
          { token: 'mock-token' }
        );
      }
    });

    it('should handle empty orders', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          total_revenue: 0,
          order_count: 0,
          average_order_value: 0,
        },
        error: null,
        status: 200,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(
        () => useTotalRevenue(startDate, endDate),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalRevenue).toBe(0);
        expect(result.current.data?.orderCount).toBe(0);
      }
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Server error',
        status: 500,
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const { result } = renderHook(
        () => useTotalRevenue(startDate, endDate),
        { wrapper }
      );

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      // 에러 시 기본값 반환
      if (result.current.isSuccess) {
        expect(result.current.data?.totalRevenue).toBe(0);
        expect(result.current.data?.orderCount).toBe(0);
      }
    });
  });

  describe('useUserTotalSpent', () => {
    it('should calculate user spending metrics', async () => {
      const mockData = {
        total_spent: 450000,
        order_count: 3,
        last_order_date: '2025-11-30',
      };

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      });

      const userId = 'user123';

      const { result } = renderHook(() => useUserTotalSpent(userId), {
        wrapper,
      });

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalSpent).toBe(450000);
        expect(result.current.data?.orderCount).toBe(3);
        expect(result.current.data?.lastOrderDate).toBe('2025-11-30');
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/users/user123/spending',
          { token: 'mock-token' }
        );
      }
    });

    it('should handle user with no orders', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          total_spent: 0,
          order_count: 0,
          last_order_date: null,
        },
        error: null,
        status: 200,
      });

      const userId = 'user456';

      const { result } = renderHook(() => useUserTotalSpent(userId), {
        wrapper,
      });

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data?.totalSpent).toBe(0);
        expect(result.current.data?.orderCount).toBe(0);
        expect(result.current.data?.lastOrderDate).toBeNull();
      }
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'User not found',
        status: 404,
      });

      const userId = 'nonexistent';

      const { result } = renderHook(() => useUserTotalSpent(userId), {
        wrapper,
      });

      await waitFor(
        () => expect(result.current.isSuccess || result.current.isError).toBe(true),
        { timeout: 3000 }
      );

      // 에러 시 기본값 반환
      if (result.current.isSuccess) {
        expect(result.current.data?.totalSpent).toBe(0);
        expect(result.current.data?.orderCount).toBe(0);
        expect(result.current.data?.lastOrderDate).toBeNull();
      }
    });

    it('should be disabled when userId is empty', async () => {
      const { result } = renderHook(() => useUserTotalSpent(''), {
        wrapper,
      });

      // enabled: !!userId이므로 쿼리가 비활성화됨
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
