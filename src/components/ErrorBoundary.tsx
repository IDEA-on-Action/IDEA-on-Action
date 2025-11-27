/**
 * ErrorBoundary Component
 *
 * React Error Boundary 패턴을 구현한 컴포넌트
 * - 하위 컴포넌트의 에러를 포착하여 fallback UI 표시
 * - Sentry를 통한 에러 리포팅
 * - 재시도 기능 제공
 *
 * @description
 * React의 Error Boundary 기능을 사용하여 하위 컴포넌트에서 발생한 에러를
 * 포착하고, 애플리케이션이 크래시되지 않도록 합니다. Sentry와 통합되어
 * 에러를 자동으로 리포팅합니다.
 *
 * @example
 * ```tsx
 * // App 최상위에 적용
 * function App() {
 *   return (
 *     <ErrorBoundary>
 *       <Routes>
 *         <Route path="/" element={<HomePage />} />
 *       </Routes>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 특정 섹션에만 적용
 * function Dashboard() {
 *   return (
 *     <div>
 *       <Header />
 *       <ErrorBoundary fallback={<DashboardError />}>
 *         <DashboardContent />
 *       </ErrorBoundary>
 *     </div>
 *   );
 * }
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureException } from '@/lib/sentry';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  /** 하위 컴포넌트 */
  children: ReactNode;
  /** 커스텀 fallback UI (선택) */
  fallback?: ReactNode;
  /** 에러 발생 시 콜백 (선택) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  /** 에러 발생 여부 */
  hasError: boolean;
  /** 에러 객체 */
  error: Error | null;
  /** 에러 정보 (React 컴포넌트 스택 등) */
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ErrorBoundary 클래스 컴포넌트
 *
 * @description
 * React 16에서 도입된 Error Boundary 패턴을 사용하여 에러를 포착합니다.
 * 클래스 컴포넌트로 작성되어야 하며, componentDidCatch와 getDerivedStateFromError를 사용합니다.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * 에러 발생 시 상태 업데이트
   *
   * @param error - 발생한 에러
   * @returns 업데이트할 상태
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * 에러 포착 및 Sentry 리포팅
   *
   * @param error - 발생한 에러
   * @param errorInfo - 에러 정보 (컴포넌트 스택 등)
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 상태 업데이트
    this.setState({
      errorInfo,
    });

    // Sentry 리포팅
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // 커스텀 에러 콜백 호출
    this.props.onError?.(error, errorInfo);

    // 개발 환경에서는 콘솔 로그
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  /**
   * 에러 상태 초기화 (재시도)
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 페이지 새로고침
   */
  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    // 에러가 발생하지 않았으면 children 렌더링
    if (!hasError) {
      return children;
    }

    // 커스텀 fallback이 있으면 사용
    if (fallback) {
      return fallback;
    }

    // 기본 에러 UI
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
          {/* 아이콘 */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          {/* 제목 */}
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
            문제가 발생했습니다
          </h2>

          {/* 설명 */}
          <p className="mb-6 text-center text-sm text-muted-foreground">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>

          {/* 에러 메시지 (개발 환경에서만) */}
          {import.meta.env.DEV && error && (
            <div className="mb-6 rounded-md bg-destructive/10 p-4">
              <p className="mb-2 text-sm font-semibold text-destructive">
                에러 정보 (개발 모드):
              </p>
              <pre className="overflow-x-auto text-xs text-destructive">
                {error.message}
              </pre>
              {errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    컴포넌트 스택 보기
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={this.handleReset} variant="default" className="flex-1">
              다시 시도
            </Button>
            <Button onClick={this.handleRefresh} variant="outline" className="flex-1">
              페이지 새로고침
            </Button>
          </div>

          {/* 고객센터 링크 */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            문제가 계속되면{' '}
            <a
              href="mailto:support@ideaonaction.ai"
              className="text-primary underline-offset-4 hover:underline"
            >
              고객센터
            </a>
            로 문의해주세요.
          </p>
        </div>
      </div>
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default ErrorBoundary;
