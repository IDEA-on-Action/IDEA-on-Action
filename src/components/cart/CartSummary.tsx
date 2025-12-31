/**
 * CartSummary Component
 *
 * 장바구니 합계 및 결제 버튼
 * 일반 서비스 + 서비스 패키지/플랜 합산
 */

import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useClearCart } from '@/hooks/useCart'
import { useCartStore } from '@/stores/cartStore'
import type { CartWithItems } from '@/types/database'
import type { ServiceCartItem } from '@/types/services-platform'

interface CartSummaryProps {
  cart: CartWithItems | null | undefined
  serviceItems: ServiceCartItem[]
}

export function CartSummary({ cart, serviceItems }: CartSummaryProps) {
  const navigate = useNavigate()
  const { closeCart, clearServiceItems } = useCartStore()
  const { mutate: clearCart } = useClearCart()

  const handleCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  const handleClearAll = () => {
    clearCart()
    clearServiceItems()
  }

  // 일반 서비스 소계
  const regularSubtotal =
    cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

  // 서비스 패키지/플랜 소계
  const serviceSubtotal =
    serviceItems.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

  // 전체 소계
  const subtotal = regularSubtotal + serviceSubtotal

  // 부가세 10%
  const tax = subtotal * 0.1

  // 총 금액
  const total = subtotal + tax

  const isEmpty = (!cart?.items || cart.items.length === 0) && serviceItems.length === 0

  return (
    <div className="space-y-4">
      {/* 금액 정보 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">소계</span>
          <span>₩{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">부가세 (10%)</span>
          <span>₩{tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>총 금액</span>
          <span>₩{total.toLocaleString()}</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="space-y-2">
        <Button className="w-full" size="lg" disabled={isEmpty} onClick={handleCheckout}>
          결제하기
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={handleClearAll}
          disabled={isEmpty}
        >
          장바구니 비우기
        </Button>
      </div>

      {isEmpty && (
        <p className="text-center text-sm text-muted-foreground">
          장바구니가 비어있습니다
        </p>
      )}
    </div>
  )
}
