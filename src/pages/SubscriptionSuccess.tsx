/**
 * Subscription Success Page
 *
 * 토스페이먼츠 빌링키 발급 성공 페이지
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ArrowRight, Calendar, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // URL 파라미터
  const serviceId = searchParams.get('service_id')
  const customerKey = searchParams.get('customerKey')
  const authKey = searchParams.get('authKey') // 빌링키

  const [planInfo, setPlanInfo] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // sessionStorage에서 플랜 정보 가져오기
    const savedPlanInfo = sessionStorage.getItem('subscription_plan_info')
    if (savedPlanInfo) {
      setPlanInfo(JSON.parse(savedPlanInfo))
    }
  }, [])

  // 빌링키 발급 성공 확인
  const isSuccess = authKey && authKey.startsWith('bln_')

  // 빌링키 저장 및 구독 생성
  useEffect(() => {
    const saveBillingKeyAndCreateSubscription = async () => {
      // 필수 조건 확인
      if (!authKey || !customerKey || !serviceId || !user || !planInfo) {
        return
      }

      // 이미 처리 중이거나 완료된 경우 스킵
      if (isProcessing || error) {
        return
      }

      setIsProcessing(true)
      setError(null)

      try {
        // 1. 빌링키 저장
        const { data: billingKey, error: billingKeyError } = await supabase
          .from('billing_keys')
          .insert({
            user_id: user.id,
            billing_key: authKey,
            customer_key: customerKey,
            is_active: true,
          })
          .select()
          .single()

        if (billingKeyError) {
          throw new Error(`빌링키 저장 실패: ${billingKeyError.message}`)
        }

        // 2. 구독 생성 (14일 무료 체험)
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 14) // 14일 후

        const currentPeriodEnd = new Date(trialEndDate)
        // 결제 주기에 따라 current_period_end 계산
        if (planInfo.billing_cycle === 'monthly') {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
        } else if (planInfo.billing_cycle === 'quarterly') {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3)
        } else if (planInfo.billing_cycle === 'yearly') {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
        }

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            service_id: serviceId,
            plan_id: planInfo.plan_id,
            billing_key_id: billingKey.id,
            status: 'trial',
            trial_end_date: trialEndDate.toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            next_billing_date: trialEndDate.toISOString(), // 14일 후 첫 결제
            cancel_at_period_end: false,
          })

        if (subscriptionError) {
          throw new Error(`구독 생성 실패: ${subscriptionError.message}`)
        }

        // 3. sessionStorage 정리
        sessionStorage.removeItem('subscription_plan_info')

        console.log('✅ 빌링키 저장 및 구독 생성 완료')
      } catch (err) {
        console.error('구독 생성 중 에러:', err)
        setError(err instanceof Error ? err.message : '구독 생성에 실패했습니다.')
      } finally {
        setIsProcessing(false)
      }
    }

    saveBillingKeyAndCreateSubscription()
  }, [authKey, customerKey, serviceId, user, planInfo, isProcessing, error])

  return (
    <>
      <Helmet>
        <title>구독 완료 - IDEA on Action</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-16 flex items-center justify-center">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              </div>
              <CardTitle className="text-3xl mb-2">
                구독이 완료되었습니다! 🎉
              </CardTitle>
              <CardDescription className="text-lg">
                카드가 안전하게 등록되었으며, 14일 무료 체험이 시작되었습니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 로딩 상태 */}
              {isProcessing && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    구독을 생성하는 중입니다. 잠시만 기다려주세요...
                  </AlertDescription>
                </Alert>
              )}

              {/* 에러 상태 */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 구독 정보 */}
              {planInfo && (
                <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-lg">구독 정보</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">서비스</span>
                      <span className="font-medium">{planInfo.service_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">플랜</span>
                      <span className="font-medium">{planInfo.plan_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">구독 주기</span>
                      <span className="font-medium">
                        {planInfo.billing_cycle === 'monthly'
                          ? '월간'
                          : planInfo.billing_cycle === 'quarterly'
                          ? '분기'
                          : '연간'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">가격</span>
                      <span className="font-medium">₩{planInfo.price?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 안내 사항 */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">14일 무료 체험</p>
                    <p className="text-sm text-muted-foreground">
                      14일 동안 무료로 서비스를 이용하실 수 있습니다.
                      체험 기간 내 언제든 해지 가능하며, 해지 시 결제되지 않습니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">자동 결제 안내</p>
                    <p className="text-sm text-muted-foreground">
                      14일 후부터 등록하신 카드로 자동 결제됩니다.
                      구독 관리 페이지에서 언제든 해지하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-4 pt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/orders')}
                >
                  주문 내역 보기
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/services')}
                >
                  서비스 둘러보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* 디버그 정보 (개발 환경에서만) */}
              {import.meta.env.DEV && authKey && (
                <div className="mt-6 p-4 bg-muted rounded text-xs text-muted-foreground">
                  <p className="font-mono">authKey: {authKey}</p>
                  <p className="font-mono">customerKey: {customerKey}</p>
                  <p className="font-mono">serviceId: {serviceId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  )
}
