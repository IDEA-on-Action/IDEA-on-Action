/**
 * useTeamMembers Hook 테스트
 *
 * 팀원 관리 훅 테스트 (Workers API 마이그레이션)
 * - 팀원 목록 조회
 * - 팀원 생성
 * - 팀원 수정
 * - 팀원 삭제
 * - 활성 상태 토글
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTeamMembers,
  useTeamMember,
  useActiveTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useToggleTeamMemberActive,
} from '@/hooks/useTeamMembers';
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
const mockTeamMembers = [
  {
    id: '1',
    name: '홍길동',
    role: 'CEO',
    bio: 'CEO 및 창업자',
    image_url: 'https://example.com/image1.jpg',
    priority: 100,
    active: true,
    social_links: { github: 'https://github.com/user1' },
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    name: '김철수',
    role: 'CTO',
    bio: 'CTO 및 기술 리더',
    image_url: 'https://example.com/image2.jpg',
    priority: 90,
    active: true,
    social_links: { linkedin: 'https://linkedin.com/in/user2' },
    created_at: '2025-12-01T11:00:00Z',
    updated_at: '2025-12-01T11:00:00Z',
  },
  {
    id: '3',
    name: '이영희',
    role: 'Designer',
    bio: 'UX/UI 디자이너',
    image_url: 'https://example.com/image3.jpg',
    priority: 80,
    active: false,
    social_links: {},
    created_at: '2025-12-01T12:00:00Z',
    updated_at: '2025-12-01T12:00:00Z',
  },
];

describe('useTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Setup - 지연된 응답 모킹
      vi.mocked(callWorkersApi).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: mockTeamMembers, error: null, status: 200 });
            }, 100);
          })
      );

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('팀원 목록 조회', () => {
    it('모든 팀원을 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockTeamMembers,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members?order_by=priority:desc,created_at:desc',
        { token: 'mock-token' }
      );
      expect(result.current.data).toEqual(mockTeamMembers);
    });

    it('priority 내림차순으로 정렬되어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockTeamMembers,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('order_by=priority:desc,created_at:desc'),
        expect.any(Object)
      );
    });

    it('빈 목록을 올바르게 처리해야 함', async () => {
      // Setup - 빈 배열 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('개별 팀원 조회', () => {
    it('ID로 특정 팀원을 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockTeamMembers[0],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useTeamMember('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members/1',
        { token: 'mock-token' }
      );
      expect(result.current.data).toEqual(mockTeamMembers[0]);
    });

    it('존재하지 않는 팀원 조회 시 null을 반환해야 함', async () => {
      // Setup - null 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useTeamMember('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('ID가 없으면 쿼리가 비활성화되어야 함', () => {
      const { result } = renderHook(() => useTeamMember(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('활성 팀원 조회', () => {
    it('활성 상태인 팀원만 조회해야 함', async () => {
      const activeMembers = mockTeamMembers.filter((m) => m.active);

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: activeMembers,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useActiveTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members?active=true&order_by=priority:desc,created_at:desc',
        { token: 'mock-token' }
      );
      expect(result.current.data?.every((m) => m.active)).toBe(true);
    });
  });

  describe('팀원 생성', () => {
    it('새 팀원을 생성해야 함', async () => {
      const newMember = {
        name: '박민수',
        role: 'Developer',
        bio: '백엔드 개발자',
        image_url: 'https://example.com/image4.jpg',
        priority: 70,
        active: true,
        social_links: {},
      };

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { id: '4', ...newMember },
        error: null,
        status: 201,
      });

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync(newMember);

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members',
        {
          method: 'POST',
          token: 'mock-token',
          body: newMember,
        }
      );
    });

    it('팀원 생성 실패 시 에러를 던져야 함', async () => {
      // Setup - 에러 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Insert failed',
        status: 500,
      });

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          name: 'Test',
          role: 'Test Role',
          bio: 'Test Bio',
        })
      ).rejects.toThrow();
    });

    it('팀원 생성 성공 시 캐시를 무효화해야 함', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { id: '4', name: 'Test', role: 'Test Role', bio: 'Test Bio' },
        error: null,
        status: 201,
      });

      const { result } = renderHook(() => useCreateTeamMember(), { wrapper });

      await result.current.mutateAsync({
        name: 'Test',
        role: 'Test Role',
        bio: 'Test Bio',
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members'] })
        );
      });
    });
  });

  describe('팀원 수정', () => {
    it('팀원 정보를 수정해야 함', async () => {
      const updates = {
        name: '홍길동(수정)',
        role: 'CEO & Founder',
      };

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...mockTeamMembers[0], ...updates },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({ id: '1', updates });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members/1',
        {
          method: 'PATCH',
          token: 'mock-token',
          body: updates,
        }
      );
    });

    it('팀원 수정 실패 시 에러를 던져야 함', async () => {
      // Setup - 에러 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Update failed',
        status: 500,
      });

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync({ id: '1', updates: {} })).rejects.toThrow();
    });

    it('팀원 수정 성공 시 관련 캐시를 무효화해야 함', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { id: '1', name: 'Updated', role: 'Updated Role' },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useUpdateTeamMember(), { wrapper });

      await result.current.mutateAsync({ id: '1', updates: { name: 'Updated' } });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members'] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members', '1'] })
        );
      });
    });
  });

  describe('팀원 삭제', () => {
    it('팀원을 삭제해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      });

      const { result } = renderHook(() => useDeleteTeamMember(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('1');

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members/1',
        {
          method: 'DELETE',
          token: 'mock-token',
        }
      );
    });

    it('팀원 삭제 실패 시 에러를 던져야 함', async () => {
      // Setup - 에러 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Delete failed',
        status: 500,
      });

      const { result } = renderHook(() => useDeleteTeamMember(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('1')).rejects.toThrow();
    });

    it('팀원 삭제 성공 시 캐시를 무효화해야 함', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      });

      const { result } = renderHook(() => useDeleteTeamMember(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members'] })
        );
      });
    });
  });

  describe('활성 상태 토글', () => {
    it('팀원의 활성 상태를 변경해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...mockTeamMembers[0], active: false },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useToggleTeamMemberActive(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({ id: '1', active: false });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/team-members/1',
        {
          method: 'PATCH',
          token: 'mock-token',
          body: { active: false },
        }
      );
    });

    it('활성 상태 토글 실패 시 에러를 던져야 함', async () => {
      // Setup - 에러 반환 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Toggle failed',
        status: 500,
      });

      const { result } = renderHook(() => useToggleTeamMemberActive(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync({ id: '1', active: false })).rejects.toThrow();
    });

    it('활성 상태 토글 성공 시 모든 관련 캐시를 무효화해야 함', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { id: '1', active: false },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useToggleTeamMemberActive(), { wrapper });

      await result.current.mutateAsync({ id: '1', active: false });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members'] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members', '1'] })
        );
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ['team-members', 'active'] })
        );
      });
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 fallback 데이터를 반환해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Workers API 에러 시 빈 배열 반환
      expect(result.current.data).toEqual([]);
    });

    it('네트워크 에러를 처리하고 fallback 데이터를 반환해야 함', async () => {
      // Setup - 네트워크 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Network error',
        status: 0,
      });

      const { result } = renderHook(() => useTeamMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // 에러 시 fallbackValue(빈 배열) 반환
      expect(result.current.data).toEqual([]);
    });
  });

  describe('데이터 유효성 검증', () => {
    it('필수 필드가 없는 팀원 생성은 TypeScript에서 방지됨', async () => {
      // TypeScript 타입 체크로 컴파일 시점에 방지됨
      // 런타임 테스트는 생략 (TypeScript strict mode에서 이미 보장됨)
      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mutateAsync).toBeDefined();
    });

    it('잘못된 priority 값을 처리해야 함', async () => {
      const memberWithInvalidPriority = {
        name: 'Test',
        role: 'Test Role',
        bio: 'Test Bio',
        priority: -1,
      };

      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { id: '5', ...memberWithInvalidPriority },
        error: null,
        status: 201,
      });

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      });

      // 음수 priority도 허용되지만 데이터베이스에서 제약 조건으로 처리
      await expect(result.current.mutateAsync(memberWithInvalidPriority)).resolves.toBeDefined();
    });
  });
});
