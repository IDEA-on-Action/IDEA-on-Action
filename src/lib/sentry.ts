import * as Sentry from "@sentry/react";

// Sentry 초기화 함수
export function initSentry() {
  // 프로덕션 환경에서만 Sentry 활성화
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // 세션 리플레이 설정
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 1.0, // 100% of transactions (프로덕션에서는 0.1-0.2 권장)

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 에러 발생 시 100% 기록

      // Environment
      environment: import.meta.env.MODE, // 'production' or 'development'

      // Release tracking
      release: `vibe-working@${import.meta.env.VITE_APP_VERSION || "1.6.1"}`,

      // 에러 필터링 (민감한 정보 제거)
      beforeSend(event, hint) {
        // 로컬 개발 환경에서는 에러를 콘솔에만 출력
        if (window.location.hostname === "localhost") {
          console.error(hint.originalException || hint.syntheticException);
          return null;
        }

        // 민감한 정보 제거
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        return event;
      },

      // 에러 무시 패턴
      ignoreErrors: [
        // 브라우저 확장 프로그램 에러
        "top.GLOBALS",
        "chrome-extension://",
        "moz-extension://",
        // 네트워크 에러 (사용자 연결 문제)
        "NetworkError",
        "Network request failed",
        // ResizeObserver 에러 (무해한 경고)
        "ResizeObserver loop limit exceeded",
      ],
    });
  }
}

// 수동 에러 로깅
export function logError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

// 사용자 정보 설정
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

// 사용자 정보 제거 (로그아웃 시)
export function clearUser() {
  Sentry.setUser(null);
}

// 커스텀 이벤트 추적
export function trackEvent(eventName: string, data?: Record<string, unknown>) {
  Sentry.captureMessage(eventName, {
    level: "info",
    contexts: {
      event: data,
    },
  });
}
