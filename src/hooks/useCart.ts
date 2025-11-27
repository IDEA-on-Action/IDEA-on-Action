/**
 * useCart Hooks
 *
 * React Query를 사용한 장바구니 서버 상태 관리
 *
 * @description
 * Supabase를 백엔드로 사용하는 장바구니 CRUD 기능을 제공합니다.
 * React Query를 활용하여 서버 상태를 캐싱하고 자동으로 동기화합니다.
 *
 * @module hooks/useCart
 *
 * @example
 * ```tsx
 * // 장바구니 조회
 * const { data: cart, isLoading } = useCart();
 *
 * // 장바구니에 추가
 * const addToCart = useAddToCart();
 * await addToCart.mutateAsync({
 *   serviceId: 'service-uuid',
 *   price: 10000,
 *   quantity: 1,
 * });
 *
 * // 수량 변경
 * const updateItem = useUpdateCartItem();
 * await updateItem.mutateAsync({ itemId: 'item-uuid', quantity: 2 });
 *
 * // 항목 삭제
 * const removeItem = useRemoveCartItem();
 * await removeItem.mutateAsync('item-uuid');
 * ```
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { CartWithItems, CartItemInsert, CartItemUpdate } from '@/types/database'
import { handleSupabaseError, handleApiError, devError } from '@/lib/errors'
import { createQueryKeys, commonQueryOptions, createUserQueryKey } from '@/lib/react-query'

// ===================================================================
// Query Keys
// ===================================================================

const cartQueryKeys = createQueryKeys('cart')

// ===================================================================
// 1. 장바구니 조회 (GET)
// ===================================================================

/**
 * 장바구니 조회 훅
 *
 * @description
 * 현재 로그인한 사용자의 장바구니를 조회합니다.
 * 장바구니 항목(cart_items)과 서비스(services) 정보가 조인되어 반환됩니다.
 *
 * @returns {UseQueryResult<CartWithItems | null>} 장바구니 데이터 및 쿼리 상태
 *
 * @example
 * ```tsx
 * function CartPage() {
 *   const { data: cart, isLoading, error } = useCart();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!cart || cart.items.length === 0) return <EmptyCart />;
 *
 *   return (
 *     <div>
 *       {cart.items.map(item => (
 *         <CartItem key={item.id} item={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCart() {
  const { user } = useAuth()

  return useQuery<CartWithItems | null>({
    queryKey: createUserQueryKey('cart', user?.id),
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
        return handleSupabaseError(error, {
          table: 'carts',
          operation: '장바구니 조회',
          fallbackValue: null,
        })
      }

      return data
    },
    enabled: !!user,
    staleTime: commonQueryOptions.defaultStaleTime,
  })
}

// ===================================================================
// 2. 장바구니에 추가 (POST)
// ===================================================================

interface AddToCartParams {
  serviceId: string
  quantity?: number
  price: number
  packageName?: string
}

export function useAddToCart() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, quantity = 1, price, packageName }: AddToCartParams) => {
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 장바구니가 없으면 생성
      const { data: existingCart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cartError) throw cartError

      let cart = existingCart

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
          package_name: packageName || null,
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
      const errorMessage = handleApiError(error, {
        service: 'carts',
        operation: '장바구니 추가',
      })
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
      devError(error, { operation: '수량 변경' })
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
      devError(error, { operation: '항목 삭제' })
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
      devError(error, { operation: '장바구니 비우기' })
      toast.error('장바구니 비우기에 실패했습니다')
    },
  })
}
