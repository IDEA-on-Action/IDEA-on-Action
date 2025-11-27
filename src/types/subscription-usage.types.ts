/**
 * Subscription Usage Types
 *
 * 구독 사용량 추적 및 기능 제한 관련 타입 정의
 *
 * @module types/subscription-usage
 */

import type { SubscriptionStatus, BillingCycle } from './subscription.types'

// ============================================================================
// Enums
// ============================================================================

/**
 * 기능 제한 타입
 */
export type LimitType =
  | 'count'      // 횟수 제한 (예: API 호출 1000회)
  | 'boolean'    // 사용 가능 여부 (예: 고급 기능 ON/OFF)
  | 'size'       // 용량 제한 (예: 파일 업로드 100MB)
  | 'duration'   // 시간 제한 (예: 세션 타임아웃 60분)

/**
 * 기능 카테고리
 */
export type FeatureCategory =
  | 'find'       // Minu Find 기능
  | 'frame'      // Minu Frame 기능
  | 'build'      // Minu Build 기능
  | 'keep'       // Minu Keep 기능
  | 'common'     // 공통 기능

/**
 * 사용량 집계 주기
 */
export type UsagePeriod =
  | 'daily'      // 일일
  | 'weekly'     // 주간
  | 'monthly'    // 월간
  | 'yearly'     // 연간

// ============================================================================
// Feature Key Definitions
// ============================================================================

/**
 * 기능 키 (타입 안전)
 *
 * 플랜별 기능 제한을 식별하는 고유 키
 */
export type FeatureKey =
  // ============================================================================
  // Minu Find - 시장 분석 및 사업 기회 탐색
  // ============================================================================
  | 'find_market_search'           // 시장 조사 (횟수)
  | 'find_competitor_analysis'     // 경쟁사 분석 (횟수)
  | 'find_trend_report'            // 트렌드 보고서 생성 (횟수)
  | 'find_export_excel'            // Excel 내보내기 (boolean)
  | 'find_ai_insights'             // AI 인사이트 (boolean)
  | 'find_custom_industry'         // 산업 커스터마이징 (boolean)
  | 'find_api_access'              // API 접근 (boolean)
  // ============================================================================
  // Minu Frame - 문서 및 RFP 생성
  // ============================================================================
  | 'frame_document_generate'      // 문서 생성 (횟수)
  | 'frame_rfp_create'             // RFP 생성 (횟수)
  | 'frame_template_use'           // 템플릿 사용 (횟수)
  | 'frame_custom_template'        // 커스텀 템플릿 생성 (boolean)
  | 'frame_collaboration'          // 협업 기능 (boolean)
  | 'frame_version_history'        // 버전 관리 (boolean)
  | 'frame_export_formats'         // 다양한 포맷 내보내기 (boolean)
  // ============================================================================
  // Minu Build - 프로젝트 관리
  // ============================================================================
  | 'build_project_create'         // 프로젝트 생성 (횟수)
  | 'build_sprint_manage'          // 스프린트 관리 (횟수/프로젝트)
  | 'build_team_invite'            // 팀원 초대 (횟수/프로젝트)
  | 'build_task_automation'        // 작업 자동화 (boolean)
  | 'build_gantt_chart'            // 간트 차트 (boolean)
  | 'build_burndown_chart'         // 번다운 차트 (boolean)
  | 'build_integration_github'     // GitHub 연동 (boolean)
  | 'build_integration_jira'       // Jira 연동 (boolean)
  // ============================================================================
  // Minu Keep - 운영 및 모니터링
  // ============================================================================
  | 'keep_monitoring_service'      // 모니터링 서비스 수 (횟수)
  | 'keep_alert_rule'              // 알림 규칙 (횟수)
  | 'keep_report_generate'         // 보고서 생성 (횟수/월)
  | 'keep_log_retention_days'      // 로그 보관 기간 (일수)
  | 'keep_custom_dashboard'        // 커스텀 대시보드 (boolean)
  | 'keep_sla_monitoring'          // SLA 모니터링 (boolean)
  | 'keep_incident_management'     // 장애 관리 (boolean)
  // ============================================================================
  // Common - 공통 기능
  // ============================================================================
  | 'common_storage_gb'            // 스토리지 용량 (GB)
  | 'common_api_calls_per_day'     // API 호출 횟수/일
  | 'common_export_pdf'            // PDF 내보내기 (boolean)
  | 'common_export_excel'          // Excel 내보내기 (boolean)
  | 'common_export_pptx'           // PowerPoint 내보내기 (boolean)
  | 'common_priority_support'      // 우선 지원 (boolean)
  | 'common_sso'                   // SSO 로그인 (boolean)
  | 'common_white_label'           // 화이트 라벨 (boolean)

