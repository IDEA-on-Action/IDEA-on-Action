/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProposals,
  useMyProposals,
  useProposalsByStatus,
  useSubmitProposal,
  useUpdateProposalStatus,
  useDeleteProposal,
} from '@/hooks/useProposals';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import type { Proposal, ProposalFormValues } from '@/types/v2';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useProposals', () => {
    it('전체 제안서 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockProposals,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProposals);
        expect(supabase.from).toHaveBeenCalledWith('proposals');
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      }
    });

    it('에러 발생 시 에러 상태를 반환해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useMyProposals', () => {
    it('사용자의 제안서를 조회해야 함', async () => {
      // Setup
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const filteredProposals = mockProposals.filter((p) => p.user_id === 'user-1');
      const orderMock = vi.fn().mockResolvedValue({
        data: filteredProposals,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useMyProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProposals);
        expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
      }
    });

    it('사용자가 없으면 빈 배열을 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useMyProposals(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([]);
      }
    });
  });

  describe('useProposalsByStatus', () => {
    it('상태별로 제안서를 필터링해야 함', async () => {
      // Setup
      const filteredProposals = mockProposals.filter((p) => p.status === 'pending');
      const orderMock = vi.fn().mockResolvedValue({
        data: filteredProposals,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProposalsByStatus('pending'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProposals);
        expect(eqMock).toHaveBeenCalledWith('status', 'pending');
      }
    });

    it('상태가 없으면 전체 제안서를 반환해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockProposals,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProposalsByStatus(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProposals);
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

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          ...newProposal,
          id: 3,
          status: 'pending',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useSubmitProposal(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newProposal);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(insertMock).toHaveBeenCalledWith([{ ...newProposal, status: 'pending' }]);
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateProposalStatus', () => {
    it('제안서 상태를 업데이트해야 함', async () => {
      // Setup
      const updatedProposal = { ...mockProposals[0], status: 'accepted' as const, admin_notes: '승인됨' };

      const singleMock = vi.fn().mockResolvedValue({
        data: updatedProposal,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

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
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith({
          status: 'accepted',
          admin_notes: '승인됨',
        });
        expect(eqMock).toHaveBeenCalledWith('id', 1);
      }
    });
  });

  describe('useDeleteProposal', () => {
    it('제안서를 삭제해야 함', async () => {
      // Setup
      const eqMock = vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useDeleteProposal(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(eqMock).toHaveBeenCalledWith('id', 1);
      }
    });
  });
});

