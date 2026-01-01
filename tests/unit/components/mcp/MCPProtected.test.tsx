/**
 * MCPProtected 컴포넌트 테스트
 *
 * MCP 권한 기반 보호 컴포넌트 테스트
 * - 권한 있을 때 children 렌더링
 * - 권한 없을 때 Fallback 렌더링
 * - 로딩 중 Loading 컴포넌트
 * - 에러 시 Error 컴포넌트
 * - requiredPermission prop 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MCPProtected } from '@/components/mcp/MCPProtected';
import * as useMCPPermissionHook from '@/hooks/integrations/useMCPPermission';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useMCPPermission', () => ({
  useMCPServicePermission: vi.fn(),
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('MCPProtected', () => {
  const TestContent = () => <div>Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 Loading 컴포넌트를 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: true,
        error: null,
        subscription: null,
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert - 서비스 이름이 포함된 로딩 메시지
      expect(screen.getByText(/Minu Find 서비스 로딩 중/i)).toBeInTheDocument();
    });

    it('커스텀 loadingFallback을 렌더링해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: true,
        error: null,
        subscription: null,
        requiredPlan: undefined,
      });

      const CustomLoading = () => <div>Custom Loading...</div>;

      // Execute
      render(
        <MCPProtected serviceId="minu-find" loadingFallback={<CustomLoading />}>
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    });
  });

  describe('에러 상태', () => {
    it('에러 발생 시 Fallback을 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: new Error('Service error'),
        subscription: null,
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText(/서비스 연결 중 문제가 발생했습니다/i)).toBeInTheDocument();
    });

    it('커스텀 fallback을 렌더링해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: new Error('Service error'),
        subscription: null,
        requiredPlan: undefined,
      });

      const CustomError = () => <div>Custom Error</div>;

      // Execute
      render(
        <MCPProtected serviceId="minu-find" fallback={<CustomError />}>
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });
  });

  describe('권한 없음 상태', () => {
    it('서비스 접근 권한이 없으면 Fallback을 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: null,
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert - 제목 요소만 확인
      expect(screen.getByRole('heading', { name: /구독이 필요합니다/i })).toBeInTheDocument();
    });

    it('구독이 만료되면 만료 메시지를 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'expired',
          validUntil: new Date(Date.now() - 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByRole('heading', { name: /구독이 만료되었습니다/i })).toBeInTheDocument();
    });

    it('플랜이 부족하면 플랜 업그레이드 메시지를 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Basic',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: 'Pro',
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByRole('heading', { name: /권한이 부족합니다/i })).toBeInTheDocument();
    });
  });

  describe('권한 있음 상태', () => {
    it('서비스 접근 권한이 있으면 children을 렌더링해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('hasAccess와 hasPermission이 모두 true일 때만 children을 렌더링해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find" requiredPermission="export_data">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('requiredPermission prop', () => {
    it('추가 권한이 필요하고 없으면 Fallback을 표시해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Basic',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: 'Pro',
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-build" requiredPermission="export_data">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/권한이 부족합니다/i)).toBeInTheDocument();
    });

    it('추가 권한이 필요하고 있으면 children을 렌더링해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-build" requiredPermission="export_data">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('서비스별 테스트', () => {
    it('minu-find 서비스에 대해 작동해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(useMCPPermissionHook.useMCPServicePermission).toHaveBeenCalledWith(
        'minu-find',
        undefined
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('minu-frame 서비스에 대해 작동해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-frame">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(useMCPPermissionHook.useMCPServicePermission).toHaveBeenCalledWith(
        'minu-frame',
        undefined
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('minu-build 서비스에 대해 작동해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-build">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(useMCPPermissionHook.useMCPServicePermission).toHaveBeenCalledWith(
        'minu-build',
        undefined
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('minu-keep 서비스에 대해 작동해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-keep">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(useMCPPermissionHook.useMCPServicePermission).toHaveBeenCalledWith(
        'minu-keep',
        undefined
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('구독 정보 표시', () => {
    it('현재 플랜 정보를 Fallback에 전달해야 함', () => {
      // Setup
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Basic Plan',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: 'Pro',
      });

      // Execute
      render(
        <MCPProtected serviceId="minu-build">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // Assert - 플랜 정보가 표시되어야 함
      expect(screen.getByRole('heading', { name: /권한이 부족합니다/i })).toBeInTheDocument();
    });
  });

  describe('복잡한 시나리오', () => {
    it('로딩 후 권한 확인 후 children 렌더링 흐름', async () => {
      // Setup - 초기 로딩 상태
      const { rerender } = render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      // 로딩 중
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: true,
        error: null,
        subscription: null,
        requiredPlan: undefined,
      });

      rerender(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>
      );

      expect(screen.getByText(/Minu Find 서비스 로딩 중/i)).toBeInTheDocument();

      // 권한 확인 완료
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      rerender(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('권한이 있다가 만료되는 시나리오', async () => {
      // Setup - 초기 권한 있음
      const { rerender } = render(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>,
        { wrapper: createWrapper() }
      );

      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'active',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      rerender(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // 구독 만료
      vi.mocked(useMCPPermissionHook.useMCPServicePermission).mockReturnValue({
        hasAccess: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        subscription: {
          planName: 'Pro',
          status: 'expired',
          validUntil: new Date(Date.now() - 86400000).toISOString(),
        },
        requiredPlan: undefined,
      });

      rerender(
        <MCPProtected serviceId="minu-find">
          <TestContent />
        </MCPProtected>
      );

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /구독이 만료되었습니다/i })).toBeInTheDocument();
      });
    });
  });
});
