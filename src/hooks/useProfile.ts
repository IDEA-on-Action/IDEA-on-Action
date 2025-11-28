/**
 * useProfile Hook
 *
 * 사용자 프로필 관리 훅
 * - 프로필 조회/수정
 * - 아바타 이미지 업로드
 * - 이메일 인증
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { UserProfile, UserProfileUpdate } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'

const PROFILE_QUERY_KEY = 'profile'

/**
 * 현재 사용자 프로필 조회
 */
export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // 프로필이 없으면 생성
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || null,
              avatar_url: user.user_metadata?.avatar_url || null,
            })
            .select()
            .single()

          if (createError) {
            console.error('Profile creation error:', createError)
            return null
          }

          return newProfile as UserProfile
        }

        console.error('Profile fetch error:', error)
        return null
      }

      return data as UserProfile
    },
    enabled: !!user,
  })
}

/**
 * 프로필 업데이트
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (updates: UserProfileUpdate) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        throw new Error('프로필 업데이트에 실패했습니다.')
      }

      return data as UserProfile
    },
    onSuccess: (data) => {
      queryClient.setQueryData([PROFILE_QUERY_KEY, user?.id], data)
    },
  })
}

/**
 * 아바타 이미지 업로드
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // 파일 검증
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('JPG, PNG, WEBP 이미지만 업로드 가능합니다.')
      }

      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.')
      }

      // 파일명 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      // 기존 아바타 삭제 (있으면)
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`])

      // 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Avatar upload error:', uploadError)
        throw new Error('이미지 업로드에 실패했습니다.')
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const avatarUrl = urlData.publicUrl

      // 프로필 업데이트
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error('프로필 업데이트에 실패했습니다.')
      }

      return data as UserProfile
    },
    onSuccess: (data) => {
      queryClient.setQueryData([PROFILE_QUERY_KEY, user?.id], data)
    },
  })
}

/**
 * 아바타 삭제
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // Storage에서 삭제
      await supabase.storage.from('avatars').remove([
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.png`,
        `${user.id}/avatar.webp`,
      ])

      // 프로필 업데이트
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw new Error('프로필 업데이트에 실패했습니다.')
      }

      return data as UserProfile
    },
    onSuccess: (data) => {
      queryClient.setQueryData([PROFILE_QUERY_KEY, user?.id], data)
    },
  })
}

/**
 * 이메일 인증 요청
 */
export function useRequestEmailVerification() {
  return useMutation({
    mutationFn: async () => {
      // Supabase Edge Function 호출 (별도 구현 필요)
      const { data, error } = await supabase.functions.invoke('send-verification-email')

      if (error) {
        console.error('Email verification request error:', error)
        throw new Error('이메일 인증 요청에 실패했습니다.')
      }

      return data
    },
  })
}

/**
 * 이메일 인증 확인
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('verify_email', { token })

      if (error) {
        console.error('Email verification error:', error)
        throw new Error('이메일 인증에 실패했습니다.')
      }

      if (!data) {
        throw new Error('유효하지 않거나 만료된 인증 링크입니다.')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, user?.id] })
    },
  })
}

/**
 * 사용자 역할 조회
 */
export function useUserRoles() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('User roles fetch error:', error)
        return []
      }

      return data
    },
    enabled: !!user,
  })
}
