/**
 * useAdmins Hook
 *
 * CMS Phase 1: Admin 사용자 관리를 위한 React Query 훅
 * - 관리자 목록 조회 (이메일 포함)
 * - 역할별 필터링
 * - 관리자 생성/수정/삭제 (super_admin만)
 * - 현재 사용자 관리자 권한 확인
 */

import { supabase } from '@/integrations/supabase/client'
import { useSupabaseQuery, supabaseQuery } from '@/lib/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Admin, AdminWithEmail, AdminRole } from '@/types/v2'
import { toast } from 'sonner'

// ===================================================================
// Query Keys
// ===================================================================

export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (role?: AdminRole) => (role ? [...adminKeys.all, 'list', role] as const : [...adminKeys.all, 'list'] as const),
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (userId: string) => [...adminKeys.all, 'detail', userId] as const,
}

// ===================================================================
// Query Hooks
// ===================================================================

/**
 * 모든 관리자 목록 조회 (이메일 포함)
 */
export function useAdmins() {
  return useSupabaseQuery<AdminWithEmail[]>({
    queryKey: adminKeys.lists(),
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          // admins 테이블에서 email 포함하여 조회
          const { data: admins, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            return { data: null, error }
          }

          return { data: (admins || []) as AdminWithEmail[], error: null }
        },
        {
          table: 'admins',
          operation: '관리자 목록 조회',
          fallbackValue: [],
        }
      )
    },
    table: 'admins',
    operation: '관리자 목록 조회',
    fallbackValue: [],
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 단일 관리자 조회
 */
export function useAdmin(userId: string) {
  return useSupabaseQuery<AdminWithEmail | null>({
    queryKey: adminKeys.detail(userId),
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()

          if (error) {
            return { data: null, error }
          }

          return { data: admin as AdminWithEmail | null, error: null }
        },
        {
          table: 'admins',
          operation: `관리자 조회 (user_id: ${userId})`,
          fallbackValue: null,
        }
      )
    },
    table: 'admins',
    operation: `관리자 조회 (user_id: ${userId})`,
    fallbackValue: null,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 역할별 관리자 목록 조회
 */
export function useAdminsByRole(role: AdminRole) {
  return useSupabaseQuery<AdminWithEmail[]>({
    queryKey: adminKeys.list(role),
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const { data: admins, error } = await supabase
            .from('admins')
            .select('*')
            .eq('role', role)
            .order('created_at', { ascending: false })

          if (error) {
            return { data: null, error }
          }

          return { data: (admins || []) as AdminWithEmail[], error: null }
        },
        {
          table: 'admins',
          operation: `역할별 관리자 조회 (role: ${role})`,
          fallbackValue: [],
        }
      )
    },
    table: 'admins',
    operation: `역할별 관리자 조회 (role: ${role})`,
    fallbackValue: [],
    enabled: !!role,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 현재 사용자가 관리자인지 확인
 * NOTE: useAuth()를 호출하면 순환 참조 발생하므로 직접 Supabase auth 사용
 */
export function useIsAdmin() {
  return useSupabaseQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      // Supabase auth 세션에서 직접 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        return false
      }

      return await supabaseQuery(
        async () => {
          const { data, error } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (error) {
            return { data: false, error }
          }

          return { data: !!data, error: null }
        },
        {
          table: 'admins',
          operation: '관리자 권한 확인',
          fallbackValue: false,
        }
      )
    },
    table: 'admins',
    operation: '관리자 권한 확인',
    fallbackValue: false,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 현재 사용자의 관리자 역할 조회
 * @returns AdminRole | null
 */
export function useCurrentAdminRole() {
  return useSupabaseQuery<AdminRole | null>({
    queryKey: ['currentAdminRole'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        return null
      }

      return await supabaseQuery(
        async () => {
          const { data, error } = await supabase
            .from('admins')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()

          if (error) {
            return { data: null, error }
          }

          return { data: data?.role || null, error: null }
        },
        {
          table: 'admins',
          operation: '관리자 역할 조회',
          fallbackValue: null,
        }
      )
    },
    table: 'admins',
    operation: '관리자 역할 조회',
    fallbackValue: null,
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10, // 10분
  })
}

// ===================================================================
// Mutation Hooks
// ===================================================================

/**
 * 관리자 생성 (super_admin만)
 */
export function useCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { user_id: string; role: AdminRole }) => {
      const { data, error } = await supabase.from('admins').insert(params).select().single()

      if (error) {
        throw error
      }

      return data as Admin
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      toast.success('관리자가 생성되었습니다.')
    },
    onError: (error: Error) => {
      console.error('관리자 생성 실패:', error)
      toast.error('관리자 생성에 실패했습니다.')
    },
  })
}

/**
 * 관리자 수정 (super_admin만)
 */
export function useUpdateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; role: AdminRole }) => {
      const { data, error } = await supabase.from('admins').update({ role: params.role }).eq('id', params.id).select().single()

      if (error) {
        throw error
      }

      return data as Admin
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(data.user_id) })
      toast.success('관리자 정보가 수정되었습니다.')
    },
    onError: (error: Error) => {
      console.error('관리자 수정 실패:', error)
      toast.error('관리자 수정에 실패했습니다.')
    },
  })
}

/**
 * 관리자 삭제 (super_admin만)
 */
export function useDeleteAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admins').delete().eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      toast.success('관리자가 삭제되었습니다.')
    },
    onError: (error: Error) => {
      console.error('관리자 삭제 실패:', error)
      toast.error('관리자 삭제에 실패했습니다.')
    },
  })
}
