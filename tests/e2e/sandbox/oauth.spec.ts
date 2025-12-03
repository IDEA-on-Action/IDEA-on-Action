/**
 * Sandbox OAuth E2E 테스트
 *
 * 목적: OAuth 인증 플로우 통합 테스트
 * 참조: plan/minu-sandbox-setup.md
 *
 * 테스트 케이스:
 * - 로그인 성공 (email/password)
 * - 토큰 갱신 (refresh token)
 * - 로그아웃 (세션 삭제)
 * - 잘못된 자격 증명 거부
 * - 만료된 토큰 처리
 */

import { test, expect } from '@playwright/test';
import { getAccessToken, refreshAccessToken, decodeJWT } from './helpers/auth';

/**
 * 테스트 계정 정보
 * 실제 테스트에서는 환경 변수로 관리
 */
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@ideaonaction.ai',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

const INVALID_USER = {
  email: 'invalid@ideaonaction.ai',
  password: 'wrongpassword',
};

describe('OAuth 인증 플로우', () => {
  test.describe('로그인', () => {
    test('이메일/패스워드로 로그인 성공', async ({ request }) => {
      // Given: 유효한 사용자 자격 증명
      const { email, password } = TEST_USER;

      // When: 로그인 요청
      const accessToken = await getAccessToken(request, email, password);

      // Then: 액세스 토큰 발급 성공
      expect(accessToken).toBeTruthy();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3); // JWT 형식 검증

      // Then: JWT 페이로드 검증
      const payload = decodeJWT(accessToken);
      expect(payload.sub).toBeTruthy(); // User ID 존재
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // 만료 시간이 미래
    });

    test('잘못된 자격 증명 거부', async ({ request }) => {
      // Given: 잘못된 사용자 자격 증명
      const { email, password } = INVALID_USER;

      // When & Then: 로그인 요청 실패
      await expect(
        getAccessToken(request, email, password)
      ).rejects.toThrow(/로그인 실패/);
    });

    test('존재하지 않는 이메일 거부', async ({ request }) => {
      // Given: 존재하지 않는 이메일
      const email = 'nonexistent@ideaonaction.ai';
      const password = 'anypassword';

      // When & Then: 로그인 요청 실패
      await expect(
        getAccessToken(request, email, password)
      ).rejects.toThrow(/로그인 실패/);
    });

    test('빈 자격 증명 거부', async ({ request }) => {
      // Given: 빈 자격 증명
      const email = '';
      const password = '';

      // When & Then: 로그인 요청 실패
      await expect(
        getAccessToken(request, email, password)
      ).rejects.toThrow(/로그인 실패/);
    });
  });

  test.describe('토큰 갱신', () => {
    test('Refresh Token으로 새 Access Token 발급', async ({ request }) => {
      // Given: 로그인하여 리프레시 토큰 획득
      const { email, password } = TEST_USER;
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const loginResponse = await request.post(`${baseURL}/auth/v1/token?grant_type=password`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
        },
        data: { email, password },
      });

      const { refresh_token: refreshToken } = await loginResponse.json();
      expect(refreshToken).toBeTruthy();

      // When: 리프레시 토큰으로 갱신
      const newAccessToken = await refreshAccessToken(request, refreshToken);

      // Then: 새 액세스 토큰 발급 성공
      expect(newAccessToken).toBeTruthy();
      expect(typeof newAccessToken).toBe('string');
      expect(newAccessToken.split('.')).toHaveLength(3); // JWT 형식 검증

      // Then: JWT 페이로드 검증
      const payload = decodeJWT(newAccessToken);
      expect(payload.sub).toBeTruthy();
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('잘못된 Refresh Token 거부', async ({ request }) => {
      // Given: 잘못된 리프레시 토큰
      const invalidRefreshToken = 'invalid-refresh-token';

      // When & Then: 토큰 갱신 요청 실패
      await expect(
        refreshAccessToken(request, invalidRefreshToken)
      ).rejects.toThrow(/토큰 갱신 실패/);
    });

    test('만료된 Refresh Token 거부', async ({ request }) => {
      // Given: 만료된 리프레시 토큰 (Mock)
      // 실제 환경에서는 만료 시간을 조작하거나 이미 만료된 토큰 사용
      const expiredRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ.dummy';

      // When & Then: 토큰 갱신 요청 실패
      await expect(
        refreshAccessToken(request, expiredRefreshToken)
      ).rejects.toThrow(/토큰 갱신 실패/);
    });
  });

  test.describe('로그아웃', () => {
    test('세션 삭제 성공', async ({ request }) => {
      // Given: 로그인하여 액세스 토큰 획득
      const { email, password } = TEST_USER;
      const accessToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 로그아웃 요청
      const logoutResponse = await request.post(`${baseURL}/auth/v1/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // Then: 로그아웃 성공
      expect(logoutResponse.ok()).toBeTruthy();
      expect([200, 204]).toContain(logoutResponse.status());

      // Then: 로그아웃 후 토큰 재사용 실패
      const verifyResponse = await request.get(`${baseURL}/auth/v1/user`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(verifyResponse.ok()).toBeFalsy();
      expect(verifyResponse.status()).toBe(401);
    });

    test('유효하지 않은 토큰으로 로그아웃 거부', async ({ request }) => {
      // Given: 유효하지 않은 토큰
      const invalidToken = 'invalid-access-token';
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 로그아웃 요청
      const logoutResponse = await request.post(`${baseURL}/auth/v1/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
          'Authorization': `Bearer ${invalidToken}`,
        },
      });

      // Then: 로그아웃 실패
      expect(logoutResponse.ok()).toBeFalsy();
      expect(logoutResponse.status()).toBe(401);
    });
  });

  test.describe('만료된 토큰 처리', () => {
    test('만료된 Access Token 거부', async ({ request }) => {
      // Given: 만료된 액세스 토큰 (Mock)
      // 실제 환경에서는 만료 시간을 조작하거나 이미 만료된 토큰 사용
      const expiredAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ.dummy';
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 만료된 토큰으로 인증 요청
      const verifyResponse = await request.get(`${baseURL}/auth/v1/user`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
          'Authorization': `Bearer ${expiredAccessToken}`,
        },
      });

      // Then: 인증 실패
      expect(verifyResponse.ok()).toBeFalsy();
      expect(verifyResponse.status()).toBe(401);
    });

    test('만료 시간이 가까운 토큰 자동 갱신', async ({ request }) => {
      // Given: 로그인하여 토큰 획득
      const { email, password } = TEST_USER;
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const loginResponse = await request.post(`${baseURL}/auth/v1/token?grant_type=password`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
        },
        data: { email, password },
      });

      const { access_token: accessToken, refresh_token: refreshToken } = await loginResponse.json();

      // When: JWT 페이로드 확인
      const payload = decodeJWT(accessToken);
      const expiresAt = payload.exp * 1000; // 밀리초로 변환
      const now = Date.now();
      const remainingTime = expiresAt - now;

      // Then: 만료 시간이 5분 이내면 갱신 권장
      const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5분
      if (remainingTime < REFRESH_THRESHOLD) {
        const newAccessToken = await refreshAccessToken(request, refreshToken);
        expect(newAccessToken).toBeTruthy();

        const newPayload = decodeJWT(newAccessToken);
        expect(newPayload.exp).toBeGreaterThan(payload.exp);
      }

      // Then: 만료 시간이 충분하면 기존 토큰 유지
      expect(remainingTime).toBeGreaterThan(0);
    });
  });

  test.describe('토큰 형식 검증', () => {
    test('JWT 형식 검증', async ({ request }) => {
      // Given: 로그인하여 액세스 토큰 획득
      const { email, password } = TEST_USER;
      const accessToken = await getAccessToken(request, email, password);

      // When: JWT 디코딩
      const payload = decodeJWT(accessToken);

      // Then: 필수 Claims 존재 확인
      expect(payload.sub).toBeTruthy(); // Subject (User ID)
      expect(payload.exp).toBeTruthy(); // Expiration Time
      expect(payload.iat).toBeTruthy(); // Issued At
      expect(payload.iss).toBeTruthy(); // Issuer

      // Then: 만료 시간 > 발급 시간
      expect(payload.exp).toBeGreaterThan(payload.iat);

      // Then: 발급 시간이 과거
      expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    test('Bearer 토큰 형식 검증', async ({ request }) => {
      // Given: 로그인하여 액세스 토큰 획득
      const { email, password } = TEST_USER;
      const accessToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: Authorization 헤더에 Bearer 토큰 전달
      const verifyResponse = await request.get(`${baseURL}/auth/v1/user`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // Then: 인증 성공
      expect(verifyResponse.ok()).toBeTruthy();
      expect(verifyResponse.status()).toBe(200);

      const user = await verifyResponse.json();
      expect(user.id).toBeTruthy();
      expect(user.email).toBe(email);
    });
  });
});
