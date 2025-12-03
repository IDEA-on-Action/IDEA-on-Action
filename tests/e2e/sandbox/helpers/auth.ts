/**
 * Sandbox 인증 헬퍼 함수
 *
 * 목적: OAuth 테스트용 인증 유틸리티
 */

import { APIRequestContext } from '@playwright/test';

/**
 * 테스트 계정으로 로그인하여 Access Token 획득
 */
export async function getAccessToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

  // Supabase Auth 로그인
  const response = await request.post(`${baseURL}/auth/v1/token?grant_type=password`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
    },
    data: {
      email,
      password,
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`로그인 실패: ${response.status()} ${text}`);
  }

  const body = await response.json();
  return body.access_token;
}

/**
 * Refresh Token으로 새 Access Token 발급
 */
export async function refreshAccessToken(
  request: APIRequestContext,
  refreshToken: string
): Promise<string> {
  const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

  const response = await request.post(`${baseURL}/auth/v1/token?grant_type=refresh_token`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
    },
    data: {
      refresh_token: refreshToken,
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`토큰 갱신 실패: ${response.status()} ${text}`);
  }

  const body = await response.json();
  return body.access_token;
}

/**
 * JWT 디코딩 (서명 검증 없이 페이로드만 추출)
 */
export function decodeJWT(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('유효하지 않은 JWT 형식');
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * OAuth Authorization Code Flow 시뮬레이션
 */
export async function getOAuthAccessToken(
  request: APIRequestContext,
  clientId: string,
  clientSecret: string,
  authorizationCode: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const baseURL = process.env.VITE_SUPABASE_URL_SANDBOX || 'https://sandbox.ideaonaction.ai';

  const response = await request.post(`${baseURL}/functions/v1/oauth-token`, {
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`OAuth 토큰 교환 실패: ${response.status()} ${text}`);
  }

  return await response.json();
}
