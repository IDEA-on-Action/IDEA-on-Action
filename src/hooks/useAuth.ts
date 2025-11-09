/**
 * useAuth Hook
 *
 * Supabase Auth 상태 관리 및 로그인/로그아웃 기능
 * - OAuth 로그인 (Google, GitHub, Kakao, Microsoft, Apple)
 * - 세션 상태 구독
 * - 사용자 정보 관리
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry'
import { devError } from '@/lib/errors'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signInWithKakao: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
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