/**
 * 기능 키 설명 매핑
 */
export const FEATURE_KEY_DESCRIPTIONS: Record<FeatureKey, string> = {
  // Minu Find
  find_market_search: '시장 조사 횟수',
  find_competitor_analysis: '경쟁사 분석 횟수',
  find_trend_report: '트렌드 보고서 생성 횟수',
  find_export_excel: 'Excel 내보내기',
  find_ai_insights: 'AI 인사이트 제공',
  find_custom_industry: '산업 커스터마이징',
  find_api_access: 'API 접근 권한',
  // Minu Frame
  frame_document_generate: '문서 생성 횟수',
  frame_rfp_create: 'RFP 생성 횟수',
  frame_template_use: '템플릿 사용 횟수',
  frame_custom_template: '커스텀 템플릿 생성',
  frame_collaboration: '협업 기능',
  frame_version_history: '버전 관리',
  frame_export_formats: '다양한 포맷 내보내기',
  // Minu Build
  build_project_create: '프로젝트 생성 횟수',
  build_sprint_manage: '스프린트 관리 횟수',
  build_team_invite: '팀원 초대 횟수',
  build_task_automation: '작업 자동화',
  build_gantt_chart: '간트 차트',
  build_burndown_chart: '번다운 차트',
  build_integration_github: 'GitHub 연동',
  build_integration_jira: 'Jira 연동',
  // Minu Keep
  keep_monitoring_service: '모니터링 서비스 수',
  keep_alert_rule: '알림 규칙 수',
  keep_report_generate: '보고서 생성 횟수',
  keep_log_retention_days: '로그 보관 기간 (일)',
  keep_custom_dashboard: '커스텀 대시보드',
  keep_sla_monitoring: 'SLA 모니터링',
  keep_incident_management: '장애 관리',
  // Common
  common_storage_gb: '스토리지 용량 (GB)',
  common_api_calls_per_day: 'API 호출 횟수/일',
  common_export_pdf: 'PDF 내보내기',
  common_export_excel: 'Excel 내보내기',
  common_export_pptx: 'PowerPoint 내보내기',
  common_priority_support: '우선 지원',
  common_sso: 'SSO 로그인',
  common_white_label: '화이트 라벨',
}

/**
 * 기능 키 카테고리 매핑
 */
