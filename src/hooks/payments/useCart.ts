/**
 * useCart Hooks
 *
 * React Query를 사용한 장바구니 서버 상태 관리
 *
 * @description
 * Cloudflare Workers API를 사용하는 장바구니 CRUD 기능을 제공합니다.
 * React Query를 활용하여 서버 상태를 캐싱하고 자동으로 동기화합니다.
 *
 * @module hooks/useCart
 * @migration Supabase → Cloudflare Workers
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
import { cartApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { CartWithItems } from '@/types/shared/database'
import { devError } from '@/lib/errors'
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
 * 장바구니 항목과 서비스 정보가 조인되어 반환됩니다.
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
  const { user, accessToken } = useAuth()

  return useQuery<CartWithItems | null>({
    queryKey: createUserQueryKey('cart', user?.id),
    queryFn: async () => {
      if (!user || !accessToken) return null

      const response = await cartApi.get(accessToken)

      if (response.error) {
        console.error('[useCart] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: CartWithItems } | null
      return result?.data || null
    },
    enabled: !!user && !!accessToken,
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
  const { user, accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, quantity = 1 }: AddToCartParams) => {
      if (!user || !accessToken) throw new Error('로그인이 필요합니다')

      const response = await cartApi.add(accessToken, {
        service_id: serviceId,
        quantity,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('장바구니에 추가되었습니다')
    },
    onError: (error: Error) => {
      devError(error, { operation: '장바구니 추가' })
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
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, quantity }: UpdateCartItemParams) => {
      if (!accessToken) throw new Error('로그인이 필요합니다')

      if (quantity < 1) {
        throw new Error('수량은 1개 이상이어야 합니다')
      }

      if (quantity > 99) {
        throw new Error('최대 수량은 99개입니다')
      }

      const response = await cartApi.updateQuantity(accessToken, itemId, quantity)

      if (response.error) {
        throw new Error(response.error)
      }

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
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!accessToken) throw new Error('로그인이 필요합니다')

      const response = await cartApi.remove(accessToken, itemId)

      if (response.error) {
        throw new Error(response.error)
      }

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
  const { user, accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user || !accessToken) throw new Error('로그인이 필요합니다')

      const response = await cartApi.clear(accessToken)

      if (response.error) {
        throw new Error(response.error)
      }

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
