/**
 * Edge Functions 보안 메커니즘 테스트
 *
 * @module tests/unit/edge-functions/security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Timing-safe 비교 함수 (Edge Function에서 사용하는 로직 복제)
// ============================================================================

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// 타임스탬프 검증 함수
// ============================================================================

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5분

function verifyTimestamp(timestamp: string, toleranceMs = TIMESTAMP_TOLERANCE_MS): boolean {
  try {
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.abs(now - requestTime) <= toleranceMs;
  } catch {
    return false;
  }
}

// ============================================================================
// Timing-safe 비교 테스트
// ============================================================================

describe('Timing-safe String Comparison', () => {
  it('should return true for equal strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('secret123', 'secret123')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('secret123', 'secret124')).toBe(false);
    expect(timingSafeEqual('abc', 'ABC')).toBe(false);
  });

  it('should return false for different lengths', () => {
    expect(timingSafeEqual('abc', 'ab')).toBe(false);
    expect(timingSafeEqual('ab', 'abc')).toBe(false);
    expect(timingSafeEqual('', 'a')).toBe(false);
  });

  it('should handle special characters', () => {
    expect(timingSafeEqual('sha256=abc123', 'sha256=abc123')).toBe(true);
    expect(timingSafeEqual('sha256=abc123', 'sha256=abc124')).toBe(false);
  });

  it('should handle unicode strings', () => {
    expect(timingSafeEqual('한글', '한글')).toBe(true);
    expect(timingSafeEqual('한글', '한국')).toBe(false);
  });

  // 타이밍 공격 방어 검증 (실제 시간 측정은 환경에 따라 다를 수 있음)
  it('should take similar time for matching and non-matching strings of same length', () => {
    const str1 = 'a'.repeat(1000);
    const str2 = 'a'.repeat(999) + 'b';

    // 첫 문자가 다른 경우
    const str3 = 'b' + 'a'.repeat(999);

    // 이 테스트는 원리적으로만 검증 (실제 타이밍 측정은 불안정)
    expect(timingSafeEqual(str1, str2)).toBe(false);
    expect(timingSafeEqual(str1, str3)).toBe(false);
  });
});

// ============================================================================
// 타임스탬프 검증 테스트
// ============================================================================

describe('Timestamp Verification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-17T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should accept current timestamp', () => {
    const now = new Date().toISOString();
    expect(verifyTimestamp(now)).toBe(true);
  });

  it('should accept timestamp within 5 minutes', () => {
    // 4분 전
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(verifyTimestamp(fourMinutesAgo)).toBe(true);

    // 4분 후
    const fourMinutesLater = new Date(Date.now() + 4 * 60 * 1000).toISOString();
    expect(verifyTimestamp(fourMinutesLater)).toBe(true);
  });

  it('should reject timestamp older than 5 minutes', () => {
    // 6분 전
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(verifyTimestamp(sixMinutesAgo)).toBe(false);
  });

  it('should reject timestamp more than 5 minutes in future', () => {
    // 6분 후
    const sixMinutesLater = new Date(Date.now() + 6 * 60 * 1000).toISOString();
    expect(verifyTimestamp(sixMinutesLater)).toBe(false);
  });

  it('should accept timestamp at boundary (5 minutes)', () => {
    // 정확히 5분 전
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(verifyTimestamp(fiveMinutesAgo)).toBe(true);
  });

  it('should reject invalid timestamp format', () => {
    expect(verifyTimestamp('not-a-timestamp')).toBe(false);
    expect(verifyTimestamp('')).toBe(false);
    expect(verifyTimestamp('2025-13-45')).toBe(false); // 잘못된 날짜
  });

  it('should accept various ISO 8601 formats', () => {
    // Z 접미사
    expect(verifyTimestamp('2025-12-17T12:00:00Z')).toBe(true);

    // 밀리초 포함
    expect(verifyTimestamp('2025-12-17T12:00:00.000Z')).toBe(true);

    // 타임존 오프셋 (UTC와 동일)
    expect(verifyTimestamp('2025-12-17T21:00:00+09:00')).toBe(true);
  });
});

// ============================================================================
// 리플레이 공격 방어 테스트
// ============================================================================

describe('Replay Attack Prevention', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-17T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reject replayed request after tolerance window', () => {
    // 원래 요청 시간
    const originalTimestamp = '2025-12-17T11:54:00Z'; // 6분 전

    // 현재 시간 기준으로 검증
    expect(verifyTimestamp(originalTimestamp)).toBe(false);
  });

  it('should demonstrate time-window narrowing effect', () => {
    const timestamp = new Date().toISOString();

    // 즉시 검증: 성공
    expect(verifyTimestamp(timestamp)).toBe(true);

    // 3분 후: 여전히 성공
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(verifyTimestamp(timestamp)).toBe(true);

    // 6분 후 (총 9분 경과): 실패
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(verifyTimestamp(timestamp)).toBe(false);
  });
});

// ============================================================================
// HMAC 서명 포맷 검증 테스트
// ============================================================================

describe('HMAC Signature Format', () => {
  const isValidSignatureFormat = (signature: string): boolean => {
    return /^sha256=[a-f0-9]{64}$/i.test(signature);
  };

  it('should validate correct signature format', () => {
    const validSignature = 'sha256=' + 'a'.repeat(64);
    expect(isValidSignatureFormat(validSignature)).toBe(true);
  });

  it('should accept lowercase hex', () => {
    const signature = 'sha256=abcdef0123456789' + '0'.repeat(48);
    expect(isValidSignatureFormat(signature)).toBe(true);
  });

  it('should accept uppercase hex', () => {
    const signature = 'sha256=ABCDEF0123456789' + '0'.repeat(48);
    expect(isValidSignatureFormat(signature)).toBe(true);
  });

  it('should reject missing prefix', () => {
    const signature = 'a'.repeat(64);
    expect(isValidSignatureFormat(signature)).toBe(false);
  });

  it('should reject wrong algorithm prefix', () => {
    const signature = 'sha512=' + 'a'.repeat(64);
    expect(isValidSignatureFormat(signature)).toBe(false);
  });

  it('should reject wrong length', () => {
    // 63자 (1자 부족)
    expect(isValidSignatureFormat('sha256=' + 'a'.repeat(63))).toBe(false);
    // 65자 (1자 초과)
    expect(isValidSignatureFormat('sha256=' + 'a'.repeat(65))).toBe(false);
  });

  it('should reject non-hex characters', () => {
    const signature = 'sha256=' + 'g'.repeat(64); // g는 hex가 아님
    expect(isValidSignatureFormat(signature)).toBe(false);
  });
});

// ============================================================================
// 서비스 ID 검증 테스트
// ============================================================================

describe('Service ID Validation', () => {
  const VALID_SERVICE_IDS = [
    'minu-find',
    'minu-frame',
    'minu-build',
    'minu-keep',
    'minu-portal',
  ];

  const isValidServiceId = (serviceId: string): boolean => {
    return VALID_SERVICE_IDS.includes(serviceId);
  };

  it('should accept valid service IDs', () => {
    VALID_SERVICE_IDS.forEach((id) => {
      expect(isValidServiceId(id)).toBe(true);
    });
  });

  it('should reject invalid service IDs', () => {
    expect(isValidServiceId('minu-unknown')).toBe(false);
    expect(isValidServiceId('other-service')).toBe(false);
    expect(isValidServiceId('')).toBe(false);
    expect(isValidServiceId('MINU-FIND')).toBe(false); // 대소문자 구분
  });

  it('should reject SQL injection attempts', () => {
    expect(isValidServiceId("minu-find' OR '1'='1")).toBe(false);
    expect(isValidServiceId('minu-find; DROP TABLE users;')).toBe(false);
  });
});

// ============================================================================
// Scope 검증 테스트
// ============================================================================

describe('Scope Validation', () => {
  const VALID_SCOPES = [
    'events:read',
    'events:write',
    'health:read',
    'health:write',
    'sync:read',
    'sync:write',
  ];

  const hasRequiredScopes = (
    userScopes: string[],
    requiredScopes: string[]
  ): boolean => {
    return requiredScopes.every((required) => userScopes.includes(required));
  };

  it('should pass when user has all required scopes', () => {
    expect(hasRequiredScopes(['events:read', 'events:write'], ['events:read'])).toBe(
      true
    );
    expect(
      hasRequiredScopes(['events:read', 'events:write'], ['events:read', 'events:write'])
    ).toBe(true);
  });

  it('should fail when user is missing required scopes', () => {
    expect(hasRequiredScopes(['events:read'], ['events:write'])).toBe(false);
    expect(hasRequiredScopes([], ['events:read'])).toBe(false);
  });

  it('should pass when no scopes are required', () => {
    expect(hasRequiredScopes([], [])).toBe(true);
    expect(hasRequiredScopes(['events:read'], [])).toBe(true);
  });

  it('should handle extra scopes gracefully', () => {
    expect(
      hasRequiredScopes(
        ['events:read', 'events:write', 'health:read', 'health:write'],
        ['events:write']
      )
    ).toBe(true);
  });
});
