/**
 * Minu SSO 훅
 *
 * Minu 서비스 SSO 인증을 위한 훅입니다.
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { callWorkersApi } from '@/integrations/cloudflare/client'

// ============================================================================
// 타입 정의
// ============================================================================

export type MinuService = 'find' | 'frame' | 'build' | 'keep'

interface MinuSSOState {
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  accessToken: string | null
  subscription: MinuSubscription | null
}

interface MinuSubscription {
  planId: string
  planName: string
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'
  features: string[]
  currentPeriodEnd?: string
}

interface MinuSSOOptions {
  service: MinuService
  redirectUri?: string
}

interface TokenExchangeResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user: {
    id: string
    email: string
    name?: string
    avatar_url?: string
  }
  subscription: MinuSubscription | null
}

// ============================================================================
// 상수
// ============================================================================

const MINU_SERVICE_URLS: Record<MinuService, string> = {
  find: 'https://find.minu.best',
  frame: 'https://frame.minu.best',
  build: 'https://build.minu.best',
  keep: 'https://keep.minu.best',
}

// Workers API URL
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'minu_access_token',
  REFRESH_TOKEN: 'minu_refresh_token',
  SERVICE: 'minu_service',
  EXPIRES_AT: 'minu_expires_at',
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * PKCE code_verifier 생성
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * PKCE code_challenge 생성
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Base64 URL 인코딩
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * State 생성 (CSRF 토큰 포함)
 */
function generateState(service: MinuService, redirectUri: string): string {
  const csrf = crypto.randomUUID()
  const state = { csrf, service, redirect_uri: redirectUri }
  return btoa(JSON.stringify(state))
}

// ============================================================================
// 훅 구현
// ============================================================================

