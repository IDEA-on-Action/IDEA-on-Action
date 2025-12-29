 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBounties,
  useBounty,
  useBountiesByStatus,
  useApplyToBounty,
  useCreateBounty,
  useUpdateBounty,
  useDeleteBounty,
  useAssignBounty,
} from '@/hooks/useBounties';
import { bountiesApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';
import type { Bounty } from '@/types/v2';

// Mock Cloudflare Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  bountiesApi: {
    list: vi.fn(),
    getById: vi.fn(),
    apply: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    assign: vi.fn(),
  },
}));

describe('useBounties', () => {
  let queryClient: QueryClient;

  const mockBounties: Bounty[] = [
    {
      id: 1,
      title: '바운티 1',
      description: '바운티 1 설명',
      status: 'open',
      difficulty: '초급',
      reward: 100000,
      estimated_hours: 10,
      skills_required: ['React', 'TypeScript'],
      deliverables: ['컴포넌트 구현', '테스트 작성'],
      deadline: '2024-02-01',
      assignee_id: null,
      applicants: [],
      project_id: 'project-1',
      metadata: { priority: 'high' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: '바운티 2',
      description: '바운티 2 설명',
      status: 'assigned',
      difficulty: '중급',
      reward: 200000,
      estimated_hours: 20,
      skills_required: ['Node.js', 'PostgreSQL'],
      deliverables: ['API 구현', '문서 작성'],
      assignee_id: 'user-1',
      applicants: ['user-1', 'user-2'],
      project_id: 'project-2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useBounties', () => {
    it('전체 바운티 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      vi.mocked(bountiesApi.list).mockResolvedValue({
        data: mockBounties,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useBounties(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBounties);
      expect(bountiesApi.list).toHaveBeenCalled();
    });

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      // Setup
      vi.mocked(bountiesApi.list).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useBounties(), { wrapper });

      // Assert - 훅이 에러를 처리하고 빈 배열 반환
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useBounty', () => {
    it('id로 단일 바운티를 조회해야 함', async () => {
      // Setup
      vi.mocked(bountiesApi.getById).mockResolvedValue({
        data: mockBounties[0],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useBounty(1), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBounties[0]);
      expect(bountiesApi.getById).toHaveBeenCalledWith(1);
    });

    it('id가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useBounty(0), { wrapper });

      // Assert
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useBountiesByStatus', () => {
    it('상태별로 바운티를 필터링해야 함', async () => {
      // Setup
      const filteredBounties = mockBounties.filter((b) => b.status === 'open');

      vi.mocked(bountiesApi.list).mockResolvedValue({
        data: filteredBounties,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useBountiesByStatus('open'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(filteredBounties);
      expect(bountiesApi.list).toHaveBeenCalledWith({ status: 'open' });
    });
  });

  describe('useApplyToBounty', () => {
    it('바운티에 지원해야 함', async () => {
      // Setup
      vi.mocked(bountiesApi.apply).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useApplyToBounty(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bountiesApi.apply).toHaveBeenCalledWith('test-token', 1);
    });
  });

  describe('useCreateBounty', () => {
    it('새 바운티를 생성해야 함', async () => {
      // Setup
      const newBounty = {
        title: '새 바운티',
        description: '새 바운티 설명',
        status: 'open' as const,
        difficulty: '초급' as const,
        reward: 50000,
        skills_required: ['JavaScript'],
        deliverables: ['구현'],
      };

      const createdBounty = {
        ...newBounty,
        id: 3,
        applicants: [],
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      vi.mocked(bountiesApi.create).mockResolvedValue({
        data: createdBounty,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useCreateBounty(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newBounty);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bountiesApi.create).toHaveBeenCalledWith('test-token', { ...newBounty, applicants: [] });
      expect(result.current.data).toEqual(createdBounty);
    });
  });

  describe('useUpdateBounty', () => {
    it('바운티를 업데이트해야 함', async () => {
      // Setup
      const updates = { status: 'in-progress' as const, reward: 150000 };
      const updatedBounty = { ...mockBounties[0], ...updates };

      vi.mocked(bountiesApi.update).mockResolvedValue({
        data: updatedBounty,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUpdateBounty(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: 1, updates });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bountiesApi.update).toHaveBeenCalledWith('test-token', 1, updates);
      expect(result.current.data).toEqual(updatedBounty);
    });
  });

  describe('useDeleteBounty', () => {
    it('바운티를 삭제해야 함', async () => {
      // Setup
      vi.mocked(bountiesApi.delete).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      });

      // Execute
      const { result } = renderHook(() => useDeleteBounty(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bountiesApi.delete).toHaveBeenCalledWith('test-token', 1);
      expect(result.current.data).toBe(1);
    });
  });

  describe('useAssignBounty', () => {
    it('바운티를 사용자에게 할당해야 함', async () => {
      // Setup
      const assignedBounty = { ...mockBounties[0], assignee_id: 'user-1', status: 'assigned' as const };

      vi.mocked(bountiesApi.assign).mockResolvedValue({
        data: assignedBounty,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useAssignBounty(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ bountyId: 1, userId: 'user-1' });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bountiesApi.assign).toHaveBeenCalledWith('test-token', 1, 'user-1');
      expect(result.current.data).toEqual(assignedBounty);
    });
  });
});

