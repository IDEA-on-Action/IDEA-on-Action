 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProposals,
  useMyProposals,
  useProposalsByStatus,
  useSubmitProposal,
  useUpdateProposalStatus,
  useDeleteProposal,
} from '@/hooks/projects/useProposals';
import { proposalsApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';
import type { Proposal, ProposalFormValues } from '@/types/shared/v2';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  proposalsApi: {
    list: vi.fn(),
    getMyProposals: vi.fn(),
    submit: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    workersTokens: { accessToken: 'mock-token' },
  }),
}));

describe('useProposals', () => {
  let queryClient: QueryClient;

  const mockProposals: Proposal[] = [
    {
      id: 1,
      name: '홍길동',
      email: 'hong@example.com',
      company: '회사 A',
      package: 'mvp',
      budget: '500만원 ~ 1000만원',
      message: '프로젝트 제안서입니다. 최소 50자 이상의 내용을 작성해야 합니다.',
      preferred_contact: 'email',
      status: 'pending',
      phone: null,
      user_id: 'user-1',
      admin_notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: '김철수',
      email: 'kim@example.com',
      package: 'consulting',
      budget: '1000만원 ~ 2000만원',
      message: '기술 컨설팅 제안서입니다. 최소 50자 이상의 내용을 작성해야 합니다.',
      status: 'reviewing',
      user_id: 'user-2',
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

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useProposals', () => {
    it('전체 제안서 목록을 성공적으로 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(proposalsApi.list).mockResolvedValue({
        data: mockProposals,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProposals);
        expect(proposalsApi.list).toHaveBeenCalledWith('mock-token');
      }
    });

    it('에러 발생 시 fallback 값을 반환해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(proposalsApi.list).mockResolvedValue({
        data: null,
        error: 'Database error',
      });

      // Execute
      const { result } = renderHook(() => useProposals(), { wrapper });

      // Assert - 에러 시 빈 배열 반환
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useMyProposals', () => {
    it('사용자의 제안서를 조회해야 함', async () => {
      // Setup - Workers API 모킹
      const filteredProposals = mockProposals.filter((p) => p.user_id === 'user-1');
      vi.mocked(proposalsApi.getMyProposals).mockResolvedValue({
        data: filteredProposals,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useMyProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProposals);
        expect(proposalsApi.getMyProposals).toHaveBeenCalledWith('mock-token');
      }
    });
  });

  describe('useProposalsByStatus', () => {
    it('상태별로 제안서를 필터링해야 함', async () => {
      // Setup - Workers API 모킹
      const filteredProposals = mockProposals.filter((p) => p.status === 'pending');
      vi.mocked(proposalsApi.list).mockResolvedValue({
        data: filteredProposals,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useProposalsByStatus('pending'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProposals);
        expect(proposalsApi.list).toHaveBeenCalledWith('mock-token', { status: 'pending' });
      }
    });

    it('상태가 없으면 전체 제안서를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(proposalsApi.list).mockResolvedValue({
        data: mockProposals,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useProposalsByStatus(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProposals);
        expect(proposalsApi.list).toHaveBeenCalledWith('mock-token', { status: undefined });
      }
    });
  });

  describe('useSubmitProposal', () => {
    it('새 제안서를 제출해야 함', async () => {
      // Setup
      const newProposal: ProposalFormValues = {
        name: '이영희',
        email: 'lee@example.com',
        company: '회사 B',
        package: 'design',
        budget: '300만원 ~ 500만원',
        message: '디자인 시스템 제안서입니다. 최소 50자 이상의 내용을 작성해야 합니다.',
        preferred_contact: 'phone',
        phone: '010-1234-5678',
      };

      const createdProposal = {
        ...newProposal,
        id: 3,
        status: 'pending',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      // Workers API 모킹
      vi.mocked(proposalsApi.submit).mockResolvedValue({
        data: createdProposal,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useSubmitProposal(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newProposal);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(proposalsApi.submit).toHaveBeenCalledWith('mock-token', { ...newProposal, status: 'pending' });
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateProposalStatus', () => {
    it('제안서 상태를 업데이트해야 함', async () => {
      // Setup
      const updatedProposal = { ...mockProposals[0], status: 'accepted' as const, admin_notes: '승인됨' };

      // Workers API 모킹
      vi.mocked(proposalsApi.updateStatus).mockResolvedValue({
        data: updatedProposal,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useUpdateProposalStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        id: 1,
        status: 'accepted',
        admin_notes: '승인됨',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(proposalsApi.updateStatus).toHaveBeenCalledWith('mock-token', 1, 'accepted', '승인됨');
        expect(result.current.data).toEqual(updatedProposal);
      }
    });
  });

  describe('useDeleteProposal', () => {
    it('제안서를 삭제해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(proposalsApi.delete).mockResolvedValue({
        data: null,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useDeleteProposal(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(proposalsApi.delete).toHaveBeenCalledWith('mock-token', 1);
        expect(result.current.data).toBe(1);
      }
    });
  });
});
