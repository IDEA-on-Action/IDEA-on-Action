import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { CartWithItems } from '@/types/database'
import type { ServiceItem } from '@/stores/cartStore'

interface OrderSummaryProps {
    cart: CartWithItems | null | undefined
    serviceItems: ServiceItem[]
    subtotal: number
    tax: number
    total: number
    isCreatingOrder: boolean
    isAllAgreed: boolean
    onSubmit: () => void
}

export function OrderSummary({
    cart,
    serviceItems,
    subtotal,
    tax,
    total,
    isCreatingOrder,
    isAllAgreed,
    onSubmit,
}: OrderSummaryProps) {
    return (
        <Card>
            <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">주문 요약</h3>

                {/* 장바구니 아이템 */}
                {cart?.items && cart.items.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                            일반 서비스
                        </h4>
                        {cart.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="flex-1 truncate">
                                    {item.service?.title}
                                    {item.package_name && (
                                        <span className="text-muted-foreground"> - {item.package_name}</span>
                                    )}{' '}
                                    x {item.quantity}
                                </span>
                                <span className="font-medium">
                                    ₩{(item.price * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                        <Separator />
                    </div>
                )}

                {/* 서비스 아이템 (구독 등) */}
                {serviceItems.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                            서비스 패키지/플랜
                        </h4>
                        {serviceItems.map((item) => (
                            <div key={item.item_id} className="flex justify-between text-sm">
                                <span className="flex-1 truncate">
                                    {item.item_name}
                                    {item.billing_cycle && (
                                        <span className="text-muted-foreground">
                                            {' '}
                                            - {item.billing_cycle === 'monthly' ? '월간' : item.billing_cycle === 'quarterly' ? '분기' : '연간'}
                                        </span>
                                    )}
                                    {item.quantity > 1 && <span> x {item.quantity}</span>}
                                </span>
                                <span className="font-medium">
                                    ₩{(item.price * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                        <Separator />
                    </div>
                )}

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
                        <span className="text-primary">₩{total.toLocaleString()}</span>
                    </div>
                </div>

                <Button
                    className="w-full"
                    size="lg"
                    onClick={onSubmit}
                    disabled={isCreatingOrder || !isAllAgreed}
                >
                    {isCreatingOrder ? '주문 중...' : '주문하기'}
                </Button>

                {!isAllAgreed && (
                    <p className="text-xs text-destructive text-center">
                        필수 약관에 모두 동의해주세요
                    </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                    주문 버튼을 클릭하시면 주문이 완료됩니다
                </p>
            </CardContent>
        </Card>
    )
}
