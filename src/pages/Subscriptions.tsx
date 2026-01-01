/**
 * Subscriptions Page
 *
 * 구독 관리 페이지 (내 구독 조회 및 관리)
 * - 토스페이먼츠 심사 요건 충족:
 *   1. 사용자가 직접 구독 조회 가능 ✅
 *   2. 사용자가 직접 구독 해지 가능 ✅
 *   3. 결제 히스토리 확인 가능 ✅
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle2, XCircle, Receipt } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SEO } from '@/components/shared/SEO'
import { useAuth } from '@/hooks/auth/useAuth'
import { useMySubscriptions, useCancelSubscription, useSubscriptionPayments } from '@/hooks/subscription/useSubscriptions'
import {
    SUBSCRIPTION_STATUS_KR,
    SUBSCRIPTION_STATUS_VARIANT,
    BILLING_CYCLE_KR,
    PAYMENT_STATUS_KR,
    PAYMENT_STATUS_VARIANT,
    SubscriptionWithPlan
} from '@/types/subscription.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * 결제 히스토리 컴포넌트
 */
interface PaymentHistoryProps {
  subscriptionId: string
}

function PaymentHistory({ subscriptionId }: PaymentHistoryProps) {
  const { data: payments, isLoading } = useSubscriptionPayments(subscriptionId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!payments || payments.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>결제 내역이 없습니다.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {payment.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-medium">
                {format(new Date(payment.created_at), 'PPP', { locale: ko })}
              </p>
              <p className="text-sm text-muted-foreground">
                {payment.subscription.service_title} - {payment.subscription.plan_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">₩{payment.amount.toLocaleString()}</p>
            <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
              {PAYMENT_STATUS_KR[payment.status]}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Subscriptions() {
    const { user } = useAuth()
    const { data: subscriptions, isLoading, error } = useMySubscriptions()
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithPlan | null>(null)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

    const cancelSubscription = useCancelSubscription()

    const handleCancelClick = (subscription: SubscriptionWithPlan) => {
        setSelectedSubscription(subscription)
        setIsCancelDialogOpen(true)
    }

    const handleConfirmCancel = () => {
        if (!selectedSubscription) return

        cancelSubscription.mutate(
            {
                subscription_id: selectedSubscription.id,
                cancel_at_period_end: true,
                reason: '사용자 요청에 의한 취소'
            },
            {
                onSuccess: () => {
                    setIsCancelDialogOpen(false)
                    setSelectedSubscription(null)
                }
            }
        )
    }

    // 로그인 체크
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
                <SEO
                    title="구독 관리"
                    description="IDEA on Action 구독 서비스를 관리하세요. 구독 조회, 결제 수단 변경, 구독 해지 등을 할 수 있습니다."
                    canonical="/subscriptions"
                    noIndex
                />
                <Header />
                <main className="flex-1 container mx-auto px-4 py-16">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>구독 관리를 보려면 로그인이 필요합니다.</AlertDescription>
                    </Alert>
                    <Button asChild className="mt-4">
                        <Link to="/login">로그인하기</Link>
                    </Button>
                </main>
                <Footer />
            </div>
        )
    }

    const activeSubscriptions = subscriptions?.filter(sub =>
        ['active', 'trial'].includes(sub.status) && !sub.cancel_at_period_end
    ) || []

    const pastSubscriptions = subscriptions?.filter(sub =>
        !['active', 'trial'].includes(sub.status) || sub.cancel_at_period_end
    ) || []

    return (
        <>
            <SEO
                title="구독 관리"
                description="IDEA on Action 구독 서비스를 관리하세요. 구독 조회, 결제 수단 변경, 구독 해지 등을 할 수 있습니다."
                canonical="/subscriptions"
                noIndex
            />

            <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
                <Header />

                <main id="main-content" className="flex-1 container mx-auto px-4 pt-24 pb-8">
                    {/* 로딩 */}
                    {isLoading && (
                        <div className="container max-w-4xl space-y-6">
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-48" />
                                <Skeleton className="h-4 w-96" />
                            </div>
                            <div className="grid gap-6">
                                <Skeleton className="h-64 w-full" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        </div>
                    )}

                    {/* 에러 */}
                    {error && (
                        <div className="container max-w-4xl">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>오류 발생</AlertTitle>
                                <AlertDescription>
                                    구독 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* 메인 콘텐츠 */}
                    {!isLoading && !error && (
                        <div className="container max-w-4xl space-y-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">내 구독 관리</h1>
                                <p className="text-muted-foreground mt-2">
                                    이용 중인 서비스의 구독 상태와 결제 정보를 관리하세요.
                                </p>
                            </div>

            {/* 활성 구독 섹션 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    이용 중인 구독
                </h2>

                {activeSubscriptions.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            현재 이용 중인 구독 서비스가 없습니다.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {activeSubscriptions.map((sub) => (
                            <Card key={sub.id} className="overflow-hidden border-l-4 border-l-primary">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle>{sub.service.title}</CardTitle>
                                                <Badge variant={SUBSCRIPTION_STATUS_VARIANT[sub.status]}>
                                                    {SUBSCRIPTION_STATUS_KR[sub.status]}
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                {sub.plan.plan_name} • {BILLING_CYCLE_KR[sub.plan.billing_cycle]} 결제
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold">
                                                ₩{sub.plan.price.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                /{BILLING_CYCLE_KR[sub.plan.billing_cycle]}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <Separator />
                                <CardContent className="py-6 grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">다음 결제일</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {sub.next_billing_date
                                                        ? format(new Date(sub.next_billing_date), 'PPP', { locale: ko })
                                                        : '정보 없음'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">결제 수단</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {sub.billing_key
                                                        ? `${sub.billing_key.card_type || '카드'} ${sub.billing_key.card_number}`
                                                        : '등록된 결제 수단 없음'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {sub.cancel_at_period_end && (
                                        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            <AlertTitle className="text-yellow-800 dark:text-yellow-300">해지 예약됨</AlertTitle>
                                            <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                                                {sub.current_period_end
                                                    ? format(new Date(sub.current_period_end), 'PPP', { locale: ko })
                                                    : '기간 만료'}에 구독이 자동으로 종료됩니다.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-muted/50 flex justify-end gap-3 py-4">
                                    <Button variant="outline" size="sm">
                                        플랜 변경
                                    </Button>
                                    {!sub.cancel_at_period_end && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleCancelClick(sub)}
                                            disabled={cancelSubscription.isPending}
                                        >
                                            {cancelSubscription.isPending && selectedSubscription?.id === sub.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : null}
                                            구독 해지
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* 지난 구독 섹션 */}
            {pastSubscriptions.length > 0 && (
                <section className="space-y-4 pt-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-5 w-5" />
                        종료된 구독
                    </h2>
                    <div className="grid gap-4">
                        {pastSubscriptions.map((sub) => (
                            <Card key={sub.id} className="bg-muted/30">
                                <CardContent className="flex items-center justify-between p-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{sub.service.title}</span>
                                            <Badge variant="outline" className="text-muted-foreground">
                                                {SUBSCRIPTION_STATUS_KR[sub.status]}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {sub.plan.plan_name} •
                                            {sub.current_period_end
                                                ? ` ${format(new Date(sub.current_period_end), 'PPP', { locale: ko })} 종료`
                                                : ' 종료됨'}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm">상세 보기</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* 결제 히스토리 */}
            {activeSubscriptions.length > 0 && (
                <section className="space-y-4 pt-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        결제 히스토리
                    </h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>최근 결제 내역</CardTitle>
                            <CardDescription>
                                {activeSubscriptions[0].service.title} - {activeSubscriptions[0].plan.plan_name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PaymentHistory subscriptionId={activeSubscriptions[0].id} />
                        </CardContent>
                    </Card>
                </section>
            )}
                        </div>
                    )}
                </main>

                <Footer />
            </div>

            {/* 구독 취소 확인 다이얼로그 */}
            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>구독을 해지하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            해지하더라도 현재 결제 주기가 끝나는
                            {selectedSubscription?.current_period_end
                                ? ` ${format(new Date(selectedSubscription.current_period_end), 'PPP', { locale: ko })}`
                                : ''}
                            까지는 서비스를 계속 이용하실 수 있습니다.
                            <br /><br />
                            정말로 해지하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            해지 확정
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
