/**
 * Error Handling Utilities
 *
 * 일관된 에러 핸들링 시스템
 * - Database 에러 처리
 * - API 에러 처리
 * - 개발/프로덕션 환경별 로깅
 * - Sentry 통합
 */

import axios, { AxiosError } from 'axios'
import { logError as sentryLogError } from './sentry'

// ===================================================================
// Error Types
// ===================================================================

/**
 * PostgreSQL/D1 데이터베이스 에러 타입
 * (이전 Supabase PostgrestError와 호환)
 */
export interface PostgrestError {
  code: string
  message: string
  details?: string
  hint?: string
}

export interface DatabaseErrorResult<T> {
  data: T | null
  error: PostgrestError | null
}

/** @deprecated DatabaseErrorResult 사용 권장 */
export type SupabaseErrorResult<T> = DatabaseErrorResult<T>

export interface ApiErrorResult<T> {
  data: T | null
  error: Error | null
}

// ===================================================================
// Supabase Error Handling
// ===================================================================

/**
 * Supabase 에러 타입 체크
 */
export function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const err = error as { code?: string; message?: string }
  return (
    err.code === '42501' ||
    err.message?.includes('permission denied') ||
    err.message?.includes('permission denied for table')
  )
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const err = error as { code?: string; message?: string }
  return (
    err.code === 'PGRST116' ||
    err.code === 'PGRST205' ||
    err.message?.includes('does not exist') ||
    err.message?.includes('Could not find the table') ||
    err.message?.includes('not found')
  )
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  
  const err = error as { message?: string; code?: string }
  return (
    err.message?.includes('NetworkError') ||
    err.message?.includes('Network request failed') ||
    err.message?.includes('Failed to fetch') ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT'
  )
}

/**
 * Supabase 에러 처리
 * 
 * @param error - Supabase 에러 객체
 * @param context - 에러 컨텍스트 (테이블명, 작업 등)
 * @param fallbackValue - 에러 발생 시 반환할 기본값
 * @returns 처리된 결과
 */
export function handleSupabaseError<T>(
  error: unknown,
  context?: {
    table?: string
    operation?: string
    fallbackValue?: T
  }
): T | null {
  const { table, operation, fallbackValue = null } = context || {}

  if (!error) return fallbackValue

  const err = error as PostgrestError

  // 권한 에러 (403)
  if (isPermissionError(err)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[${table || 'Supabase'}] 접근 권한이 없습니다. RLS 정책을 확인하세요:`,
        err.message
      )
    }
    return fallbackValue
  }

  // 테이블 없음 에러 (404)
  if (isNotFoundError(err)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[${table || 'Supabase'}] 테이블을 찾을 수 없습니다. 마이그레이션을 실행하세요:`,
        err.message
      )
    }
    return fallbackValue
  }

  // 네트워크 에러
  if (isNetworkError(err)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[${table || 'Supabase'}] 네트워크 오류가 발생했습니다:`,
        err.message
      )
    }
    // 네트워크 에러는 Sentry에 전송하지 않음 (사용자 연결 문제)
    return fallbackValue
  }

  // 기타 에러
  if (import.meta.env.DEV) {
    console.error(
      `[${table || 'Supabase'}] ${operation || '작업'} 실패:`,
      err
    )
  }

  // 프로덕션에서는 Sentry로 전송
  if (import.meta.env.PROD) {
    sentryLogError(err as Error, {
      table,
      operation,
      errorCode: err.code,
      errorMessage: err.message,
    })
  }

  return fallbackValue
}

// ===================================================================
// API Error Handling
// ===================================================================

/**
 * API 에러 메시지 추출
 */
export function extractErrorMessage(error: unknown): string {
  // Axios 에러
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; msg?: string }>
    if (axiosError.response?.data) {
      const data = axiosError.response.data
      return data.message || data.msg || axiosError.message || 'API 요청 중 오류가 발생했습니다.'
    }
    return axiosError.message || 'API 요청 중 오류가 발생했습니다.'
  }

  // PostgrestError (Supabase)
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return (error as PostgrestError).message
  }

  // 일반 Error
  if (error instanceof Error) {
    return error.message
  }

  // 알 수 없는 에러
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * API 에러 처리
 * 
 * @param error - API 에러 객체
 * @param context - 에러 컨텍스트
 * @param fallbackValue - 에러 발생 시 반환할 기본값
 * @returns 처리된 결과
 */
export function handleApiError<T>(
  error: unknown,
  context?: {
    service?: string
    operation?: string
    fallbackValue?: T
  }
): T | null {
  const { service, operation, fallbackValue = null } = context || {}

  if (!error) return fallbackValue

  const errorMessage = extractErrorMessage(error)

  // 개발 환경에서만 로그 출력
  if (import.meta.env.DEV) {
    console.error(
      `[${service || 'API'}] ${operation || '작업'} 실패:`,
      errorMessage
    )
  }

  // 프로덕션에서는 Sentry로 전송
  if (import.meta.env.PROD && error instanceof Error) {
    sentryLogError(error, {
      service,
      operation,
      errorMessage,
    })
  }

  return fallbackValue
}

// ===================================================================
// Logging Utilities
// ===================================================================

/**
 * 개발 환경에서만 로그 출력
 */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

/**
 * 개발 환경에서만 경고 출력
 */
export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args)
  }
}

/**
 * 개발 환경에서만 에러 출력 (프로덕션에서는 Sentry로 전송)
 */
export function devError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error(error)
    if (context) {
      console.error('Context:', context)
    }
  }

  // 프로덕션에서는 Sentry로 전송
  if (import.meta.env.PROD && error instanceof Error) {
    sentryLogError(error, context)
  }
}

// ===================================================================
// Error Wrapper for React Query
// ===================================================================

/**
 * React Query queryFn에서 사용할 에러 핸들링 래퍼
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    table?: string
    operation?: string
    fallbackValue?: T
    onError?: (error: unknown) => void
  }
): Promise<T> {
  return fn().catch((error) => {
    const { table, operation, fallbackValue, onError } = options || {}

    // 커스텀 에러 핸들러 실행
    if (onError) {
      onError(error)
    }

    // Supabase 에러 처리
    if (table) {
      const result = handleSupabaseError(error, { table, operation, fallbackValue })
      if (result !== null) {
        return Promise.resolve(result)
      }
    }

    // 일반 API 에러 처리
    const result = handleApiError(error, {
      service: table,
      operation,
      fallbackValue,
    })

    if (result !== null) {
      return Promise.resolve(result)
    }

    // fallbackValue가 없으면 에러를 다시 throw
    throw error
  })
}

