/**
 * useAdmins Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * CMS Phase 1: Admin 사용자 관리를 위한 React Query 훅
 * - 관리자 목록 조회 (이메일 포함)
 * - 역할별 필터링
 * - 관리자 생성/수정/삭제 (super_admin만)
 * - 현재 사용자 관리자 권한 확인
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminsApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'
import type { AdminRole } from '@/types/v2'
import { toast } from 'sonner'

// ===================================================================
// Types
// ===================================================================

export interface AdminWithEmail {
  id: string
  user_id: string
  email: string
  role: AdminRole
  created_at: string
}

// ===================================================================
// Query Keys
// ===================================================================

export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (role?: AdminRole) => (role ? [...adminKeys.all, 'list', role] as const : [...adminKeys.all, 'list'] as const),
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (userId: string) => [...adminKeys.all, 'detail', userId] as const,
  isAdmin: () => ['isAdmin'] as const,
  currentRole: () => ['currentAdminRole'] as const,
}

// ===================================================================
// Query Hooks
// ===================================================================

/**
 * 모든 관리자 목록 조회 (이메일 포함)
 */
export function useAdmins() {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: adminKeys.lists(),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.list(token)
      if (result.error) throw new Error(result.error)

      return (result.data?.admins || []) as AdminWithEmail[]
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 단일 관리자 조회
 */
export function useAdmin(userId: string) {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: adminKeys.detail(userId),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.list(token)
      if (result.error) throw new Error(result.error)

      const admin = result.data?.admins?.find(a => a.user_id === userId)
      return admin as AdminWithEmail | null
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 역할별 관리자 목록 조회
 */
export function useAdminsByRole(role: AdminRole) {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: adminKeys.list(role),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.listByRole(token, role)
      if (result.error) throw new Error(result.error)

      return (result.data?.admins || []) as AdminWithEmail[]
    },
    enabled: isAuthenticated && !!role,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 현재 사용자가 관리자인지 확인
 */
export function useIsAdmin() {
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()

  return useQuery({
    queryKey: adminKeys.isAdmin(),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) return false

      const result = await adminsApi.checkIsAdmin(token)
      if (result.error) return false

      return result.data?.isAdmin || false
    },
    enabled: isAuthenticated,
    staleTime: 0, // 캐시 사용 안 함 - 매번 최신 데이터 조회
    gcTime: 0,
    refetchOnMount: 'always',
  })
}

/**
 * 현재 사용자의 관리자 역할 조회
 * @returns AdminRole | null
 */
export function useCurrentAdminRole() {
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()

  return useQuery({
    queryKey: adminKeys.currentRole(),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) return null

      const result = await adminsApi.checkIsAdmin(token)
      if (result.error) return null

      return (result.data?.role as AdminRole) || null
    },
    enabled: isAuthenticated,
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
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async (params: { user_id: string; role: AdminRole }) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.create(token, params)
      if (result.error) throw new Error(result.error)

      return result.data
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
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async (params: { id: string; role: AdminRole }) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.update(token, params.id, { role: params.role })
      if (result.error) throw new Error(result.error)

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
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
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await adminsApi.delete(token, id)
      if (result.error) throw new Error(result.error)

      return result.data
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
