/**
 * Push Notifications Utilities
 *
 * PWA 푸시 알림 관련 유틸리티 함수들을 제공합니다.
 *
 * 기능:
 * - 알림 권한 요청
 * - 푸시 구독 생성/해제
 * - 알림 표시
 *
 * 주의: 실제 푸시 알림 서버 연동은 별도 구현 필요
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Push_API
 */

// 푸시 알림 권한 상태
export type NotificationPermission = "default" | "granted" | "denied";

// 푸시 구독 옵션
interface PushSubscriptionOptions {
  userVisibleOnly?: boolean;
  applicationServerKey?: string;
}

/**
 * 브라우저가 푸시 알림을 지원하는지 확인
 */
export function isPushNotificationSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * 현재 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return "denied";
  }
  return Notification.permission as NotificationPermission;
}

/**
 * 알림 권한 요청
 *
 * @returns Promise<NotificationPermission> - 권한 상태
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn("푸시 알림이 지원되지 않는 브라우저입니다.");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  } catch (error) {
    console.error("알림 권한 요청 실패:", error);
    return "denied";
  }
}

/**
 * 서비스 워커 등록 확인
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("서비스 워커 등록 실패:", error);
    return null;
  }
}

/**
 * 푸시 구독 생성
 *
 * @param options - 구독 옵션
 * @returns Promise<PushSubscription | null> - 푸시 구독 객체
 *
 * @example
 * const subscription = await subscribeToPush({
 *   applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
 * });
 */
export async function subscribeToPush(
  options: PushSubscriptionOptions = {}
): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.warn("푸시 알림이 지원되지 않습니다.");
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    console.warn("알림 권한이 거부되었습니다.");
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    console.error("서비스 워커가 등록되지 않았습니다.");
    return null;
  }

  try {
    // 기존 구독 확인
    const existingSubscription =
      await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // 새 구독 생성
    const subscriptionOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: options.userVisibleOnly ?? true,
    };

    // VAPID 키가 있는 경우 추가
    if (options.applicationServerKey) {
      subscriptionOptions.applicationServerKey = urlBase64ToUint8Array(
        options.applicationServerKey
      );
    }

    const subscription =
      await registration.pushManager.subscribe(subscriptionOptions);
    return subscription;
  } catch (error) {
    console.error("푸시 구독 생성 실패:", error);
    return null;
  }
}

/**
 * 푸시 구독 해제
 *
 * @returns Promise<boolean> - 해제 성공 여부
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error("푸시 구독 해제 실패:", error);
    return false;
  }
}

/**
 * 현재 푸시 구독 상태 확인
 *
 * @returns Promise<PushSubscription | null> - 현재 구독 객체
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error("푸시 구독 확인 실패:", error);
    return null;
  }
}

/**
 * 로컬 알림 표시 (테스트용)
 *
 * @param title - 알림 제목
 * @param options - 알림 옵션
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  const permission = getNotificationPermission();
  if (permission !== "granted") {
    console.warn("알림 권한이 없습니다.");
    return;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    // 서비스 워커 없이 직접 알림 표시
    new Notification(title, {
      icon: "/pwa-192x192.png",
      badge: "/favicon-32x32.png",
      ...options,
    });
    return;
  }

  // 서비스 워커를 통한 알림 표시
  await registration.showNotification(title, {
    icon: "/pwa-192x192.png",
    badge: "/favicon-32x32.png",
    vibrate: [200, 100, 200],
    ...options,
  });
}

/**
 * Base64 URL을 Uint8Array로 변환 (VAPID 키 변환용)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 푸시 알림 설정 UI에서 사용할 유틸리티
 */
export const PushNotificationStatus = {
  /**
   * 푸시 알림 전체 상태 확인
   */
  async getStatus(): Promise<{
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  }> {
    const supported = isPushNotificationSupported();
    const permission = getNotificationPermission();
    const subscription = await getCurrentPushSubscription();

    return {
      supported,
      permission,
      subscribed: subscription !== null,
    };
  },

  /**
   * 푸시 알림 활성화
   */
  async enable(vapidPublicKey?: string): Promise<{
    success: boolean;
    subscription: PushSubscription | null;
    error?: string;
  }> {
    if (!isPushNotificationSupported()) {
      return {
        success: false,
        subscription: null,
        error: "푸시 알림이 지원되지 않는 브라우저입니다.",
      };
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return {
        success: false,
        subscription: null,
        error: "알림 권한이 거부되었습니다.",
      };
    }

    const subscription = await subscribeToPush({
      applicationServerKey: vapidPublicKey,
    });

    if (!subscription) {
      return {
        success: false,
        subscription: null,
        error: "푸시 구독 생성에 실패했습니다.",
      };
    }

    return {
      success: true,
      subscription,
    };
  },

  /**
   * 푸시 알림 비활성화
   */
  async disable(): Promise<boolean> {
    return unsubscribeFromPush();
  },

  /**
   * 테스트 알림 발송
   */
  async sendTestNotification(): Promise<void> {
    await showLocalNotification("IDEA on Action", {
      body: "푸시 알림이 정상적으로 설정되었습니다!",
      tag: "test-notification",
      renotify: true,
      data: {
        url: "/",
        timestamp: Date.now(),
      },
    });
  },
};

export default PushNotificationStatus;
