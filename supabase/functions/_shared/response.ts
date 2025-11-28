/**
 * Response Helpers for Edge Functions
 *
 * 표준화된 응답 형식
 */

import { corsHeaders } from './cors.ts'

interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

/**
 * 성공 응답
 */
export function successResponse<T>(data: T, status = 200): Response {
  const body: SuccessResponse<T> = {
    success: true,
    data,
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * 에러 응답
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * 일반적인 에러 응답들
 */
export const errors = {
  unauthorized: () =>
    errorResponse('UNAUTHORIZED', '인증이 필요합니다.', 401),

  forbidden: () =>
    errorResponse('FORBIDDEN', '접근 권한이 없습니다.', 403),

  notFound: (resource = '리소스') =>
    errorResponse('NOT_FOUND', `${resource}를 찾을 수 없습니다.`, 404),

  badRequest: (message: string) =>
    errorResponse('BAD_REQUEST', message, 400),

  internalError: (message = '서버 오류가 발생했습니다.') =>
    errorResponse('INTERNAL_ERROR', message, 500),

  paymentError: (message: string, details?: unknown) =>
    errorResponse('PAYMENT_ERROR', message, 400, details),
}
