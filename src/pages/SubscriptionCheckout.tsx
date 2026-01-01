/**
 * Subscription Checkout Page
 *
 * 정기결제(빌링) 체크아웃 페이지
 * 토스페이먼츠 빌링키 발급용
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SEO } from '@/components/shared/SEO'
import { useAuth } from '@/hooks/auth/useAuth'
import { useServiceDetail } from '@/hooks/useServices'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowLeft, CreditCard, Shield, Check, ExternalLink } from 'lucide-react'

// 플랜 정보 타입 정의
interface SavedPlanInfo {
  service_id: string
  service_title: string
  plan_id: string
  plan_name: string
  price: number
  billing_cycle: string
  features?: string[]
  is_popular?: boolean
}

// 정기결제 폼 스키마
const subscriptionSchema = z.object({
  // 구독자 정보
  customerName: z.string().min(2, '이름을 입력해주세요'),
  customerEmail: z.string().email('올바른 이메일을 입력해주세요'),
  customerPhone: z
    .string()
    .min(10, '올바른 전화번호를 입력해주세요')
    .regex(/^[0-9-]+$/, '숫자와 하이픈만 입력 가능합니다'),

  // 약관 동의 (필수)
  termsAgreed: z.boolean().refine((val) => val === true, {
    message: '이용약관에 동의해주세요',
  }),
  privacyAgreed: z.boolean().refine((val) => val === true, {
    message: '개인정보처리방침에 동의해주세요',
  }),
  refundAgreed: z.boolean().refine((val) => val === true, {
    message: '환불정책에 동의해주세요',
  }),
  electronicFinanceAgreed: z.boolean().refine((val) => val === true, {
    message: '전자금융거래약관에 동의해주세요',
  }),
  recurringPaymentAgreed: z.boolean().refine((val) => val === true, {
    message: '정기결제 이용 약관에 동의해주세요',
  }),
  digitalServiceWithdrawalAgreed: z.boolean().refine((val) => val === true, {
    message: '디지털 서비스 청약철회 제한에 동의해주세요',
  }),
})

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

export default function SubscriptionCheckout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('service_id')
  const planId = searchParams.get('plan_id')
  const { user } = useAuth()
  const { data: service, isLoading: isServiceLoading } = useServiceDetail(serviceId!)
  const [isProcessing, setIsProcessing] = useState(false)

  // sessionStorage에서 플랜 정보 가져오기
  const [planInfo, setPlanInfo] = useState<SavedPlanInfo | null>(null)
  useEffect(() => {
    const savedPlanInfo = sessionStorage.getItem('subscription_plan_info')
    if (savedPlanInfo) {
      setPlanInfo(JSON.parse(savedPlanInfo))
    }
  }, [])

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      customerName: user?.user_metadata?.full_name || '',
      customerEmail: user?.email || '',
      customerPhone: user?.user_metadata?.phone || '',
      termsAgreed: false,
      privacyAgreed: false,
      refundAgreed: false,
      electronicFinanceAgreed: false,
      recurringPaymentAgreed: false,
      digitalServiceWithdrawalAgreed: false,
    },
  })

  // 전체 동의 핸들러
  const handleAllAgree = (checked: boolean) => {
    form.setValue('termsAgreed', checked)
    form.setValue('privacyAgreed', checked)
    form.setValue('refundAgreed', checked)
    form.setValue('electronicFinanceAgreed', checked)
    form.setValue('recurringPaymentAgreed', checked)
    form.setValue('digitalServiceWithdrawalAgreed', checked)
  }

  // 전체 동의 상태 확인
  const isAllAgreed =
    form.watch('termsAgreed') &&
    form.watch('privacyAgreed') &&
    form.watch('refundAgreed') &&
    form.watch('electronicFinanceAgreed') &&
    form.watch('digitalServiceWithdrawalAgreed') &&
    form.watch('recurringPaymentAgreed')

  // 구독 시작 핸들러 (토스페이먼츠 빌링키 발급)
  const onSubmit = async (data: SubscriptionFormValues) => {
    if (!service || !planInfo) return

    setIsProcessing(true)

    try {
      // 고객 정보를 sessionStorage에 저장 (결제 페이지에서 사용)
      sessionStorage.setItem(
        'subscription_customer_info',
        JSON.stringify({
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
        })
      )

      // 토스페이먼츠 빌링키 발급 페이지로 이동 (plan_id 포함)
      navigate(`/subscription/payment?service_id=${service.id}&plan_id=${planInfo.plan_id}`)
    } catch (error) {
      console.error('구독 시작 실패:', error)
      alert('구독 시작에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 서비스 없음
  if (!isServiceLoading && !service) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <SEO
          title="정기결제"
          description="IDEA on Action 정기결제 서비스에 가입하세요."
          noIndex
        />
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>서비스를 찾을 수 없습니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/services')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            서비스 보러가기
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <SEO
        title={`정기결제 - ${service?.title || '서비스'}`}
        description={`${service?.title || '서비스'} 정기결제에 가입하세요. 14일 무료 체험 후 자동 결제가 시작됩니다.`}
        noIndex
      />

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              뒤로가기
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 구독 정보 폼 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 구독 혜택 안내 */}
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>정기결제 서비스</CardTitle>
                  </div>
                  <CardDescription>
                    14일 무료 체험 후 {planInfo?.billing_cycle === 'monthly' ? '월' : planInfo?.billing_cycle === 'quarterly' ? '분기' : '연'} ₩{planInfo?.price?.toLocaleString()}이 자동으로 결제됩니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>14일 무료 체험 - 언제든 해지 가능</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{planInfo?.billing_cycle === 'monthly' ? '월' : planInfo?.billing_cycle === 'quarterly' ? '분기' : '연'} 단위 자동 결제</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>해지 후 환불 보장 (7일 이내)</span>
                  </div>
                </CardContent>
              </Card>

              {/* 구독자 정보 입력 */}
              <Card>
                <CardHeader>
                  <CardTitle>구독자 정보</CardTitle>
                  <CardDescription>정기결제를 위한 정보를 입력해주세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이름</FormLabel>
                            <FormControl>
                              <Input placeholder="홍길동" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <Input placeholder="hong@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>연락처</FormLabel>
                            <FormControl>
                              <Input placeholder="010-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator className="my-6" />

                      {/* 약관 동의 */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">약관 동의</h3>

                        {/* 전체 동의 */}
                        <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                          <Checkbox
                            id="allAgree"
                            checked={isAllAgreed}
                            onCheckedChange={handleAllAgree}
                          />
                          <label
                            htmlFor="allAgree"
                            className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            전체 동의
                          </label>
                        </div>

                        {/* 개별 약관 동의 */}
                        <div className="space-y-3 pl-2">
                          <FormField
                            control={form.control}
                            name="termsAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 이용약관 동의
                                    <a
                                      href="/terms"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      보기
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </FormLabel>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="privacyAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 개인정보처리방침 동의
                                    <a
                                      href="/privacy"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      보기
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </FormLabel>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="refundAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 환불정책 동의
                                    <a
                                      href="/refund-policy"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      보기
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </FormLabel>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="electronicFinanceAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 전자금융거래약관 동의
                                    <a
                                      href="/electronic-finance-terms"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      보기
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </FormLabel>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="recurringPaymentAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 정기결제 이용 약관 동의
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    매월 동일한 금액이 자동으로 결제되며, 언제든 해지할 수 있습니다.
                                  </p>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="digitalServiceWithdrawalAgreed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    [필수] 디지털 서비스 청약철회 제한 동의
                                    <a
                                      href="/refund-policy#digital-services"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      보기
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    디지털 콘텐츠는 다운로드/실행 시점부터 청약철회가 제한됩니다. 무료 체험판을 먼저 이용하시기 바랍니다.
                                  </p>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* 구독 요약 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    구독 요약
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 서비스 정보 */}
                  <div className="space-y-2">
                    <div className="font-semibold">{service?.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {planInfo?.plan_name}
                      {planInfo?.is_popular && (
                        <Badge variant="default" className="ml-2">인기</Badge>
                      )}
                    </div>
                    {service?.category && (
                      <Badge variant="secondary">{service.category.name}</Badge>
                    )}
                  </div>

                  <Separator />

                  {/* 가격 정보 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">무료 체험</span>
                      <span className="line-through">₩{planInfo?.price?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">체험 기간</span>
                      <span>14일</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>이후 {planInfo?.billing_cycle === 'monthly' ? '월' : planInfo?.billing_cycle === 'quarterly' ? '분기' : '연'} 구독</span>
                      <span className="text-primary">₩{planInfo?.price?.toLocaleString()}/{planInfo?.billing_cycle === 'monthly' ? '월' : planInfo?.billing_cycle === 'quarterly' ? '분기' : '년'}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isProcessing || !isAllAgreed}
                  >
                    {isProcessing ? '처리 중...' : '카드 등록 및 구독 시작'}
                  </Button>

                  {!isAllAgreed && (
                    <p className="text-xs text-destructive text-center">
                      필수 약관에 모두 동의해주세요
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    14일 무료 체험 후 자동으로 결제가 시작됩니다
                  </p>
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
