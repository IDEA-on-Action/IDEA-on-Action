/**
 * D1 데이터베이스 모니터링 타입 정의
 * Cloudflare D1 성능 메트릭 및 통계
 */

// ============================================
// 테이블 통계
// ============================================

export interface D1TableStats {
  /** 테이블 이름 */
  name: string
  /** 행 수 */
  rowCount: number
  /** 테이블 크기 (바이트) */
  sizeBytes: number
  /** 인덱스 수 */
  indexCount: number
  /** 마지막 수정 시간 */
  lastModified?: string
}

// ============================================
// 쿼리 성능
// ============================================

export interface D1QueryStats {
  /** 총 쿼리 수 */
  totalQueries: number
  /** 평균 실행 시간 (ms) */
  avgExecutionTime: number
  /** 최대 실행 시간 (ms) */
  maxExecutionTime: number
  /** 최소 실행 시간 (ms) */
  minExecutionTime: number
  /** 슬로우 쿼리 수 (100ms 이상) */
  slowQueries: number
  /** 실패한 쿼리 수 */
  failedQueries: number
}

export interface D1SlowQuery {
  /** 쿼리 문자열 (첫 100자) */
  query: string
  /** 실행 시간 (ms) */
  executionTime: number
  /** 실행 시간 */
  timestamp: string
  /** 영향 받은 행 수 */
  rowsAffected?: number
}

// ============================================
// 데이터베이스 상태
// ============================================

export type D1HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface D1DatabaseHealth {
  /** 상태 */
  status: D1HealthStatus
  /** 응답 시간 (ms) */
  responseTime: number
  /** 마지막 체크 시간 */
  lastChecked: string
  /** 에러 메시지 (있는 경우) */
  error?: string
}

// ============================================
// 시간별 메트릭
// ============================================

export interface D1TimeSeriesPoint {
  /** 타임스탬프 */
  timestamp: string
  /** 쿼리 수 */
  queries: number
  /** 평균 응답 시간 (ms) */
  avgResponseTime: number
  /** 에러 수 */
  errors: number
}

// ============================================
// 종합 메트릭
// ============================================

export interface D1Metrics {
  /** 데이터베이스 상태 */
  health: D1DatabaseHealth
  /** 테이블별 통계 */
  tables: D1TableStats[]
  /** 쿼리 성능 통계 */
  queryStats: D1QueryStats
  /** 슬로우 쿼리 목록 (최근 10개) */
  slowQueries: D1SlowQuery[]
  /** 시간별 메트릭 (최근 24시간) */
  timeSeries: D1TimeSeriesPoint[]
  /** 총 테이블 수 */
  totalTables: number
  /** 총 데이터베이스 크기 (바이트) */
  totalSizeBytes: number
  /** 메트릭 수집 시간 */
  collectedAt: string
}

// ============================================
// API 응답
// ============================================

export interface D1MonitoringResponse {
  success: boolean
  data?: D1Metrics
  error?: string
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 * @example formatBytes(1024) → "1 KB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 밀리초를 읽기 쉬운 형식으로 변환
 * @example formatDuration(1500) → "1.5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * 상태에 따른 색상 클래스 반환
 */
export function getStatusColor(status: D1HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500'
    case 'degraded':
      return 'text-yellow-500'
    case 'unhealthy':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * 상태에 따른 배지 variant 반환
 */
export function getStatusBadgeVariant(
  status: D1HealthStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'healthy':
      return 'default'
    case 'degraded':
      return 'secondary'
    case 'unhealthy':
      return 'destructive'
    default:
      return 'outline'
  }
}
