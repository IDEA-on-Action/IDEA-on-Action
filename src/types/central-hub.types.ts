/**
 * Central Hub 타입 정의
 *
 * IDEA on Action이 Minu 서비스들의 중심 허브 역할을 위한 타입들
 *
 * @module types/central-hub
 */

// ============================================================================
// 기본 타입
// ============================================================================

/**
 * Minu 서비스 ID
 */
export type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';

/**
 * 이벤트 유형
 */
export type EventType =
  | 'progress.updated'      // 진행 상태 업데이트
  | 'task.completed'        // 작업 완료
  | 'task.started'          // 작업 시작
  | 'milestone.reached'     // 마일스톤 달성
  | 'issue.created'         // 이슈 생성
  | 'issue.resolved'        // 이슈 해결
  | 'issue.updated'         // 이슈 업데이트
  | 'service.health'        // 서비스 헬스 체크
  | 'user.action';          // 사용자 액션 로그

/**
 * 이슈 심각도
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 이슈 상태
 */
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

/**
 * 서비스 헬스 상태
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// 엔티티 타입
// ============================================================================

/**
 * 서비스 이벤트
 */
export interface ServiceEvent {
  id: string;
  service_id: ServiceId;
  event_type: EventType;
  project_id?: string;
  user_id?: string;
  payload: ServiceEventPayload;
  created_at: string;
}

/**
 * 서비스 이벤트 페이로드 (event_type별 상세 데이터)
 */
export interface ServiceEventPayload {
  // progress.updated
  stage?: string;
  progress?: number;
  message?: string;

  // task 관련
  task_id?: string;
  task_name?: string;

  // milestone
  milestone_id?: string;
  milestone_name?: string;

  // issue 관련
  issue_id?: string;
  severity?: IssueSeverity;
  title?: string;
  description?: string;

  // health
  status?: HealthStatus;
  metrics?: HealthMetrics;

  // 기타
  [key: string]: unknown;
}

/**
 * 서비스 이슈
 */
export interface ServiceIssue {
  id: string;
  service_id: ServiceId;
  severity: IssueSeverity;
  title: string;
  description?: string;
  status: IssueStatus;
  project_id?: string;
  reported_by?: string;
  assigned_to?: string;
  resolved_at?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 서비스 헬스
 */
export interface ServiceHealth {
  service_id: ServiceId;
  status: HealthStatus;
  last_ping?: string;
  metrics: HealthMetrics;
  updated_at: string;
}

/**
 * 헬스 메트릭
 */
export interface HealthMetrics {
  response_time_ms?: number;
  error_rate?: number;
  request_count?: number;
  uptime_percent?: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  [key: string]: unknown;
}

// ============================================================================
// 웹훅 타입
// ============================================================================

/**
 * 웹훅 요청 페이로드
 */
export interface WebhookPayload {
  event_type: EventType;
  project_id?: string;
  user_id?: string;
  payload: ServiceEventPayload;
  timestamp: string;
}

/**
 * 웹훅 응답
 */
export interface WebhookResponse {
  received: boolean;
  event_id?: string;
  error?: string;
}

/**
 * 웹훅 헤더
 */
export interface WebhookHeaders {
  'X-Service-Id': ServiceId;
  'X-Signature': string;
  'X-Timestamp': string;
  'Content-Type': 'application/json';
}

// ============================================================================
// 필터 및 쿼리 타입
// ============================================================================

/**
 * 이벤트 필터
 */
export interface ServiceEventFilter {
  service_id?: ServiceId;
  event_type?: EventType;
  project_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * 이슈 필터
 */
export interface ServiceIssueFilter {
  service_id?: ServiceId;
  severity?: IssueSeverity;
  status?: IssueStatus;
  project_id?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// UI 컴포넌트 타입
// ============================================================================

/**
 * 서비스 정보 (UI용)
 */
export interface ServiceInfo {
  id: ServiceId;
  name: string;
  description: string;
  icon: string;
  color: string;
  url?: string;
}

/**
 * 서비스 메타데이터
 */
export const SERVICE_INFO: Record<ServiceId, ServiceInfo> = {
  'minu-find': {
    id: 'minu-find',
    name: 'Minu Find',
    description: '사업기회 탐색',
    icon: 'Search',
    color: '#3B82F6', // blue-500
  },
  'minu-frame': {
    id: 'minu-frame',
    name: 'Minu Frame',
    description: '문제정의 & RFP',
    icon: 'Frame',
    color: '#8B5CF6', // violet-500
  },
  'minu-build': {
    id: 'minu-build',
    name: 'Minu Build',
    description: '프로젝트 진행',
    icon: 'Hammer',
    color: '#F59E0B', // amber-500
  },
  'minu-keep': {
    id: 'minu-keep',
    name: 'Minu Keep',
    description: '운영/유지보수',
    icon: 'Shield',
    color: '#10B981', // emerald-500
  },
};

/**
 * 심각도별 색상
 */
export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: '#EF4444', // red-500
  high: '#F97316',     // orange-500
  medium: '#EAB308',   // yellow-500
  low: '#22C55E',      // green-500
};

/**
 * 상태별 색상
 */
export const STATUS_COLORS: Record<IssueStatus, string> = {
  open: '#EF4444',       // red-500
  in_progress: '#3B82F6', // blue-500
  resolved: '#22C55E',   // green-500
  closed: '#6B7280',     // gray-500
};

/**
 * 헬스 상태별 색상
 */
export const HEALTH_COLORS: Record<HealthStatus, string> = {
  healthy: '#22C55E',   // green-500
  degraded: '#EAB308',  // yellow-500
  unhealthy: '#EF4444', // red-500
  unknown: '#6B7280',   // gray-500
};
