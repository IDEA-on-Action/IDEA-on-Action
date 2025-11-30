/**
 * 브라우저 알림 유틸리티
 *
 * 브라우저 Notification API를 활용한 데스크톱 알림 기능
 *
 * @module utils/notifications
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface NotificationOptions {
  /** 알림 본문 */
  body?: string;
  /** 알림 아이콘 */
  icon?: string;
  /** 알림 뱃지 */
  badge?: string;
  /** 알림 태그 (중복 방지용) */
  tag?: string;
  /** 알림 데이터 (커스텀 데이터) */
  data?: unknown;
  /** 진동 패턴 (모바일) */
  vibrate?: number[];
  /** 무음 알림 */
  silent?: boolean;
  /** 알림 클릭 핸들러 */
  onClick?: () => void;
  /** 알림 닫기 핸들러 */
  onClose?: () => void;
  /** 알림 에러 핸들러 */
  onError?: (error: Event) => void;
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_ICON = '/favicon.ico';
const DEFAULT_BADGE = '/favicon.ico';

// ============================================================================
// 권한 관리
// ============================================================================

/**
 * 브라우저 알림 지원 여부 확인
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * 현재 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }

  return Notification.permission as NotificationPermission;
}

/**
 * 알림 권한이 허용되었는지 확인
 */
export function isNotificationGranted(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * 알림 권한 요청
 *
 * @returns 권한 상태
 *
 * @example
 * ```ts
 * const permission = await requestNotificationPermission();
 * if (permission === 'granted') {
 *   showBrowserNotification('알림 테스트', { body: '알림이 허용되었습니다.' });
 * }
 * ```
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

// ============================================================================
// 알림 표시
// ============================================================================

/**
 * 브라우저 알림 표시
 *
 * @param title - 알림 제목
 * @param options - 알림 옵션
 * @returns Notification 인스턴스 (null: 권한 없음 또는 지원 안 함)
 *
 * @example
 * ```ts
 * showBrowserNotification('새 이슈 발생', {
 *   body: '심각도: 높음 - 빌드 실패',
 *   icon: '/favicon.ico',
 *   tag: 'issue-123',
 *   onClick: () => {
 *     window.focus();
 *     // 이슈 상세 페이지로 이동
 *   },
 * });
 * ```
 */
export function showBrowserNotification(
  title: string,
  options: NotificationOptions = {}
): Notification | null {
  if (!isBrowserNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return null;
  }

  if (!isNotificationGranted()) {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const {
      body,
      icon = DEFAULT_ICON,
      badge = DEFAULT_BADGE,
      tag,
      data,
      vibrate,
      silent,
      onClick,
      onClose,
      onError,
    } = options;

    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      data,
      vibrate,
      silent,
      requireInteraction: false, // 자동 닫힘 허용
    });

    // 이벤트 핸들러 등록
    if (onClick) {
      notification.onclick = () => {
        onClick();
        notification.close();
      };
    } else {
      // 기본 동작: 클릭 시 창 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    if (onClose) {
      notification.onclose = onClose;
    }

    if (onError) {
      notification.onerror = onError;
    }

    // 5초 후 자동 닫기
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error('Failed to show browser notification:', error);
    return null;
  }
}

/**
 * 이슈 알림 표시 (헬퍼)
 *
 * @param issueTitle - 이슈 제목
 * @param severity - 심각도
 * @param serviceId - 서비스 ID
 * @param onClick - 클릭 핸들러
 */
export function showIssueNotification(
  issueTitle: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  serviceId: string,
  onClick?: () => void
): Notification | null {
  const severityLabels = {
    critical: '심각',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

  return showBrowserNotification(`이슈 발생: ${issueTitle}`, {
    body: `심각도: ${severityLabels[severity]} | 서비스: ${serviceId}`,
    icon: DEFAULT_ICON,
    tag: `issue-${Date.now()}`,
    onClick,
  });
}

/**
 * 이벤트 알림 표시 (헬퍼)
 *
 * @param eventMessage - 이벤트 메시지
 * @param serviceId - 서비스 ID
 * @param onClick - 클릭 핸들러
 */
export function showEventNotification(
  eventMessage: string,
  serviceId: string,
  onClick?: () => void
): Notification | null {
  return showBrowserNotification(`알림: ${eventMessage}`, {
    body: `서비스: ${serviceId}`,
    icon: DEFAULT_ICON,
    tag: `event-${Date.now()}`,
    onClick,
  });
}

// ============================================================================
// 알림 닫기
// ============================================================================

/**
 * 특정 태그의 알림 닫기
 *
 * Note: Web Notification API는 태그로 닫기 기능을 직접 제공하지 않습니다.
 * Service Worker를 사용하거나 알림 인스턴스를 관리해야 합니다.
 *
 * @param tag - 알림 태그
 */
export function closeNotificationByTag(tag: string): void {
  // 현재 Web Notification API에서는 직접 지원하지 않음
  // Service Worker 사용 시 구현 가능
  console.warn(`Closing notification by tag is not directly supported: ${tag}`);
}

/**
 * 모든 알림 닫기
 *
 * Note: Service Worker를 사용하는 경우에만 가능합니다.
 */
export function closeAllNotifications(): void {
  // Service Worker 사용 시 구현 가능
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => notification.close());
      });
    });
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 알림 권한 상태 메시지
 */
export function getPermissionStatusMessage(permission: NotificationPermission): string {
  switch (permission) {
    case 'granted':
      return '알림이 허용되었습니다.';
    case 'denied':
      return '알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.';
    case 'default':
      return '알림 권한을 요청해주세요.';
    default:
      return '알림 권한 상태를 확인할 수 없습니다.';
  }
}

/**
 * 브라우저 알림 테스트
 */
export async function testBrowserNotification(): Promise<boolean> {
  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return false;
  }

  const notification = showBrowserNotification('알림 테스트', {
    body: '브라우저 알림이 정상적으로 작동합니다.',
    icon: DEFAULT_ICON,
  });

  return notification !== null;
}

export default {
  isBrowserNotificationSupported,
  getNotificationPermission,
  isNotificationGranted,
  requestNotificationPermission,
  showBrowserNotification,
  showIssueNotification,
  showEventNotification,
  closeNotificationByTag,
  closeAllNotifications,
  getPermissionStatusMessage,
  testBrowserNotification,
};
