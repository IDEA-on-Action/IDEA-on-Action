/**
 * useProfileSync Hook
 *
 * ideaonaction ↔ Minu 프로필 실시간 동기화 관리
 * - 동기화 상태 조회
 * - 수동 동기화 트리거
 * - 동기화 이력 조회
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { devError } from '@/lib/errors'

// ===================================================================
// Types
// ===================================================================

/**
 * 동기화 상태
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'

/**
 * 동기화 방향
 */
export type SyncDirection = 'ideaonaction_to_minu' | 'minu_to_ideaonaction' | 'bidirectional'

/**
 * 동기화 결과
 */
export type SyncResult = 'success' | 'partial' | 'conflict' | 'failed'

/**
 * 동기화 트리거
 */
export type TriggeredBy = 'user' | 'webhook' | 'scheduled' | 'manual'

/**
 * 프로필 동기화 상태
 */
export interface ProfileSyncStatus {
  id: string
  user_id: string
  sync_status: SyncStatus
  last_sync_direction: SyncDirection | null
  last_synced_at: string | null
  ideaonaction_updated_at: string | null
  minu_updated_at: string | null
  conflict_fields: Record<string, { ideaonaction: unknown; minu: unknown }> | null
  conflict_resolved_at: string | null
  error_message: string | null
  error_count: number
  last_error_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * 프로필 동기화 이력
 */
export interface ProfileSyncHistory {
  id: string
  user_id: string
  sync_direction: SyncDirection
  sync_result: SyncResult
  synced_fields: string[]
  conflict_fields: Record<string, { ideaonaction: unknown; minu: unknown }> | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  error_message: string | null
  error_code: string | null
  triggered_by: TriggeredBy | null
  metadata: Record<string, unknown>
  synced_at: string
  created_at: string
}

/**
 * 동기화 트리거 파라미터
 */
export interface TriggerSyncParams {
  direction?: SyncDirection
  force?: boolean
}

/**
 * 동기화 응답
 */
interface SyncResponse {
  synced: boolean
  user_id: string
  sync_direction: SyncDirection
  sync_result: SyncResult
  synced_fields: string[]
  conflict_fields: Record<string, { ideaonaction: unknown; minu: unknown }> | null
  synced_at: string
}

// ===================================================================
// 1. 동기화 상태 조회
// ===================================================================

/**
 * 사용자의 프로필 동기화 상태 조회
 *
 * @example
 * ```tsx
 * const { data: syncStatus, isLoading } = useProfileSyncStatus()
 *
 * if (syncStatus?.sync_status === 'conflict') {
 *   // 충돌 처리 UI 표시
 * }
 * ```
 */
export function useProfileSyncStatus() {
  const { user } = useAuth()

  return useQuery<ProfileSyncStatus | null>({
    queryKey: ['profile-sync-status', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('profile_sync_status')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // 상태가 없으면 null 반환 (에러 아님)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as ProfileSyncStatus
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 1, // 1분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  })
}

// ===================================================================
// 2. 수동 동기화 트리거
// ===================================================================

/**
 * 프로필 수동 동기화 트리거
 *
 * Edge Function을 호출하여 ideaonaction ↔ Minu 프로필 동기화를 수행합니다.
 *
 * @example
 * ```tsx
 * const { mutate: triggerSync, isPending } = useTriggerProfileSync()
 *
 * // 양방향 동기화
 * triggerSync({ direction: 'bidirectional' })
 *
 * // ideaonaction → Minu만
 * triggerSync({ direction: 'ideaonaction_to_minu' })
 *
 * // 충돌 무시하고 강제 동기화
 * triggerSync({ direction: 'bidirectional', force: true })
 * ```
 */
export function useTriggerProfileSync() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: TriggerSyncParams = {}) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // Edge Function 호출
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('인증 세션이 없습니다.')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-sync/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            direction: params.direction || 'bidirectional',
            force: params.force || false,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '동기화에 실패했습니다.')
      }

