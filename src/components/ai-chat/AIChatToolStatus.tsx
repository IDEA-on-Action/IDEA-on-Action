/**
 * AI Chat Tool Status
 *
 * Claude Tool Use 실행 상태를 표시하는 컴포넌트
 * - 도구 실행 중 로딩 인디케이터
 * - 실행 중인 도구 이름 표시
 *
 * @module components/ai-chat/AIChatToolStatus
 */

import { Loader2 } from 'lucide-react';

interface AIChatToolStatusProps {
  /** 현재 실행 중인 도구 이름 (null이면 표시 안 함) */
  toolName: string | null;
}

/** 도구 이름 → 한글 표시명 매핑 */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_issues: '이슈 조회',
  get_events: '이벤트 조회',
  get_health: '상태 확인',
  get_projects: '프로젝트 조회',
};

/**
 * 도구 실행 상태 표시 컴포넌트
 *
 * @example
 * ```tsx
 * <AIChatToolStatus toolName="get_issues" />
 * // 결과: "🔄 이슈 조회 실행 중..."
 *
 * <AIChatToolStatus toolName={null} />
 * // 결과: 아무것도 렌더링하지 않음
 * ```
 */
export function AIChatToolStatus({ toolName }: AIChatToolStatusProps) {
  if (!toolName) return null;

  const displayName = TOOL_DISPLAY_NAMES[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">
        {displayName} 실행 중...
      </span>
    </div>
  );
}

export default AIChatToolStatus;
