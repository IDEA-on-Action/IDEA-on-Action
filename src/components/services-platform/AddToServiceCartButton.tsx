/**
 * AddToServiceCartButton Component
 *
 * 서비스 패키지/플랜을 장바구니에 추가하는 버튼
 * PricingCard에서 사용하거나 독립적으로 사용 가능
 */

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'
import type {
  ServicePackage,
  SubscriptionPlan,
  ServiceCartItem,
  ServiceWithContent,
} from '@/types/services-platform'

interface AddToServiceCartButtonProps {
  /** 서비스 정보 */
  service: ServiceWithContent
  /** 패키지 또는 플랜 */
  item: ServicePackage | SubscriptionPlan
  /** 패키지(true) or 플랜(false) */
  isPackage: boolean
  /** 버튼 텍스트 (기본: "장바구니 담기") */
  label?: string
  /** 버튼 크기 (기본: "default") */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** 버튼 variant (기본: "default") */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** 전체 너비 여부 (기본: true) */
  fullWidth?: boolean
  /** 클릭 후 커스텀 핸들러 (옵션) */
  onAdded?: () => void
}

export function AddToServiceCartButton({
  service,
  item,
  isPackage,
  label = '장바구니 담기',
  size = 'default',
  variant = 'default',
  fullWidth = true,
  onAdded,
}: AddToServiceCartButtonProps) {
  const { addServiceItem, openCart, serviceItems } = useCartStore()
  const [isAdding, setIsAdding] = useState(false)

  // 이미 장바구니에 있는지 확인
  const isInCart = serviceItems.some((cartItem) => cartItem.item_id === item.id)

  const handleAddToCart = () => {
    setIsAdding(true)

    try {
      const cartItem: ServiceCartItem = {
        type: isPackage ? 'package' : 'plan',
        service_id: service.id,
        service_title: service.title,
        item_id: item.id,
        item_name: item.name || (item as SubscriptionPlan).plan_name,
        price: item.price,
        quantity: 1,
        billing_cycle: !isPackage ? (item as SubscriptionPlan).billing_cycle : undefined,
      }

      addServiceItem(cartItem)

      // 성공 토스트
      toast.success('장바구니에 추가되었습니다', {
        description: `${service.title} - ${cartItem.item_name}`,
        action: {
          label: '장바구니 보기',
          onClick: () => openCart(),
        },
      })

      // 커스텀 핸들러 실행
      onAdded?.()
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      toast.error('장바구니 추가에 실패했습니다')
    } finally {
      setTimeout(() => setIsAdding(false), 300) // 버튼 상태 복구
    }
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isInCart || isAdding}
      size={size}
      variant={variant}
      className={fullWidth ? 'w-full' : ''}
      aria-label={isInCart ? '장바구니에 추가됨' : label}
    >
      {isInCart ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          장바구니에 추가됨
        </>
      ) : isAdding ? (
        <>
          <ShoppingCart className="mr-2 h-4 w-4 animate-pulse" />
          추가 중...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
