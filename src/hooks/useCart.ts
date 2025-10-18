/**
 * useCart Hooks
 *
 * React Query를 사용한 장바구니 서버 상태 관리
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { CartWithItems, CartItemInsert, CartItemUpdate } from '@/types/database'

// ===================================================================
// 1. 장바구니 조회 (GET)
// ===================================================================

export function useCart() {
  const { user } = useAuth()

  return useQuery<CartWithItems | null>({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return null

      // carts + cart_items + services 조인
      const { data, error } = await supabase
        .from('carts')
        .select(
          `
          *,
          items:cart_items(
            *,
            service:services(*)
          )
        `
        )
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('장바구니 조회 실패:', error)
        throw error
      }

      return data
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
  })
}

// ===================================================================
// 2. 장바구니에 추가 (POST)
// ===================================================================

interface AddToCartParams {
  serviceId: string
  quantity?: number
  price: number
}

export function useAddToCart() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, quantity = 1, price }: AddToCartParams) => {
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 장바구니가 없으면 생성
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cartError) throw cartError

      if (!cart) {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id')
          .single()

        if (createError) throw createError
        cart = newCart
      }

      // 2. 이미 장바구니에 있는지 확인
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('service_id', serviceId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingItem) {
        // 이미 있으면 수량 증가
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)

        if (updateError) throw updateError
      } else {
        // 없으면 새로 추가
        const newItem: CartItemInsert = {
          cart_id: cart.id,
          service_id: serviceId,
          quantity,
          price,
        }

        const { error: insertError } = await supabase.from('cart_items').insert(newItem)

        if (insertError) throw insertError
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('장바구니에 추가되었습니다')
    },
    onError: (error: Error) => {
      console.error('장바구니 추가 실패:', error)
      toast.error(error.message || '장바구니 추가에 실패했습니다')
    },
  })
}

// ===================================================================
// 3. 수량 변경 (PATCH)
// ===================================================================

interface UpdateCartItemParams {
  itemId: string
  quantity: number
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, quantity }: UpdateCartItemParams) => {
      if (quantity < 1) {
        throw new Error('수량은 1개 이상이어야 합니다')
      }

      if (quantity > 99) {
        throw new Error('최대 수량은 99개입니다')
      }

      const update: CartItemUpdate = { quantity }

      const { error } = await supabase.from('cart_items').update(update).eq('id', itemId)

      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (error: Error) => {
      console.error('수량 변경 실패:', error)
      toast.error(error.message || '수량 변경에 실패했습니다')
    },
  })
}

// ===================================================================
// 4. 항목 삭제 (DELETE)
// ===================================================================

export function useRemoveCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId)

      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('장바구니에서 삭제되었습니다')
    },
    onError: (error: Error) => {
      console.error('항목 삭제 실패:', error)
      toast.error('삭제에 실패했습니다')
    },
  })
}

// ===================================================================
// 5. 장바구니 비우기 (DELETE ALL)
// ===================================================================

export function useClearCart() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 장바구니 ID 조회
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cartError) throw cartError
      if (!cart) return { success: true } // 장바구니가 없으면 성공

      // 2. 모든 cart_items 삭제
      const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id)

      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('장바구니가 비워졌습니다')
    },
    onError: (error: Error) => {
      console.error('장바구니 비우기 실패:', error)
      toast.error('장바구니 비우기에 실패했습니다')
    },
  })
}
