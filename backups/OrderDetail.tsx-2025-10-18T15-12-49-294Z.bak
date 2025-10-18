/**
 * OrderDetail Page
 *
 * 주문 상세 페이지 (주문 추적)
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useOrderDetail, useCancelOrder } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

// 주문 상태 한글 변환
const ORDER_STATUS_KR: Record<string, string> = {
  pending: '결제 대기',
  confirmed: '주문 확인',
  processing: '처리 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소됨',
  refunded: '환불됨',
}

// 주문 상태 색상
const ORDER_STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  confirmed: 'default',
  processing: 'default',
  shipped: 'default',
  delivered: 'outline',
  cancelled: 'destructive',
  refunded: 'destructive',
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: order, isLoading, isError } = useOrderDetail(id)
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder()

  // 로그인 체크
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>주문 내역을 보려면 로그인이 필요합니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/login')} className="mt-4">
            로그인하기
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // 에러 또는 주문 없음
  if (isError || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>주문을 찾을 수 없습니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            주문 목록으로
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // 주문 취소 가능 여부
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  const handleCancelOrder = () => {
    if (confirm('정말 이 주문을 취소하시겠습니까?')) {
      cancelOrder(order.id, {
        onSuccess: () => {
          navigate('/orders')
        },
      })
    }
  }

  return (
    <>
      <Helmet>
        <title>주문 상세 - {order.order_number} - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* 뒤로가기 */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              주문 목록으로
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 주문 정보 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 주문 헤더 */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5" />
                        주문번호: {order.order_number}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                    <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="text-base">
                      {ORDER_STATUS_KR[order.status]}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* 주문 항목 */}
              <Card>
                <CardHeader>
                  <CardTitle>주문 항목</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                      {item.service?.image_url && (
                        <img
                          src={item.service.image_url}
                          alt={item.service_title}
                          className="w-24 h-24 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.service_title}</h4>
                        {item.service_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.service_description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm">
                            ₩{item.unit_price.toLocaleString()} x {item.quantity}개
                          </p>
                          <p className="font-semibold">₩{item.subtotal.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 배송 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    배송 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">받는 사람</p>
                    <p className="font-medium">{order.shipping_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">연락처</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {order.shipping_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">배송지</p>
                    <p className="font-medium">
                      [{order.shipping_address?.postcode}] {order.shipping_address?.address}{' '}
                      {order.shipping_address?.addressDetail}
                    </p>
                  </div>
                  {order.shipping_note && (
                    <div>
                      <p className="text-sm text-muted-foreground">배송 요청사항</p>
                      <p className="font-medium">{order.shipping_note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 주문자 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>주문자 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {order.contact_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">연락처</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {order.contact_phone}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 오른쪽: 주문 요약 */}
            <div className="space-y-6">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>결제 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">소계</span>
                      <span>₩{order.subtotal.toLocaleString()}</span>
                    </div>
                    {order.tax_amount !== null && order.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">부가세</span>
                        <span>₩{order.tax_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {order.discount_amount !== null && order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>할인</span>
                        <span>-₩{order.discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {order.shipping_fee !== null && order.shipping_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">배송비</span>
                        <span>₩{order.shipping_fee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-xl">
                    <span>총 결제 금액</span>
                    <span className="text-primary">₩{order.total_amount.toLocaleString()}</span>
                  </div>

                  {/* 주문 취소 버튼 */}
                  {canCancel && (
                    <>
                      <Separator />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {isCancelling ? '취소 중...' : '주문 취소'}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        결제 대기 및 주문 확인 상태에서만 취소 가능합니다
                      </p>
                    </>
                  )}

                  {order.status === 'delivered' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>배송이 완료되었습니다</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
