/**
 * CartDrawer Component
 *
 * 반응형 장바구니 패널:
 * - 모바일: 하단에서 슬라이드되는 Drawer
 * - 데스크톱: 우측에서 슬라이드되는 Sheet
 * 일반 서비스 (cart_items) + 서비스 패키지/플랜 (serviceItems) 모두 표시
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/stores/cartStore'
import { useCart } from '@/hooks/useCart'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { CartItem } from './CartItem'
import { ServiceCartItem } from './ServiceCartItem'
import { CartSummary } from './CartSummary'

export function CartDrawer() {
  const { isOpen, closeCart, serviceItems } = useCartStore()
  const { data: cart, isLoading } = useCart()
  const isMobile = useIsMobile()

  const regularItemCount = cart?.items?.length || 0
  const serviceItemCount = serviceItems.length
  const totalItemCount = regularItemCount + serviceItemCount

  // 공통 컨텐츠 컴포넌트
  const CartContent = () => (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      ) : totalItemCount > 0 ? (
        <div className="py-4 space-y-4">
          {/* 서비스 패키지/플랜 항목 */}
          {serviceItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                서비스 패키지/플랜
              </h3>
              {serviceItems.map((item) => (
                <ServiceCartItem key={item.item_id} item={item} />
              ))}
            </div>
          )}

          {/* 구분선 (둘 다 있을 때만) */}
          {serviceItems.length > 0 && regularItemCount > 0 && (
            <Separator className="my-4" />
          )}

          {/* 일반 서비스 항목 */}
          {regularItemCount > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                일반 서비스
              </h3>
              {cart?.items?.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">장바구니가 비어있습니다</p>
        </div>
      )}
    </>
  )

  // 모바일: Drawer (하단에서 슬라이드)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={closeCart}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          {/* 헤더 */}
          <DrawerHeader className="px-6 py-4 border-b">
            <DrawerTitle>장바구니</DrawerTitle>
            <DrawerDescription>
              {totalItemCount > 0 ? `${totalItemCount}개의 상품` : '장바구니가 비어있습니다'}
            </DrawerDescription>
          </DrawerHeader>

          {/* 장바구니 항목 리스트 */}
          <ScrollArea className="flex-1 px-6">
            <CartContent />
          </ScrollArea>

          {/* 합계 및 결제 버튼 */}
          <div className="px-6 py-4 border-t bg-background">
            <CartSummary cart={cart} serviceItems={serviceItems} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // 데스크톱: Sheet (우측에서 슬라이드)
  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {/* 헤더 */}
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>장바구니</SheetTitle>
          <SheetDescription>
            {totalItemCount > 0 ? `${totalItemCount}개의 상품` : '장바구니가 비어있습니다'}
          </SheetDescription>
        </SheetHeader>

        {/* 장바구니 항목 리스트 */}
        <ScrollArea className="flex-1 px-6">
          <CartContent />
        </ScrollArea>

        {/* 합계 및 결제 버튼 */}
        <div className="px-6 py-4 border-t bg-background">
          <CartSummary cart={cart} serviceItems={serviceItems} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
