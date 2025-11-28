/**
 * PaymentComplete Page
 *
 * 결제 완료/실패 처리 페이지
 * - 결제 승인 처리
 * - 결과 표시
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useApprovePayment, usePaymentStatus, getProviderLabel } from '@/hooks/usePayments'
import type { PaymentProvider } from '@/services/paymentService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, Package } from 'lucide-react'

type PageState = 'processing' | 'success' | 'failed'

export default function PaymentComplete() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const provider = searchParams.get('provider') as PaymentProvider | null
  const pgToken = searchParams.get('pg_token') // 카카오페이
  const paymentKey = searchParams.get('paymentKey') // 토스페이먼츠

  const approvePayment = useApprovePayment()
  const { data: payment } = usePaymentStatus(paymentId)

  const [pageState, setPageState] = useState<PageState>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 결제 승인 처리
  useEffect(() => {
    if (!paymentId || !provider) {
      setPageState('failed')
      setErrorMessage('결제 정보가 올바르지 않습니다.')
      return
    }

    // 이미 처리된 결제면 상태에 따라 표시
    if (payment) {
      if (payment.status === 'completed') {
        setPageState('success')
        return
      } else if (payment.status === 'failed') {
        setPageState('failed')
        return
      }
    }

    // 결제 승인 요청
    const approve = async () => {
      try {
        await approvePayment.mutateAsync({
          paymentId,
          provider,
          pgToken: pgToken || undefined,
          paymentKey: paymentKey || undefined,
        })
        setPageState('success')
      } catch (error) {
        console.error('Payment approval failed:', error)
        setPageState('failed')
        setErrorMessage(
          error instanceof Error ? error.message : '결제 승인에 실패했습니다.'
        )
      }
    }

    if (pageState === 'processing' && !approvePayment.isPending) {
      approve()
    }
  }, [paymentId, provider, pgToken, paymentKey, payment, pageState, approvePayment])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)

  // 처리 중
  if (pageState === 'processing') {
    return (
      <>
        <Helmet>
          <title>결제 처리 중 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
            <Card className="max-w-md w-full glass-card">
              <CardHeader className="text-center">
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <CardTitle>결제 처리 중...</CardTitle>
                <CardDescription>잠시만 기다려주세요.</CardDescription>
              </CardHeader>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  // 실패
  if (pageState === 'failed') {
    return (
      <>
        <Helmet>
          <title>결제 실패 | VIBE WORKING</title>
        </Helmet>

        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
            <Card className="max-w-md w-full glass-card">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-destructive">결제에 실패했습니다</CardTitle>
                <CardDescription>
                  {errorMessage || '결제 처리 중 문제가 발생했습니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (payment?.order_id) {
                      navigate(`/payment?orderId=${payment.order_id}`)
                    } else {
                      navigate('/orders')
                    }
                  }}
                >
                  다시 시도하기
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/orders')}
                >
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

  // 성공
  return (
    <>
      <Helmet>
        <title>결제 완료 | VIBE WORKING</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="max-w-md w-full glass-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>결제가 완료되었습니다!</CardTitle>
              <CardDescription>
                {provider && `${getProviderLabel(provider)}로 결제되었습니다.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 결제 정보 */}
              {payment && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">결제 금액</span>
                    <span className="font-medium">{formatPrice(payment.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">결제 수단</span>
                    <span>{payment.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">거래 번호</span>
                    <span className="font-mono text-xs">
                      {payment.provider_transaction_id?.slice(0, 20)}
                    </span>
                  </div>
                </div>
              )}

              {/* 안내 메시지 */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">서비스 이용 안내</p>
                  <p className="text-muted-foreground">
                    담당자가 확인 후 연락드리겠습니다.
                    문의사항은 주문 내역에서 확인하실 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 버튼 */}
              <div className="space-y-3">
                <Button className="w-full" onClick={() => navigate('/orders')}>
                  주문 내역 확인
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/services')}
                >
                  서비스 더 둘러보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  )
}
