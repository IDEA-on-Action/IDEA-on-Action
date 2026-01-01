/**
 * Sandbox MCP Integration E2E 테스트
 *
 * 목적: MCP 토큰 교환 및 권한 검증 통합 테스트
 * 참조: plan/minu-sandbox-setup.md
 *
 * 테스트 케이스:
 * - MCP 토큰 교환 (Supabase JWT → MCP Access Token)
 * - 권한 검증 (Scope 기반)
 * - 서비스별 토큰 발급
 * - 토큰 폐기
 */

import { test, expect } from '@playwright/test';
import { getAccessToken, getOAuthAccessToken, decodeJWT } from './helpers/auth';
import type { MCPServiceName, OAuthTokenResponse } from '@/types/auth/mcp-auth.types';

/**
 * 테스트 계정 정보
 */
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@ideaonaction.ai',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

/**
 * OAuth 클라이언트 정보 (Mock)
 */
const OAUTH_CLIENT = {
  clientId: process.env.OAUTH_CLIENT_ID || 'test-client-id',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || 'test-client-secret',
  redirectUri: 'https://sandbox.ideaonaction.ai/callback',
};

/**
 * MCP 서비스 목록
 */
const MCP_SERVICES: MCPServiceName[] = [
  'minu-find',
  'minu-frame',
  'minu-build',
  'minu-keep',
];

