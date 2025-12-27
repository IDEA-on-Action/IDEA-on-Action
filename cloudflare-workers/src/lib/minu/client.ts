/**
 * Minu API 클라이언트
 * Cloudflare Workers용
 */

import {
  type MinuService,
  type MinuTokenResponse,
  type MinuUserInfo,
  type MinuUserInfoResponse,
  type MinuSubscriptionInfo,
  MINU_SERVICE_URLS,
} from './types';

// ============================================================================
// 클라이언트 설정
// ============================================================================

export interface MinuClientConfig {
  service: MinuService;
  clientId: string;
  clientSecret: string;
}

// ============================================================================
// 에러 클래스
// ============================================================================

export class MinuClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MinuClientError';
  }
}

// ============================================================================
// Minu API 클라이언트
// ============================================================================

export class MinuClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly service: MinuService;

  constructor(config: MinuClientConfig) {
    this.service = config.service;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = MINU_SERVICE_URLS[config.service];
  }

  /**
   * Authorization Code로 토큰 교환
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<MinuTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new MinuClientError('MINU_API_ERROR', error.message, error.details);
    }

    return response.json();
  }

  /**
   * Refresh Token으로 새 토큰 발급
   */
  async refreshToken(refreshToken: string): Promise<MinuTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new MinuClientError('MINU_TOKEN_EXPIRED', error.message, error.details);
    }

    return response.json();
  }

  /**
   * 사용자 정보 조회
   */
  async getUserInfo(accessToken: string): Promise<MinuUserInfo> {
    const response = await fetch(`${this.baseUrl}/oauth/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new MinuClientError('MINU_INVALID_TOKEN', '유효하지 않은 토큰입니다.');
      }
      const error = await this.parseError(response);
      throw new MinuClientError('MINU_API_ERROR', error.message, error.details);
    }

    const data: MinuUserInfoResponse = await response.json();

    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      avatar_url: data.picture,
      organization: data.organization,
    };
  }

  /**
   * 구독 정보 조회
   */
  async getSubscription(accessToken: string): Promise<MinuSubscriptionInfo | null> {
    const response = await fetch(`${this.baseUrl}/api/user/subscription?service=${this.service}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      if (response.status === 401) {
        throw new MinuClientError('MINU_INVALID_TOKEN', '유효하지 않은 토큰입니다.');
      }
      const error = await this.parseError(response);
      throw new MinuClientError('MINU_API_ERROR', error.message, error.details);
    }

    return response.json();
  }

  /**
   * 에러 응답 파싱
   */
  private async parseError(response: Response): Promise<{ message: string; details?: Record<string, unknown> }> {
    try {
      const data = await response.json() as Record<string, unknown>;
      return {
        message: (data.error_description as string) || (data.message as string) || 'Unknown error',
        details: data,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 환경 변수에서 Minu 클라이언트 생성
 */
export function createMinuClient(service: MinuService, env: Record<string, string | undefined>): MinuClient {
  const serviceUpper = service.toUpperCase();
  const clientId = env[`MINU_${serviceUpper}_CLIENT_ID`];
  const clientSecret = env[`MINU_${serviceUpper}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing MINU_${serviceUpper}_CLIENT_ID or MINU_${serviceUpper}_CLIENT_SECRET`);
  }

  return new MinuClient({
    service,
    clientId,
    clientSecret,
  });
}

/**
 * SHA-256 해시 생성 (토큰 저장용)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 웹훅 서명 검증
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  if (!signature) {
    return { valid: false, error: '서명이 없습니다.' };
  }

  // 타임스탬프 검증 (5분 이내)
  if (timestamp) {
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return { valid: false, error: '타임스탬프가 만료되었습니다.' };
    }
  }

  // HMAC-SHA256 서명 검증
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe 비교
  const sig = signature.replace('sha256=', '').toLowerCase();
  const expected = expectedSignature.toLowerCase();

  if (sig.length !== expected.length) {
    return { valid: false, error: '서명 길이가 일치하지 않습니다.' };
  }

  let result = 0;
  for (let i = 0; i < sig.length; i++) {
    result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (result !== 0) {
    return { valid: false, error: '서명이 일치하지 않습니다.' };
  }

  return { valid: true };
}
