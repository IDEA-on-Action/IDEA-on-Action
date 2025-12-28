/**
 * MCP 토큰 서비스
 *
 * Supabase Edge Function과 통신하여 MCP JWT 토큰을 발급/검증/갱신/폐기합니다.
 * - Access Token: 1시간 만료
 * - Refresh Token: 7일 만료
 *
 * @module lib/auth/mcp-token-service
 */

import { callWorkersApi } from '@/integrations/cloudflare/client';
import { generateAccessToken, generateRefreshToken, verifyToken, decodeToken } from './jwt';
import type { JWTPayload } from '@/types/mcp-auth.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 토큰 발급 요청
 */
export interface IssueTokenRequest {
  clientId: string;
  userId: string;
  scopes?: string[];
}

/**
 * 토큰 발급 응답
 */
export interface IssueTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string;
}

/**
 * 토큰 검증 응답
 */
export interface VerifyTokenResponse {
  valid: boolean;
  status: 'valid' | 'expired' | 'invalid' | 'revoked';
  payload?: JWTPayload;
  expiresAt?: Date;
  remainingSeconds?: number;
  userId?: string;
  clientId?: string;
  scope?: string;
}

/**
 * 토큰 정보 조회 응답
 */
export interface TokenInfo {
  userId: string;
  clientId: string;
  scope: string;
  expiresAt: Date;
  remainingSeconds: number;
  sessionId?: string;
  jti?: string;
}

// ============================================================================
// 토큰 발급
// ============================================================================

/**
 * MCP 토큰 발급
 *
 * Supabase issue_mcp_token 함수를 호출하여 JWT 토큰을 생성합니다.
 *
 * @param clientId OAuth 클라이언트 ID
 * @param userId 사용자 ID (UUID)
 * @param scopes 요청 권한 (기본: ['openid'])
 * @returns 발급된 토큰 정보
 * @throws Error 발급 실패 시
 *
 * @example
 * ```ts
 * const tokens = await issueToken('minu-find-sandbox', 'user-uuid', ['openid', 'profile']);
 * console.log('Access Token:', tokens.accessToken);
 * ```
 */
