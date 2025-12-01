/**
 * MCP 에러 표시 UI
 *
 * @description 서비스 접근 중 발생한 에러를 표시하고 재시도 옵션 제공
 */

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';

/**
 * MCPError 컴포넌트 Props
 */
export interface MCPErrorProps {
  /** 발생한 에러 객체 */
  error: Error;
  /** 재시도 버튼 클릭 핸들러 (선택사항) */
  onRetry?: () => void;
}

/**
 * MCP 에러 표시 UI
 *
 * 서비스 접근 중 발생한 에러를 사용자에게 알리고,
 * 재시도 옵션을 제공합니다.
 *
 * @example
 * ```tsx
 * <MCPError
 *   error={new Error('서비스 연결 실패')}
 *   onRetry={() => window.location.reload()}
 * />
 * ```
 */
export function MCPError({ error, onRetry }: MCPErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류가 발생했습니다</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error.message}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="bg-white hover:bg-gray-100 text-destructive border-destructive/30"
              >
                다시 시도
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default MCPError;
