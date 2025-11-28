/**
 * CartDrawer Component
 *
 * 장바구니 사이드바 UI
 * - 아이템 목록
 * - 수량 조절
 * - 총액 표시
 * - 결제 진행 버튼
 */

import { useNavigate } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCartStore } from '@/stores/cartStore'
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'

export function CartDrawer() {
  const navigate = useNavigate()
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getTotalPrice,
    clearCart,
  } = useCartStore()

  const totalPrice = getTotalPrice()
  const formattedTotal = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(totalPrice)

  const handleCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            장바구니
          </SheetTitle>
          <SheetDescription>
            {items.length > 0
              ? `${items.length}개의 서비스가 담겨있습니다.`
              : '장바구니가 비어있습니다.'}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">장바구니에 담긴 서비스가 없습니다.</p>
            <Button
              variant="link"
              className="mt-4"
              onClick={() => {
                closeCart()
                navigate('/services')
              }}
            >
              서비스 둘러보기
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemCard
                    key={item.serviceId}
                    item={item}
                    onRemove={() => removeItem(item.serviceId)}
                    onUpdateQuantity={(qty) => updateQuantity(item.serviceId, qty)}
                  />
                ))}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            {/* 총액 */}
            <div className="space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>총 금액</span>
                <span className="text-primary">{formattedTotal}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                부가세 별도
              </p>
            </div>

            <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
              <Button
                size="lg"
                className="w-full bg-gradient-primary"
                onClick={handleCheckout}
              >
                결제하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={clearCart}
              >
                장바구니 비우기
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// 개별 아이템 카드
interface CartItemCardProps {
  item: {
    serviceId: string
    service: { id: string; title: string; price: number; image_url: string | null }
    quantity: number
  }
  onRemove: () => void
  onUpdateQuantity: (quantity: number) => void
}

function CartItemCard({ item, onRemove, onUpdateQuantity }: CartItemCardProps) {
  const { service, quantity } = item

  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(service.price * quantity)

  return (
    <div className="flex gap-4 p-3 rounded-lg border bg-card">
      {/* 이미지 */}
      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-2xl font-bold text-muted-foreground">
              {service.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{service.title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{formattedPrice}</p>

        {/* 수량 조절 */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CartDrawer
