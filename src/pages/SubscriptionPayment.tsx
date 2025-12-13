/**
 * Subscription Payment Page
 *
 * 토스페이먼츠 빌링키 발급 페이지
 * Payment Widget을 사용하여 카드 등록
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { loadTossPayments, type TossPaymentsInstance } from '@tosspayments/payment-sdk'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { useServiceDetail } from '@/hooks/useServices'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowLeft, Shield, Info } from 'lucide-react'

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
const TOSS_CUSTOMER_KEY = 'CUSTOMER_KEY_FOR_BILLING' // 실제로는 사용자 ID 기반

export default function SubscriptionPayment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('service_id')
  const planId = searchParams.get('plan_id')
  const { user } = useAuth()
  const { data: service } = useServiceDetail(serviceId!)

  const tossPaymentsRef = useRef<TossPaymentsInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Toss Payments SDK 초기화
  useEffect(() => {
    const initializeTossPayments = async () => {
      try {
        // Toss Payments SDK 로드
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
        tossPaymentsRef.current = tossPayments

        setIsLoading(false)
      } catch (error) {
        console.error('Toss Payments SDK 초기화 실패:', error)
        alert('토스페이먼츠 SDK 로드 실패. 프로덕션 환경에서 다시 시도해주세요.')
        setIsLoading(false)
      }
    }

    initializeTossPayments()
  }, [])

  // 구독 시작 (빌링키 발급)
  const handleSubscribe = async () => {
    if (!tossPaymentsRef.current || !service || !user) {
      alert('Toss Payments SDK가 초기화되지 않았습니다. 페이지를 새로고침하거나 프로덕션 환경에서 시도해주세요.')
      return
    }

    try {
      // sessionStorage에서 고객 정보 가져오기
      const customerInfoStr = sessionStorage.getItem('subscription_customer_info')
      const customerInfo = customerInfoStr ? JSON.parse(customerInfoStr) : null

      // 고객 정보 또는 로그인 정보 사용
      const customerEmail = customerInfo?.customerEmail || user?.email || ''
      const customerName = customerInfo?.customerName || user?.user_metadata?.full_name || '구독자'

      // 토스페이먼츠 빌링키 발급 (정기결제용)
      // requestBillingAuth(): 카드 정보만 등록하고 빌링키 발급 (첫 결제 X)
      // plan_id를 successUrl에 포함 (SubscriptionSuccess에서 구독 생성 시 필요)
      const planIdParam = planId ? `&plan_id=${planId}` : ''

      await tossPaymentsRef.current.requestBillingAuth('카드', {
        customerKey: user.id, // 사용자 고유 ID (Supabase UID)
        successUrl: `${window.location.origin}/subscription/success?service_id=${service.id}${planIdParam}`,
        failUrl: `${window.location.origin}/subscription/fail?service_id=${service.id}${planIdParam}`,
        customerEmail,
        customerName,
      })
    } catch (error) {
      console.error('구독 시작 실패:', error)
      alert('구독 시작에 실패했습니다. 프로덕션 환경에서 다시 시도해주세요.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>로그인이 필요합니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/login')} className="mt-4">
            로그인하기
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>카드 등록 - {service?.title || 'IDEA on Action'}</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              뒤로가기
            </Button>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* 안내 메시지 */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">안전한 카드 등록</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p>14일 무료 체험 동안 카드에서 출금되지 않습니다</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p>무료 체험 기간 내 언제든 해지 가능합니다</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p>카드 정보는 토스페이먼츠가 안전하게 보관합니다</p>
                </div>
              </CardContent>
            </Card>

            {/* 구독 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>{service?.title}</CardTitle>
                <CardDescription>
                  14일 무료 체험 후 월 ₩{service?.price.toLocaleString()}이 자동으로 결제됩니다
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 토스페이먼츠 Payment Widget */}
            <Card>
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
                <CardDescription>정기결제용 카드를 등록해주세요</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <>
                    {/* 안내 메시지 */}
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        다음 단계에서 토스페이먼츠 안전한 카드 등록 창이 열립니다.
                        <br />
                        카드 정보를 입력하시면 14일 무료 체험이 시작됩니다.
                      </p>
                    </div>

                    {/* 구독 시작 버튼 */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSubscribe}
                    >
                      카드 등록하고 14일 무료 체험 시작
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      구독 시작 버튼을 클릭하시면 토스페이먼츠 결제창으로 이동하여 카드 정보를 안전하게 등록할 수 있습니다
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 하단 정보 */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                <div className="space-y-1 text-center">
                  <p><strong>생각과 행동 (IDEA on Action)</strong> | 대표자: 서민원</p>
                  <p>사업자등록번호: 537-05-01511 | 신고번호: 2025-경기시흥-2094</p>
                  <p>주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호</p>
                  <p>이메일: sinclair.seo@ideaonaction.ai | 전화: 010-4904-2671</p>
                  <p className="mt-2">유선전화번호: 010-4904-2671</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
