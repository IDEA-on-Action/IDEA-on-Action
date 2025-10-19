/**
 * useProfile Hook
 *
 * React Query를 사용한 사용자 프로필 관리
 * - 프로필 조회, 수정
 * - 아바타 업로드
 * - 연결된 계정 관리
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

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
  const { user } = useAuth()

  return useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // 프로필이 없으면 생성
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              display_name: user.user_metadata?.name || user.email?.split('@')[0],
              preferences: {},
              location: {},
            })
            .select()
            .single()

          if (createError) throw createError
          return newProfile as UserProfile
        }

        throw error
      }

      return data as UserProfile
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
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          display_name: params.display_name,
          bio: params.bio,
          phone: params.phone,
          location: params.location,
          preferences: params.preferences,
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data as UserProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error: Error) => {
      console.error('프로필 업데이트 실패:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    },
  })
}

// ===================================================================
// 3. 아바타 업로드
// ===================================================================

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // 파일 검증
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('JPG, PNG, WEBP 형식만 지원합니다.')
      }

      // 파일명 생성 (user_id + timestamp)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // 기존 아바타 삭제 (있으면)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single()

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`avatars/${oldPath}`])
        }
      }

      // 새 아바타 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Public URL 생성
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // 프로필 업데이트
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError
      return data as UserProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필 사진이 업데이트되었습니다.')
    },
    onError: (error: Error) => {
      console.error('아바타 업로드 실패:', error)
      toast.error(error.message || '아바타 업로드에 실패했습니다.')
    },
  })
}

// ===================================================================
// 4. 연결된 계정 조회
// ===================================================================

export function useConnectedAccounts() {
  const { user } = useAuth()

  return useQuery<ConnectedAccount[]>({
    queryKey: ['connected-accounts', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false })

      if (error) throw error
      return data as ConnectedAccount[]
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

  return useMutation({
    mutationFn: async (accountId: string) => {
      // 주 계정인지 확인
      const { data: account, error: checkError } = await supabase
        .from('connected_accounts')
        .select('is_primary, provider')
        .eq('id', accountId)
        .single()

      if (checkError) throw checkError

      if (account.is_primary) {
        throw new Error('주 계정은 연결 해제할 수 없습니다.')
      }

      // 연결 해제
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', accountId)

      if (error) throw error
      return { success: true, provider: account.provider }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] })
      toast.success(`${result.provider} 계정 연결이 해제되었습니다.`)
    },
    onError: (error: Error) => {
      console.error('계정 연결 해제 실패:', error)
      toast.error(error.message || '계정 연결 해제에 실패했습니다.')
    },
  })
}