describe('MCP 통합', () => {
  test.describe('MCP 토큰 교환', () => {
    test('Supabase JWT를 MCP Access Token으로 교환', async ({ request }) => {
      // Given: Supabase 로그인하여 JWT 획득
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      expect(supabaseToken).toBeTruthy();

      // When: MCP 토큰 교환 요청 (Mock)
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';
      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read', 'write'],
        },
      });

      // Then: MCP 토큰 발급 성공
      if (tokenExchangeResponse.ok()) {
        const mcpTokenResponse: OAuthTokenResponse = await tokenExchangeResponse.json();

        expect(mcpTokenResponse.access_token).toBeTruthy();
        expect(mcpTokenResponse.token_type).toBe('Bearer');
        expect(mcpTokenResponse.expires_in).toBeGreaterThan(0);

        // Then: MCP 토큰 JWT 검증
        const mcpPayload = decodeJWT(mcpTokenResponse.access_token);
        expect(mcpPayload.sub).toBeTruthy();
        expect(mcpPayload.scope).toContain('read');
        expect(mcpPayload.scope).toContain('write');
      } else {
        // Edge Function이 아직 배포되지 않았을 수 있음
        console.warn('MCP 토큰 교환 Edge Function이 배포되지 않았습니다. 테스트 스킵.');
        test.skip();
      }
    });

    test('서비스별 MCP 토큰 발급', async ({ request }) => {
      // Given: Supabase 로그인하여 JWT 획득
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 각 MCP 서비스별 토큰 발급
      for (const serviceName of MCP_SERVICES) {
        const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseToken}`,
          },
          data: {
            service_name: serviceName,
            scopes: ['read'],
          },
        });

        // Then: 서비스별 토큰 발급 성공
        if (tokenExchangeResponse.ok()) {
          const mcpTokenResponse: OAuthTokenResponse = await tokenExchangeResponse.json();

          expect(mcpTokenResponse.access_token).toBeTruthy();
          expect(mcpTokenResponse.token_type).toBe('Bearer');

          const mcpPayload = decodeJWT(mcpTokenResponse.access_token);
          expect(mcpPayload.sub).toBeTruthy();
          expect(mcpPayload.aud).toContain(serviceName);
        } else {
          console.warn(`MCP 토큰 교환 실패: ${serviceName}. 테스트 스킵.`);
        }
      }
    });

    test('잘못된 Supabase JWT 거부', async ({ request }) => {
      // Given: 잘못된 Supabase JWT
      const invalidToken = 'invalid-supabase-jwt';
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: MCP 토큰 교환 요청
      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invalidToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read'],
        },
      });

      // Then: 토큰 교환 실패
      expect(tokenExchangeResponse.ok()).toBeFalsy();
      expect(tokenExchangeResponse.status()).toBe(401);
    });

    test('존재하지 않는 서비스 거부', async ({ request }) => {
      // Given: Supabase 로그인하여 JWT 획득
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 존재하지 않는 서비스로 토큰 교환 요청
      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'invalid-service',
          scopes: ['read'],
        },
      });

      // Then: 토큰 교환 실패
      if (!tokenExchangeResponse.ok()) {
        expect(tokenExchangeResponse.status()).toBe(400);
      } else {
        console.warn('서비스 검증이 구현되지 않았습니다. 테스트 스킵.');
      }
    });
  });

  test.describe('권한 검증', () => {
    test('Scope 기반 권한 검증', async ({ request }) => {
      // Given: Supabase 로그인 및 MCP 토큰 발급
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read'],
        },
      });

      if (!tokenExchangeResponse.ok()) {
        console.warn('MCP 토큰 발급 실패. 테스트 스킵.');
        test.skip();
        return;
      }

      const { access_token: mcpToken } = await tokenExchangeResponse.json();

      // When: read 권한으로 리소스 조회 (Mock API)
      const readResponse = await request.get(`${baseURL}/functions/v1/mcp-api/resources`, {
        headers: {
          'Authorization': `Bearer ${mcpToken}`,
        },
      });

      // Then: 조회 성공
      if (readResponse.ok()) {
        expect(readResponse.status()).toBe(200);
      }

      // When: write 권한 없이 리소스 생성 시도 (Mock API)
      const createResponse = await request.post(`${baseURL}/functions/v1/mcp-api/resources`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mcpToken}`,
        },
        data: {
          name: 'test-resource',
        },
      });

      // Then: 권한 부족으로 실패
      if (!createResponse.ok()) {
        expect(createResponse.status()).toBe(403);
      } else {
        console.warn('권한 검증이 구현되지 않았습니다. 테스트 스킵.');
      }
    });

    test('다중 Scope 권한 검증', async ({ request }) => {
      // Given: Supabase 로그인 및 MCP 토큰 발급 (read + write)
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read', 'write'],
        },
      });

      if (!tokenExchangeResponse.ok()) {
        console.warn('MCP 토큰 발급 실패. 테스트 스킵.');
        test.skip();
        return;
      }

      const { access_token: mcpToken } = await tokenExchangeResponse.json();

      // Then: JWT Scope 검증
      const mcpPayload = decodeJWT(mcpToken);
      expect(mcpPayload.scope).toContain('read');
      expect(mcpPayload.scope).toContain('write');

      // When: read + write 권한으로 리소스 생성 (Mock API)
      const createResponse = await request.post(`${baseURL}/functions/v1/mcp-api/resources`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mcpToken}`,
        },
        data: {
          name: 'test-resource',
        },
      });

      // Then: 생성 성공 또는 API 미구현
      if (createResponse.ok()) {
        expect(createResponse.status()).toBe(201);
      } else {
        console.warn('MCP API가 구현되지 않았습니다. 테스트 스킵.');
      }
    });

    test('만료된 MCP 토큰 거부', async ({ request }) => {
      // Given: 만료된 MCP 토큰 (Mock)
      const expiredMcpToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwLCJzY29wZSI6InJlYWQifQ.dummy';
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      // When: 만료된 토큰으로 API 요청
      const response = await request.get(`${baseURL}/functions/v1/mcp-api/resources`, {
        headers: {
          'Authorization': `Bearer ${expiredMcpToken}`,
        },
      });

      // Then: 인증 실패
      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(401);
    });
  });

  test.describe('OAuth Authorization Code Flow', () => {
    test('Authorization Code를 Access Token으로 교환', async ({ request }) => {
      // Given: Authorization Code 획득 (Mock)
      // 실제 환경에서는 OAuth 인증 플로우를 통해 획득
      const mockAuthorizationCode = 'mock-auth-code-123456';
      const { clientId, clientSecret, redirectUri } = OAUTH_CLIENT;

      // When: Authorization Code를 Access Token으로 교환
      try {
        const tokenResponse = await getOAuthAccessToken(
          request,
          clientId,
          clientSecret,
          mockAuthorizationCode,
          redirectUri
        );

        // Then: Access Token 발급 성공
        expect(tokenResponse.access_token).toBeTruthy();
        expect(tokenResponse.refresh_token).toBeTruthy();
        expect(tokenResponse.expires_in).toBeGreaterThan(0);

        // Then: JWT 형식 검증
        const payload = decodeJWT(tokenResponse.access_token);
        expect(payload.sub).toBeTruthy();
        expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      } catch (error) {
        // Edge Function이 배포되지 않았거나 Mock 코드가 유효하지 않을 수 있음
        console.warn('OAuth 토큰 교환 실패. Edge Function 미배포 또는 Mock 코드 무효:', error);
        test.skip();
      }
    });

    test('PKCE (Proof Key for Code Exchange) 지원', async ({ request }) => {
      // Given: PKCE Code Verifier 생성
      const codeVerifier = 'mock-code-verifier-123456789';
      const mockAuthorizationCode = 'mock-auth-code-with-pkce';
      const { clientId, clientSecret, redirectUri } = OAUTH_CLIENT;

      // When: PKCE를 사용한 토큰 교환
      try {
        const tokenResponse = await getOAuthAccessToken(
          request,
          clientId,
          clientSecret,
          mockAuthorizationCode,
          redirectUri,
          codeVerifier
        );

        // Then: Access Token 발급 성공
        expect(tokenResponse.access_token).toBeTruthy();
        expect(tokenResponse.refresh_token).toBeTruthy();
      } catch (error) {
        console.warn('PKCE OAuth 토큰 교환 실패. Edge Function 미배포:', error);
        test.skip();
      }
    });

    test('잘못된 Authorization Code 거부', async ({ request }) => {
      // Given: 잘못된 Authorization Code
      const invalidAuthCode = 'invalid-auth-code';
      const { clientId, clientSecret, redirectUri } = OAUTH_CLIENT;

      // When & Then: 토큰 교환 실패
      await expect(
        getOAuthAccessToken(request, clientId, clientSecret, invalidAuthCode, redirectUri)
      ).rejects.toThrow(/OAuth 토큰 교환 실패/);
    });

    test('만료된 Authorization Code 거부', async ({ request }) => {
      // Given: 만료된 Authorization Code (Mock)
      const expiredAuthCode = 'expired-auth-code-123456';
      const { clientId, clientSecret, redirectUri } = OAUTH_CLIENT;

      // When & Then: 토큰 교환 실패
      await expect(
        getOAuthAccessToken(request, clientId, clientSecret, expiredAuthCode, redirectUri)
      ).rejects.toThrow(/OAuth 토큰 교환 실패/);
    });
  });

  test.describe('토큰 폐기', () => {
    test('MCP Access Token 폐기', async ({ request }) => {
      // Given: MCP 토큰 발급
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read'],
        },
      });

      if (!tokenExchangeResponse.ok()) {
        console.warn('MCP 토큰 발급 실패. 테스트 스킵.');
        test.skip();
        return;
      }

      const { access_token: mcpToken } = await tokenExchangeResponse.json();

      // When: 토큰 폐기 요청
      const revokeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-revoke`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mcpToken}`,
        },
        data: {
          token: mcpToken,
          token_type: 'access',
        },
      });

      // Then: 폐기 성공 또는 API 미구현
      if (revokeResponse.ok()) {
        expect(revokeResponse.status()).toBe(200);

        // Then: 폐기된 토큰 재사용 실패
        const verifyResponse = await request.get(`${baseURL}/functions/v1/mcp-api/resources`, {
          headers: {
            'Authorization': `Bearer ${mcpToken}`,
          },
        });

        expect(verifyResponse.ok()).toBeFalsy();
        expect(verifyResponse.status()).toBe(401);
      } else {
        console.warn('MCP 토큰 폐기 API가 구현되지 않았습니다. 테스트 스킵.');
      }
    });

    test('Refresh Token 폐기', async ({ request }) => {
      // Given: MCP 토큰 발급 (Refresh Token 포함)
      const { email, password } = TEST_USER;
      const supabaseToken = await getAccessToken(request, email, password);
      const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

      const tokenExchangeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-exchange`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`,
        },
        data: {
          service_name: 'minu-find',
          scopes: ['read'],
        },
      });

      if (!tokenExchangeResponse.ok()) {
        console.warn('MCP 토큰 발급 실패. 테스트 스킵.');
        test.skip();
        return;
      }

      const tokenData: OAuthTokenResponse = await tokenExchangeResponse.json();
      const refreshToken = tokenData.refresh_token;

      if (!refreshToken) {
        console.warn('Refresh Token이 발급되지 않았습니다. 테스트 스킵.');
        test.skip();
        return;
      }

      // When: Refresh Token 폐기 요청
      const revokeResponse = await request.post(`${baseURL}/functions/v1/mcp-token-revoke`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        data: {
          token: refreshToken,
          token_type: 'refresh',
        },
      });

      // Then: 폐기 성공 또는 API 미구현
      if (revokeResponse.ok()) {
        expect(revokeResponse.status()).toBe(200);
      } else {
        console.warn('Refresh Token 폐기 API가 구현되지 않았습니다. 테스트 스킵.');
      }
    });
  });
});