export function useMinuSSO(options: MinuSSOOptions) {
  const { service, redirectUri = window.location.origin + '/auth/minu/callback' } = options
  const { user, workersTokens } = useAuth()
  const token = workersTokens?.accessToken || null

  const [state, setState] = useState<MinuSSOState>({
    isLoading: false,
    error: null,
    isAuthenticated: false,
    accessToken: null,
    subscription: null,
  })

  // 초기화: 저장된 토큰 복원
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const storedService = localStorage.getItem(STORAGE_KEYS.SERVICE)
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT)

    if (storedToken && storedService === service && expiresAt) {
      const isExpired = new Date(expiresAt) < new Date()
      if (!isExpired) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          accessToken: storedToken,
        }))

        // 구독 정보 로드 (Workers API 사용)
        if (user?.id && token) {
          callWorkersApi<{
            plan_id: string
            plan_name: string
            status: string
            features: string[]
            current_period_end: string
          }[]>(`/minu/subscription/${service}`, { token })
            .then((result) => {
              if (result.data && result.data.length > 0) {
                const sub = result.data[0]
                setState(prev => ({
                  ...prev,
                  subscription: {
                    planId: sub.plan_id,
                    planName: sub.plan_name,
                    status: sub.status as MinuSubscription['status'],
                    features: sub.features || [],
                    currentPeriodEnd: sub.current_period_end,
                  },
                }))
              }
            })
            .catch(console.error)
        }
      } else {
        // 만료된 토큰 정리
        clearTokens()
      }
    }
  }, [service, user?.id, token])

  /**
   * OAuth 로그인 시작
   */
  const initiateLogin = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // PKCE 생성
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const stateParam = generateState(service, redirectUri)

      // 세션 저장 (Workers API 사용)
      const sessionResult = await callWorkersApi('/minu/oauth/session', {
        method: 'POST',
        body: {
          user_id: user?.id || null,
          service,
          state: stateParam,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
        },
        token: token || undefined,
      })

      if (sessionResult.error) {
        throw new Error('세션 생성에 실패했습니다.')
      }

      // Minu OAuth 페이지로 리다이렉트 (Workers 콜백 엔드포인트 사용)
      const authUrl = new URL(`${MINU_SERVICE_URLS[service]}/oauth/authorize`)
      authUrl.searchParams.set('client_id', import.meta.env.VITE_MINU_CLIENT_ID || 'idea-on-action')
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('redirect_uri', `${WORKERS_API_URL}/minu/oauth/callback`)
      authUrl.searchParams.set('scope', 'openid profile email subscription')
      authUrl.searchParams.set('state', stateParam)
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')

      window.location.href = authUrl.toString()
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.',
      }))
    }
  }, [service, redirectUri, user?.id, token])

  /**
   * OAuth 콜백 처리
   */
  const handleCallback = useCallback(async (callbackParams: URLSearchParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const accessToken = callbackParams.get('access_token')
      const callbackService = callbackParams.get('service')
      const error = callbackParams.get('error')
      const errorDescription = callbackParams.get('error_description')

      if (error) {
        throw new Error(errorDescription || error)
      }

      if (!accessToken || callbackService !== service) {
        throw new Error('유효하지 않은 콜백 응답입니다.')
      }

      // 토큰 저장
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString() // 1시간
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
      localStorage.setItem(STORAGE_KEYS.SERVICE, service)
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt)

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: true,
        accessToken,
      }))

      // 구독 정보는 별도로 로드됨 (useEffect에서 처리)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '콜백 처리 중 오류가 발생했습니다.',
      }))
    }
  }, [service])

  /**
   * 토큰 교환 (Minu 토큰 → Central Hub 토큰)
   */
  const exchangeToken = useCallback(async (minuAccessToken: string): Promise<TokenExchangeResponse> => {
    const result = await callWorkersApi<TokenExchangeResponse>('/minu/token/exchange', {
      method: 'POST',
      body: {
        minu_access_token: minuAccessToken,
        service,
      },
    })

    if (result.error || !result.data) {
      throw new Error(result.error || '토큰 교환에 실패했습니다.')
    }

    return result.data
  }, [service])

  /**
   * 구독 정보 로드
   */
  const loadSubscription = useCallback(async () => {
    if (!user?.id || !token) return

    try {
      const result = await callWorkersApi<{
        plan_id: string
        plan_name: string
        status: string
        features: string[]
        current_period_end: string
      }[]>(`/minu/subscription/${service}`, { token })

      if (result.error) throw new Error(result.error)

      if (result.data && result.data.length > 0) {
        const sub = result.data[0]
        setState(prev => ({
          ...prev,
          subscription: {
            planId: sub.plan_id,
            planName: sub.plan_name,
            status: sub.status as MinuSubscription['status'],
            features: sub.features || [],
            currentPeriodEnd: sub.current_period_end,
          },
        }))
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
    }
  }, [user?.id, service, token])

  /**
   * 로그아웃
   */
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // 토큰 폐기 API 호출 (선택적)
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (accessToken) {
        await fetch(`${MINU_SERVICE_URLS[service]}/oauth/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: accessToken }),
        }).catch(() => {
          // 폐기 실패는 무시 (RFC 7009)
        })
      }

      // 로컬 토큰 정리
      clearTokens()

      setState({
        isLoading: false,
        error: null,
        isAuthenticated: false,
        accessToken: null,
        subscription: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.',
      }))
    }
  }, [service])

  /**
   * 토큰 갱신
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    if (!storedRefreshToken) return false

    try {
      const response = await fetch(`${MINU_SERVICE_URLS[service]}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: storedRefreshToken,
          client_id: import.meta.env.VITE_MINU_CLIENT_ID || 'idea-on-action',
        }),
      })

      if (!response.ok) {
        clearTokens()
        return false
      }

      const data = await response.json()

      // 새 토큰 저장
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt)
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
      }

      setState(prev => ({
        ...prev,
        accessToken: data.access_token,
      }))

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearTokens()
      return false
    }
  }, [service])

  /**
   * 토큰 정리
   */
  const clearTokens = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.SERVICE)
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT)
  }

  /**
   * 기능 사용 가능 여부 확인
   */
  const canUseFeature = useCallback((featureKey: string): boolean => {
    if (!state.subscription) return false
    return state.subscription.features.includes(featureKey)
  }, [state.subscription])

  /**
   * 서비스 접근 가능 여부 확인
   */
  const canAccessService = useCallback((): boolean => {
    if (!state.subscription) return false
    return ['active', 'trialing'].includes(state.subscription.status)
  }, [state.subscription])

  return {
    ...state,
    initiateLogin,
    handleCallback,
    exchangeToken,
    logout,
    refreshToken,
    canUseFeature,
    canAccessService,
    loadSubscription,
  }
}

export type UseMinuSSOReturn = ReturnType<typeof useMinuSSO>
