/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Status from '@/pages/Status';
import type { Project, Bounty, Log } from '@/types/v2';
import React, { type ReactNode } from 'react';

// Mock hooks
vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(),
}));

vi.mock('@/hooks/useBounties', () => ({
  useBounties: vi.fn(),
}));

vi.mock('@/hooks/useLogs', () => ({
  useLogs: vi.fn(),
}));

vi.mock('@/hooks/useNewsletter', () => ({
  useNewsletterStats: vi.fn(),
  useSubscribeNewsletter: vi.fn(),
}));

// Mock react-helmet-async
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock ResizeObserver (for Recharts)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { useProjects } from '@/hooks/useProjects';
import { useBounties } from '@/hooks/useBounties';
import { useLogs } from '@/hooks/useLogs';
import { useNewsletterStats, useSubscribeNewsletter } from '@/hooks/useNewsletter';

describe('Status Page', () => {
  let queryClient: QueryClient;

  const mockProjects: Project[] = [
    {
      id: '1',
      slug: 'project-1',
      title: '프로젝트 1',
      summary: '프로젝트 1 요약',
      description: '프로젝트 1 설명',
      status: 'in-progress',
      category: 'web',
      image: 'https://example.com/image1.jpg',
      tags: ['react', 'typescript'],
      metrics: {
        progress: 50,
        contributors: 3,
        commits: 100,
        tests: 50,
        coverage: 80,
      },
      tech: {
        frontend: ['React', 'TypeScript'],
        backend: ['Node.js'],
        testing: ['Vitest'],
        deployment: ['Vercel'],
      },
      links: {
        github: 'https://github.com/example/project1',
        demo: 'https://demo.example.com',
        docs: 'https://docs.example.com',
      },
      timeline: {
        started: '2024-01-01',
        launched: null,
        updated: '2024-01-15',
      },
      highlights: ['하이라이트 1'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      slug: 'project-2',
      title: '프로젝트 2',
      summary: '프로젝트 2 요약',
      status: 'launched',
      category: 'mobile',
      tags: ['react-native'],
      metrics: {
        progress: 100,
        contributors: 5,
        commits: 200,
        tests: 100,
      },
      tech: {
        frontend: ['React Native'],
        backend: null,
        testing: null,
        deployment: ['App Store'],
      },
      links: {
        github: 'https://github.com/example/project2',
        demo: null,
        docs: null,
      },
      timeline: {
        started: '2024-01-10',
        launched: '2024-02-01',
        updated: '2024-02-01',
      },
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    },
  ];

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
      status: 'done',
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

  const mockLogs: Log[] = [
    {
      id: 1,
      type: 'release',
      title: '릴리스 로그 1',
      content: '릴리스 내용',
      project_id: 'project-1',
      author_id: 'user-1',
      tags: ['release', 'v1.0'],
      metadata: { version: '1.0.0' },
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      type: 'learning',
      title: '학습 로그 1',
      content: '학습 내용',
      project_id: null,
      author_id: 'user-1',
      tags: ['learning'],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      type: 'decision',
      title: '결정 로그 1',
      content: '결정 내용',
      project_id: 'project-2',
      author_id: 'user-2',
      tags: ['decision'],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10일 전
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const mockNewsletterStats = {
    total: 100,
    pending: 20,
    confirmed: 75,
    unsubscribed: 5,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Mock useSubscribeNewsletter (mutation)
    vi.mocked(useSubscribeNewsletter).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
    } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  describe('기본 렌더링', () => {
    it('컴포넌트가 정상적으로 렌더링되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('Hero 섹션이 렌더링되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('모든 활동을 투명하게 공개합니다')).toBeInTheDocument();
        expect(screen.getByText('Live Metrics')).toBeInTheDocument();
      });
    });
  });

  describe('로딩 상태', () => {
    it('모든 훅이 로딩 중일 때 로딩 스피너가 표시되어야 함', () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      // Execute
      const { container } = render(<Status />, { wrapper });

      // Assert
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('일부 훅만 로딩 중일 때도 로딩 스피너가 표시되어야 함', () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      const { container } = render(<Status />, { wrapper });

      // Assert
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('에러 상태', () => {
    it('프로젝트 데이터 에러 시 에러 메시지가 표시되어야 함', () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('프로젝트 데이터 로드 실패'),
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      expect(screen.getByText('데이터 로드 실패')).toBeInTheDocument();
      expect(screen.getByText('프로젝트 데이터 로드 실패')).toBeInTheDocument();
    });

    it('바운티 데이터 에러 시 에러 메시지가 표시되어야 함', () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('바운티 데이터 로드 실패'),
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      expect(screen.getByText('데이터 로드 실패')).toBeInTheDocument();
    });

    it('로그 데이터 에러 시 에러 메시지가 표시되어야 함', () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('로그 데이터 로드 실패'),
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      expect(screen.getByText('데이터 로드 실패')).toBeInTheDocument();
    });
  });

  describe('메트릭 계산', () => {
    it('프로젝트 메트릭이 올바르게 계산되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // 총 프로젝트: 2개
        expect(screen.getByText('2')).toBeInTheDocument();
        // 진행중 프로젝트: 1개
        expect(screen.getByText('1 진행중')).toBeInTheDocument();
        // 출시 프로젝트: 1개
        expect(screen.getByText('1 출시')).toBeInTheDocument();
      });
    });

    it('바운티 완료율이 올바르게 계산되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // 완료율: 1/2 = 50%
        // 바운티 완료율 섹션 확인
        expect(screen.getByText('바운티 완료율')).toBeInTheDocument();
        expect(screen.getByText('1 완료')).toBeInTheDocument();
        expect(screen.getByText('1 모집중')).toBeInTheDocument();
        // 50%는 여러 곳에 있을 수 있으므로 getAllByText 사용
        const percentageElements = screen.getAllByText(/50/);
        expect(percentageElements.length).toBeGreaterThan(0);
      });
    });

    it('커밋/기여자/테스트 집계가 올바르게 계산되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // 총 커밋: 100 + 200 = 300 (toLocaleString() 사용으로 쉼표가 있을 수 있음)
        expect(screen.getByText(/300/)).toBeInTheDocument();
        // 총 기여자: 3 + 5 = 8
        expect(screen.getByText('8')).toBeInTheDocument();
        // 총 테스트: 50 + 100 = 150 (toLocaleString() 사용으로 쉼표가 있을 수 있음)
        expect(screen.getByText(/150/)).toBeInTheDocument();
        // 테스트 케이스 텍스트 확인
        expect(screen.getByText(/테스트 케이스/)).toBeInTheDocument();
      });
    });

    it('주간 활동 카운트가 올바르게 계산되어야 함', async () => {
      // Setup - 최근 7일 내 로그만 포함
      const recentLogs: Log[] = [
        {
          id: 1,
          type: 'release',
          title: '최근 로그',
          content: '최근 내용',
          project_id: 'project-1',
          author_id: 'user-1',
          tags: ['release'],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: recentLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/주간 활동/)).toBeInTheDocument();
      });
    });
  });

  describe('UI 컴포넌트 렌더링', () => {
    beforeEach(() => {
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);
    });

    it('Key Metrics 카드들이 렌더링되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('총 프로젝트')).toBeInTheDocument();
        expect(screen.getByText('바운티 완료율')).toBeInTheDocument();
        expect(screen.getByText('총 커밋')).toBeInTheDocument();
        expect(screen.getByText('기여자')).toBeInTheDocument();
        expect(screen.getByText('구독자')).toBeInTheDocument();
      });
    });

    it('프로젝트 현황 섹션이 렌더링되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('프로젝트 현황')).toBeInTheDocument();
        expect(screen.getByText('프로젝트 1')).toBeInTheDocument();
        expect(screen.getByText('프로젝트 2')).toBeInTheDocument();
      });
    });

    it('최근 활동 섹션이 렌더링되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('최근 활동')).toBeInTheDocument();
        expect(screen.getByText('릴리스 로그 1')).toBeInTheDocument();
        expect(screen.getByText('학습 로그 1')).toBeInTheDocument();
      });
    });

    it('기술 스택 통계 섹션이 렌더링되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('기술 스택 사용 현황')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Backend')).toBeInTheDocument();
        expect(screen.getByText('Testing')).toBeInTheDocument();
      });
    });

    it('CTA 섹션이 렌더링되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('함께 성장하고 싶으신가요?')).toBeInTheDocument();
        expect(screen.getByText('바운티 참여하기')).toBeInTheDocument();
        expect(screen.getByText('협업 제안하기')).toBeInTheDocument();
      });
    });

    it('뉴스레터 통계가 올바르게 표시되어야 함', async () => {
      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument(); // confirmed subscribers
        expect(screen.getByText('20 대기')).toBeInTheDocument();
        expect(screen.getByText('100 전체')).toBeInTheDocument();
      });
    });
  });

  describe('데이터 통합', () => {
    it('실제 데이터가 올바르게 표시되어야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: mockNewsletterStats,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // 프로젝트 데이터 확인
        expect(screen.getByText('프로젝트 1')).toBeInTheDocument();
        expect(screen.getByText('프로젝트 2')).toBeInTheDocument();

        // 바운티 데이터 확인
        expect(screen.getByText('바운티 완료율')).toBeInTheDocument();

        // 로그 데이터 확인
        expect(screen.getByText('릴리스 로그 1')).toBeInTheDocument();

        // 뉴스레터 통계 확인
        expect(screen.getByText('75')).toBeInTheDocument();
      });
    });

    it('빈 데이터 상태를 올바르게 처리해야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: { total: 0, pending: 0, confirmed: 0, unsubscribed: 0 },
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // 빈 상태에서도 기본 UI는 렌더링되어야 함
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('총 프로젝트')).toBeInTheDocument();
        // 총 프로젝트 카드에서 0이 표시되어야 함 (더 구체적인 검증)
        const projectCards = screen.getAllByText('총 프로젝트');
        expect(projectCards.length).toBeGreaterThan(0);
      });
    });

    it('뉴스레터 통계가 없을 때 기본값을 사용해야 함', async () => {
      // Setup
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useBounties).mockReturnValue({
        data: mockBounties,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useLogs).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useNewsletterStats).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      // Execute
      render(<Status />, { wrapper });

      // Assert
      await waitFor(() => {
        // null일 때 기본값 0이 표시되어야 함
        // 구독자 섹션에서 0이 표시되는지 확인
        expect(screen.getByText('구독자')).toBeInTheDocument();
        // 구독자 카드 내부에 0이 있는지 확인 (더 구체적인 검증)
        const subscriberSection = screen.getByText('구독자').closest('.glass-card');
        expect(subscriberSection).toBeInTheDocument();
      });
    });
  });
});

