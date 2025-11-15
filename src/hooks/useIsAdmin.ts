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
      if (!user?.id) {
        return false
      }

      // admins 테이블에서 관리자 역할 확인 (CMS Phase 3)
      const { data, error } = await supabase
        .from('admins')
        .select('user_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        const result = handleSupabaseError(error, {
          table: 'admins',
          operation: '관리자 확인',
          fallbackValue: false,
        })
        return result !== null ? result : false
      }

      // role이 'admin' 또는 'super_admin'인지 확인
      return data?.role === 'admin' || data?.role === 'super_admin'
    },
    enabled: !!user,
    staleTime: 0, // 캐시 사용 안 함 - 매번 최신 데이터 조회
    gcTime: 0, // 즉시 가비지 컬렉션 (캐시 완전 비우기)
    refetchOnMount: 'always', // 컴포넌트 마운트 시 항상 재조회
  })
}
