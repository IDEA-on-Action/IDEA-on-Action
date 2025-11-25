/**
 * useOrders Hooks
 *
 * React Query를 사용한 주문 서버 상태 관리
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { OrderWithItems, OrderInsert, OrderItemInsert, ShippingAddress } from '@/types/database'
import type { ServiceCartItem } from '@/types/services-platform'
import { handleSupabaseError, devError } from '@/lib/errors'
import { createQueryKeys, commonQueryOptions, createUserQueryKey } from '@/lib/react-query'

// CartItem 타입 정의 (cart_items 조인 결과)
interface CartItemWithService {
  service_id: string
  price: number
  quantity: number
  package_name?: string | null
  service?: {
    title: string
    description?: string | null
  } | null
}

// ===================================================================
// Query Keys
// ===================================================================

const orderQueryKeys = createQueryKeys('orders')
const adminOrderQueryKeys = createQueryKeys('admin-orders')

// ===================================================================
// 1. 주문 목록 조회 (GET)
// ===================================================================

export function useOrders() {
  const { user } = useAuth()

  return useQuery<OrderWithItems[]>({
    queryKey: createUserQueryKey('orders', user?.id),
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          items:order_items(
            *,
            service:services(*)
          ),
          payment:payments(*)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        const result = handleSupabaseError(error, {
          table: 'orders',
          operation: '주문 목록 조회',
          fallbackValue: [],
        })
        if (result !== null) {
          return result
        }
        throw error
      }

      return data as OrderWithItems[]
    },
    enabled: !!user,
    staleTime: commonQueryOptions.defaultStaleTime,
  })
}

// ===================================================================
// 2. 주문 상세 조회 (GET by ID)
// ===================================================================

export function useOrderDetail(orderId: string | undefined) {
  const { user } = useAuth()

  return useQuery<OrderWithItems | null>({
    queryKey: orderQueryKeys.detail(orderId || ''),
    queryFn: async () => {
      if (!orderId || !user) return null

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          items:order_items(
            *,
            service:services(*)
          ),
          payment:payments(*)
        `
        )
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        const result = handleSupabaseError(error, {
          table: 'orders',
          operation: '주문 상세 조회',
          fallbackValue: null,
        })
        if (result !== null) {
          return result
        }
        throw error
      }

      return data as OrderWithItems | null
    },
    enabled: !!orderId && !!user,
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
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateOrderParams) => {
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 장바구니 항목 조회 (일반 cart_items)
      let cartItems: CartItemWithService[] = []
      if (params.cartId) {
        const { data, error: cartError } = await supabase
          .from('cart_items')
          .select(
            `
            service_id,
            price,
            quantity,
            package_name,
            service:services(title, description)
          `
          )
          .eq('cart_id', params.cartId)

        if (cartError) throw cartError
        cartItems = (data || []) as CartItemWithService[]
      }

      // 2. 서비스 항목 (service_items)
      const serviceItems = params.serviceItems || []

      // 3. 최소 1개 항목 필요
      if (cartItems.length === 0 && serviceItems.length === 0) {
        throw new Error('장바구니가 비어있습니다')
      }

      // 4. 주문 금액 계산 (cart items + service items)
      const cartSubtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      const serviceSubtotal = serviceItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      const subtotal = cartSubtotal + serviceSubtotal
      const taxAmount = subtotal * 0.1 // 부가세 10%
      const totalAmount = subtotal + taxAmount

      // 3. 주문번호 생성 (서버 함수 사용)
      const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
        'generate_order_number'
      )
      if (orderNumberError) throw orderNumberError

      // 4. 주문 생성
      const newOrder: OrderInsert = {
        user_id: user.id,
        order_number: orderNumberData,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        shipping_fee: 0,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address: params.shippingAddress,
        shipping_name: params.shippingName,
        shipping_phone: params.shippingPhone,
        shipping_note: params.shippingNote || null,
        contact_email: params.contactEmail,
        contact_phone: params.contactPhone,
        payment_id: null,
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single()

      if (orderError) throw orderError

      // 5. 주문 항목 생성 (cart items + service items)
      const orderItems: OrderItemInsert[] = []

      // 5a. cart items 변환
      cartItems.forEach((item) => {
        orderItems.push({
          order_id: order.id,
          service_id: item.service_id,
          service_title: item.service?.title || '',
          service_description: item.service?.description || null,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          package_name: item.package_name || null,
          service_snapshot: item.service ? (item.service as unknown as Record<string, unknown>) : null,
        })
      })

      // 5b. service items 변환
      serviceItems.forEach((item) => {
        orderItems.push({
          order_id: order.id,
          service_id: item.service_id,
          service_title: item.service_title,
          service_description: null,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          package_name: `${item.item_name}${item.billing_cycle ? ` (${item.billing_cycle})` : ''}`,
          service_snapshot: null,
        })
      })

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

      if (itemsError) {
        // 롤백: 주문 삭제
        await supabase.from('orders').delete().eq('id', order.id)
        throw itemsError
      }

      // 6. 장바구니 비우기 (cart items)
      if (params.cartId) {
        await supabase.from('cart_items').delete().eq('cart_id', params.cartId)
      }

      return order
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .in('status', ['pending', 'confirmed']) // pending/confirmed 상태만 취소 가능

      if (error) throw error

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
  return useQuery<OrderWithItems[]>({
    queryKey: adminOrderQueryKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          items:order_items(
            *,
            service:services(*)
          ),
          payment:payments(*)
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        const result = handleSupabaseError(error, {
          table: 'orders',
          operation: '관리자 주문 목록 조회',
          fallbackValue: [],
        })
        if (result !== null) {
          return result
        }
        throw error
      }

      return data as OrderWithItems[]
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: UpdateOrderStatusParams) => {
      const now = new Date().toISOString()
      const updates: Record<string, unknown> = { status }

      // 상태별 타임스탬프 업데이트
      if (status === 'confirmed') updates.confirmed_at = now
      if (status === 'shipped') updates.shipped_at = now
      if (status === 'delivered') updates.delivered_at = now
      if (status === 'cancelled') updates.cancelled_at = now

      const { error } = await supabase.from('orders').update(updates).eq('id', orderId)

      if (error) throw error

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
