/**
 * AI 컴포넌트 모듈
 *
 * Claude AI 통합을 위한 UI 컴포넌트 모음
 * - AIAssistButton: AI 도우미 버튼 (드롭다운 메뉴, 단축키 지원)
 * - AIUsageDashboard: 토큰 사용량 추적 대시보드
 *
 * @module components/ai
 */

// ============================================================================
// Components
// ============================================================================

export { AIAssistButton, default as AIAssistButtonDefault } from "./AIAssistButton";
export { AIUsageDashboard, default as AIUsageDashboardDefault } from "./AIUsageDashboard";

// ============================================================================
// Types
// ============================================================================

export type {
  AIAssistOption,
  AIOptionConfig,
  AIAssistButtonProps,
} from "./AIAssistButton";

export type {
  DailyUsage,
  ModelUsage,
  UsageWarningLevel,
  UsageLimits,
  AIUsageDashboardProps,
} from "./AIUsageDashboard";

// ============================================================================
// Constants
// ============================================================================

export { AI_OPTIONS, DEFAULT_ENABLED_OPTIONS } from "./ai-options";
