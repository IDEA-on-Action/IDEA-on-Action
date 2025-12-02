/**
 * useAlertSettings Hook 테스트
 *
 * 알림 설정 관리 훅 테스트
 * - 초기 설정 로드
 * - 설정 업데이트
 * - 설정 저장
 * - 설정 초기화
 * - localStorage 연동
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import type { AlertSettingsData } from '@/components/central-hub/AlertSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const STORAGE_KEY = 'idea-on-action:alert-settings';

const DEFAULT_SETTINGS: AlertSettingsData = {
  enableEmailNotifications: false,
  emailAddress: '',
  enableSlackWebhook: false,
  slackWebhookUrl: '',
  serviceNotifications: {
    'minu-find': true,
    'minu-frame': true,
    'minu-build': true,
    'minu-keep': true,
  },
  severityNotifications: {
    critical: true,
    high: true,
    medium: true,
    low: false,
  },
  enableBrowserNotifications: false,
  enableSound: true,
};

describe('useAlertSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('초기 상태 확인', () => {
    it('기본 설정으로 초기화되어야 함', async () => {
      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.current.error).toBeNull();
    });

    it('localStorage에서 설정을 로드해야 함', async () => {
      const customSettings: AlertSettingsData = {
        ...DEFAULT_SETTINGS,
        enableEmailNotifications: true,
        emailAddress: 'test@example.com',
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(customSettings));

      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.enableEmailNotifications).toBe(true);
      expect(result.current.settings.emailAddress).toBe('test@example.com');
    });

    it('잘못된 JSON 데이터는 기본값으로 대체되어야 함', async () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('설정 업데이트', () => {
    it('설정을 업데이트하고 자동 저장해야 함', async () => {
      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          enableEmailNotifications: true,
          emailAddress: 'updated@example.com',
        });
      });

      await waitFor(() => {
        expect(result.current.settings.enableEmailNotifications).toBe(true);
        expect(result.current.settings.emailAddress).toBe('updated@example.com');
      });

      // localStorage에 자동 저장 확인
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) || '{}');
      expect(stored.enableEmailNotifications).toBe(true);
      expect(stored.emailAddress).toBe('updated@example.com');
    });

    it('부분 업데이트를 지원해야 함', async () => {
      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          enableSound: false,
        });
      });

      await waitFor(() => {
        expect(result.current.settings.enableSound).toBe(false);
        // 다른 설정은 유지
        expect(result.current.settings.enableEmailNotifications).toBe(DEFAULT_SETTINGS.enableEmailNotifications);
      });
    });

    it('서비스 알림 설정을 업데이트해야 함', async () => {
      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({
          serviceNotifications: {
            ...DEFAULT_SETTINGS.serviceNotifications,
            'minu-find': false,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.settings.serviceNotifications['minu-find']).toBe(false);
      });
    });
  });

  describe('설정 저장', () => {
    it('설정을 저장해야 함', async () => {
      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSettings: AlertSettingsData = {
        ...DEFAULT_SETTINGS,
        enableBrowserNotifications: true,
      };

      await act(async () => {
        await result.current.saveSettings(newSettings);
      });

      expect(result.current.settings.enableBrowserNotifications).toBe(true);

      // localStorage 확인
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) || '{}');
      expect(stored.enableBrowserNotifications).toBe(true);
    });

    it('저장 실패 시 에러를 처리해야 함', async () => {
      // localStorage mock 임시 수정하여 에러 발생시키기
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Storage full');
      };

      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.saveSettings(DEFAULT_SETTINGS);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeTruthy();
      expect(error?.message).toContain('설정 저장');

      // 복원
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('설정 초기화', () => {
    it('설정을 기본값으로 초기화해야 함', async () => {
      // 커스텀 설정 저장
      const customSettings: AlertSettingsData = {
        ...DEFAULT_SETTINGS,
        enableEmailNotifications: true,
        emailAddress: 'test@example.com',
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(customSettings));

      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.enableEmailNotifications).toBe(true);

      // 초기화
      act(() => {
        result.current.resetSettings();
      });

      await waitFor(() => {
        expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      });

      // localStorage에서 제거 확인
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('로드 실패 시 기본값을 사용해야 함', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useAlertSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);

      vi.restoreAllMocks();
    });
  });
});
