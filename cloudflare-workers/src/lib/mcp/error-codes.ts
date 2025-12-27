/**
 * MCP 에러 코드 정의
 * Supabase Edge Functions에서 마이그레이션
 */

// ============================================================================
// 에러 코드 상수
// ============================================================================

export const ErrorCodes = {
  // 인증 관련
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_REVOKED: 'token_revoked',
  INSUFFICIENT_SCOPE: 'insufficient_scope',
  INVALID_SIGNATURE: 'invalid_signature',
  INVALID_TIMESTAMP: 'invalid_timestamp',
  UNAUTHORIZED: 'unauthorized',
  REFRESH_TOKEN_REUSE: 'refresh_token_reuse',

  // 요청 관련
  INVALID_PAYLOAD: 'invalid_payload',
  INVALID_JSON: 'invalid_json',
  MISSING_HEADER: 'missing_header',
  INVALID_SERVICE: 'invalid_service',
  INVALID_SCOPE: 'invalid_scope',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  NOT_FOUND: 'not_found',
  EMPTY_BODY: 'empty_body',

  // 서버 관련
  CONFIG_ERROR: 'config_error',
  INTERNAL_ERROR: 'internal_error',
  DATABASE_ERROR: 'database_error',
} as const;

/** 에러 코드 타입 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// 에러 메시지 매핑
// ============================================================================

export const ErrorMessages: Record<ErrorCode, string> = {
  // 인증 관련
  [ErrorCodes.TOKEN_EXPIRED]: '토큰이 만료되었습니다.',
  [ErrorCodes.TOKEN_INVALID]: '유효하지 않은 토큰입니다.',
  [ErrorCodes.TOKEN_REVOKED]: '토큰이 폐기되었습니다.',
  [ErrorCodes.INSUFFICIENT_SCOPE]: '필요한 권한이 없습니다.',
  [ErrorCodes.INVALID_SIGNATURE]: 'HMAC 서명이 유효하지 않습니다.',
  [ErrorCodes.INVALID_TIMESTAMP]: '요청 타임스탬프가 만료되었거나 유효하지 않습니다.',
  [ErrorCodes.UNAUTHORIZED]: '인증에 실패했습니다.',
  [ErrorCodes.REFRESH_TOKEN_REUSE]: '보안 위협 감지: Refresh 토큰 재사용이 감지되었습니다.',

  // 요청 관련
  [ErrorCodes.INVALID_PAYLOAD]: '유효하지 않은 페이로드입니다.',
  [ErrorCodes.INVALID_JSON]: '유효하지 않은 JSON 형식입니다.',
  [ErrorCodes.MISSING_HEADER]: '필수 헤더가 누락되었습니다.',
  [ErrorCodes.INVALID_SERVICE]: '유효하지 않은 서비스 ID입니다.',
  [ErrorCodes.INVALID_SCOPE]: '유효한 scope가 없습니다.',
  [ErrorCodes.UNSUPPORTED_GRANT_TYPE]: '지원하지 않는 grant_type입니다.',
  [ErrorCodes.METHOD_NOT_ALLOWED]: '허용되지 않는 메서드입니다.',
  [ErrorCodes.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCodes.EMPTY_BODY]: '요청 본문이 비어 있습니다.',

  // 서버 관련
  [ErrorCodes.CONFIG_ERROR]: '서버 설정 오류입니다.',
  [ErrorCodes.INTERNAL_ERROR]: '내부 서버 오류가 발생했습니다.',
  [ErrorCodes.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다.',
};

// ============================================================================
// HTTP 상태 코드 매핑
// ============================================================================

export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // 인증 관련 (401, 403)
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.TOKEN_INVALID]: 401,
  [ErrorCodes.TOKEN_REVOKED]: 401,
  [ErrorCodes.INSUFFICIENT_SCOPE]: 403,
  [ErrorCodes.INVALID_SIGNATURE]: 401,
  [ErrorCodes.INVALID_TIMESTAMP]: 401,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.REFRESH_TOKEN_REUSE]: 401,

  // 요청 관련 (400, 404, 405)
  [ErrorCodes.INVALID_PAYLOAD]: 400,
  [ErrorCodes.INVALID_JSON]: 400,
  [ErrorCodes.MISSING_HEADER]: 400,
  [ErrorCodes.INVALID_SERVICE]: 400,
  [ErrorCodes.INVALID_SCOPE]: 400,
  [ErrorCodes.UNSUPPORTED_GRANT_TYPE]: 400,
  [ErrorCodes.METHOD_NOT_ALLOWED]: 405,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.EMPTY_BODY]: 400,

  // 서버 관련 (500)
  [ErrorCodes.CONFIG_ERROR]: 500,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
};
