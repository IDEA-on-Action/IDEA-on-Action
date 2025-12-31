/**
 * useAuth Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Workers Auth 전용 인증 (Cloudflare Workers + D1)
 * - OAuth 로그인 (Google, GitHub, Kakao, Microsoft, Apple) -> Workers
 * - 이메일/비밀번호 로그인 -> Workers
 * - 회원가입 -> Workers (D1 저장)
 * - 세션 상태 관리
 * - 사용자 정보 관리
 * - Sentry 사용자 추적 통합
 *
 * @description
 * Workers 전용 전략:
 * 1. 모든 OAuth: Workers OAuth 엔드포인트로 리다이렉트
 * 2. 이메일 로그인/가입: Workers API 사용
 * 3. 세션: localStorage에 JWT 토큰 저장
 *
 * @returns {UseAuthReturn} 사용자 정보, 세션 정보, 로그인/로그아웃 함수
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { workersUser, loading, signInWithGoogle, signOut } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *
 *   if (workersUser) {
 *     return (
 *       <div>
 *         <p>환영합니다, {workersUser.email}님!</p>
 *         <Button onClick={signOut}>로그아웃</Button>
 *       </div>
 *     );
 *   }
 *
 *   return <Button onClick={signInWithGoogle}>Google 로그인</Button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 이메일 로그인
 * const { signInWithEmail } = useAuth();
 *
 * const handleLogin = async (email: string, password: string) => {
 *   try {
 *     await signInWithEmail(email, password);
 *     toast.success('로그인 성공!');
 *   } catch (error) {
 *     toast.error('로그인 실패');
 *   }
 * };
 * ```
 *
 * @example
 * ```tsx
 * // Workers 회원가입
 * const { signUpWithEmail } = useAuth();
 *
 * const handleSignUp = async (email: string, password: string, name?: string) => {
 *   try {
 *     await signUpWithEmail(email, password, name);
 *     toast.success('회원가입 성공!');
 *   } catch (error) {
 *     toast.error('회원가입 실패');
 *   }
 * };
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry'
import { devError, devLog } from '@/lib/errors'
import { authApi } from '@/integrations/cloudflare/client'

// Workers OAuth URL
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai'

// Workers 인증 토큰 저장 키
const WORKERS_TOKEN_KEY = 'workers_auth_tokens'

/**
 * Workers 사용자 정보
 */
export interface WorkersUser {
  id: string
  email: string
  name: string | null
  avatarUrl?: string | null
  isAdmin?: boolean
}

/**
 * Workers 인증 토큰
 */
export interface WorkersTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // timestamp
  user: WorkersUser
}

/**
 * useAuth 훅 반환 타입
 */
interface UseAuthReturn {
  /** Workers 사용자 정보 (null: 비로그인) */
  workersUser: WorkersUser | null
  /** Workers 토큰 */
  workersTokens: WorkersTokens | null
  /** 초기 로딩 상태 */
  loading: boolean
  /** 인증 여부 */
  isAuthenticated: boolean
  /** Google OAuth 로그인 */
  signInWithGoogle: () => Promise<void>
  /** GitHub OAuth 로그인 */
  signInWithGithub: () => Promise<void>
  /** Kakao OAuth 로그인 */
  signInWithKakao: () => Promise<void>
  /** Microsoft (Azure AD) OAuth 로그인 */
  signInWithMicrosoft: () => Promise<void>
  /** Apple OAuth 로그인 */
  signInWithApple: () => Promise<void>
  /** 이메일/비밀번호 로그인 */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** Workers 회원가입 */
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
  /** 로그아웃 */
  signOut: () => Promise<void>
  /** Workers 토큰 갱신 */
  refreshWorkersToken: () => Promise<boolean>
  /** Access Token 반환 (API 호출용) */
  getAccessToken: () => string | null

  // 하위 호환성을 위한 레거시 속성
  /** @deprecated workersUser를 사용하세요 */
  user: WorkersUser | null
  /** @deprecated 제거됨 */
  session: null
  /** @deprecated 'workers' 고정값 */
  authProvider: 'workers'
}

/**
 * Workers 토큰을 localStorage에 저장
 */
function saveWorkersTokens(tokens: WorkersTokens): void {
  try {
    localStorage.setItem(WORKERS_TOKEN_KEY, JSON.stringify(tokens))
  } catch (e) {
    devError(e, { service: 'Auth', operation: 'Workers 토큰 저장' })
  }
}

/**
 * Workers 토큰을 localStorage에서 로드
 */
function loadWorkersTokens(): WorkersTokens | null {
  try {
    const stored = localStorage.getItem(WORKERS_TOKEN_KEY)
    if (!stored) return null
    return JSON.parse(stored) as WorkersTokens
  } catch (e) {
    devError(e, { service: 'Auth', operation: 'Workers 토큰 로드' })
    return null
  }
}

/**
 * Workers 토큰을 localStorage에서 삭제
 */
function clearWorkersTokens(): void {
  try {
    localStorage.removeItem(WORKERS_TOKEN_KEY)
  } catch (e) {
    devError(e, { service: 'Auth', operation: 'Workers 토큰 삭제' })
  }
}

