/**
 * useProfile Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * React Query를 사용한 사용자 프로필 관리
 * - 프로필 조회, 수정
 * - 아바타 업로드 (R2 지원)
 * - 연결된 계정 관리
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi, storageApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { devError } from '@/lib/errors'
import { rewriteStorageUrl } from '@/lib/storage/url-rewriter'

// ===================================================================
// Types
// ===================================================================

export interface UserProfile {
  id: string
  user_id: string
  avatar_url: string | null
  display_name: string | null
  bio: string | null
  phone: string | null
  location: {
    country?: string
    city?: string
    timezone?: string
  }
  preferences: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    notifications?: boolean
  }
  email_verified: boolean
  phone_verified: boolean
  last_login_at: string | null
  last_login_ip: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileParams {
  display_name?: string
  bio?: string
  phone?: string
  location?: {
    country?: string
    city?: string
    timezone?: string
  }
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    notifications?: boolean
  }
}

export interface ConnectedAccount {
  id: string
  user_id: string
  provider: 'google' | 'github' | 'kakao' | 'microsoft' | 'apple'
  provider_account_id: string
  provider_account_email: string | null
  is_primary: boolean
  connected_at: string
  last_used_at: string | null
}

// ===================================================================
// 1. 프로필 조회
// ===================================================================

export function useProfile() {
  const { user, workersTokens } = useAuth()

  return useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<UserProfile>(
        `/api/v1/users/${user.id}/profile`,
        { token }
      )

      if (error) {
        // 프로필이 없으면 생성
        if (error.includes('not found') || error.includes('404')) {
          const { data: newProfile, error: createError } = await callWorkersApi<UserProfile>(
            `/api/v1/users/${user.id}/profile`,
            {
              method: 'POST',
              token,
              body: {
                user_id: user.id,
                display_name: user.user_metadata?.name || user.email?.split('@')[0],
                preferences: {},
                location: {},
              },
            }
          )

          if (createError) throw new Error(createError)
          return newProfile
        }

        throw new Error(error)
      }

      // avatar_url을 R2 URL로 변환
      return data ? {
        ...data,
        avatar_url: rewriteStorageUrl(data.avatar_url),
      } : null
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

// ===================================================================
// 2. 프로필 수정
// ===================================================================

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<UserProfile>(
        `/api/v1/users/${user.id}/profile`,
        {
          method: 'PATCH',
          token,
          body: {
            display_name: params.display_name,
            bio: params.bio,
            phone: params.phone,
            location: params.location,
            preferences: params.preferences,
          },
        }
      )

      if (error) throw new Error(error)
      return data as UserProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error: Error) => {
      devError(error, { operation: '프로필 업데이트', service: 'Profile' })
      toast.error('프로필 업데이트에 실패했습니다.')
    },
  })
}

// ===================================================================
// 3. 아바타 업로드
// ===================================================================

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증 토큰이 없습니다.')

      // 파일 검증
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('JPG, PNG, WEBP 형식만 지원합니다.')
      }

      // 기존 아바타 삭제 (있으면)
      const { data: profile } = await callWorkersApi<UserProfile>(
        `/api/v1/users/${user.id}/profile`,
        { token }
      )

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await storageApi.delete(token, oldPath)
        }
      }

      // R2로 새 아바타 업로드
      const uploadResult = await storageApi.upload(token, file, 'avatars')

      if (uploadResult.error) throw new Error(uploadResult.error)

      const avatarUrl = uploadResult.data?.url

      // 프로필 업데이트
      const { data, error: updateError } = await callWorkersApi<UserProfile>(
        `/api/v1/users/${user.id}/profile`,
        {
          method: 'PATCH',
          token,
          body: { avatar_url: avatarUrl },
        }
      )

      if (updateError) throw new Error(updateError)
      return data as UserProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필 사진이 업데이트되었습니다.')
    },
    onError: (error: Error) => {
      devError(error, { operation: '아바타 업로드', service: 'Profile' })
      toast.error(error.message || '아바타 업로드에 실패했습니다.')
    },
  })
}

// ===================================================================
// 4. 연결된 계정 조회
// ===================================================================

export function useConnectedAccounts() {
  const { user, workersTokens } = useAuth()

  return useQuery<ConnectedAccount[]>({
    queryKey: ['connected-accounts', user?.id],
    queryFn: async () => {
      if (!user) return []

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<ConnectedAccount[]>(
        `/api/v1/users/${user.id}/connected-accounts`,
        { token }
      )

      if (error) throw new Error(error)
      return data || []
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

// ===================================================================
// 5. 계정 연결 해제
// ===================================================================

export function useDisconnectAccount() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      const token = workersTokens?.accessToken

      // 주 계정인지 확인
      const { data: account, error: checkError } = await callWorkersApi<{ is_primary: boolean; provider: string }>(
        `/api/v1/users/${user.id}/connected-accounts/${accountId}`,
        { token }
      )

      if (checkError) throw new Error(checkError)
      if (!account) throw new Error('계정을 찾을 수 없습니다.')

      if (account.is_primary) {
        throw new Error('주 계정은 연결 해제할 수 없습니다.')
      }

      // 연결 해제
      const { error } = await callWorkersApi(
        `/api/v1/users/${user.id}/connected-accounts/${accountId}`,
        {
          method: 'DELETE',
          token,
        }
      )

      if (error) throw new Error(error)
      return { success: true, provider: account.provider }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] })
      toast.success(`${result.provider} 계정 연결이 해제되었습니다.`)
    },
    onError: (error: Error) => {
      devError(error, { operation: '계정 연결 해제', service: 'Profile' })
      toast.error(error.message || '계정 연결 해제에 실패했습니다.')
    },
  })
}
