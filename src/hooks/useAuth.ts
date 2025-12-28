/**
 * useAuth Hook
 *
 * Workers Auth 전용 인증 (Cloudflare Workers + D1)
 * - OAuth 로그인 (Google, GitHub, Kakao, Microsoft, Apple) → Workers
 * - 이메일/비밀번호 로그인 → Workers
 * - 회원가입 → Workers (D1 저장)
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
 *   const { user, loading, signInWithGoogle, signOut } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *
 *   if (user) {
 *     return (
 *       <div>
 *         <p>환영합니다, {user.email}님!</p>
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
 * // 이메일 로그인 (이중 인증)
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
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry'
import { devError, devLog } from '@/lib/errors'
import { authApi } from '@/integrations/cloudflare/client'

// Workers OAuth URL
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai'

// Workers 인증 토큰 저장 키
const WORKERS_TOKEN_KEY = 'workers_auth_tokens'
const AUTH_PROVIDER_KEY = 'auth_provider'

/**
 * Workers 인증 토큰
 */
interface WorkersTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // timestamp
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl?: string | null
    isAdmin?: boolean
  }
}

/**
 * 인증 제공자
 */
type AuthProvider = 'supabase' | 'workers'

/**
 * useAuth 훅 반환 타입
 */
interface UseAuthReturn {
  /** 현재 로그인한 사용자 정보 (null: 비로그인) */
  user: User | null
  /** 현재 세션 정보 */
  session: Session | null
  /** 초기 로딩 상태 */
  loading: boolean
  /** 현재 인증 제공자 */
  authProvider: AuthProvider | null
  /** Workers 토큰 (Workers 인증 시) */
  workersTokens: WorkersTokens | null
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
  /** 이메일/비밀번호 로그인 (이중 인증) */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** Workers 회원가입 */
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
  /** 로그아웃 */
  signOut: () => Promise<void>
  /** Workers 토큰 갱신 */
  refreshWorkersToken: () => Promise<boolean>
}

/**
 * Workers 토큰을 localStorage에 저장
 */
function saveWorkersTokens(tokens: WorkersTokens): void {
  try {
    localStorage.setItem(WORKERS_TOKEN_KEY, JSON.stringify(tokens))
    localStorage.setItem(AUTH_PROVIDER_KEY, 'workers')
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
    localStorage.removeItem(AUTH_PROVIDER_KEY)
  } catch (e) {
    devError(e, { service: 'Auth', operation: 'Workers 토큰 삭제' })
  }
}

/**
 * 저장된 인증 제공자 확인
 */
function getStoredAuthProvider(): AuthProvider | null {
  try {
    const provider = localStorage.getItem(AUTH_PROVIDER_KEY)
    return provider as AuthProvider | null
  } catch {
    return null
  }
}

/**
 * Workers 사용자를 Supabase User 형태로 변환
 */
