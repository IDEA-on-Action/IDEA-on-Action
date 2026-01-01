 
/**
 * use2FA Hook 테스트
 *
 * 2단계 인증 관리 훅 테스트
 * - 2FA 설정 조회
 * - TOTP 활성화/비활성화
 * - 백업 코드 생성/재생성
 * - TOTP 토큰 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  use2FASettings,
  useIs2FAEnabled,
  useSetup2FA,
  useEnable2FA,
  useDisable2FA,
  useRegenerateBackupCodes,
  useVerify2FA,
} from '@/hooks/auth/use2FA';
import { twoFactorApi } from '@/integrations/cloudflare/client';
import * as totpLib from '@/lib/auth/totp';
import React from 'react';

// Mock Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  twoFactorApi: {
    getSettings: vi.fn(),
    setup: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('@/lib/auth/totp', () => ({
  generateTOTPSecret: vi.fn(),
  verifyTOTPToken: vi.fn(),
  generateBackupCodes: vi.fn(),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersUser: {
      id: 'user-123',
      email: 'test@example.com',
    },
    getAccessToken: vi.fn(() => 'mock-token'),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
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

describe('use2FA', () => {
  const mockTwoFactorAuth = {
    id: '2fa-123',
    user_id: 'user-123',
    enabled: true,
    verified_at: '2024-01-01T00:00:00Z',
    backup_codes_used: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_used_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('use2FASettings', () => {
    it('사용자의 2FA 설정을 성공적으로 조회해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.getSettings).mockResolvedValue({
        data: mockTwoFactorAuth,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTwoFactorAuth);
      expect(twoFactorApi.getSettings).toHaveBeenCalled();
    });

    it('2FA 설정이 없을 때 null을 반환해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.getSettings).mockResolvedValue({
        data: null,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('데이터베이스 에러 발생 시 에러를 던져야 함', async () => {
      // Setup - 훅은 에러를 문자열로 처리
      vi.mocked(twoFactorApi.getSettings).mockResolvedValue({
        data: null,
        error: 'Database error',
      });

      // Execute
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useIs2FAEnabled', () => {
    it('2FA가 활성화되어 있을 때 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.getSettings).mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: true },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useIs2FAEnabled(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('2FA가 비활성화되어 있을 때 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.getSettings).mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: false },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useIs2FAEnabled(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useSetup2FA', () => {
    it('2FA 설정을 성공적으로 초기화해야 함', async () => {
      // Setup
      const mockQrCode = 'data:image/png;base64,QRCODE';
      const mockBackupCodes = ['CODE1', 'CODE2', 'CODE3'];

      vi.mocked(twoFactorApi.setup).mockResolvedValue({
        data: {
          secret: 'SECRET123',
          qrCode: mockQrCode,
          backupCodes: mockBackupCodes,
        },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useSetup2FA(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined();
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(twoFactorApi.setup).toHaveBeenCalled();
    });

    it('설정 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.setup).mockResolvedValue({
        data: null,
        error: 'Setup failed',
      });

      // Execute
      const { result } = renderHook(() => useSetup2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useEnable2FA', () => {
    it('유효한 토큰으로 2FA를 성공적으로 활성화해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.enable).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useEnable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123456');

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(twoFactorApi.enable).toHaveBeenCalledWith('mock-token', '123456');
    });

    it('잘못된 토큰으로 2FA 활성화 실패 시 에러를 던져야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.enable).mockResolvedValue({
        data: null,
        error: '유효하지 않은 인증 코드입니다.',
      });

      // Execute
      const { result } = renderHook(() => useEnable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('000000');

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDisable2FA', () => {
    it('올바른 비밀번호로 2FA를 성공적으로 비활성화해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.disable).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useDisable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('password123');

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(twoFactorApi.disable).toHaveBeenCalledWith('mock-token', 'password123');
    });

    it('잘못된 비밀번호로 2FA 비활성화 실패 시 에러를 던져야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.disable).mockResolvedValue({
        data: null,
        error: '비밀번호가 일치하지 않습니다.',
      });

      // Execute
      const { result } = renderHook(() => useDisable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('wrongpassword');

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRegenerateBackupCodes', () => {
    it('백업 코드를 성공적으로 재생성해야 함', async () => {
      // Setup
      const newBackupCodes = ['NEW1', 'NEW2', 'NEW3'];
      vi.mocked(twoFactorApi.regenerateBackupCodes).mockResolvedValue({
        data: { backupCodes: newBackupCodes },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useRegenerateBackupCodes(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newBackupCodes);
      expect(twoFactorApi.regenerateBackupCodes).toHaveBeenCalled();
    });

    it('재생성 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.regenerateBackupCodes).mockResolvedValue({
        data: null,
        error: 'Update failed',
      });

      // Execute
      const { result } = renderHook(() => useRegenerateBackupCodes(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useVerify2FA', () => {
    it('유효한 TOTP 토큰으로 인증을 성공해야 함', async () => {
      // Setup - 훅은 result.data?.success를 확인
      vi.mocked(twoFactorApi.verify).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useVerify2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ token: '123456', isBackupCode: false });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(twoFactorApi.verify).toHaveBeenCalledWith('mock-token', '123456', false);
    });

    it('유효한 백업 코드로 인증을 성공해야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.verify).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useVerify2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ token: 'BACKUP1', isBackupCode: true });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(twoFactorApi.verify).toHaveBeenCalledWith('mock-token', 'BACKUP1', true);
    });

    it('잘못된 토큰으로 인증 실패 시 에러를 던져야 함', async () => {
      // Setup
      vi.mocked(twoFactorApi.verify).mockResolvedValue({
        data: null,
        error: '유효하지 않은 인증 코드입니다.',
      });

      // Execute
      const { result } = renderHook(() => useVerify2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ token: 'INVALID', isBackupCode: false });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
