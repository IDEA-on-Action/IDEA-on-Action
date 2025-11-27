/**
 * useAuth Hook
 *
 * Supabase Auth 상태 관리 및 로그인/로그아웃 기능
 * - OAuth 로그인 (Google, GitHub, Kakao, Microsoft, Apple)
 * - 세션 상태 구독
 * - 사용자 정보 관리
 * - Sentry 사용자 추적 통합
 *
 * @description
 * 인증 상태를 관리하고 다양한 OAuth 제공자를 통한 로그인 기능을 제공합니다.
 * Supabase Auth와 통합되어 세션을 자동으로 추적하며, Sentry를 통해 사용자 정보를 기록합니다.
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
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry'
import { devError } from '@/lib/errors'

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
  /** 로그아웃 */
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 세션 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Sentry 사용자 추적
      if (session?.user) {
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
  }, [])

  /**
   * Google OAuth 로그인
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      devError(error, { service: 'Auth', operation: 'Google 로그인' })
      throw error
    }
  }

  /**
   * GitHub OAuth 로그인
   */
  const signInWithGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      devError(error, { service: 'Auth', operation: 'GitHub 로그인' })
      throw error
    }
  }

  /**
   * Kakao OAuth 로그인
   */
  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      devError(error, { service: 'Auth', operation: 'Kakao 로그인' })
      throw error
    }
  }

  /**
   * Microsoft (Azure AD) OAuth 로그인
   */
  const signInWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email profile openid',
      },
    })

    if (error) {
      devError(error, { service: 'Auth', operation: 'Microsoft 로그인' })
      throw error
    }
  }

  /**
   * Apple OAuth 로그인
   */
  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email name',
      },
    })

    if (error) {
      devError(error, { service: 'Auth', operation: 'Apple 로그인' })
      throw error
    }
  }

  /**
   * 이메일/비밀번호 로그인
   * (관리자 계정용: admin / demian00)
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      devError(error, { service: 'Auth', operation: '이메일 로그인' })
      throw error
    }
  }

  /**
   * 로그아웃
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      devError(error, { service: 'Auth', operation: '로그아웃' })
      throw error
    }

    navigate('/')
  }

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithGithub,
    signInWithKakao,
    signInWithMicrosoft,
    signInWithApple,
    signInWithEmail,
    signOut,
  }
}
