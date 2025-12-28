/**
 * use2FA Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 2단계 인증(2FA) 관리 훅
 * - 2FA 설정 조회
 * - TOTP 활성화/비활성화
 * - 백업 코드 생성/재생성
 * - TOTP 토큰 검증
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { twoFactorApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { devError } from '@/lib/errors'

// ===================================================================
// Types
// ===================================================================

export interface TwoFactorAuth {
  id: string
  user_id: string
  enabled: boolean
  verified_at: string | null
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
  const { workersUser, getAccessToken } = useAuth()

  return useQuery({
    queryKey: twoFactorKeys.detail(workersUser?.id || ''),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) throw new Error('User not authenticated')

      const result = await twoFactorApi.getSettings(token)
      if (result.error) throw new Error(result.error)

      return result.data as TwoFactorAuth | null
    },
    enabled: !!workersUser?.id,
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
  const { workersUser, getAccessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<TwoFactorSetupData> => {
      const token = getAccessToken()
      if (!token || !workersUser?.id || !workersUser?.email) {
        throw new Error('User not authenticated')
      }

      const result = await twoFactorApi.setup(token)
      if (result.error || !result.data) {
        throw new Error(result.error || '2FA 설정 초기화에 실패했습니다')
      }

      return {
        secret: result.data.secret,
        qrCode: result.data.qrCode,
        backupCodes: result.data.backupCodes,
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
  const { workersUser, getAccessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (totpToken: string) => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) throw new Error('User not authenticated')

      const result = await twoFactorApi.enable(token, totpToken)
      if (result.error || !result.data?.success) {
        throw new Error(result.error || '유효하지 않은 인증 코드입니다.')
      }
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
  const { workersUser, getAccessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      const token = getAccessToken()
      if (!token || !workersUser?.id || !workersUser?.email) {
        throw new Error('User not authenticated')
      }

      const result = await twoFactorApi.disable(token, password)
      if (result.error || !result.data?.success) {
        throw new Error(result.error || '비밀번호가 일치하지 않습니다.')
      }
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
  const { workersUser, getAccessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) throw new Error('User not authenticated')

      const result = await twoFactorApi.regenerateBackupCodes(token)
      if (result.error || !result.data) {
        throw new Error(result.error || '백업 코드 재생성에 실패했습니다')
      }

      return result.data.backupCodes
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
  const { workersUser, getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async ({ token: totpToken, isBackupCode = false }: { token: string; isBackupCode?: boolean }) => {
      const accessToken = getAccessToken()
      if (!accessToken || !workersUser?.id) throw new Error('User not authenticated')

      const result = await twoFactorApi.verify(accessToken, totpToken, isBackupCode)
      if (result.error || !result.data?.success) {
        const errorMsg = isBackupCode
          ? '유효하지 않은 백업 코드입니다.'
          : '유효하지 않은 인증 코드입니다.'
        throw new Error(result.error || errorMsg)
      }
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
