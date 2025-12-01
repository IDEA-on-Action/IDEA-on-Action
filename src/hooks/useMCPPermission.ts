/**
 * useMCPPermission Hook
 *
 * MCP 서비스별 권한 확인 훅
 * - 사용자 구독 상태 기반 권한 계산
 * - React Query 캐싱 (5분 TTL)
 * - 서비스별 접근 권한 확인
 *
 * @description
 * 사용자의 구독 정보를 조회하여 특정 MCP 서비스에 대한 접근 권한을 확인합니다.
 * 구독이 없거나 만료된 경우 적절한 fallback reason을 반환합니다.
 *
 * @example
 * ```tsx
 * function MinuFindPage() {
 *   const { hasPermission, isLoading, reason } = useMCPPermission({
 *     serviceId: 'minu-find',
 *     requiredPermission: 'read'
 *   });
 *
 *   if (isLoading) return <Loading />;
 *   if (!hasPermission) return <NoAccess reason={reason} />;
 *
 *   return <PageContent />;
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { handleSupabaseError } from '@/lib/errors'

// =====================================================
// Types
// =====================================================

/**
 * MCP 서비스 ID
 * - minu-find: Minu Find (검색/발견)
 * - minu-frame: Minu Frame (구조화)
 * - minu-build: Minu Build (프로젝트 관리)
 * - minu-keep: Minu Keep (운영 관리)
 */
export type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep'

/**
 * MinuServiceId (ServiceId의 별칭)
 * MCPProtected 컴포넌트와의 호환성을 위한 타입
 */
export type MinuServiceId = ServiceId

/**
 * 권한 레벨
 * - none: 권한 없음
 * - read: 읽기 권한
 * - write: 쓰기 권한
 * - admin: 관리자 권한
 */
export type Permission = 'none' | 'read' | 'write' | 'admin'

/**
 * Fallback 사유
 * - subscription_required: 구독 필요
 * - subscription_expired: 구독 만료
 * - insufficient_permission: 권한 부족
 * - service_unavailable: 서비스 이용 불가
 */
export type FallbackReason =
  | 'subscription_required'
  | 'subscription_expired'
  | 'insufficient_permission'
  | 'service_unavailable'

/**
 * useMCPPermission 옵션
 */
export interface UseMCPPermissionOptions {
  /** MCP 서비스 ID */
  serviceId: ServiceId
  /** 필요한 권한 레벨 (기본값: 'read') */
  requiredPermission?: Permission
}

/**
 * useMCPPermission 반환값
 */
