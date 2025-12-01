/**
 * MCP 권한 확인 중 로딩 UI
 *
 * @description 서비스 접근 권한 확인 중 표시되는 로딩 상태 컴포넌트
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 로딩 스피너 크기 옵션
 */
type LoadingSize = 'sm' | 'md' | 'lg';

/**
 * MCPLoading 컴포넌트 Props
 */
export interface MCPLoadingProps {
  /** 표시할 메시지 (기본: "권한을 확인하고 있습니다...") */
  message?: string;
  /** 스피너 크기 (기본: 'md') */
  size?: LoadingSize;
  /** @deprecated 서비스 ID 기반 메시지 (하위 호환성) */
  serviceId?: string;
}

/**
 * 서비스 ID를 한글 서비스명으로 변환
 */
function getServiceName(serviceId: string): string {
  const names: Record<string, string> = {
    'minu-find': 'Minu Find',
    'minu-frame': 'Minu Frame',
    'minu-build': 'Minu Build',
    'minu-keep': 'Minu Keep',
  };
  return names[serviceId] ?? serviceId;
}

/**
 * 크기별 스피너 클래스 매핑
 */
const sizeClasses: Record<LoadingSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

/**
 * MCP 권한 확인 중 로딩 UI
 *
 * @example
 * ```tsx
 * <MCPLoading />
 * <MCPLoading message="권한 확인 중..." size="lg" />
 * <MCPLoading serviceId="minu-frame" />  // 하위 호환
 * ```
 */
export function MCPLoading({ serviceId, message, size = 'md' }: MCPLoadingProps) {
  const displayMessage = message ?? (
    serviceId
      ? `${getServiceName(serviceId)} 서비스 로딩 중...`
      : '권한을 확인하고 있습니다...'
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Loader2 className={cn('animate-spin text-primary mb-4', sizeClasses[size])} />
      <p className="text-muted-foreground text-center">{displayMessage}</p>
    </div>
  );
}

export default MCPLoading;
