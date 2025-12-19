/**
 * Minu API 클라이언트
 *
 * Minu 서비스 API 호출을 위한 클라이언트 클래스입니다.
 *
 * @version 1.0.0
 */

import {
  type MinuService,
  type MinuTokenResponse,
  type MinuUserInfo,
  type MinuUserInfoResponse,
  type MinuSubscriptionInfo,
  type MinuApiError,
  MINU_SERVICE_URLS,
  MINU_SERVICE_URLS_DEV,
  MinuErrorCodes,
} from './minu.types.ts'

/** 클라이언트 설정 */
export interface MinuClientConfig {
  /** 서비스 타입 */
  service: MinuService
  /** 클라이언트 ID */
  clientId: string
  /** 클라이언트 시크릿 */
  clientSecret: string
  /** 개발 환경 여부 */
  isDevelopment?: boolean
}

/**
 * Minu API 클라이언트
 */
export class MinuClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly service: MinuService

  constructor(config: MinuClientConfig) {
    this.service = config.service
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret

    // 환경에 따른 URL 선택
    const urls = config.isDevelopment ? MINU_SERVICE_URLS_DEV : MINU_SERVICE_URLS
    this.baseUrl = urls[config.service]
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
    })

    if (!response.ok) {
      const error = await this.parseError(response)
      throw new MinuClientError(MinuErrorCodes.API_ERROR, error.message, error)
    }

    return response.json()
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
    })

    if (!response.ok) {
      const error = await this.parseError(response)
      throw new MinuClientError(MinuErrorCodes.TOKEN_EXPIRED, error.message, error)
    }

    return response.json()
  }

  /**
   * 토큰 폐기
   */
  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    const body: Record<string, string> = { token }
    if (tokenTypeHint) {
      body.token_type_hint = tokenTypeHint
    }

    const response = await fetch(`${this.baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: new URLSearchParams(body),
    })

    // RFC 7009: 항상 200 OK 반환 (에러 무시)
    if (!response.ok && response.status !== 200) {
      console.warn('Token revocation failed:', await response.text())
    }
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
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new MinuClientError(MinuErrorCodes.INVALID_TOKEN, '유효하지 않은 토큰입니다.')
      }
      const error = await this.parseError(response)
      throw new MinuClientError(MinuErrorCodes.API_ERROR, error.message, error)
    }

    const data: MinuUserInfoResponse = await response.json()

    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      avatar_url: data.picture,
      organization: data.organization,
    }
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
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      if (response.status === 401) {
        throw new MinuClientError(MinuErrorCodes.INVALID_TOKEN, '유효하지 않은 토큰입니다.')
      }
      const error = await this.parseError(response)
      throw new MinuClientError(MinuErrorCodes.API_ERROR, error.message, error)
    }

    return response.json()
  }

  /**
   * Access Token 검증
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken)
      return true
    } catch {
      return false
    }
  }

  /**
   * 에러 응답 파싱
   */
  private async parseError(response: Response): Promise<MinuApiError> {
    try {
      const data = await response.json()
      return {
        code: data.error || 'unknown_error',
        message: data.error_description || data.message || 'Unknown error',
        details: data,
      }
    } catch {
      return {
        code: 'parse_error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }
    }
  }
}

/**
 * Minu 클라이언트 에러
 */
export class MinuClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: MinuApiError
  ) {
    super(message)
    this.name = 'MinuClientError'
  }
}

/**
 * 환경 변수에서 Minu 클라이언트 생성
 */
export function createMinuClient(service: MinuService): MinuClient {
  const serviceUpper = service.toUpperCase()
  const clientId = Deno.env.get(`MINU_${serviceUpper}_CLIENT_ID`)
  const clientSecret = Deno.env.get(`MINU_${serviceUpper}_CLIENT_SECRET`)
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development'

  if (!clientId || !clientSecret) {
    throw new Error(`Missing MINU_${serviceUpper}_CLIENT_ID or MINU_${serviceUpper}_CLIENT_SECRET`)
  }

  return new MinuClient({
    service,
    clientId,
    clientSecret,
    isDevelopment,
  })
}

/**
 * SHA-256 해시 생성 (토큰 저장용)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
