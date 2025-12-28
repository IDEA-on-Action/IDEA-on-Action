/**
 * useOrders Hooks
 *
 * React Query를 사용한 주문 서버 상태 관리
 *
 * @migration Supabase → Cloudflare Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi, cartApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { OrderWithItems, ShippingAddress } from '@/types/database'
import type { ServiceCartItem } from '@/types/services-platform'
import { devError } from '@/lib/errors'
import { createQueryKeys, commonQueryOptions, createUserQueryKey } from '@/lib/react-query'

// ===================================================================
// Query Keys
// ===================================================================

const orderQueryKeys = createQueryKeys('orders')
const adminOrderQueryKeys = createQueryKeys('admin-orders')

// ===================================================================
// 1. 주문 목록 조회 (GET)
// ===================================================================

export function useOrders() {
  const { user, accessToken } = useAuth()

  return useQuery<OrderWithItems[]>({
    queryKey: createUserQueryKey('orders', user?.id),
    queryFn: async () => {
      if (!user || !accessToken) return []

      const response = await ordersApi.list(accessToken)

      if (response.error) {
        console.error('[useOrders] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: OrderWithItems[] } | null
      return result?.data || []
    },
    enabled: !!user && !!accessToken,
    staleTime: commonQueryOptions.defaultStaleTime,
  })
}

// ===================================================================
// 2. 주문 상세 조회 (GET by ID)
// ===================================================================

export function useOrderDetail(orderId: string | undefined) {
  const { user, accessToken } = useAuth()

  return useQuery<OrderWithItems | null>({
    queryKey: orderQueryKeys.detail(orderId || ''),
    queryFn: async () => {
      if (!orderId || !user || !accessToken) return null

      const response = await ordersApi.getById(accessToken, orderId)

      if (response.error) {
        console.error('[useOrderDetail] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: OrderWithItems } | null
      return result?.data || null
    },
    enabled: !!orderId && !!user && !!accessToken,
  })
}

// ===================================================================
// 3. 주문 생성 (POST)
// ===================================================================

interface CreateOrderParams {
  // 배송 정보
  shippingAddress: ShippingAddress
  shippingName: string
  shippingPhone: string
  shippingNote?: string

  // 연락처 정보
  contactEmail: string
  contactPhone: string

  // 주문 항목
  cartId: string // 장바구니 ID (기존 cart_items 테이블)
  serviceItems?: ServiceCartItem[] // 서비스 패키지/플랜 (로컬 상태)
}

export function useCreateOrder() {
  const { user, accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateOrderParams) => {
      if (!user || !accessToken) throw new Error('로그인이 필요합니다')

      // 장바구니 체크아웃 API 호출
      const checkoutResponse = await cartApi.checkout(accessToken)

      if (checkoutResponse.error) {
        throw new Error(checkoutResponse.error)
      }

      const result = checkoutResponse.data as { data: OrderWithItems } | null
      return result?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('주문이 완료되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '주문 생성' })
      toast.error(error.message || '주문 생성에 실패했습니다')
    },
  })
}

// ===================================================================
// 4. 주문 취소 (PATCH)
// ===================================================================

export function useCancelOrder() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!accessToken) throw new Error('로그인이 필요합니다')

      const response = await ordersApi.cancel(accessToken, orderId)

      if (response.error) {
        throw new Error(response.error)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
      toast.success('주문이 취소되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '주문 취소' })
      toast.error('주문 취소에 실패했습니다')
    },
  })
}

// ===================================================================
// 5. 관리자: 모든 주문 조회 (GET - Admin)
// ===================================================================

export function useAdminOrders() {
  const { accessToken } = useAuth()

  return useQuery<OrderWithItems[]>({
    queryKey: adminOrderQueryKeys.all,
    queryFn: async () => {
      if (!accessToken) return []

      // 관리자 전용 주문 조회 (전체)
      const response = await ordersApi.list(accessToken, { limit: 100 })

      if (response.error) {
        console.error('[useAdminOrders] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: OrderWithItems[] } | null
      return result?.data || []
    },
    enabled: !!accessToken,
    staleTime: commonQueryOptions.shortStaleTime,
  })
}

// ===================================================================
// 6. 관리자: 주문 상태 변경 (PATCH - Admin)
// ===================================================================

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

interface UpdateOrderStatusParams {
  orderId: string
  status: OrderStatus
}

export function useUpdateOrderStatus() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: UpdateOrderStatusParams) => {
      if (!accessToken) throw new Error('로그인이 필요합니다')

      const response = await ordersApi.update(accessToken, orderId, { status })

      if (response.error) {
        throw new Error(response.error)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: adminOrderQueryKeys.all })
      toast.success('주문 상태가 변경되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '주문 상태 변경' })
      toast.error('주문 상태 변경에 실패했습니다')
    },
  })
}
