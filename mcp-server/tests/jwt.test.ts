/**
 * JWT 유틸리티 테스트
 *
 * JWT 토큰 검증, 추출, 만료 확인 관련 테스트
 * - verifyToken: 토큰 검증
 * - extractUserIdUnsafe: 안전하지 않은 사용자 ID 추출
 * - isTokenNearExpiration: 토큰 만료 임박 확인
 * - validateJWTEnvironment: 환경 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  mockUser,
  createMockJWTPayload,
  createExpiredJWTPayload,
} from './setup.js';

describe('JWT 유틸리티 (JWT Utility)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ============================================================
  // verifyToken 함수 테스트
  // ============================================================
  describe('verifyToken 함수', () => {
    describe('토큰 입력 검증', () => {
      it('빈 토큰은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        const result = await verifyToken('');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Token is required');
      });

      it('null/undefined 토큰은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        // @ts-expect-error - 의도적으로 잘못된 타입 테스트
        const result = await verifyToken(null);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Token is required');
      });
    });

    describe('환경 변수 검증', () => {
      it('JWT 시크릿이 설정되지 않은 경우 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', '');
        const { verifyToken } = await import('../src/lib/jwt.js');

        const result = await verifyToken('some-token');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('JWT verification is not configured');
      });
    });

    describe('토큰 형식 검증', () => {
      it('잘못된 형식의 토큰은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        const result = await verifyToken('invalid-token-format');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('올바른 JWT 형식이 아닌 토큰은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        const result = await verifyToken('not.a.valid.jwt.token.format');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Base64가 아닌 토큰 부분은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        const result = await verifyToken('header.payload.signature');

        expect(result.valid).toBe(false);
      });
    });

    describe('토큰 시그니처 검증', () => {
      it('잘못된 시크릿으로 서명된 토큰은 invalid를 반환해야 합니다', async () => {
        vi.stubEnv('SUPABASE_JWT_SECRET', 'different-secret-key-32-characters-long');
        const { verifyToken } = await import('../src/lib/jwt.js');

        // 다른 시크릿으로 생성된 토큰 (실제 JWT 형식)
        const invalidSignatureToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
          'eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.' +
          'invalid_signature';

        const result = await verifyToken(invalidSignatureToken);

        expect(result.valid).toBe(false);
      });
    });
  });

  // ============================================================
  // extractUserIdUnsafe 함수 테스트
  // ============================================================
  describe('extractUserIdUnsafe 함수', () => {
    it('유효하지 않은 토큰은 null을 반환해야 합니다', async () => {
      const { extractUserIdUnsafe } = await import('../src/lib/jwt.js');

      const userId = extractUserIdUnsafe('invalid-token');

      expect(userId).toBeNull();
    });

    it('빈 토큰은 null을 반환해야 합니다', async () => {
      const { extractUserIdUnsafe } = await import('../src/lib/jwt.js');

      const userId = extractUserIdUnsafe('');

      expect(userId).toBeNull();
    });

    it('JWT 형식이 아닌 토큰은 null을 반환해야 합니다', async () => {
      const { extractUserIdUnsafe } = await import('../src/lib/jwt.js');

      const userId = extractUserIdUnsafe('not.valid.jwt');

      expect(userId).toBeNull();
    });

    it('sub 클레임이 없는 토큰은 null을 반환해야 합니다', async () => {
      const { extractUserIdUnsafe } = await import('../src/lib/jwt.js');

      // sub 클레임이 없는 JWT (Base64 인코딩된 {"email":"test@example.com"})
      const noSubToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.' +
        'signature';

      const userId = extractUserIdUnsafe(noSubToken);

      expect(userId).toBeNull();
    });
  });

  // ============================================================
  // isTokenNearExpiration 함수 테스트
  // ============================================================
  describe('isTokenNearExpiration 함수', () => {
    it('유효하지 않은 토큰은 true를 반환해야 합니다', async () => {
      const { isTokenNearExpiration } = await import('../src/lib/jwt.js');

      const result = isTokenNearExpiration('invalid-token');

      expect(result).toBe(true);
    });

    it('빈 토큰은 true를 반환해야 합니다', async () => {
      const { isTokenNearExpiration } = await import('../src/lib/jwt.js');

      const result = isTokenNearExpiration('');

      expect(result).toBe(true);
    });

    it('exp 클레임이 없는 토큰은 true를 반환해야 합니다', async () => {
      const { isTokenNearExpiration } = await import('../src/lib/jwt.js');

      // exp 클레임이 없는 JWT
      const noExpToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiJ1c2VyLTEyMyJ9.' +
        'signature';

      const result = isTokenNearExpiration(noExpToken);

      expect(result).toBe(true);
    });

    it('기본 임계값(5분)을 사용해야 합니다', async () => {
      const { isTokenNearExpiration } = await import('../src/lib/jwt.js');

      // 3분 후 만료되는 토큰 (5분 임계값보다 작음)
      const exp = Math.floor(Date.now() / 1000) + 180; // 3분 후
      const nearExpirationToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        Buffer.from(JSON.stringify({ sub: 'user-123', exp })).toString('base64url') +
        '.signature';

      const result = isTokenNearExpiration(nearExpirationToken);

      expect(result).toBe(true);
    });

    it('사용자 정의 임계값을 사용해야 합니다', async () => {
      const { isTokenNearExpiration } = await import('../src/lib/jwt.js');

      // 30분 후 만료되는 토큰
      const exp = Math.floor(Date.now() / 1000) + 1800; // 30분 후
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        Buffer.from(JSON.stringify({ sub: 'user-123', exp })).toString('base64url') +
        '.signature';

      // 60분 임계값: 30분 후 만료되므로 true
      const nearExpiration = isTokenNearExpiration(token, 60);
      expect(nearExpiration).toBe(true);

      // 10분 임계값: 30분 후 만료되므로 false
      const notNearExpiration = isTokenNearExpiration(token, 10);
      expect(notNearExpiration).toBe(false);
    });
  });

  // ============================================================
  // validateJWTEnvironment 함수 테스트
  // ============================================================
  describe('validateJWTEnvironment 함수', () => {
    it('JWT 시크릿이 설정되지 않으면 에러를 던져야 합니다', async () => {
      vi.stubEnv('SUPABASE_JWT_SECRET', '');
      const { validateJWTEnvironment } = await import('../src/lib/jwt.js');

      expect(() => validateJWTEnvironment()).toThrow(
        'SUPABASE_JWT_SECRET environment variable is required'
      );
    });

    it('JWT 시크릿이 설정되면 에러를 던지지 않아야 합니다', async () => {
      vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
      const { validateJWTEnvironment } = await import('../src/lib/jwt.js');

      expect(() => validateJWTEnvironment()).not.toThrow();
    });
  });

  // ============================================================
  // SupabaseJWTPayload 타입 테스트
  // ============================================================
  describe('SupabaseJWTPayload 타입', () => {
    it('Mock JWT 페이로드가 올바른 구조를 가져야 합니다', () => {
      const payload = createMockJWTPayload();

      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('iss');
      expect(payload).toHaveProperty('aud');
      expect(payload).toHaveProperty('role');
    });

    it('만료된 JWT 페이로드가 올바른 구조를 가져야 합니다', () => {
      const payload = createExpiredJWTPayload();

      expect(payload).toHaveProperty('sub');
      expect(payload.exp).toBeLessThan(Math.floor(Date.now() / 1000));
    });

    it('Mock 페이로드 커스터마이징이 가능해야 합니다', () => {
      const customPayload = createMockJWTPayload({
        email: 'custom@example.com',
        role: 'admin',
      });

      expect(customPayload.email).toBe('custom@example.com');
      expect(customPayload.role).toBe('admin');
      expect(customPayload.sub).toBe(mockUser.id);
    });
  });

  // ============================================================
  // 토큰 만료 시나리오 테스트
  // ============================================================
  describe('토큰 만료 시나리오', () => {
    it('이미 만료된 토큰은 verifyToken에서 invalid를 반환해야 합니다', async () => {
      vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret-key-32-characters-long');
      const { verifyToken } = await import('../src/lib/jwt.js');

      // 만료된 토큰 (과거 exp)
      const expiredPayload = createExpiredJWTPayload();
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        Buffer.from(JSON.stringify(expiredPayload)).toString('base64url') +
        '.invalid_signature';

      const result = await verifyToken(expiredToken);

      expect(result.valid).toBe(false);
    });
  });
});