function workersUserToSupabaseUser(workersUser: WorkersTokens['user']): User {
  return {
    id: workersUser.id,
    email: workersUser.email,
    aud: 'authenticated',
    role: workersUser.isAdmin ? 'admin' : 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmation_sent_at: undefined,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'workers',
      providers: ['workers'],
    },
    user_metadata: {
      full_name: workersUser.name,
      avatar_url: workersUser.avatarUrl,
      is_admin: workersUser.isAdmin,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as User
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null)
  const [workersTokens, setWorkersTokens] = useState<WorkersTokens | null>(null)
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
        setAuthProvider(null)
        setUser(null)
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

  useEffect(() => {
    // 초기 인증 상태 확인
    const initAuth = async () => {
      const storedProvider = getStoredAuthProvider()

      // 1. Workers 토큰 확인
      if (storedProvider === 'workers') {
        const tokens = loadWorkersTokens()
        if (tokens) {
          // 토큰 만료 확인
          if (tokens.expiresAt > Date.now()) {
            setWorkersTokens(tokens)
            setAuthProvider('workers')
            setUser(workersUserToSupabaseUser(tokens.user))
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
                setAuthProvider('workers')
                setUser(workersUserToSupabaseUser(newTokens.user))
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
      }

      // 2. Supabase 세션 확인
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      if (supabaseSession) {
        setSession(supabaseSession)
        setUser(supabaseSession.user)
        setAuthProvider('supabase')
        localStorage.setItem(AUTH_PROVIDER_KEY, 'supabase')
      }
      setLoading(false)
    }

    initAuth()

    // Supabase 세션 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Workers 인증 중이면 Supabase 상태 무시
      if (getStoredAuthProvider() === 'workers') {
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setAuthProvider(session ? 'supabase' : null)
      setLoading(false)

      // Sentry 사용자 추적
      if (session?.user) {
        localStorage.setItem(AUTH_PROVIDER_KEY, 'supabase')
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        })
      } else {
        clearSentryUser()
      }
    })

    return () => subscription.unsubscribe()
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
   * 이메일/비밀번호 로그인 (이중 인증)
   *
   * 전략:
   * 1. Supabase 로그인 시도
   * 2. Supabase 실패 시 Workers 로그인 시도
   * 3. Workers 성공 시 토큰 저장 및 상태 업데이트
   */
  const signInWithEmail = async (email: string, password: string) => {
    // 1. Supabase 로그인 시도
    const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!supabaseError && supabaseData.session) {
      // Supabase 로그인 성공
      devLog('Supabase 로그인 성공', { email })
      setAuthProvider('supabase')
      localStorage.setItem(AUTH_PROVIDER_KEY, 'supabase')
      return
    }

    // 2. Supabase 실패 시 Workers 로그인 시도
    devLog('Supabase 로그인 실패, Workers 시도', { email, error: supabaseError?.message })

    const workersResult = await authApi.login(email, password)

    if (workersResult.error || !workersResult.data) {
      // 둘 다 실패
      const error = new Error(workersResult.error || supabaseError?.message || '로그인에 실패했습니다')
      devError(error, { service: 'Auth', operation: '이메일 로그인 (이중)' })
      throw error
    }

    // 3. Workers 로그인 성공
    devLog('Workers 로그인 성공', { email })

    const tokens: WorkersTokens = {
      accessToken: workersResult.data.accessToken,
      refreshToken: workersResult.data.refreshToken,
      expiresAt: Date.now() + workersResult.data.expiresIn * 1000,
      user: workersResult.data.user,
    }

    saveWorkersTokens(tokens)
    setWorkersTokens(tokens)
    setAuthProvider('workers')
    setUser(workersUserToSupabaseUser(tokens.user))

    setSentryUser({
      id: tokens.user.id,
      email: tokens.user.email,
      username: tokens.user.name || tokens.user.email.split('@')[0],
    })
  }

  /**
   * Workers 회원가입 (D1 저장)
   *
   * 신규 가입은 Workers로만 처리하여 D1에 저장
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
    setAuthProvider('workers')
    setUser(workersUserToSupabaseUser(tokens.user))

    setSentryUser({
      id: tokens.user.id,
      email: tokens.user.email,
      username: tokens.user.name || tokens.user.email.split('@')[0],
    })
  }

  /**
   * 로그아웃 (이중 인증 지원)
   */
  const signOut = async () => {
    const currentProvider = authProvider || getStoredAuthProvider()

    // Workers 로그아웃
    if (currentProvider === 'workers') {
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
    }

    // Supabase 로그아웃 (항상 시도)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      // Supabase 로그아웃 실패해도 로컬 상태는 정리
      if (currentProvider === 'supabase') {
        devError(e, { service: 'Auth', operation: 'Supabase 로그아웃' })
      }
    }

    // 상태 초기화
    setUser(null)
    setSession(null)
    setAuthProvider(null)
    clearSentryUser()

    navigate('/')
  }

  return {
    user,
    session,
    loading,
    authProvider,
    workersTokens,
    signInWithGoogle,
    signInWithGithub,
    signInWithKakao,
    signInWithMicrosoft,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshWorkersToken,
  }
}
