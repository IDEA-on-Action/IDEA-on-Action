/**
 * Payment Page
 *
 * 결제 처리 페이지
 * - 결제 수단 선택
 * - 결제 진행
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { useOrderDetail } from '@/hooks/useOrders'
import { usePreparePayment, getProviderLabel } from '@/hooks/usePayments'
import type { PaymentProvider } from '@/services/paymentService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard,
  Wallet,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'

// 결제 수단 목록
const PAYMENT_METHODS: { id: PaymentProvider; name: string; icon: typeof CreditCard; description: string }[] = [
  {
    id: 'kakao',
    name: '카카오페이',
    icon: Wallet,
    description: '카카오톡에서 간편하게 결제',
  },
  {
    id: 'toss',
    name: '토스페이',
    icon: Wallet,
    description: '토스 앱으로 간편 결제',
  },
  {
    id: 'stripe',
    name: '신용/체크카드',
    icon: CreditCard,
    description: 'Visa, Mastercard, 국내 카드',
  },
]

export default function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  const { user, loading: authLoading } = useAuth()
  const { data: order, isLoading: orderLoading, isError } = useOrderDetail(orderId || '')
  const preparePayment = usePreparePayment()

  const [selectedMethod, setSelectedMethod] = useState<PaymentProvider>('kakao')

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: { pathname: `/payment?orderId=${orderId}` } } })
    }
  }, [authLoading, user, navigate, orderId])

  const handlePayment = async () => {
    if (!order) return

    try {
      const itemNames = order.items.map((item) => item.service?.title || item.service_title).join(', ')

      const response = await preparePayment.mutateAsync({
        orderId: order.id,
        provider: selectedMethod,
        amount: order.total_amount,
        itemName: itemNames.length > 50 ? `${itemNames.slice(0, 47)}...` : itemNames,
        successUrl: `${window.location.origin}/payment/complete`,
        failUrl: `${window.location.origin}/payment/fail`,
        cancelUrl: `${window.location.origin}/payment?orderId=${order.id}`,
      })

      // 결제 페이지로 이동 (실제로는 결제사 페이지로 리다이렉트)
      // 현재는 Mock으로 바로 완료 페이지로 이동
      navigate(`/payment/complete?paymentId=${response.paymentId}&provider=${selectedMethod}`)
    } catch (error) {
      console.error('Payment preparation failed:', error)
    }
  }

  // 로딩 중
  if (authLoading || orderLoading) {
    return (
      <>
        <Helmet>
          <title>결제 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16">
            <Skeleton className="h-8 w-48 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Skeleton className="h-64" />
              </div>
              <Skeleton className="h-48" />
            </div>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  // 주문 없음
  if (!orderId || isError || !order) {
    return (
      <>
        <Helmet>
          <title>결제 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16">
            <Card className="max-w-lg mx-auto glass-card">
              <CardHeader className="text-center">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <CardTitle>주문 정보를 찾을 수 없습니다</CardTitle>
                <CardDescription>
                  유효하지 않은 주문이거나 이미 결제가 완료되었습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate('/orders')}>
                  주문 내역으로 이동
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
        <title>결제 | VIBE WORKING</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 결제 수단 선택 */}
            <div className="lg:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>결제 수단 선택</CardTitle>
                  <CardDescription>
                    원하시는 결제 수단을 선택해주세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedMethod}
                    onValueChange={(value) => setSelectedMethod(value as PaymentProvider)}
                    className="space-y-4"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <div key={method.id}>
                        <Label
                          htmlFor={method.id}
                          className="flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                        >
                          <RadioGroupItem value={method.id} id={method.id} />
                          <method.icon className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.description}
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* 보안 안내 */}
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">안전한 결제</p>
                      <p>모든 결제 정보는 암호화되어 안전하게 처리됩니다.</p>
                    </div>
                  </div>

                  {preparePayment.isError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        결제 준비 중 오류가 발생했습니다. 다시 시도해주세요.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    size="lg"
                    className="w-full mt-6 bg-gradient-primary"
                    onClick={handlePayment}
                    disabled={preparePayment.isPending}
                  >
                    {preparePayment.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        결제 준비 중...
                      </>
                    ) : (
                      `${getProviderLabel(selectedMethod)}로 ${formatPrice(order.total_amount)} 결제하기`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <Card className="glass-card sticky top-20">
                <CardHeader>
                  <CardTitle>주문 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 아이템 목록 */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          {item.service?.title || item.service_title} x {item.quantity}
                        </span>
                        <span>{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* 금액 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">상품 금액</span>
                      <span>
                        {formatPrice(
                          order.total_amount - order.tax_amount + order.discount_amount
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">부가세</span>
                      <span>{formatPrice(order.tax_amount)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>할인</span>
                        <span>-{formatPrice(order.discount_amount)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-semibold">
                    <span>총 결제금액</span>
                    <span className="text-primary">{formatPrice(order.total_amount)}</span>
                  </div>
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