      const result: SyncResponse = await response.json()
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['profile-sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['profile-sync-history'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })

      if (result.sync_result === 'conflict') {
        toast.warning('프로필 충돌이 감지되어 최신 정보로 자동 해결되었습니다.', {
          description: `충돌 필드: ${Object.keys(result.conflict_fields || {}).join(', ')}`,
        })
      } else if (result.sync_result === 'success') {
        toast.success('프로필이 동기화되었습니다.', {
          description: `동기화된 필드: ${result.synced_fields.length}개`,
        })
      } else {
        toast.info('프로필이 부분적으로 동기화되었습니다.')
      }
    },
    onError: (error: Error) => {
      devError(error, { operation: '프로필 동기화', service: 'ProfileSync' })
      toast.error('프로필 동기화에 실패했습니다.', {
        description: error.message,
      })
    },
  })
}

// ===================================================================
// 3. 동기화 이력 조회
// ===================================================================

/**
 * 프로필 동기화 이력 조회
 *
 * 최근 동기화 이력을 시간 역순으로 조회합니다.
 *
 * @param limit - 조회할 이력 개수 (기본값: 10)
 *
 * @example
 * ```tsx
 * const { data: history, isLoading } = useProfileSyncHistory(20)
 *
 * {history?.map(item => (
 *   <div key={item.id}>
 *     {item.sync_direction} - {item.sync_result}
 *     {item.conflict_fields && <ConflictBadge />}
 *   </div>
 * ))}
 * ```
 */
export function useProfileSyncHistory(limit = 10) {
  const { user } = useAuth()

  return useQuery<ProfileSyncHistory[]>({
    queryKey: ['profile-sync-history', user?.id, limit],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('profile_sync_history')
        .select('*')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as ProfileSyncHistory[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

// ===================================================================
// 4. 실시간 동기화 상태 구독
// ===================================================================

/**
 * 프로필 동기화 상태 실시간 구독
 *
 * Supabase Realtime을 사용하여 동기화 상태 변경을 실시간으로 감지합니다.
 *
 * @example
 * ```tsx
 * const { data: syncStatus } = useProfileSyncStatus()
 *
 * // syncStatus는 자동으로 실시간 업데이트됨
 * useEffect(() => {
 *   if (syncStatus?.sync_status === 'synced') {
 *     console.log('동기화 완료!')
 *   }
 * }, [syncStatus?.sync_status])
 * ```
 */
export function useRealtimeProfileSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useQuery({
    queryKey: ['profile-sync-realtime', user?.id],
    queryFn: () => {
      if (!user) return null

      const channel = supabase
        .channel(`profile-sync:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_sync_status',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Profile sync status changed:', payload)

            // 동기화 상태 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ['profile-sync-status', user.id] })

            // 동기화 완료 시 프로필 쿼리도 무효화
            if (payload.new && (payload.new as ProfileSyncStatus).sync_status === 'synced') {
              queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
            }
          }
        )
        .subscribe()

      return channel
    },
    enabled: !!user,
    staleTime: Infinity, // 구독은 계속 유지
  })
}

// ===================================================================
// 5. 유틸리티 함수
// ===================================================================

/**
 * 동기화 상태 레이블 반환
 */
export function getSyncStatusLabel(status: SyncStatus): string {
  const labels: Record<SyncStatus, string> = {
    pending: '대기 중',
    syncing: '동기화 중',
    synced: '동기화 완료',
    conflict: '충돌 해결됨',
    failed: '동기화 실패',
  }
  return labels[status] || status
}

/**
 * 동기화 방향 레이블 반환
 */
export function getSyncDirectionLabel(direction: SyncDirection): string {
  const labels: Record<SyncDirection, string> = {
    ideaonaction_to_minu: 'ideaonaction → Minu',
    minu_to_ideaonaction: 'Minu → ideaonaction',
    bidirectional: '양방향',
  }
  return labels[direction] || direction
}

/**
 * 동기화 결과 레이블 반환
 */
export function getSyncResultLabel(result: SyncResult): string {
  const labels: Record<SyncResult, string> = {
    success: '성공',
    partial: '부분 성공',
    conflict: '충돌 해결됨',
    failed: '실패',
  }
  return labels[result] || result
}
