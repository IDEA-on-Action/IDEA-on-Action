/**
 * useAlertSettings Hook
 *
 * 알림 설정을 localStorage에 저장/로드하는 훅
 * 향후 Supabase user_preferences 테이블 연동 준비
 *
 * @module hooks/useAlertSettings
 */

import { useState, useEffect, useCallback } from 'react';
import type { AlertSettingsData } from '@/components/central-hub/AlertSettings';

// ============================================================================
// 타입 정의
// ============================================================================

export interface AlertSettings {
  /** 이메일 알림 활성화 */
  emailEnabled: boolean;
  /** 이메일 주소 */
  emailAddress: string;
  /** Slack 웹훅 활성화 */
  slackEnabled: boolean;
  /** Slack 웹훅 URL */
  slackWebhookUrl: string;
  /** 브라우저 알림 활성화 */
  browserNotifications: boolean;
  /** 소리 활성화 */
  soundEnabled: boolean;
  /** 활성화된 서비스 목록 */
  enabledServices: string[];
  /** 활성화된 심각도 목록 */
  enabledSeverities: string[];
}

export interface UseAlertSettingsReturn {
  /** 현재 설정 */
  settings: AlertSettingsData;
  /** 설정 업데이트 */
  updateSettings: (newSettings: Partial<AlertSettingsData>) => void;
  /** 설정 저장 */
  saveSettings: (settingsToSave: AlertSettingsData) => Promise<void>;
  /** 설정 리셋 */
  resetSettings: () => void;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
}

// ============================================================================
// 상수
// ============================================================================

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

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * localStorage에서 설정 로드
 */
function loadSettingsFromStorage(): AlertSettingsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored);
    // 기본값과 병합 (새로운 필드가 추가되었을 때 대비)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      serviceNotifications: {
        ...DEFAULT_SETTINGS.serviceNotifications,
        ...(parsed.serviceNotifications || {}),
      },
      severityNotifications: {
        ...DEFAULT_SETTINGS.severityNotifications,
        ...(parsed.severityNotifications || {}),
      },
    };
  } catch (error) {
    console.error('Failed to load alert settings from storage:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * localStorage에 설정 저장
 */
function saveSettingsToStorage(settings: AlertSettingsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save alert settings to storage:', error);
    throw new Error('설정 저장에 실패했습니다.');
  }
}

/**
 * localStorage에서 설정 삭제
 */
function clearSettingsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear alert settings from storage:', error);
  }
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * 알림 설정 관리 훅
 *
 * localStorage를 사용하여 알림 설정을 저장/로드합니다.
 * 향후 Supabase user_preferences 테이블과 연동할 수 있도록 설계되었습니다.
 *
 * @example
 * ```tsx
 * const { settings, updateSettings, saveSettings, resetSettings } = useAlertSettings();
 *
 * // 설정 업데이트 (즉시 반영)
 * updateSettings({ enableBrowserNotifications: true });
 *
 * // 설정 저장 (비동기)
 * await saveSettings(newSettings);
 *
 * // 설정 초기화
 * resetSettings();
 * ```
 */
export function useAlertSettings(): UseAlertSettingsReturn {
  const [settings, setSettings] = useState<AlertSettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 초기 로드
  useEffect(() => {
    try {
      setIsLoading(true);
      const loaded = loadSettingsFromStorage();
      setSettings(loaded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('설정 로드 실패'));
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 설정 업데이트 (즉시 반영 + 자동 저장)
  const updateSettings = useCallback((newSettings: Partial<AlertSettingsData>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // 자동 저장
      try {
        saveSettingsToStorage(updated);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }

      return updated;
    });
  }, []);

  // 설정 저장 (비동기)
  const saveSettings = useCallback(async (settingsToSave: AlertSettingsData) => {
    try {
      setIsLoading(true);
      setError(null);

      // localStorage 저장
      saveSettingsToStorage(settingsToSave);

      // TODO: Workers API user_preferences 엔드포인트 구현 시 연동
      // await userPreferencesApi.upsert(token, { alert_settings: settingsToSave });

      setSettings(settingsToSave);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('설정 저장 실패');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 설정 초기화
  const resetSettings = useCallback(() => {
    try {
      clearSettingsFromStorage();
      setSettings(DEFAULT_SETTINGS);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('설정 초기화 실패'));
    }
  }, []);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    error,
  };
}

export default useAlertSettings;