export function useAuth(): UseAuthReturn {
  const [workersUser, setWorkersUser] = useState<WorkersUser | null>(null)
  const [workersTokens, setWorkersTokens] = useState<WorkersTokens | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  /**
   * Workers 토큰 갱신
   */
  const refreshWorkersToken = useCallback(async (): Promise<boolean> => {
    const tokens = loadWorkersTokens()
    if (!tokens) return false

    try {
      const result = await authApi.refresh(tokens.refreshToken)
      if (result.error || !result.data) {
        devLog('Workers 토큰 갱신 실패, 로그아웃 처리', result.error)
        clearWorkersTokens()
        setWorkersTokens(null)
        setWorkersUser(null)
        return false
      }

      const newTokens: WorkersTokens = {
        ...tokens,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresAt: Date.now() + result.data.expiresIn * 1000,
      }
      saveWorkersTokens(newTokens)
      setWorkersTokens(newTokens)
      return true
    } catch (error) {
      devError(error, { service: 'Auth', operation: 'Workers 토큰 갱신' })
      return false
    }
  }, [])

  /**
   * Access Token 반환
   */
  const getAccessToken = useCallback((): string | null => {
    return workersTokens?.accessToken || null
  }, [workersTokens])

  useEffect(() => {
    // 초기 인증 상태 확인
    const initAuth = async () => {
      const tokens = loadWorkersTokens()
      if (tokens) {
        // 토큰 만료 확인
        if (tokens.expiresAt > Date.now()) {
          setWorkersTokens(tokens)
          setWorkersUser(tokens.user)
          setSentryUser({
            id: tokens.user.id,
            email: tokens.user.email,
            username: tokens.user.name || tokens.user.email.split('@')[0],
          })
          setLoading(false)
          return
        } else {
          // 토큰 갱신 시도
          const refreshed = await refreshWorkersToken()
          if (refreshed) {
            const newTokens = loadWorkersTokens()
            if (newTokens) {
              setWorkersTokens(newTokens)
              setWorkersUser(newTokens.user)
              setSentryUser({
                id: newTokens.user.id,
                email: newTokens.user.email,
                username: newTokens.user.name || newTokens.user.email.split('@')[0],
              })
              setLoading(false)
              return
            }
          }
        }
      }

      setLoading(false)
    }

    initAuth()
  }, [refreshWorkersToken])

  /**
   * Google OAuth 로그인 (Workers)
   */
  const signInWithGoogle = async () => {
    devLog('Workers Google OAuth 시작')
    window.location.href = `${WORKERS_API_URL}/oauth/google/authorize`
  }

  /**
   * GitHub OAuth 로그인 (Workers)
   */
  const signInWithGithub = async () => {
    devLog('Workers GitHub OAuth 시작')
    window.location.href = `${WORKERS_API_URL}/oauth/github/authorize`
  }

  /**
   * Kakao OAuth 로그인 (Workers)
   */
  const signInWithKakao = async () => {
    devLog('Workers Kakao OAuth 시작')
    window.location.href = `${WORKERS_API_URL}/oauth/kakao/authorize`
  }

  /**
   * Microsoft (Azure AD) OAuth 로그인 (Workers)
   */
  const signInWithMicrosoft = async () => {
    devLog('Workers Microsoft OAuth 시작')
    window.location.href = `${WORKERS_API_URL}/oauth/microsoft/authorize`
  }

  /**
   * Apple OAuth 로그인 (Workers)
   */
  const signInWithApple = async () => {
    devLog('Workers Apple OAuth 시작')
    window.location.href = `${WORKERS_API_URL}/oauth/apple/authorize`
  }

  /**
   * 이메일/비밀번호 로그인
   */
  const signInWithEmail = async (email: string, password: string) => {
    const workersResult = await authApi.login(email, password)

    if (workersResult.error || !workersResult.data) {
      const error = new Error(workersResult.error || '로그인에 실패했습니다')
      devError(error, { service: 'Auth', operation: '이메일 로그인' })
      throw error
    }

    devLog('Workers 로그인 성공', { email })

    const tokens: WorkersTokens = {
      accessToken: workersResult.data.accessToken,
      refreshToken: workersResult.data.refreshToken,
      expiresAt: Date.now() + workersResult.data.expiresIn * 1000,
      user: workersResult.data.user,
    }

    saveWorkersTokens(tokens)
    setWorkersTokens(tokens)
    setWorkersUser(tokens.user)

    setSentryUser({
      id: tokens.user.id,
      email: tokens.user.email,
      username: tokens.user.name || tokens.user.email.split('@')[0],
    })
  }

  /**
   * Workers 회원가입 (D1 저장)
   */
  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const result = await authApi.register(email, password, name)

    if (result.error || !result.data) {
      const error = new Error(result.error || '회원가입에 실패했습니다')
      devError(error, { service: 'Auth', operation: 'Workers 회원가입' })
      throw error
    }

    devLog('Workers 회원가입 성공', { email })

    const tokens: WorkersTokens = {
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      expiresAt: Date.now() + result.data.expiresIn * 1000,
      user: {
        ...result.data.user,
        avatarUrl: null,
        isAdmin: false,
      },
    }

    saveWorkersTokens(tokens)
    setWorkersTokens(tokens)
    setWorkersUser(tokens.user)

    setSentryUser({
      id: tokens.user.id,
      email: tokens.user.email,
      username: tokens.user.name || tokens.user.email.split('@')[0],
    })
  }

  /**
   * 로그아웃
   */
  const signOut = async () => {
    const tokens = loadWorkersTokens()
    if (tokens) {
      try {
        await authApi.logout(tokens.refreshToken)
      } catch (e) {
        // 로그아웃 API 실패해도 로컬 상태는 정리
        devError(e, { service: 'Auth', operation: 'Workers 로그아웃 API' })
      }
    }
    clearWorkersTokens()
    setWorkersTokens(null)
    setWorkersUser(null)
    clearSentryUser()

    navigate('/')
  }

  return {
    workersUser,
    workersTokens,
    loading,
    isAuthenticated: !!workersUser,
    signInWithGoogle,
    signInWithGithub,
    signInWithKakao,
    signInWithMicrosoft,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshWorkersToken,
    getAccessToken,

    // 하위 호환성
    user: workersUser,
    session: null,
    authProvider: 'workers',
  }
}
