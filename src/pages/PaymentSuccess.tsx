/**
 * PaymentSuccess Page
 *
 * 결제 성공 페이지 (Kakao Pay / Toss Payments 공통)
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PaymentStatus } from '@/components/payment/PaymentStatus'
import { usePayment } from '@/hooks/payments/usePayment'
import { ordersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { devError } from '@/lib/errors'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { workersTokens } = useAuth()

  // URL 파라미터
  const orderId = searchParams.get('order_id')
  const pgToken = searchParams.get('pg_token') // Kakao Pay
  const paymentKey = searchParams.get('paymentKey') // Toss Payments
  const amount = searchParams.get('amount') // Toss Payments

  const [isProcessing, setIsProcessing] = useState(true)
  const [orderInfo, setOrderInfo] = useState<{
    orderNumber: string
    amount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { approveKakaoPay, confirmTossPay } = usePayment()

  // 중복 실행 방지 (React Strict Mode 대응)
  const hasProcessed = useRef(false)

  // 결제 승인 처리
  useEffect(() => {
    // 이미 처리했거나 처리 중이면 스킵
    if (hasProcessed.current) return

    if (!orderId) {
      setError('주문 정보가 없습니다.')
      setIsProcessing(false)
      return
    }

    const processPayment = async () => {
      // 처리 시작 마킹 (중복 방지)
      hasProcessed.current = true

      try {
        // 1. 주문 정보 조회 (Workers API)
        const { data: order, error: orderError } = await ordersApi.getById(workersTokens?.accessToken || '', orderId)

        if (orderError || !order) throw new Error('주문 정보를 찾을 수 없습니다.')
        const orderData = order as { order_number: string; total_amount: number }

        setOrderInfo({
          orderNumber: orderData.order_number,
          amount: orderData.total_amount,
        })

        // 2. 결제 승인
        if (pgToken) {
          // Kakao Pay 승인
          const tid = sessionStorage.getItem(`kakao_pay_tid_${orderId}`)
          if (!tid) throw new Error('결제 정보가 없습니다.')

          await approveKakaoPay(orderId, tid, pgToken)
        } else if (paymentKey && amount) {
          // Toss Payments 승인
          await confirmTossPay(orderId, paymentKey, parseInt(amount))
        } else {
          throw new Error('결제 정보가 올바르지 않습니다.')
        }

        setIsProcessing(false)
      } catch (err) {
        devError(err, { operation: '결제 승인', service: 'Payment' })
        setError(err instanceof Error ? err.message : '결제 승인 실패')
        setIsProcessing(false)
      }
    }

    processPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 빈 의존성 배열: 마운트 시 1회만 실행

  // 주문 내역 페이지로 이동
  const handleGoToOrders = () => {
    navigate('/orders')
  }

  // 처리 중
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Helmet>
          <title>결제 처리 중 - IDEA on Action</title>
        </Helmet>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 pt-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-xl font-semibold mb-2">결제를 처리하고 있습니다</p>
            <p className="text-muted-foreground">잠시만 기다려주세요...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{error ? '결제 실패' : '결제 완료'} - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 pt-20">
          <PaymentStatus
            status={error ? 'failed' : 'success'}
            orderId={orderId || undefined}
            orderNumber={orderInfo?.orderNumber}
            amount={orderInfo?.amount}
            message={error || undefined}
            onGoToOrders={handleGoToOrders}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}
