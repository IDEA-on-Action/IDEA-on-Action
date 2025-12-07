/**
 * JWT 유틸리티 함수 테스트
 *
 * Note: jose 라이브러리는 jsdom 환경에서 TextEncoder 호환성 문제가 있어
 * 브라우저 환경에서만 정상 작동합니다. 여기서는 주요 로직만 테스트합니다.
 *
 * @module tests/unit/lib/jwt
 */

import { describe, it, expect } from 'vitest';
import {
  decodeToken,
  isTokenExpired,
  getRemainingTime,
  extractUserInfo,
} from '@/lib/auth/jwt';

// ============================================================================
// Mock JWT 토큰 (브라우저에서 생성된 실제 토큰)
// ============================================================================

// 유효한 토큰 (exp: 2099년)
const VALID_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItdXVpZCIsImF1ZCI6Im1pbnUtZmluZC1zYW5kYm94Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsImp0aSI6InRlc3QtdG9rZW4tanRpIiwic2lkIjoidGVzdC1zZXNzaW9uLWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInBpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5wbmciLCJpc3MiOiJodHRwczovL3d3dy5pZGVhb25hY3Rpb24uYWkiLCJpYXQiOjE3MzM1NzMwMDAsImV4cCI6NDA3MDkwODgwMH0.invalid-signature-for-testing';

// 만료된 토큰 (exp: 2020년)
const EXPIRED_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItdXVpZCIsImF1ZCI6Im1pbnUtZmluZC1zYW5kYm94IiwiaXNzIjoiaHR0cHM6Ly93d3cuaWRlYW9uYWN0aW9uLmFpIiwiaWF0IjoxNTc3ODM2ODAwLCJleHAiOjE1Nzc4NDA0MDB9.invalid-signature-for-testing';

// ============================================================================
// 토큰 디코딩 테스트
// ============================================================================

describe('JWT Token Decoding', () => {
  it('should decode valid token without verification', () => {
    const payload = decodeToken(VALID_TOKEN);
    expect(payload).toBeDefined();
    expect(payload?.sub).toBe('test-user-uuid');
    expect(payload?.aud).toBe('minu-find-sandbox');
    expect(payload?.scope).toBe('openid profile email');
  });

  it('should decode custom claims', () => {
    const payload = decodeToken(VALID_TOKEN);
    expect(payload?.email).toBe('test@example.com');
    expect(payload?.name).toBe('Test User');
    expect(payload?.picture).toBe('https://example.com/avatar.png');
  });

  it('should return null for malformed token', () => {
    const payload = decodeToken('not.a.valid.jwt.token.format');
    expect(payload).toBeNull();
  });

  it('should decode expired token (without verification)', () => {
    const payload = decodeToken(EXPIRED_TOKEN);
    expect(payload).toBeDefined(); // 검증 없이 디코딩만
    expect(payload?.sub).toBe('test-user-uuid');
  });

  it('should decode all standard claims', () => {
    const payload = decodeToken(VALID_TOKEN);
    expect(payload).toBeDefined();
    if (payload) {
      expect(payload.sub).toBe('test-user-uuid');
      expect(payload.aud).toBe('minu-find-sandbox');
      expect(payload.iss).toBe('https://www.ideaonaction.ai');
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    }
  });
});

// ============================================================================
// 토큰 만료 확인 테스트
// ============================================================================

describe('JWT Token Expiration Check', () => {
  it('should return false for valid token', () => {
    const expired = isTokenExpired(VALID_TOKEN);
    expect(expired).toBe(false);
  });

  it('should return true for expired token', () => {
    const expired = isTokenExpired(EXPIRED_TOKEN);
    expect(expired).toBe(true);
  });

  it('should return null for invalid token', () => {
    const expired = isTokenExpired('invalid.token');
    expect(expired).toBeNull();
  });
});

// ============================================================================
// 남은 시간 계산 테스트
// ============================================================================

describe('JWT Token Remaining Time', () => {
  it('should calculate remaining time correctly for valid token', () => {
    const remaining = getRemainingTime(VALID_TOKEN);
    expect(remaining).toBeGreaterThan(0);
    // 2099년까지 남은 시간이므로 매우 클 것
    expect(remaining).toBeGreaterThan(365 * 24 * 60 * 60); // 1년 이상
  });

  it('should return null for expired token', () => {
    const remaining = getRemainingTime(EXPIRED_TOKEN);
    expect(remaining).toBeNull();
  });

  it('should return null for invalid token', () => {
    const remaining = getRemainingTime('invalid.token');
    expect(remaining).toBeNull();
  });
});

// ============================================================================
// 사용자 정보 추출 테스트
// ============================================================================

describe('JWT User Info Extraction', () => {
  it('should extract user info from token', () => {
    const userInfo = extractUserInfo(VALID_TOKEN);
    expect(userInfo).toBeDefined();
    expect(userInfo?.userId).toBe('test-user-uuid');
    expect(userInfo?.email).toBe('test@example.com');
    expect(userInfo?.name).toBe('Test User');
    expect(userInfo?.picture).toBe('https://example.com/avatar.png');
  });

  it('should return null for invalid token', () => {
    const userInfo = extractUserInfo('invalid.token');
    expect(userInfo).toBeNull();
  });

  it('should handle token without optional fields', () => {
    const payload = decodeToken(EXPIRED_TOKEN);
    expect(payload).toBeDefined();
    expect(payload?.email).toBeUndefined();
  });
});

// ============================================================================
// Edge Cases 테스트
// ============================================================================

describe('JWT Edge Cases', () => {
  it('should handle token without email/name/picture', () => {
    const userInfo = extractUserInfo(EXPIRED_TOKEN);
    expect(userInfo).toBeDefined();
    expect(userInfo?.userId).toBe('test-user-uuid');
    expect(userInfo?.email).toBeUndefined();
    expect(userInfo?.name).toBeUndefined();
    expect(userInfo?.picture).toBeUndefined();
  });

  it('should decode token with minimal claims', () => {
    const payload = decodeToken(EXPIRED_TOKEN);
    expect(payload).toBeDefined();
    expect(payload?.sub).toBeDefined();
    expect(payload?.aud).toBeDefined();
  });
});
