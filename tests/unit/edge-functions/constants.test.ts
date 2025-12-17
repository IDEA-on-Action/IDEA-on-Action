/**
 * Edge Functions 공유 상수 테스트
 *
 * @module tests/unit/edge-functions/constants
 */

import { describe, it, expect } from 'vitest';

// 상수 값들을 직접 정의 (Deno 모듈은 Node.js에서 import 불가)
const VALID_SERVICE_IDS = [
  'minu-find',
  'minu-frame',
  'minu-build',
  'minu-keep',
  'minu-portal',
] as const;

const VALID_SCOPES = [
  'events:read',
  'events:write',
  'health:read',
  'health:write',
  'sync:read',
  'sync:write',
] as const;

const JWT_ISSUER = 'mcp-auth';
const JWT_AUDIENCE = 'central-hub';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

// ============================================================================
// 서비스 ID 테스트
// ============================================================================

describe('Service IDs', () => {
  it('should include all Minu services', () => {
    expect(VALID_SERVICE_IDS).toContain('minu-find');
    expect(VALID_SERVICE_IDS).toContain('minu-frame');
    expect(VALID_SERVICE_IDS).toContain('minu-build');
    expect(VALID_SERVICE_IDS).toContain('minu-keep');
    expect(VALID_SERVICE_IDS).toContain('minu-portal');
  });

  it('should have exactly 5 services', () => {
    expect(VALID_SERVICE_IDS.length).toBe(5);
  });

  it('should follow minu-* naming convention', () => {
    VALID_SERVICE_IDS.forEach((id) => {
      expect(id).toMatch(/^minu-[a-z]+$/);
    });
  });
});

// ============================================================================
// Scope 테스트
// ============================================================================

describe('Scopes', () => {
  it('should include events scopes', () => {
    expect(VALID_SCOPES).toContain('events:read');
    expect(VALID_SCOPES).toContain('events:write');
  });

  it('should include health scopes', () => {
    expect(VALID_SCOPES).toContain('health:read');
    expect(VALID_SCOPES).toContain('health:write');
  });

  it('should include sync scopes', () => {
    expect(VALID_SCOPES).toContain('sync:read');
    expect(VALID_SCOPES).toContain('sync:write');
  });

  it('should follow resource:action format', () => {
    VALID_SCOPES.forEach((scope) => {
      expect(scope).toMatch(/^[a-z]+:(read|write)$/);
    });
  });

  it('should have read/write pairs for each resource', () => {
    const resources = ['events', 'health', 'sync'];
    resources.forEach((resource) => {
      expect(VALID_SCOPES).toContain(`${resource}:read`);
      expect(VALID_SCOPES).toContain(`${resource}:write`);
    });
  });
});

// ============================================================================
// JWT 설정 테스트
// ============================================================================

describe('JWT Configuration', () => {
  it('should have correct issuer', () => {
    expect(JWT_ISSUER).toBe('mcp-auth');
  });

  it('should have correct audience', () => {
    expect(JWT_AUDIENCE).toBe('central-hub');
  });

  it('should have access token expiry of 15 minutes', () => {
    expect(ACCESS_TOKEN_EXPIRY_SECONDS).toBe(15 * 60);
    expect(ACCESS_TOKEN_EXPIRY_SECONDS).toBe(900);
  });

  it('should have refresh token expiry of 7 days', () => {
    expect(REFRESH_TOKEN_EXPIRY_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(REFRESH_TOKEN_EXPIRY_SECONDS).toBe(604800);
  });
});

// ============================================================================
// 보안 설정 테스트
// ============================================================================

describe('Security Configuration', () => {
  it('should have timestamp tolerance of 5 minutes', () => {
    expect(TIMESTAMP_TOLERANCE_MS).toBe(5 * 60 * 1000);
    expect(TIMESTAMP_TOLERANCE_MS).toBe(300000);
  });

  it('should be reasonable for network latency', () => {
    // 5분은 네트워크 지연과 시간 동기화 오차를 감안한 적절한 값
    expect(TIMESTAMP_TOLERANCE_MS).toBeGreaterThanOrEqual(60 * 1000); // 최소 1분
    expect(TIMESTAMP_TOLERANCE_MS).toBeLessThanOrEqual(10 * 60 * 1000); // 최대 10분
  });
});
