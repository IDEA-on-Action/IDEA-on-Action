/**
 * PaymentFail Page
 *
 * 결제 실패/취소 페이지 (Kakao Pay / Toss Payments 공통)
 */

import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PaymentStatus } from '@/components/payment/PaymentStatus'

export default function PaymentFail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const orderId = searchParams.get('order_id')
  const code = searchParams.get('code') // Toss Payments 에러 코드
  const message = searchParams.get('message') // Toss Payments 에러 메시지

  // 재시도 (결제 페이지로 이동)
  const handleRetry = () => {
    if (orderId) {
      navigate(`/checkout/payment?order_id=${orderId}`)
    } else {
      navigate('/cart')
    }
  }

  // 홈으로 이동
  const handleGoToHome = () => {
    navigate('/')
  }

  // 에러 메시지 생성
  const errorMessage = message
    ? `${message} (${code})`
    : '결제가 취소되었거나 실패했습니다.'

  return (
    <>
      <Helmet>
        <title>결제 실패 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1">
          <PaymentStatus
            status="failed"
            orderId={orderId || undefined}
            message={errorMessage}
            onRetry={handleRetry}
            onGoToHome={handleGoToHome}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}
