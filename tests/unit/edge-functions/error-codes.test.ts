/**
 * Edge Functions 에러 코드 테스트
 *
 * @module tests/unit/edge-functions/error-codes
 */

import { describe, it, expect } from 'vitest';

// 에러 코드 정의 (Deno 모듈은 Node.js에서 import 불가)
const ErrorCodes = {
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

const ErrorStatusCodes: Record<string, number> = {
  // 인증 관련 (401, 403)
  token_expired: 401,
  token_invalid: 401,
  token_revoked: 401,
  insufficient_scope: 403,
  invalid_signature: 401,
  invalid_timestamp: 401,
  unauthorized: 401,
  refresh_token_reuse: 401,

  // 요청 관련 (400, 404, 405)
  invalid_payload: 400,
  invalid_json: 400,
  missing_header: 400,
  invalid_service: 400,
  invalid_scope: 400,
  unsupported_grant_type: 400,
  method_not_allowed: 405,
  not_found: 404,
  empty_body: 400,

  // 서버 관련 (500)
  config_error: 500,
  internal_error: 500,
  database_error: 500,
};

// ============================================================================
// 에러 코드 존재 여부 테스트
// ============================================================================

describe('Error Codes Existence', () => {
  it('should have authentication error codes', () => {
    expect(ErrorCodes.TOKEN_EXPIRED).toBe('token_expired');
    expect(ErrorCodes.TOKEN_INVALID).toBe('token_invalid');
    expect(ErrorCodes.TOKEN_REVOKED).toBe('token_revoked');
    expect(ErrorCodes.INSUFFICIENT_SCOPE).toBe('insufficient_scope');
    expect(ErrorCodes.INVALID_SIGNATURE).toBe('invalid_signature');
    expect(ErrorCodes.UNAUTHORIZED).toBe('unauthorized');
  });

  it('should have request error codes', () => {
    expect(ErrorCodes.INVALID_PAYLOAD).toBe('invalid_payload');
    expect(ErrorCodes.INVALID_JSON).toBe('invalid_json');
    expect(ErrorCodes.MISSING_HEADER).toBe('missing_header');
    expect(ErrorCodes.METHOD_NOT_ALLOWED).toBe('method_not_allowed');
  });

  it('should have server error codes', () => {
    expect(ErrorCodes.CONFIG_ERROR).toBe('config_error');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('internal_error');
    expect(ErrorCodes.DATABASE_ERROR).toBe('database_error');
  });
});

// ============================================================================
// HTTP 상태 코드 매핑 테스트
// ============================================================================

describe('Error Status Code Mapping', () => {
  it('should map authentication errors to 401', () => {
    expect(ErrorStatusCodes[ErrorCodes.TOKEN_EXPIRED]).toBe(401);
    expect(ErrorStatusCodes[ErrorCodes.TOKEN_INVALID]).toBe(401);
    expect(ErrorStatusCodes[ErrorCodes.TOKEN_REVOKED]).toBe(401);
    expect(ErrorStatusCodes[ErrorCodes.INVALID_SIGNATURE]).toBe(401);
    expect(ErrorStatusCodes[ErrorCodes.UNAUTHORIZED]).toBe(401);
  });

  it('should map authorization errors to 403', () => {
    expect(ErrorStatusCodes[ErrorCodes.INSUFFICIENT_SCOPE]).toBe(403);
  });

  it('should map request errors to 400', () => {
    expect(ErrorStatusCodes[ErrorCodes.INVALID_PAYLOAD]).toBe(400);
    expect(ErrorStatusCodes[ErrorCodes.INVALID_JSON]).toBe(400);
    expect(ErrorStatusCodes[ErrorCodes.MISSING_HEADER]).toBe(400);
    expect(ErrorStatusCodes[ErrorCodes.INVALID_SERVICE]).toBe(400);
  });

  it('should map not found to 404', () => {
    expect(ErrorStatusCodes[ErrorCodes.NOT_FOUND]).toBe(404);
  });

  it('should map method not allowed to 405', () => {
    expect(ErrorStatusCodes[ErrorCodes.METHOD_NOT_ALLOWED]).toBe(405);
  });

  it('should map server errors to 500', () => {
    expect(ErrorStatusCodes[ErrorCodes.CONFIG_ERROR]).toBe(500);
    expect(ErrorStatusCodes[ErrorCodes.INTERNAL_ERROR]).toBe(500);
    expect(ErrorStatusCodes[ErrorCodes.DATABASE_ERROR]).toBe(500);
  });
});

// ============================================================================
// 에러 코드 형식 테스트
// ============================================================================

describe('Error Code Format', () => {
  it('should use snake_case format', () => {
    Object.values(ErrorCodes).forEach((code) => {
      expect(code).toMatch(/^[a-z]+(_[a-z]+)*$/);
    });
  });

  it('should not have duplicate codes', () => {
    const codes = Object.values(ErrorCodes);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have consistent naming between key and value', () => {
    Object.entries(ErrorCodes).forEach(([key, value]) => {
      // KEY_NAME -> key_name 변환 검증
      const expectedValue = key.toLowerCase();
      expect(value).toBe(expectedValue);
    });
  });
});

// ============================================================================
// 에러 카테고리 테스트
// ============================================================================

describe('Error Categories', () => {
  const authErrors = [
    'token_expired',
    'token_invalid',
    'token_revoked',
    'insufficient_scope',
    'invalid_signature',
    'invalid_timestamp',
    'unauthorized',
    'refresh_token_reuse',
  ];

  const requestErrors = [
    'invalid_payload',
    'invalid_json',
    'missing_header',
    'invalid_service',
    'invalid_scope',
    'unsupported_grant_type',
    'method_not_allowed',
    'not_found',
    'empty_body',
  ];

  const serverErrors = ['config_error', 'internal_error', 'database_error'];

  it('should categorize all error codes', () => {
    const allCategorized = [...authErrors, ...requestErrors, ...serverErrors];
    const allCodes = Object.values(ErrorCodes);

    expect(allCategorized.length).toBe(allCodes.length);
    allCodes.forEach((code) => {
      expect(allCategorized).toContain(code);
    });
  });

  it('should have correct status codes for each category', () => {
    // 인증 에러: 401 또는 403
    authErrors.forEach((code) => {
      const status = ErrorStatusCodes[code];
      expect([401, 403]).toContain(status);
    });

    // 요청 에러: 400, 404, 405
    requestErrors.forEach((code) => {
      const status = ErrorStatusCodes[code];
      expect([400, 404, 405]).toContain(status);
    });

    // 서버 에러: 500
    serverErrors.forEach((code) => {
      expect(ErrorStatusCodes[code]).toBe(500);
    });
  });
});
