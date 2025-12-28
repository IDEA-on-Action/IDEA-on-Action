/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * AdminSidebar Component 테스트
 *
 * CMS Phase 1: 관리자 사이드바 컴포넌트 테스트
 * - 권한에 따른 메뉴 아이템 표시/숨김
 * - 로딩 상태 처리
 * - 메뉴 접기/펼치기 기능
 * - 모바일/데스크톱 반응형 동작
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'admin@example.com',
      user_metadata: {
        full_name: 'Admin User',
      },
    },
    signOut: vi.fn(),
  })),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useUserPermissions: vi.fn(() => ({
    data: [
      { permission_name: 'blog:read' },
      { permission_name: 'blog:manage' },
      { permission_name: 'service:read' },
      { permission_name: 'user:read' },
      { permission_name: 'user:manage' },
      { permission_name: 'system:read' },
      { permission_name: 'system:manage' },
      { permission_name: 'order:read' },
      { permission_name: 'notice:read' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/stores/sidebarStore', () => ({
  useSidebarStore: vi.fn(() => ({
    isOpen: true,
    toggle: vi.fn(),
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
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AdminSidebar', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset all mocks to default state
    const useRBAC = await import('@/hooks/useRBAC');
    const authModule = await import('@/hooks/useAuth');
    const sidebarStore = await import('@/stores/sidebarStore');

    vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
      data: [
        { permission_name: 'blog:read' },
        { permission_name: 'blog:manage' },
        { permission_name: 'service:read' },
        { permission_name: 'user:read' },
        { permission_name: 'user:manage' },
        { permission_name: 'system:read' },
        { permission_name: 'system:manage' },
        { permission_name: 'order:read' },
        { permission_name: 'notice:read' },
      ],
      isLoading: false,
    } as any);

    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        user_metadata: {
          full_name: 'Admin User',
        },
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(sidebarStore.useSidebarStore).mockReturnValue({
      isOpen: true,
      toggle: vi.fn(),
    } as any);

    // Mock window.innerWidth for desktop
    Object.defineProperty(globalThis, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  describe('기본 렌더링', () => {
    it('사이드바가 렌더링되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
      expect(screen.getByText('IDEA on Action')).toBeInTheDocument();
      expect(screen.getByText('관리자 패널')).toBeInTheDocument();
    });

    it('모든 메뉴 섹션이 렌더링되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Content Management')).toBeInTheDocument();
      expect(screen.getByText('Blog')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('super_admin 사용자는 모든 메뉴 아이템을 볼 수 있어야 함', async () => {
      // Execute (기본 모킹에 모든 권한이 포함되어 있음)
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('대시보드')).toBeInTheDocument();
        expect(screen.getByText('Portfolio')).toBeInTheDocument();
        expect(screen.getByText('Lab')).toBeInTheDocument();
        expect(screen.getByText('Team')).toBeInTheDocument();
        expect(screen.getByText('Roadmap')).toBeInTheDocument();
        expect(screen.getByText('Posts')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Tags')).toBeInTheDocument();
        expect(screen.getByText('Media Library')).toBeInTheDocument();
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        expect(screen.getByText('Activity Logs')).toBeInTheDocument();
        // 'Settings' 메뉴는 현재 AdminSidebar에 존재하지 않음
      });
    });

    it('사용자 정보가 표시되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('액션 버튼들이 렌더링되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('사이트로 돌아가기')).toBeInTheDocument();
      expect(screen.getByText('로그아웃')).toBeInTheDocument();
    });
  });

  describe('권한 기반 메뉴 표시', () => {
    it('editor 역할은 제한된 메뉴만 볼 수 있어야 함', async () => {
      // Setup - editor role with limited permissions
      const useRBAC = await import('@/hooks/useRBAC');
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: [
          { permission_name: 'blog:read' },
          { permission_name: 'blog:manage' },
        ],
        isLoading: false,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        // editor는 블로그 관련 메뉴만 볼 수 있음
        expect(screen.getByText('Posts')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        // Portfolio는 숨겨져야 함 (service:read 권한 없음)
        expect(screen.queryByText('Portfolio')).not.toBeInTheDocument();
      });
    });

    it('viewer 역할은 읽기 전용 메뉴만 볼 수 있어야 함', async () => {
      // Setup - viewer role (no permissions, only dashboard)
      const useRBAC = await import('@/hooks/useRBAC');
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        // viewer는 대시보드만 볼 수 있음 (권한 불필요)
        expect(screen.getByText('대시보드')).toBeInTheDocument();
        // 다른 메뉴는 숨겨져야 함
        expect(screen.queryByText('Posts')).not.toBeInTheDocument();
        expect(screen.queryByText('Portfolio')).not.toBeInTheDocument();
      });
    });

    it('권한 없는 메뉴 아이템은 숨겨져야 함', async () => {
      // Setup - system:manage 권한 없음 (Activity Logs 숨겨짐)
      const useRBAC = await import('@/hooks/useRBAC');
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: [
          { permission_name: 'blog:read' },
          { permission_name: 'system:read' },
          // system:manage 없음 → Activity Logs, Settings 숨겨짐
        ],
        isLoading: false,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        // Activity Logs는 표시되지 않아야 함 (system:manage 필요)
        expect(screen.queryByText('Activity Logs')).not.toBeInTheDocument();
        expect(screen.queryByText('연동 관리')).not.toBeInTheDocument();

        // 다른 메뉴는 표시되어야 함
        expect(screen.getByText('대시보드')).toBeInTheDocument();
        expect(screen.getByText('Posts')).toBeInTheDocument();
      });
    });
  });

  describe('로딩 상태', () => {
    it('권한 확인 중에는 스켈레톤을 표시해야 함', async () => {
      // Setup - simulate loading
      const useRBAC = await import('@/hooks/useRBAC');
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      // Execute
      const { container } = render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert - loading state (Skeleton 컴포넌트가 렌더링됨)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      // Resolve
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: [{ permission_name: 'blog:read' }],
        isLoading: false,
      } as any);

      // Re-render
      const { rerender } = render(<AdminSidebar />, { wrapper: createWrapper() });
      rerender(<AdminSidebar />);

      await waitFor(() => {
        expect(screen.getByText('대시보드')).toBeInTheDocument();
      });
    });

    it('권한 확인 실패 시에도 기본 메뉴는 표시해야 함', async () => {
      // Setup - permission check returns empty (no error, just no permissions)
      const useRBAC = await import('@/hooks/useRBAC');
      vi.mocked(useRBAC.useUserPermissions).mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        // 에러가 발생해도 최소한의 메뉴는 표시되어야 함 (권한 불필요한 대시보드)
        expect(screen.getByText('대시보드')).toBeInTheDocument();
      });
    });
  });

  describe('메뉴 접기/펼치기', () => {
    it('사이드바를 접을 수 있어야 함', async () => {
      // Setup
      const mockToggle = vi.fn();

      const sidebarStore = await import('@/stores/sidebarStore');
      vi.mocked(sidebarStore.useSidebarStore).mockReturnValue({
        isOpen: false,
        toggle: mockToggle,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText('사이드바 펼치기');
      fireEvent.click(toggleButton);

      // Assert
      expect(mockToggle).toHaveBeenCalled();
    });

    it('사이드바를 펼칠 수 있어야 함', async () => {
      // Setup
      const mockToggle = vi.fn();

      const sidebarStore = await import('@/stores/sidebarStore');
      vi.mocked(sidebarStore.useSidebarStore).mockReturnValue({
        isOpen: true,
        toggle: mockToggle,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      const toggleButton = screen.getByLabelText('사이드바 접기');
      fireEvent.click(toggleButton);

      // Assert
      expect(mockToggle).toHaveBeenCalled();
    });

    it('사이드바가 접혀있을 때 아이콘만 표시되어야 함', async () => {
      // Setup
      const sidebarStore = await import('@/stores/sidebarStore');

      vi.mocked(sidebarStore.useSidebarStore).mockReturnValue({
        isOpen: false,
        toggle: vi.fn(),
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      // 섹션 타이틀이 숨겨져야 함
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Management')).not.toBeInTheDocument();

      // 로고와 기본 요소는 보여야 함
      expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
    });

    it('사이드바가 펼쳐져있을 때 전체 메뉴가 표시되어야 함', () => {
      // Execute (기본 모킹 상태: isOpen: true)
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('대시보드')).toBeInTheDocument();
      // Portfolio는 service:read 권한 필요 - 기본 모킹에 포함됨
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
    });
  });

  describe('반응형 동작', () => {
    it('모바일에서는 Sheet로 렌더링되어야 함', () => {
      // Setup - mobile viewport
      Object.defineProperty(globalThis, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      // Execute
      render(<AdminSidebar isMobileOpen={true} onMobileClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      // Assert
      // Sheet 컴포넌트가 렌더링되어야 함
      expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
    });

    it('모바일에서 메뉴 클릭 시 onMobileClose가 호출되어야 함', async () => {
      // Setup
      Object.defineProperty(globalThis, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      const onMobileClose = vi.fn();

      // Execute
      render(<AdminSidebar isMobileOpen={true} onMobileClose={onMobileClose} />, {
        wrapper: createWrapper(),
      });

      const dashboardLink = screen.getByText('대시보드');
      fireEvent.click(dashboardLink);

      // Assert
      expect(onMobileClose).toHaveBeenCalled();
    });

    it('데스크톱에서는 fixed sidebar로 렌더링되어야 함', () => {
      // Setup - desktop viewport
      Object.defineProperty(globalThis, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      // Execute
      const { container } = render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('fixed');
    });
  });

  describe('네비게이션', () => {
    it('활성 라우트가 하이라이트되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const dashboardButton = screen.getByRole('button', { name: '대시보드' });
      expect(dashboardButton).toHaveAttribute('aria-current', 'page');
    });

    it('로그아웃 버튼 클릭 시 signOut이 호출되어야 함', async () => {
      // Setup
      const authModule = await import('@/hooks/useAuth');
      const mockSignOut = vi.fn();

      vi.mocked(authModule.useAuth).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'admin@example.com',
        },
        signOut: mockSignOut,
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      const logoutButton = screen.getByRole('button', { name: '로그아웃' });
      fireEvent.click(logoutButton);

      // Assert
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('사이트로 돌아가기 링크가 작동해야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const homeLink = screen.getByRole('button', { name: '사이트로 돌아가기' });
      expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('사용자 정보 표시', () => {
    it('사용자 이메일의 첫 글자가 아바타에 표시되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('A')).toBeInTheDocument(); // "Admin" 첫 글자
    });

    it('full_name이 없으면 이메일의 로컬 부분을 표시해야 함', async () => {
      // Setup
      const authModule = await import('@/hooks/useAuth');

      vi.mocked(authModule.useAuth).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        },
        signOut: vi.fn(),
      } as any);

      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('Admin 배지가 표시되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const badges = screen.getAllByText('Admin');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('접근성', () => {
    it('적절한 aria-label이 설정되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const sidebar = screen.getByLabelText('관리자 네비게이션');
      expect(sidebar).toBeInTheDocument();
    });

    it('메뉴 아이템에 aria-current가 설정되어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const activeItem = screen.getByRole('button', { name: '대시보드' });
      expect(activeItem).toHaveAttribute('aria-current', 'page');
    });

    it('토글 버튼에 적절한 aria-label이 있어야 함', () => {
      // Execute
      render(<AdminSidebar />, { wrapper: createWrapper() });

      // Assert
      const toggleButton = screen.getByLabelText('사이드바 접기');
      expect(toggleButton).toBeInTheDocument();
    });
  });
});