export const FEATURE_KEY_CATEGORIES: Record<FeatureKey, FeatureCategory> = {
  // Minu Find
  find_market_search: 'find',
  find_competitor_analysis: 'find',
  find_trend_report: 'find',
  find_export_excel: 'find',
  find_ai_insights: 'find',
  find_custom_industry: 'find',
  find_api_access: 'find',
  // Minu Frame
  frame_document_generate: 'frame',
  frame_rfp_create: 'frame',
  frame_template_use: 'frame',
  frame_custom_template: 'frame',
  frame_collaboration: 'frame',
  frame_version_history: 'frame',
  frame_export_formats: 'frame',
  // Minu Build
  build_project_create: 'build',
  build_sprint_manage: 'build',
  build_team_invite: 'build',
  build_task_automation: 'build',
  build_gantt_chart: 'build',
  build_burndown_chart: 'build',
  build_integration_github: 'build',
  build_integration_jira: 'build',
  // Minu Keep
  keep_monitoring_service: 'keep',
  keep_alert_rule: 'keep',
  keep_report_generate: 'keep',
  keep_log_retention_days: 'keep',
  keep_custom_dashboard: 'keep',
  keep_sla_monitoring: 'keep',
  keep_incident_management: 'keep',
  // Common
  common_storage_gb: 'common',
  common_api_calls_per_day: 'common',
  common_export_pdf: 'common',
  common_export_excel: 'common',
  common_export_pptx: 'common',
  common_priority_support: 'common',
  common_sso: 'common',
  common_white_label: 'common',
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * 플랜 기능 (plan_features 테이블)
 *
 * 각 플랜별로 제공되는 기능과 제한 정의
 */
export interface PlanFeature {
  /** 기능 고유 ID (UUID) */
  id: string
  /** 플랜 ID (FK: subscription_plans.id) */
  plan_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 제한값 (null = 무제한) */
  limit_value: number | null
  /** 제한 타입 */
  limit_type: LimitType
  /** 기능 설명 */
  description: string
  /** 생성 일시 (ISO 8601) */
  created_at: string
  /** 수정 일시 (ISO 8601) */
  updated_at: string
}

/**
 * 구독 사용량 (subscription_usage 테이블)
 *
 * 사용자의 기능별 사용량 추적
 */
export interface SubscriptionUsage {
  /** 사용량 레코드 ID (UUID) */
  id: string
  /** 구독 ID (FK: subscriptions.id) */
  subscription_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 사용 횟수 */
  used_count: number
  /** 집계 주기 시작일 (ISO 8601) */
  period_start: string
  /** 집계 주기 종료일 (ISO 8601) */
  period_end: string
  /** 생성 일시 (ISO 8601) */
  created_at: string
  /** 수정 일시 (ISO 8601) */
  updated_at: string
}

/**
 * 사용량 이벤트 로그 (usage_events 테이블)
 *
 * 개별 사용 이벤트 상세 기록
 */
export interface UsageEvent {
  /** 이벤트 ID (UUID) */
  id: string
  /** 구독 ID */
  subscription_id: string
  /** 사용자 ID */
  user_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 이벤트 타입 */
  event_type: 'increment' | 'decrement' | 'reset'
  /** 변경량 */
  delta: number
  /** 메타데이터 (JSON) */
  metadata: Record<string, unknown> | null
  /** 발생 일시 (ISO 8601) */
  created_at: string
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * 사용량 조회 요청
 */
export interface GetUsageRequest {
  /** 구독 ID */
  subscription_id: string
  /** 기능 키 (선택, 없으면 전체) */
  feature_key?: FeatureKey
  /** 조회 시작일 (ISO 8601, 선택) */
  period_start?: string
  /** 조회 종료일 (ISO 8601, 선택) */
  period_end?: string
}

/**
 * 사용량 조회 응답
 */
export interface GetUsageResponse {
  /** 기능 키 */
  feature_key: FeatureKey
  /** 사용 횟수 */
  used_count: number
  /** 제한값 (null = 무제한) */
  limit_value: number | null
  /** 남은 횟수 (null = 무제한) */
  remaining: number | null
  /** 제한 타입 */
  limit_type: LimitType
  /** 집계 주기 시작일 */
  period_start: string
  /** 집계 주기 종료일 */
  period_end: string
  /** 사용률 (0~1, boolean 타입은 0 또는 1) */
  usage_rate: number
  /** 제한 도달 여부 */
  is_limited: boolean
}

/**
 * 사용량 증가 요청
 */
export interface IncrementUsageRequest {
  /** 구독 ID */
  subscription_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 증가량 (기본값: 1) */
  delta?: number
  /** 메타데이터 (선택) */
  metadata?: Record<string, unknown>
}

/**
 * 사용량 증가 응답
 */
export interface IncrementUsageResponse {
  /** 성공 여부 */
  success: boolean
  /** 현재 사용량 */
  current_usage: number
  /** 제한값 */
  limit_value: number | null
  /** 남은 횟수 */
  remaining: number | null
  /** 제한 도달 여부 */
  is_limited: boolean
  /** 에러 메시지 (실패 시) */
  error?: string
}

/**
 * 기능 사용 가능 여부 확인 요청
 */
export interface CheckFeatureAvailabilityRequest {
  /** 구독 ID */
  subscription_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 확인할 사용량 (기본값: 1) */
  required_count?: number
}

/**
 * 기능 사용 가능 여부 확인 응답
 */
export interface CheckFeatureAvailabilityResponse {
  /** 사용 가능 여부 */
  available: boolean
  /** 현재 사용량 */
  current_usage: number
  /** 제한값 */
  limit_value: number | null
  /** 남은 횟수 */
  remaining: number | null
  /** 거부 사유 (사용 불가 시) */
  reason?: string
  /** 업그레이드 권장 플랜 (선택) */
  suggested_plan?: {
    plan_id: string
    plan_name: string
    price: number
  }
}

// ============================================================================
// Extended Types
// ============================================================================

/**
 * 플랜 기능 + 구독 정보
 */
export interface PlanFeatureWithSubscription extends PlanFeature {
  /** 플랜 정보 */
  plan: {
    id: string
    plan_name: string
    billing_cycle: BillingCycle
    price: number
  }
}

/**
 * 구독 사용량 + 기능 정보
 */
export interface SubscriptionUsageWithFeature extends SubscriptionUsage {
  /** 기능 정보 */
  feature: {
    key: FeatureKey
    description: string
    category: FeatureCategory
    limit_type: LimitType
    limit_value: number | null
  }
}

/**
 * 사용량 대시보드 데이터
 */
export interface UsageDashboardData {
  /** 구독 정보 */
  subscription: {
    id: string
    plan_name: string
    status: SubscriptionStatus
    current_period_start: string
    current_period_end: string
  }
  /** 기능별 사용량 목록 */
  features: GetUsageResponse[]
  /** 전체 사용률 (평균) */
  overall_usage_rate: number
  /** 제한 도달 기능 수 */
  limited_features_count: number
  /** 경고 상태 기능 수 (사용률 80% 이상) */
  warning_features_count: number
}

/**
 * 사용량 통계
 */
export interface UsageStatistics {
  /** 기간 */
  period: {
    start: string
    end: string
  }
  /** 전체 사용량 */
  total_usage: number
  /** 평균 일일 사용량 */
  daily_average: number
  /** 최대 일일 사용량 */
  daily_peak: number
  /** 기능별 사용량 분포 */
  by_feature: Record<FeatureKey, number>
  /** 카테고리별 사용량 분포 */
  by_category: Record<FeatureCategory, number>
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * 사용량 상태 색상
 */
export type UsageStatusColor =
  | 'success'    // 사용률 0~50%
  | 'warning'    // 사용률 50~80%
  | 'danger'     // 사용률 80~100%
  | 'blocked'    // 제한 도달 (100%)

/**
 * 사용량 상태 판단 함수
 */
export function getUsageStatusColor(usageRate: number): UsageStatusColor {
  if (usageRate >= 1.0) return 'blocked'
  if (usageRate >= 0.8) return 'danger'
  if (usageRate >= 0.5) return 'warning'
  return 'success'
}

/**
 * 제한 타입 아이콘 매핑
 */
export const LIMIT_TYPE_ICONS: Record<LimitType, string> = {
  count: '🔢',
  boolean: '✅',
  size: '💾',
  duration: '⏱️',
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 집계 주기 (월간)
 */
export const DEFAULT_USAGE_PERIOD: UsagePeriod = 'monthly'

/**
 * 사용량 경고 임계값 (80%)
 */
export const USAGE_WARNING_THRESHOLD = 0.8

/**
 * 무제한 플랜 표시 문자열
 */
export const UNLIMITED_LABEL = '무제한'
