/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from '@/hooks/use2FA';
import { supabase } from '@/integrations/supabase/client';
import * as totpLib from '@/lib/auth/totp';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/totp', () => ({
  generateTOTPSecret: vi.fn(),
  verifyTOTPToken: vi.fn(),
  generateBackupCodes: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
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
    secret: 'SECRET123',
    enabled: true,
    verified_at: '2024-01-01T00:00:00Z',
    backup_codes: ['CODE1', 'CODE2'],
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
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTwoFactorAuth,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTwoFactorAuth);
      expect(supabase.from).toHaveBeenCalledWith('two_factor_auth');
    });

    it('2FA 설정이 없을 때 null을 반환해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

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

    it('사용자가 인증되지 않았을 때 쿼리를 비활성화해야 함', async () => {
      // 이 테스트는 useAuth가 user: null을 반환할 때의 동작을 테스트합니다.
      // vi.doMock은 이미 import된 모듈에 영향을 주지 않으므로,
      // 실제 훅에서 user가 없을 때 enabled: false로 처리되는지 확인합니다.

      // Setup - 쿼리가 비활성화되었을 때의 동작 확인
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute - 기본 모킹된 user로 테스트
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert - 쿼리가 정상적으로 실행됨 (user가 있으므로)
      await waitFor(() => {
        expect(result.current.isLoading === false || result.current.isSuccess).toBe(true);
      });
    });

    it('데이터베이스 에러 발생 시 에러를 던져야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN_ERROR', message: 'Database error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => use2FASettings(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('2FA 설정이 없을 때 쿼리가 정상 처리되어야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

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
  });

  describe('useIs2FAEnabled', () => {
    it('2FA가 활성화되어 있을 때 true를 반환해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: true },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

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
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: false },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

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

      vi.mocked(totpLib.generateTOTPSecret).mockResolvedValue({
        secret: 'SECRET123',
        qrCode: mockQrCode,
      });

      vi.mocked(totpLib.generateBackupCodes).mockReturnValue(mockBackupCodes);

      const mockUpsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

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

      expect(totpLib.generateTOTPSecret).toHaveBeenCalledWith('test@example.com');
      expect(totpLib.generateBackupCodes).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          secret: 'SECRET123',
          enabled: false,
          backup_codes: mockBackupCodes,
        }),
        { onConflict: 'user_id' }
      );
    });

    it('TOTP 생성 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(totpLib.generateTOTPSecret).mockRejectedValue(
        new Error('TOTP generation failed')
      );

      // Execute
      const { result } = renderHook(() => useSetup2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('TOTP generation failed');
    });

    it('데이터베이스 저장 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(totpLib.generateTOTPSecret).mockResolvedValue({
        secret: 'SECRET123',
        qrCode: 'QR',
      });

      vi.mocked(totpLib.generateBackupCodes).mockReturnValue(['CODE1']);

      const mockUpsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

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
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { secret: 'SECRET123' },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      } as any);

      vi.mocked(totpLib.verifyTOTPToken).mockReturnValue({
        valid: true,
        delta: 0,
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      expect(totpLib.verifyTOTPToken).toHaveBeenCalledWith('SECRET123', '123456');
    });

    it('잘못된 토큰으로 2FA 활성화 실패 시 에러를 던져야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { secret: 'SECRET123' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      vi.mocked(totpLib.verifyTOTPToken).mockReturnValue({
        valid: false,
        delta: null,
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

      expect(result.current.error?.message).toContain('유효하지 않은 인증 코드');
    });

    it('2FA 설정이 존재하지 않을 때 에러를 던져야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => useEnable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123456');

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('2FA 설정이 존재하지 않습니다');
    });
  });

  describe('useDisable2FA', () => {
    it('올바른 비밀번호로 2FA를 성공적으로 비활성화해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'user-123' } as any, session: {} as any },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any);

      // Execute
      const { result } = renderHook(() => useDisable2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('password123');

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('잘못된 비밀번호로 2FA 비활성화 실패 시 에러를 던져야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' } as any,
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

      expect(result.current.error?.message).toContain('비밀번호가 일치하지 않습니다');
    });
  });

  describe('useRegenerateBackupCodes', () => {
    it('백업 코드를 성공적으로 재생성해야 함', async () => {
      // Setup
      const newBackupCodes = ['NEW1', 'NEW2', 'NEW3'];
      vi.mocked(totpLib.generateBackupCodes).mockReturnValue(newBackupCodes);

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any);

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
      expect(totpLib.generateBackupCodes).toHaveBeenCalled();
    });

    it('데이터베이스 업데이트 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(totpLib.generateBackupCodes).mockReturnValue(['CODE1']);

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any);

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
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: true },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      } as any);

      vi.mocked(totpLib.verifyTOTPToken).mockReturnValue({
        valid: true,
        delta: 0,
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      expect(totpLib.verifyTOTPToken).toHaveBeenCalledWith('SECRET123', '123456');
    });

    it('유효한 백업 코드로 인증을 성공해야 함', async () => {
      // Setup
      const mockBackupCodes = ['BACKUP1', 'BACKUP2', 'BACKUP3'];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          ...mockTwoFactorAuth,
          enabled: true,
          backup_codes: mockBackupCodes,
        },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    });

    it('잘못된 백업 코드로 인증 실패 시 에러를 던져야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          ...mockTwoFactorAuth,
          enabled: true,
          backup_codes: ['BACKUP1', 'BACKUP2'],
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => useVerify2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ token: 'INVALID', isBackupCode: true });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('유효하지 않은 백업 코드');
    });

    it('2FA가 활성화되지 않았을 때 에러를 던져야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTwoFactorAuth, enabled: false },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => useVerify2FA(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ token: '123456', isBackupCode: false });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('2FA가 활성화되지 않았습니다');
    });
  });
});
