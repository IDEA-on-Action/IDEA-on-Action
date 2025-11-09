/**
 * Payment Page
 *
 * 결제 수단 선택 및 결제 진행 페이지
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector'
import { usePayment } from '@/hooks/usePayment'
import { supabase } from '@/integrations/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { PaymentProvider } from '@/lib/payments/types'
import { devError } from '@/lib/errors'

interface OrderInfo {
  id: string
  orderNumber: string
  totalAmount: number
  itemName: string
}

export default function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { initiateKakaoPay, initiateTossPay, isProcessing } = usePayment()

  // 주문 정보 조회
  useEffect(() => {
    if (!orderId) {
      setError('주문 정보가 없습니다.')
      setIsLoading(false)
      return
    }

    const fetchOrderInfo = async () => {
      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, order_items(service_title)')
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError
        if (!order) throw new Error('주문을 찾을 수 없습니다.')

        // 첫 번째 아이템 이름 (+ N개 형식)
        const firstItem = order.order_items?.[0]?.service_title || '상품'
        const itemCount = order.order_items?.length || 0
        const itemName = itemCount > 1 ? `${firstItem} 외 ${itemCount - 1}개` : firstItem

        setOrderInfo({
          id: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
          itemName,
        })
      } catch (err) {
        devError(err, { operation: '주문 정보 조회', service: 'Payment' })
        setError(err instanceof Error ? err.message : '주문 정보 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderInfo()
  }, [orderId])

  // 결제 수단 선택 핸들러
  const handleSelectPaymentMethod = async (provider: PaymentProvider) => {
    if (!orderInfo) return

    try {
      if (provider === 'kakao') {
        await initiateKakaoPay(
          orderInfo.id,
          orderInfo.orderNumber,
          orderInfo.totalAmount,
          orderInfo.itemName
        )
      } else if (provider === 'toss') {
        await initiateTossPay(
          orderInfo.id,
          orderInfo.orderNumber,
          orderInfo.totalAmount,
          orderInfo.itemName
        )
      }
    } catch (err) {
      devError(err, { operation: '결제 시작', service: 'Payment' })
      setError(err instanceof Error ? err.message : '결제 시작 실패')
    }
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">주문 정보를 불러오는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // 에러 발생
  if (error || !orderInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Helmet>
          <title>결제 - IDEA on Action</title>
        </Helmet>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || '주문 정보를 불러올 수 없습니다.'}</AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>결제 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">결제하기</h1>
            <p className="text-muted-foreground">
              주문번호: <span className="font-mono">{orderInfo.orderNumber}</span>
            </p>
          </div>

          <PaymentMethodSelector
            amount={orderInfo.totalAmount}
            onSelectMethod={handleSelectPaymentMethod}
            isProcessing={isProcessing}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}
