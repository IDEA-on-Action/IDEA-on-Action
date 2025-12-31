/**
 * useOAuthClient Hook
 *
 * Minu 서비스용 OAuth 클라이언트 훅
 * - PKCE (Proof Key for Code Exchange) 기반 인증
 * - 토큰 자동 갱신 (만료 5분 전)
 * - localStorage 토큰 관리
 * - Cloudflare Workers Auth와 연동
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * @description
 * PKCE 플로우를 사용하여 안전한 OAuth 2.0 인증을 구현합니다.
 * 토큰 만료 시 자동으로 갱신하며, Minu 서비스 간 SSO를 지원합니다.
 *
 * @module hooks/useOAuthClient
 *
 * @example
 * ```tsx
 * function MinuService() {
 *   const {
 *     isAuthenticated,
 *     isLoading,
 *     user,
 *     subscription,
 *     login,
 *     logout,
 *   } = useOAuthClient();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!isAuthenticated) {
 *     return <Button onClick={() => login()}>Minu 로그인</Button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>환영합니다, {user?.name}님!</p>
 *       <p>플랜: {subscription?.plan_name}</p>
 *       <Button onClick={logout}>로그아웃</Button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { callWorkersApi } from '@/integrations/cloudflare/client'

// =====================================================
// Types
// =====================================================

interface OAuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

interface OAuthSubscription {
  id: string
  plan_name: string
  status: string
  current_period_end: string
}

interface UseOAuthClientReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: OAuthUser | null
  subscription: OAuthSubscription | null
  login: (redirectUri?: string) => void
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  handleCallback: (code: string, state: string) => Promise<void>
}

// =====================================================
// Constants
// =====================================================

const OAUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'minu_oauth_access_token',
  REFRESH_TOKEN: 'minu_oauth_refresh_token',
  EXPIRES_AT: 'minu_oauth_expires_at',
  PKCE_VERIFIER: 'minu_oauth_pkce_verifier',
  PKCE_STATE: 'minu_oauth_pkce_state',
  USER: 'minu_oauth_user',
}

// 토큰 갱신 타이밍: 만료 5분 전
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes in ms

// =====================================================
// Helper Functions
// =====================================================

/**
 * PKCE code_verifier 생성 (43~128 글자)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * PKCE code_challenge 생성 (SHA-256 해시)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

/**
 * Base64 URL 인코딩 (RFC 7636 준수)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * 랜덤 state 생성 (CSRF 방지)
 */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * 토큰 만료 여부 확인
 */
function isTokenExpired(expiresAt: number, threshold: number = 0): boolean {
  return Date.now() + threshold >= expiresAt
}

// =====================================================
// Hook
// =====================================================

