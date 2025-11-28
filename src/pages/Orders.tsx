/**
 * Orders Page
 *
 * 주문 내역 페이지
 * - 주문 목록 조회
 * - 주문 상세 보기
 * - 주문 취소
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useOrders, useCancelOrder, getOrderStatusLabel, getOrderStatusVariant } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingBag,
  Package,
  Calendar,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Orders() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { data: orders, isLoading, isError } = useOrders()
  const cancelOrder = useCancelOrder()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)

  const handleCancelClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedOrderId) return

    try {
      await cancelOrder.mutateAsync(selectedOrderId)
      setCancelDialogOpen(false)
      setSelectedOrderId(null)
    } catch (error) {
      console.error('Cancel order failed:', error)
    }
  }

  // 로그인 필요
  if (!authLoading && !user) {
    return (
      <>
        <Helmet>
          <title>주문 내역 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />

          <main className="flex-1 container mx-auto px-4 py-16">
            <Card className="max-w-lg mx-auto glass-card">
              <CardHeader className="text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <CardTitle>로그인이 필요합니다</CardTitle>
                <CardDescription>
                  주문 내역을 확인하려면 로그인해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() =>
                    navigate('/login', {
                      state: { from: { pathname: '/orders' } },
                    })
                  }
                >
                  로그인하기
                </Button>
              </CardContent>
            </Card>
          </main>

          <Footer />
        </div>
      </>
    )
  }

  // 로딩 중
  if (isLoading || authLoading) {
    return (
      <>
        <Helmet>
          <title>주문 내역 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />

          <main className="flex-1 container mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold mb-8">주문 내역</h1>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </main>

          <Footer />
        </div>
      </>
    )
  }

  // 에러
  if (isError) {
    return (
      <>
        <Helmet>
          <title>주문 내역 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />

          <main className="flex-1 container mx-auto px-4 py-16">
            <Card className="max-w-lg mx-auto glass-card">
              <CardHeader className="text-center">
                <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <CardTitle>오류가 발생했습니다</CardTitle>
                <CardDescription>
                  주문 내역을 불러오는 중 문제가 발생했습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          </main>

          <Footer />
        </div>
      </>
    )
  }

  // 주문 없음
  if (!orders || orders.length === 0) {
    return (
      <>
        <Helmet>
          <title>주문 내역 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />

          <main className="flex-1 container mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold mb-8">주문 내역</h1>
            <Card className="max-w-lg mx-auto glass-card">
              <CardHeader className="text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <CardTitle>주문 내역이 없습니다</CardTitle>
                <CardDescription>
                  아직 주문한 서비스가 없습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link to="/services">서비스 둘러보기</Link>
                </Button>
              </CardContent>
            </Card>
          </main>

          <Footer />
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>주문 내역 | VIBE WORKING</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold mb-8">주문 내역</h1>

          <div className="space-y-4">
            <Accordion type="single" collapsible className="space-y-4">
              {orders.map((order) => (
                <AccordionItem
                  key={order.id}
                  value={order.id}
                  className="border rounded-lg glass-card"
                >
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-left">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'yyyy년 M월 d일', {
                            locale: ko,
                          })}
                        </span>
                      </div>
                      <div className="font-medium">
                        주문번호: {order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                      <div className="font-semibold text-primary">
                        {formatPrice(order.total_amount)}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 pb-6">
                    <Separator className="mb-4" />

                    {/* 주문 아이템 */}
                    <div className="space-y-3 mb-4">
                      <h4 className="font-medium">주문 상품</h4>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {item.service?.image_url ? (
                              <img
                                src={item.service.image_url}
                                alt={item.service.title || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {item.service?.title || item.service_title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.unit_price)} x {item.quantity}
                            </p>
                          </div>
                          <div className="font-medium">
                            {formatPrice(item.subtotal)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 연락처 정보 */}
                    {order.contact_info && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">연락처 정보</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>이름: {order.contact_info.name}</p>
                          <p>이메일: {order.contact_info.email}</p>
                          <p>전화: {order.contact_info.phone}</p>
                        </div>
                      </div>
                    )}

                    {/* 요청사항 */}
                    {order.shipping_note && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">요청사항</h4>
                        <p className="text-sm text-muted-foreground">
                          {order.shipping_note}
                        </p>
                      </div>
                    )}

                    {/* 금액 상세 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">상품 금액</span>
                        <span>
                          {formatPrice(
                            order.total_amount -
                              order.tax_amount +
                              order.discount_amount
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">부가세</span>
                        <span>{formatPrice(order.tax_amount)}</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>할인</span>
                          <span>-{formatPrice(order.discount_amount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>총 결제금액</span>
                        <span className="text-primary">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* 주문 취소 버튼 (pending 상태에서만) */}
                    {order.status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-4"
                        onClick={() => handleCancelClick(order.id)}
                        disabled={cancelOrder.isPending}
                      >
                        주문 취소
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </main>

        <Footer />

        {/* 취소 확인 다이얼로그 */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>주문을 취소하시겠습니까?</DialogTitle>
              <DialogDescription>
                취소된 주문은 복구할 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
              >
                닫기
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={cancelOrder.isPending}
              >
                {cancelOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    취소 중...
                  </>
                ) : (
                  '주문 취소'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
