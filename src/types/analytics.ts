/**
 * Analytics 타입 정의
 * 통계, 차트, KPI 관련 타입
 */

// ============================================
// StatsCard 타입
// ============================================

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatItem {
  /** 통계 제목 */
  title: string
  /** 통계 값 */
  value: string | number
  /** 변화율 (%) */
  change?: number
  /** 트렌드 방향 */
  trend?: TrendDirection
  /** 아이콘 컴포넌트 */
  icon?: React.ReactNode
  /** 설명 텍스트 */
  description?: string
}

// ============================================
// 숫자 포맷팅 유틸리티
// ============================================

/**
 * 숫자를 천 단위 구분자로 포맷팅
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('ko-KR', options).format(value)
}

/**
 * 숫자를 원화 포맷으로 변환
 * @example formatCurrency(12345) → "₩12,345"
 */
export function formatCurrency(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}

/**
 * 숫자를 백분율로 변환
 * @example formatPercent(0.1234) → "12.34%"
 * @example formatPercent(12.34, { isDecimal: false }) → "12.34%"
 */
export function formatPercent(
  value: number,
  options?: { decimals?: number; isDecimal?: boolean }
): string {
  const { decimals = 2, isDecimal = true } = options || {}
  const percent = isDecimal ? value * 100 : value
  return `${percent.toFixed(decimals)}%`
}

/**
 * 큰 숫자를 축약 형식으로 변환
 * @example formatCompactNumber(1234567) → "1.2M"
 * @example formatCompactNumber(1234) → "1.2K"
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B` // Billion
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M` // Million
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K` // Thousand
  }
  return value.toString()
}

/**
 * 원화를 축약 형식으로 변환 (한국식)
 * @example formatKoreanCurrency(12345678) → "₩1,234만"
 * @example formatKoreanCurrency(123456789) → "₩1억 2,345만"
 */
export function formatKoreanCurrency(value: number): string {
  if (value >= 100_000_000) {
    // 1억 이상
    const eok = Math.floor(value / 100_000_000)
    const man = Math.floor((value % 100_000_000) / 10_000)
    if (man === 0) {
      return `₩${eok}억`
    }
    return `₩${eok}억 ${man.toLocaleString()}만`
  }
  if (value >= 10_000) {
    // 1만 이상
    const man = Math.floor(value / 10_000)
    const remainder = value % 10_000
    if (remainder === 0) {
      return `₩${man.toLocaleString()}만`
    }
    return `₩${man.toLocaleString()}만 ${remainder.toLocaleString()}`
  }
  return `₩${value.toLocaleString()}`
}

// ============================================
// 차트 데이터 타입
// ============================================

export interface ChartDataPoint {
  /** X축 레이블 */
  label: string
  /** Y축 값 */
  value: number
  /** 추가 데이터 (툴팁 등) */
  metadata?: Record<string, unknown>
}

export interface TimeSeriesDataPoint {
  /** 날짜/시간 */
  date: string | Date
  /** 값 */
  value: number
  /** 추가 메트릭 */
  [key: string]: string | number | Date
}

// ============================================
// KPI 타입
// ============================================

export interface KPIMetric {
  /** KPI 이름 */
  name: string
  /** 현재 값 */
  value: number
  /** 목표 값 */
  target?: number
  /** 이전 기간 값 (비교용) */
  previousValue?: number
  /** 변화율 (%) */
  changePercent?: number
  /** 트렌드 방향 */
  trend?: TrendDirection
  /** 단위 (예: "원", "건", "%") */
  unit?: string
}

// ============================================
// 날짜 범위 타입
// ============================================

export interface DateRange {
  /** 시작 날짜 */
  start: Date
  /** 종료 날짜 */
  end: Date
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom'

// ============================================
// 분석 필터 타입
// ============================================

export interface AnalyticsFilter {
  /** 날짜 범위 */
  dateRange: DateRange
  /** 서비스 ID 필터 */
  serviceIds?: string[]
  /** 사용자 세그먼트 */
  segment?: 'all' | 'new' | 'returning'
  /** 정렬 기준 */
  sortBy?: string
  /** 정렬 순서 */
  sortOrder?: 'asc' | 'desc'
}
