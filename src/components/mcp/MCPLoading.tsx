/**
 * MCP 권한 확인 중 로딩 UI
 *
 * @description 서비스 접근 권한 확인 중 표시되는 로딩 상태 컴포넌트
 */

import { Loader2 } from 'lucide-react';

interface MCPLoadingProps {
  /** 서비스 ID (표시용) */
  serviceId?: string;
  /** 커스텀 메시지 */
  message?: string;
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
 * MCP 권한 확인 중 로딩 UI
 *
 * @example
 * ```tsx
 * <MCPLoading serviceId="minu-frame" />
 * <MCPLoading message="권한 확인 중..." />
 * ```
 */
export function MCPLoading({ serviceId, message }: MCPLoadingProps) {
  const displayMessage = message ?? (
    serviceId
      ? `${getServiceName(serviceId)} 서비스 로딩 중...`
      : '서비스 로딩 중...'
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center">{displayMessage}</p>
    </div>
  );
}

export default MCPLoading;