/**
 * Minu 서비스용 OAuth 클라이언트 훅
 *
 * @returns OAuth 상태 및 메서드
 *
 * @example
 * ```tsx
 * function MinuService() {
 *   const { isAuthenticated, user, login, logout } = useOAuthClient()
 *
 *   if (!isAuthenticated) {
 *     return <Button onClick={() => login()}>Minu 로그인</Button>
 *   }
 *
 *   return (
 *     <div>
 *       <p>환영합니다, {user.name}님!</p>
 *       <Button onClick={logout}>로그아웃</Button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useOAuthClient(): UseOAuthClientReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<OAuthUser | null>(null)
  const [subscription, setSubscription] = useState<OAuthSubscription | null>(null)

  /**
   * 로그아웃
   */
  const logout = useCallback(async () => {
    // 로컬 스토리지 클리어
    Object.values(OAUTH_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    setIsAuthenticated(false)
    setUser(null)
    setSubscription(null)

    console.log('로그아웃 완료')
  }, [])

  /**
   * 토큰 갱신
   */
  const refreshToken = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem(OAUTH_STORAGE_KEYS.REFRESH_TOKEN)
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID || 'minu-client'

    if (!refreshTokenValue) {
      throw new Error('Refresh token이 없습니다.')
    }

    try {
      // Workers OAuth Token 엔드포인트 호출
      const { data, error } = await callWorkersApi<{
        access_token: string
        refresh_token: string
        expires_in: number
      }>('/auth/oauth/token', {
        method: 'POST',
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshTokenValue,
          client_id: clientId,
        },
      })

      if (error) {
        console.error('토큰 갱신 에러:', error)
        throw new Error(error)
      }

      if (data && data.access_token) {
        const expiresAt = Date.now() + (data.expires_in || 3600) * 1000

        // 토큰 저장
        localStorage.setItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
        if (data.refresh_token) {
          localStorage.setItem(OAUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
        }
        localStorage.setItem(OAUTH_STORAGE_KEYS.EXPIRES_AT, expiresAt.toString())

        console.log('토큰 갱신 완료')
      } else {
        throw new Error('토큰 갱신 응답이 유효하지 않습니다.')
      }
    } catch (error) {
      console.error('토큰 갱신 실패:', error)
      // 갱신 실패 시 로그아웃
      await logout()
      throw error
    }
  }, [logout])

  /**
   * PKCE 로그인 시작
   */
  const login = useCallback((redirectUri?: string) => {
    const verifier = generateCodeVerifier()
    const state = generateState()

    // PKCE 값 저장
    localStorage.setItem(OAUTH_STORAGE_KEYS.PKCE_VERIFIER, verifier)
    localStorage.setItem(OAUTH_STORAGE_KEYS.PKCE_STATE, state)

    // code_challenge 생성 후 리다이렉트
    generateCodeChallenge(verifier).then((challenge) => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: import.meta.env.VITE_OAUTH_CLIENT_ID || 'minu-client',
        redirect_uri: redirectUri || `${window.location.origin}/oauth/callback`,
        state: state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        scope: 'profile subscription:read subscription:write',
      })

      // Workers OAuth Authorization 엔드포인트 URL
      const workersUrl = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai'
      const authUrl = import.meta.env.VITE_OAUTH_AUTHORIZE_URL ||
        `${workersUrl}/auth/oauth/authorize?${params}`

      console.log('OAuth 로그인 시작:', authUrl)
      window.location.href = authUrl
    })
  }, [])

  /**
   * OAuth 콜백 처리
   */
  const handleCallback = useCallback(
    async (code: string, state: string) => {
      const savedState = localStorage.getItem(OAUTH_STORAGE_KEYS.PKCE_STATE)
      const savedVerifier = localStorage.getItem(OAUTH_STORAGE_KEYS.PKCE_VERIFIER)
      const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID || 'minu-client'

      // State 검증 (CSRF 방지)
      if (state !== savedState) {
        throw new Error('Invalid state parameter. Possible CSRF attack.')
      }

      if (!savedVerifier) {
        throw new Error('PKCE verifier not found.')
      }

      try {
        // Workers OAuth Token 엔드포인트 호출
        const { data, error } = await callWorkersApi<{
          access_token: string
          refresh_token: string
          expires_in: number
        }>('/auth/oauth/token', {
          method: 'POST',
          body: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${window.location.origin}/oauth/callback`,
            code_verifier: savedVerifier,
            client_id: clientId,
          },
        })

        if (error) {
          console.error('OAuth 토큰 교환 에러:', error)
          throw new Error(error)
        }

        if (data && data.access_token) {
          const expiresAt = Date.now() + (data.expires_in || 3600) * 1000

          // 토큰 저장
          localStorage.setItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
          localStorage.setItem(OAUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token || '')
          localStorage.setItem(OAUTH_STORAGE_KEYS.EXPIRES_AT, expiresAt.toString())

          // JWT에서 사용자 정보 추출 (간단한 디코딩)
          // 주의: 프로덕션에서는 서버에서 검증된 정보를 사용해야 합니다
          const tokenParts = data.access_token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))

            // 사용자 정보 저장 (JWT payload에서 추출)
            const oauthUser: OAuthUser = {
              id: payload.sub || '',
              email: payload.email || '',
              name: payload.name,
              avatar_url: payload.avatar_url,
            }
            localStorage.setItem(OAUTH_STORAGE_KEYS.USER, JSON.stringify(oauthUser))

            setUser(oauthUser)
            setIsAuthenticated(true)

            // 구독 정보가 있으면 저장
            if (payload.subscription) {
              setSubscription({
                id: payload.subscription.plan_id,
                plan_name: payload.subscription.plan_name,
                status: payload.subscription.status,
                current_period_end: payload.subscription.expires_at,
              })
            }
          }

          // PKCE 값 클리어
          localStorage.removeItem(OAUTH_STORAGE_KEYS.PKCE_VERIFIER)
          localStorage.removeItem(OAUTH_STORAGE_KEYS.PKCE_STATE)

          console.log('OAuth 로그인 완료')
        } else {
          throw new Error('OAuth 토큰 응답이 유효하지 않습니다.')
        }
      } catch (error) {
        console.error('OAuth 콜백 처리 실패:', error)
        // PKCE 값 클리어 (에러 시에도)
        localStorage.removeItem(OAUTH_STORAGE_KEYS.PKCE_VERIFIER)
        localStorage.removeItem(OAUTH_STORAGE_KEYS.PKCE_STATE)
        throw error
      }
    },
    []
  )

  /**
   * 초기화: 저장된 토큰으로 세션 복원
   */
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN)
      const expiresAtStr = localStorage.getItem(OAUTH_STORAGE_KEYS.EXPIRES_AT)
      const userStr = localStorage.getItem(OAUTH_STORAGE_KEYS.USER)

      if (accessToken && expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10)

        // 토큰 만료 확인
        if (isTokenExpired(expiresAt)) {
          // 만료되었으면 갱신 시도
          try {
            await refreshToken()
          } catch (error) {
            console.error('토큰 갱신 실패:', error)
            await logout()
          }
        } else {
          // 유효한 토큰이면 사용자 정보 복원
          if (userStr) {
            const oauthUser = JSON.parse(userStr) as OAuthUser
            setUser(oauthUser)
            setIsAuthenticated(true)
          }
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [refreshToken, logout])

  /**
   * 자동 토큰 갱신: 만료 5분 전
   */
  useEffect(() => {
    if (!isAuthenticated) return

    const checkTokenExpiration = () => {
      const expiresAtStr = localStorage.getItem(OAUTH_STORAGE_KEYS.EXPIRES_AT)
      if (!expiresAtStr) return

      const expiresAt = parseInt(expiresAtStr, 10)

      // 만료 5분 전이면 갱신
      if (isTokenExpired(expiresAt, TOKEN_REFRESH_THRESHOLD)) {
        console.log('토큰 자동 갱신 시작...')
        refreshToken()
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkTokenExpiration, 60 * 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshToken])

  return {
    isAuthenticated,
    isLoading,
    user,
    subscription,
    login,
    logout,
    refreshToken,
    handleCallback,
  }
}

/**
 * OAuth 액세스 토큰 가져오기 (API 요청용)
 */
export function useOAuthAccessToken(): string | null {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const accessToken = localStorage.getItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN)
    setToken(accessToken)
  }, [])

  return token
}

/**
 * OAuth 인증 헤더 생성 (axios, fetch 등에서 사용)
 */
export function useOAuthHeaders(): Record<string, string> | null {
  const token = useOAuthAccessToken()

  if (!token) return null

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}
