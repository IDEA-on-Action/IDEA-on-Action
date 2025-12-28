/**
 * useIsAdmin Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 현재 사용자가 관리자인지 확인
 * - Workers API를 통해 관리자 역할 조회
 * - React Query로 캐싱
 */

import { useQuery } from '@tanstack/react-query'
import { adminsApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'

export function useIsAdmin() {
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()

  return useQuery({
    queryKey: ['isAdmin', workersUser?.id],
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) {
        return false
      }

      try {
        const result = await adminsApi.checkIsAdmin(token)
        if (result.error) {
          console.error('관리자 확인 오류:', result.error)
          return false
        }

        // role이 'admin' 또는 'super_admin'인지 확인
        const role = result.data?.role
        return role === 'admin' || role === 'super_admin'
      } catch (error) {
        console.error('관리자 확인 실패:', error)
        return false
      }
    },
    enabled: isAuthenticated && !!workersUser,
    staleTime: 0, // 캐시 사용 안 함 - 매번 최신 데이터 조회
    gcTime: 0, // 즉시 가비지 컬렉션 (캐시 완전 비우기)
    refetchOnMount: 'always', // 컴포넌트 마운트 시 항상 재조회
  })
}