export interface UseMCPPermissionReturn {
  /** 권한 보유 여부 */
  hasPermission: boolean
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 정보 */
  error: Error | null
  /** 현재 권한 레벨 */
  permission: Permission
  /** 권한 없을 시 사유 */
  reason?: FallbackReason
  /** 권한 정보 재조회 */
  refetch: () => void
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * ServiceId를 서비스 slug로 변환
 * minu-find → find
 */
function serviceIdToSlug(serviceId: ServiceId): string {
  return serviceId.replace('minu-', '')
}

/**
 * 구독 상태 기반 권한 계산
 */
interface SubscriptionData {
  status: string
  current_period_end: string
  service: {
    slug: string
  } | null
}

function calculatePermission(
  subscription: SubscriptionData | null,
  serviceId: ServiceId
): { permission: Permission; reason?: FallbackReason } {
  // 구독 정보 없음
  if (!subscription) {
    return {
      permission: 'none',
      reason: 'subscription_required',
    }
  }

  // 서비스 정보 없음
  if (!subscription.service) {
    return {
      permission: 'none',
      reason: 'service_unavailable',
    }
  }

  const targetSlug = serviceIdToSlug(serviceId)

  // 서비스가 일치하지 않음
  if (subscription.service.slug !== targetSlug) {
    return {
      permission: 'none',
      reason: 'insufficient_permission',
    }
  }

  // 구독 만료 확인
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  if (periodEnd < now) {
    return {
      permission: 'none',
      reason: 'subscription_expired',
    }
  }

  // 구독 상태 확인
  const activeStatuses = ['trial', 'active']
  if (!activeStatuses.includes(subscription.status)) {
    return {
      permission: 'none',
      reason: 'subscription_expired',
    }
  }

  // 정상 구독: read 권한 부여
  // TODO: 추후 플랜별 write/admin 권한 구분 가능
  return {
    permission: 'read',
  }
}

/**
 * 필요 권한 레벨 확인
 */
function hasRequiredPermission(
  currentPermission: Permission,
  requiredPermission: Permission
): boolean {
  const permissionLevels: Record<Permission, number> = {
    none: 0,
    read: 1,
    write: 2,
    admin: 3,
  }

  return permissionLevels[currentPermission] >= permissionLevels[requiredPermission]
}

// =====================================================
// React Query Keys
// =====================================================

export const mcpPermissionKeys = {
  all: ['mcpPermission'] as const,
  service: (serviceId: ServiceId, userId: string | undefined) =>
    [...mcpPermissionKeys.all, serviceId, userId] as const,
}

// =====================================================
// Hook
// =====================================================

/**
 * MCP 서비스 권한 확인 훅
 *
 * @param options - 서비스 ID 및 필요 권한
 * @returns 권한 확인 결과
 */
export function useMCPPermission(
  options: UseMCPPermissionOptions
): UseMCPPermissionReturn {
  const { serviceId, requiredPermission = 'read' } = options
  const { user } = useAuth()

  const query = useQuery({
    queryKey: mcpPermissionKeys.service(serviceId, user?.id),
    queryFn: async () => {
      // 1. 로그인 여부 확인
      if (!user?.id) {
        return {
          permission: 'none' as Permission,
          reason: 'subscription_required' as FallbackReason,
        }
      }

      // 2. 사용자 구독 조회
      const targetSlug = serviceIdToSlug(serviceId)

      // 먼저 해당 서비스의 ID를 조회
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('slug', targetSlug)
        .maybeSingle()

      if (serviceError) {
        throw new Error(`서비스 조회 실패: ${serviceError.message}`)
      }

      if (!serviceData) {
        return {
          permission: 'none' as Permission,
          reason: 'service_unavailable' as FallbackReason,
        }
      }

      // 해당 서비스에 대한 구독 조회
      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          `
          status,
          current_period_end,
          service:services (
            slug
          )
        `
        )
        .eq('user_id', user.id)
        .eq('service_id', serviceData.id)
        .maybeSingle()

      // 3. 에러 처리
      if (error) {
        const result = handleSupabaseError(error, {
          table: 'subscriptions',
          operation: 'MCP 권한 확인',
          fallbackValue: null,
        })

        if (result === null) {
          throw new Error(`권한 확인 중 오류 발생: ${error.message}`)
        }
      }

      // 4. 권한 계산
      return calculatePermission(data as SubscriptionData | null, serviceId)
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    gcTime: 10 * 60 * 1000, // 10분 가비지 컬렉션
    retry: 1, // 실패 시 1회 재시도
  })

  // 5. 결과 계산
  const currentPermission = query.data?.permission || 'none'
  const reason = query.data?.reason
  const hasPermission = hasRequiredPermission(currentPermission, requiredPermission)

  return {
    hasPermission,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    permission: currentPermission,
    reason: hasPermission ? undefined : reason,
    refetch: query.refetch,
  }
}

// =====================================================
// useMCPServicePermission (MCPProtected용)
// =====================================================

/**
 * useMCPServicePermission 훅 반환 타입
 */
export interface UseMCPServicePermissionResult {
  /** 서비스 접근 가능 여부 */
  hasAccess: boolean
  /** 추가 권한 보유 여부 */
  hasPermission: boolean
  /** 로딩 중 여부 */
  isLoading: boolean
  /** 에러 */
  error: Error | null
  /** 구독 정보 */
  subscription: {
    planName: string
    status: string
    validUntil: string
  } | null
  /** 필요한 플랜 */
  requiredPlan?: string
}

/**
 * 서비스 단위 권한 확인 훅 (MCPProtected 전용)
 *
 * 구독 상태와 추가 권한을 동시에 확인합니다.
 * React Query를 통해 5분간 캐싱됩니다.
 *
 * @param serviceId - Minu 서비스 ID
 * @param additionalPermission - 추가로 확인할 권한 (선택)
 *
 * @example
 * ```tsx
 * const { hasAccess, isLoading, subscription } = useMCPServicePermission('minu-frame');
 *
 * const { hasAccess, hasPermission } = useMCPServicePermission(
 *   'minu-build',
 *   'export_data'
 * );
 * ```
 */
export function useMCPServicePermission(
  serviceId: MinuServiceId,
  additionalPermission?: string
): UseMCPServicePermissionResult {
  // 기본 서비스 권한 확인 (useMCPPermission 재사용)
  const basePermission = useMCPPermission({
    serviceId,
    requiredPermission: 'read',
  })

  // 추가 권한이 있으면 write 이상 권한 확인
  const enhancedPermission = useMCPPermission({
    serviceId,
    requiredPermission: additionalPermission ? 'write' : 'read',
  })

  const { user } = useAuth()

  // 구독 정보 조회
  const { data: subscriptionData } = useQuery({
    queryKey: mcpPermissionKeys.service(serviceId, user?.id),
    queryFn: async () => {
      if (!user?.id) return null

      const targetSlug = serviceIdToSlug(serviceId)

      // 서비스 ID 조회
      const { data: serviceData } = await supabase
        .from('services')
        .select('id, name')
        .eq('slug', targetSlug)
        .maybeSingle()

      if (!serviceData) return null

      // 구독 조회
      const { data } = await supabase
        .from('subscriptions')
        .select(
          `
          status,
          current_period_end,
          plan:subscription_plans (
            name
          )
        `
        )
        .eq('user_id', user.id)
        .eq('service_id', serviceData.id)
        .maybeSingle()

      if (!data) return null

      return {
        planName: (data.plan as { name: string } | null)?.name || 'Unknown',
        status: data.status,
        validUntil: data.current_period_end,
      }
    },
    enabled: !!user?.id && !!serviceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    hasAccess: basePermission.hasPermission,
    hasPermission: additionalPermission ? enhancedPermission.hasPermission : true,
    isLoading: basePermission.isLoading || enhancedPermission.isLoading,
    error: basePermission.error || enhancedPermission.error,
    subscription: subscriptionData || null,
    requiredPlan: basePermission.reason === 'insufficient_permission' ? 'Pro' : undefined,
  }
}