export async function issueToken(
  clientId: string,
  userId: string,
  scopes: string[] = ['openid']
): Promise<IssueTokenResponse> {
  try {
    // 1. Supabase Function 호출 (토큰 메타데이터 생성)
    const { data, error } = await supabase.rpc('issue_mcp_token', {
      p_client_id: clientId,
      p_user_id: userId,
      p_scopes: scopes,
    });

    if (error) {
      throw new Error(`Failed to issue token: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from issue_mcp_token');
    }

    // 2. JWT 토큰 생성 (클라이언트 사이드)
    const accessToken = await generateAccessToken({
      sub: data.user_id,
      aud: data.client_id,
      scope: data.scope,
      jti: data.access_token_jti,
      sid: data.session_id,
    });

    const refreshToken = await generateRefreshToken({
      sub: data.user_id,
      aud: data.client_id,
      scope: data.scope,
      jti: data.refresh_token_jti,
      sid: data.session_id,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: data.expires_in,
      tokenType: 'Bearer',
      scope: data.scope,
    };
  } catch (error) {
    console.error('[MCP Token Service] Issue token failed:', error);
    throw error;
  }
}

// ============================================================================
// 토큰 검증
// ============================================================================

/**
 * MCP 토큰 검증
 *
 * JWT 서명 검증 + Supabase DB에서 세션 상태 확인
 *
 * @param token JWT 토큰 문자열
 * @returns 검증 결과
 *
 * @example
 * ```ts
 * const result = await verifyMCPToken(accessToken);
 * if (result.valid) {
 *   console.log('User ID:', result.userId);
 * }
 * ```
 */
export async function verifyMCPToken(token: string): Promise<VerifyTokenResponse> {
  try {
    // 1. JWT 서명 검증
    const payload = await verifyToken(token);

    if (!payload) {
      return {
        valid: false,
        status: 'invalid',
      };
    }

    // 2. 만료 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return {
        valid: false,
        status: 'expired',
        payload,
        expiresAt: new Date(payload.exp * 1000),
        remainingSeconds: 0,
      };
    }

    // 3. DB에서 세션 상태 확인 (폐기 여부)
    const { data, error } = await supabase.rpc('verify_mcp_token', {
      p_token_jti: payload.jti,
    });

    if (error) {
      console.error('[MCP Token Service] DB verification failed:', error);
      // DB 검증 실패해도 JWT 자체는 유효하면 통과
      return {
        valid: true,
        status: 'valid',
        payload,
        userId: payload.sub,
        clientId: payload.aud,
        scope: payload.scope,
      };
    }

    if (!data || !data.valid) {
      return {
        valid: false,
        status: (data?.status as 'revoked' | 'expired' | 'invalid') || 'invalid',
      };
    }

    // 4. 검증 성공
    return {
      valid: true,
      status: 'valid',
      payload,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      remainingSeconds: data.remaining_seconds,
      userId: data.user_id,
      clientId: data.client_id,
      scope: data.scope,
    };
  } catch (error) {
    console.error('[MCP Token Service] Verify token failed:', error);
    return {
      valid: false,
      status: 'invalid',
    };
  }
}

// ============================================================================
// 토큰 폐기
// ============================================================================

/**
 * MCP 토큰 폐기 (로그아웃)
 *
 * @param tokenId JWT ID (jti claim)
 * @returns 폐기 성공 여부
 *
 * @example
 * ```ts
 * const payload = decodeToken(accessToken);
 * if (payload?.jti) {
 *   await revokeToken(payload.jti);
 * }
 * ```
 */
export async function revokeToken(tokenId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('revoke_mcp_token', {
      p_token_jti: tokenId,
    });

    if (error) {
      console.error('[MCP Token Service] Revoke token failed:', error);
      return false;
    }

    return data?.revoked || false;
  } catch (error) {
    console.error('[MCP Token Service] Revoke token exception:', error);
    return false;
  }
}

// ============================================================================
// 토큰 갱신
// ============================================================================

/**
 * MCP 토큰 갱신
 *
 * Refresh Token으로 새로운 Access Token 발급
 *
 * @param refreshToken Refresh Token 문자열
 * @returns 새로운 토큰 정보
 * @throws Error 갱신 실패 시
 *
 * @example
 * ```ts
 * const newTokens = await refreshMCPToken(oldRefreshToken);
 * console.log('New Access Token:', newTokens.accessToken);
 * ```
 */
export async function refreshMCPToken(refreshToken: string): Promise<IssueTokenResponse> {
  try {
    // 1. Refresh Token 디코딩 (JTI 추출)
    const payload = decodeToken(refreshToken);

    if (!payload || !payload.jti) {
      throw new Error('Invalid refresh token: missing jti');
    }

    // 2. Supabase Function 호출 (새 토큰 메타데이터 생성)
    const { data, error } = await supabase.rpc('refresh_mcp_token', {
      p_refresh_jti: payload.jti,
    });

    if (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from refresh_mcp_token');
    }

    // 3. 새 JWT 토큰 생성
    const newAccessToken = await generateAccessToken({
      sub: data.user_id,
      aud: data.client_id,
      scope: data.scope,
      jti: data.access_token_jti,
      sid: data.session_id,
    });

    const newRefreshToken = await generateRefreshToken({
      sub: data.user_id,
      aud: data.client_id,
      scope: data.scope,
      jti: data.refresh_token_jti,
      sid: data.session_id,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: data.expires_in,
      tokenType: 'Bearer',
      scope: data.scope,
    };
  } catch (error) {
    console.error('[MCP Token Service] Refresh token failed:', error);
    throw error;
  }
}

// ============================================================================
// 토큰 정보 조회
// ============================================================================

/**
 * 토큰 정보 조회 (디코딩만, 검증 없음)
 *
 * @param token JWT 토큰 문자열
 * @returns 토큰 정보 또는 null
 *
 * @example
 * ```ts
 * const info = getTokenInfo(accessToken);
 * if (info) {
 *   console.log('Expires in:', info.remainingSeconds, 'seconds');
 * }
 * ```
 */
export function getTokenInfo(token: string): TokenInfo | null {
  const payload = decodeToken(token);

  if (!payload || !payload.sub || !payload.aud || !payload.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = Math.max(0, payload.exp - now);

  return {
    userId: payload.sub,
    clientId: payload.aud,
    scope: payload.scope || '',
    expiresAt: new Date(payload.exp * 1000),
    remainingSeconds,
    sessionId: payload.sid,
    jti: payload.jti,
  };
}
