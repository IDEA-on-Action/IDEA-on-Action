/**
 * useOrders Hook
 *
 * 주문 관련 React Query 훅
 * - 주문 생성
 * - 주문 목록 조회
 * - 주문 상세 조회
 * - 주문 상태 업데이트
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type {
  Order,
  OrderItem,
  OrderInsert,
  OrderItemInsert,
  ContactInfo,
  Service,
} from '@/types/database'
import { useAuth } from '@/hooks/useAuth'

// 주문 생성 입력 타입
export interface CreateOrderInput {
  contactInfo: ContactInfo
  shippingNote?: string
  items: {
    serviceId: string
    serviceTitle: string
    quantity: number
    unitPrice: number
  }[]
}

// 주문 + 아이템 + 서비스 정보
export interface OrderWithItems extends Order {
  items: (OrderItem & { service: Pick<Service, 'id' | 'title' | 'image_url'> | null })[]
}

/**
 * 주문 목록 조회 훅
 */
export function useOrders() {
  const { user } = useAuth()

  return useQuery<OrderWithItems[]>({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            service:services(id, title, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        throw new Error(error.message)
      }

      return (data || []) as unknown as OrderWithItems[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 단일 주문 상세 조회 훅
 */
export function useOrderDetail(orderId: string) {
  const { user } = useAuth()

  return useQuery<OrderWithItems | null>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!user || !orderId) return null

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            service:services(id, title, image_url)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Error fetching order detail:', error)
        throw new Error(error.message)
      }

      return data as unknown as OrderWithItems
    },
    enabled: !!user && !!orderId,
    staleTime: 1000 * 60 * 10, // 10분
  })
}

/**
 * 주문 생성 훅
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // 1. 총액 계산
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      )
      const taxAmount = Math.floor(totalAmount * 0.1) // 10% 부가세
      const discountAmount = 0 // 추후 할인 로직

      // 2. 주문 생성
      const orderData: OrderInsert = {
        user_id: user.id,
        total_amount: totalAmount + taxAmount - discountAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        status: 'pending',
        contact_info: input.contactInfo,
        shipping_address: null,
        shipping_note: input.shippingNote || null,
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        throw new Error(orderError.message)
      }

      // 3. 주문 아이템 생성
      const orderItems: OrderItemInsert[] = input.items.map((item) => ({
        order_id: order.id,
        service_id: item.serviceId,
        service_title: item.serviceTitle,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // 롤백: 주문 삭제
        await supabase.from('orders').delete().eq('id', order.id)
        throw new Error(itemsError.message)
      }

      return order as Order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 주문 취소 훅
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Error cancelling order:', error)
        throw new Error(error.message)
      }

      return data as Order
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', data.id] })
    },
  })
}

/**
 * 주문 상태 한글 변환
 */
export function getOrderStatusLabel(status: Order['status']): string {
  const labels: Record<Order['status'], string> = {
    pending: '대기중',
    processing: '처리중',
    completed: '완료',
    cancelled: '취소됨',
    refunded: '환불됨',
  }
  return labels[status]
}

/**
 * 주문 상태 색상 (Badge variant)
 */
export function getOrderStatusVariant(
  status: Order['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'cancelled':
    case 'refunded':
      return 'destructive'
    default:
      return 'outline'
  }
}
