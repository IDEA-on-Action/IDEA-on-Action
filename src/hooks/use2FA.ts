/**
 * use2FA Hook
 *
 * 2단계 인증(2FA) 관리 훅
 * - 2FA 설정 조회
 * - TOTP 활성화/비활성화
 * - 백업 코드 생성/재생성
 * - TOTP 토큰 검증
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { generateTOTPSecret, verifyTOTPToken, generateBackupCodes } from '@/lib/auth/totp'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { devError } from '@/lib/errors'

// ===================================================================
// Types
// ===================================================================

export interface TwoFactorAuth {
  id: string
  user_id: string
  secret: string
  enabled: boolean
  verified_at: string | null
  backup_codes: string[] | null
  backup_codes_used: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export interface TwoFactorSetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
}

// ===================================================================
// Query Keys
// ===================================================================

const twoFactorKeys = {
  all: ['two-factor'] as const,
  detail: (userId: string) => [...twoFactorKeys.all, userId] as const,
}

// ===================================================================
// Queries
// ===================================================================

/**
 * 2FA 설정 조회
 */
export function use2FASettings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: twoFactorKeys.detail(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = Not found (정상적인 경우)
        throw error
      }

      return data as TwoFactorAuth | null
    },
    enabled: !!user?.id,
  })
}

/**
 * 2FA 활성화 여부 확인
 */
export function useIs2FAEnabled() {
  const { data: settings } = use2FASettings()
  return settings?.enabled || false
}

// ===================================================================
// Mutations
// ===================================================================

/**
 * 2FA 설정 초기화 (QR 코드 및 백업 코드 생성)
 */
export function useSetup2FA() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<TwoFactorSetupData> => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated')

      // 1. TOTP 비밀키 및 QR 코드 생성
      const { secret, qrCode } = await generateTOTPSecret(user.email)

      // 2. 백업 코드 생성 (10개)
      const backupCodes = generateBackupCodes()

      // 3. 데이터베이스에 저장 (enabled = false, 아직 검증 전)
      // 주의: 백업 코드는 해시하여 저장해야 하지만, 브라우저에서 bcrypt를 사용할 수 없으므로
      // Edge Function을 호출하거나, 플레인 텍스트로 저장 (보안 위험 있음)
      // 여기서는 임시로 플레인 텍스트로 저장 (실제 프로덕션에서는 Edge Function 사용 권장)
      const { error } = await supabase.from('two_factor_auth').upsert(
        {
          user_id: user.id,
          secret,
          enabled: false,
          backup_codes: backupCodes, // ⚠️ 실제로는 해시하여 저장해야 함
          backup_codes_used: 0,
          verified_at: null,
        },
        { onConflict: 'user_id' }
      )

      if (error) throw error

      return {
        secret,
        qrCode,
        backupCodes,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.all })
      toast.success('2FA 설정이 초기화되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '2FA 설정', service: '2FA' })
      toast.error('2FA 설정 실패: ' + error.message)
    },
  })
}

/**
 * 2FA 활성화 (TOTP 토큰 검증 후)
 */
export function useEnable2FA() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      // 1. 현재 저장된 TOTP 비밀키 가져오기
      const { data: twoFactorAuth, error: fetchError } = await supabase
        .from('two_factor_auth')
        .select('secret')
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError
      if (!twoFactorAuth) throw new Error('2FA 설정이 존재하지 않습니다. 먼저 설정을 초기화하세요.')

      // 2. TOTP 토큰 검증
      const result = verifyTOTPToken(twoFactorAuth.secret, token)

      if (!result.valid) {
        throw new Error('유효하지 않은 인증 코드입니다.')
      }

      // 3. 2FA 활성화
      const { error: updateError } = await supabase
        .from('two_factor_auth')
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.all })
      toast.success('2FA가 활성화되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '2FA 활성화', service: '2FA' })
      toast.error('2FA 활성화 실패: ' + error.message)
    },
  })
}

/**
 * 2FA 비활성화
 */
export function useDisable2FA() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated')

      // 1. 비밀번호 재확인 (보안)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })

      if (signInError) {
        throw new Error('비밀번호가 일치하지 않습니다.')
      }

      // 2. 2FA 비활성화
      const { error: updateError } = await supabase
        .from('two_factor_auth')
        .update({
          enabled: false,
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.all })
      toast.success('2FA가 비활성화되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '2FA 비활성화', service: '2FA' })
      toast.error('2FA 비활성화 실패: ' + error.message)
    },
  })
}

/**
 * 백업 코드 재생성
 */
export function useRegenerateBackupCodes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      if (!user?.id) throw new Error('User not authenticated')

      // 1. 새 백업 코드 생성
      const backupCodes = generateBackupCodes()

      // 2. 데이터베이스 업데이트
      const { error } = await supabase
        .from('two_factor_auth')
        .update({
          backup_codes: backupCodes, // ⚠️ 실제로는 해시하여 저장해야 함
          backup_codes_used: 0,
        })
        .eq('user_id', user.id)

      if (error) throw error

      return backupCodes
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.all })
      toast.success('백업 코드가 재생성되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '백업 코드 재생성', service: '2FA' })
      toast.error('백업 코드 재생성 실패: ' + error.message)
    },
  })
}

/**
 * TOTP 토큰 검증 (로그인 시)
 */
export function useVerify2FA() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ token, isBackupCode = false }: { token: string; isBackupCode?: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated')

      // 1. 2FA 설정 가져오기
      const { data: twoFactorAuth, error: fetchError } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError
      if (!twoFactorAuth?.enabled) throw new Error('2FA가 활성화되지 않았습니다.')

      // 2. 백업 코드 검증
      if (isBackupCode) {
        const backupCodes = twoFactorAuth.backup_codes || []
        const isValid = backupCodes.includes(token)

        if (!isValid) {
          throw new Error('유효하지 않은 백업 코드입니다.')
        }

        // 백업 코드 사용 처리 (일회용이므로 제거)
        const updatedCodes = backupCodes.filter((code: string) => code !== token)
        await supabase
          .from('two_factor_auth')
          .update({
            backup_codes: updatedCodes,
            backup_codes_used: twoFactorAuth.backup_codes_used + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        return
      }

      // 3. TOTP 토큰 검증
      const result = verifyTOTPToken(twoFactorAuth.secret, token)

      if (!result.valid) {
        throw new Error('유효하지 않은 인증 코드입니다.')
      }

      // 4. 마지막 사용 시각 업데이트
      await supabase
        .from('two_factor_auth')
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    },
    onSuccess: () => {
      toast.success('2FA 인증 성공')
    },
    onError: (error: Error) => {
      devError(error, { operation: '2FA 인증', service: '2FA' })
      toast.error('2FA 인증 실패: ' + error.message)
    },
  })
}
