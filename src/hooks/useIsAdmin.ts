/**
 * useIsAdmin Hook
 *
 * 현재 사용자가 관리자인지 확인
 * - user_roles 테이블 조회
 * - React Query로 캐싱
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { handleSupabaseError } from '@/lib/errors'

export function useIsAdmin() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false

      // user_roles와 roles 테이블 조인하여 관리자 역할 확인
      // roles 테이블에 직접 접근할 수 없으므로 조인 사용
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role_id,
          role:roles!inner(name)
        `)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        return handleSupabaseError(error, {
          table: 'user_roles',
          operation: '관리자 확인',
          fallbackValue: false,
        }) || false
      }

      // role.name이 'admin'인지 확인
      return data?.role?.name === 'admin'
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
  })
}
