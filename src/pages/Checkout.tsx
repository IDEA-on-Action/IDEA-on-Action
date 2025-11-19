/**
 * Checkout Page
 *
 * 주문 생성 페이지 (장바구니 → 주문 전환)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DaumPostcode from 'react-daum-postcode'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, ArrowLeft, ShoppingBag, Search, ExternalLink } from 'lucide-react'

// 주문 폼 스키마
const checkoutSchema = z.object({
  // 배송 정보
  shippingName: z.string().min(2, '이름을 입력해주세요'),
  shippingPhone: z
    .string()
    .min(10, '올바른 전화번호를 입력해주세요')
    .regex(/^[0-9-]+$/, '숫자와 하이픈만 입력 가능합니다'),
  postcode: z.string().min(5, '우편번호를 입력해주세요'),
  address: z.string().min(5, '주소를 입력해주세요'),
  addressDetail: z.string().min(2, '상세주소를 입력해주세요'),
  shippingNote: z.string().optional(),

  // 연락처 정보
  contactEmail: z.string().email('올바른 이메일을 입력해주세요'),
  contactPhone: z
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
  digitalServiceWithdrawalAgreed: z.boolean().refine((val) => val === true, {
    message: '디지털 서비스 청약철회 제한에 동의해주세요',
  }),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: cart, isLoading: isCartLoading } = useCart()
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder()
  const { serviceItems } = useCartStore()
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingName: '',
      shippingPhone: '',
      postcode: '',
      address: '',
      addressDetail: '',
      shippingNote: '',
      contactEmail: user?.email || '',
      contactPhone: '',
      termsAgreed: false,
      privacyAgreed: false,
      refundAgreed: false,
      electronicFinanceAgreed: false,
      digitalServiceWithdrawalAgreed: false,
    },
  })

  // Daum Postcode 완료 핸들러
  interface DaumPostcodeData {
    address: string
    addressType: string
    bname: string
    buildingName: string
    zonecode: string
  }

  const handlePostcodeComplete = (data: DaumPostcodeData) => {
    let fullAddress = data.address
    let extraAddress = ''

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : ''
    }

    form.setValue('postcode', data.zonecode)
    form.setValue('address', fullAddress)
    setIsPostcodeOpen(false)

    // 상세주소 입력 필드에 포커스
    setTimeout(() => {
      const addressDetailInput = document.querySelector<HTMLInputElement>('input[name="addressDetail"]')
      addressDetailInput?.focus()
    }, 100)
  }

  // 전체 동의 핸들러
  const handleAllAgree = (checked: boolean | 'indeterminate') => {
    // Ignore indeterminate state
    if (checked === 'indeterminate') return

    form.setValue('termsAgreed', checked)
    form.setValue('privacyAgreed', checked)
    form.setValue('refundAgreed', checked)
    form.setValue('electronicFinanceAgreed', checked)
    form.setValue('digitalServiceWithdrawalAgreed', checked)
  }

  // 전체 동의 상태 확인
  const isAllAgreed =
    form.watch('termsAgreed') &&
    form.watch('privacyAgreed') &&
    form.watch('refundAgreed') &&
    form.watch('electronicFinanceAgreed') &&
    form.watch('digitalServiceWithdrawalAgreed')

  // 장바구니 금액 계산
  // Regular items subtotal
  const regularSubtotal = cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

  // Service items subtotal
  const serviceSubtotal = serviceItems.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

  // Total subtotal
  const subtotal = regularSubtotal + serviceSubtotal
  const tax = subtotal * 0.1
  const total = subtotal + tax

  const isEmpty = (!cart?.items || cart.items.length === 0) && serviceItems.length === 0

  // 주문 생성 핸들러
  const onSubmit = (data: CheckoutFormValues) => {
    if (!cart) return

    createOrder(
      {
        cartId: cart.id,
        shippingAddress: {
          postcode: data.postcode,
          address: data.address,
          addressDetail: data.addressDetail,
        },
        shippingName: data.shippingName,
        shippingPhone: data.shippingPhone,
        shippingNote: data.shippingNote,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      {
        onSuccess: (order) => {
          // 주문 생성 후 결제 페이지로 이동
          navigate(`/checkout/payment?order_id=${order.id}`)
        },
      }
    )
  }

  // 로그인 체크
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>주문하려면 로그인이 필요합니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/login')} className="mt-4">
            로그인하기
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // 장바구니 비어있음
  if (!isCartLoading && isEmpty) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Helmet>
          <title>주문하기 - IDEA on Action</title>
        </Helmet>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>장바구니가 비어있습니다.</AlertDescription>
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
      <Helmet>
        <title>주문하기 - IDEA on Action</title>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 주문 폼 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>배송 정보</CardTitle>
                  <CardDescription>상품을 받으실 정보를 입력해주세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="shippingName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>받는 사람</FormLabel>
                            <FormControl>
                              <Input placeholder="홍길동" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="shippingPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>받는 사람 연락처</FormLabel>
                            <FormControl>
                              <Input placeholder="010-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="postcode"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                              <FormLabel>우편번호</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input placeholder="12345" {...field} readOnly />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsPostcodeOpen(true)}
                                >
                                  <Search className="mr-2 h-4 w-4" />
                                  검색
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>주소</FormLabel>
                            <FormControl>
                              <Input placeholder="서울시 강남구 테헤란로 123" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressDetail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>상세주소</FormLabel>
                            <FormControl>
                              <Input placeholder="101동 202호" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="shippingNote"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>배송 요청사항</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="문 앞에 놓아주세요 (선택사항)"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>배송 시 요청사항을 입력해주세요</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator className="my-6" />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">주문자 정보</h3>

                        <FormField
                          control={form.control}
                          name="contactEmail"
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
                          name="contactPhone"
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
                      </div>

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
                                  <FormDescription className="text-xs text-muted-foreground">
                                    디지털 콘텐츠는 다운로드/실행 시점부터 청약철회가 제한됩니다. 무료 체험판을 먼저 이용하시기 바랍니다.
                                  </FormDescription>
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

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    주문 요약
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 주문 항목 */}
                  <div className="space-y-2">
                    {cart?.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1 truncate">
                          {item.service?.title}
                          {item.package_name && (
                            <span className="text-muted-foreground"> - {item.package_name}</span>
                          )}{' '}
                          x {item.quantity}
                        </span>
                        <span className="font-medium">
                          ₩{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* 금액 정보 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">소계</span>
                      <span>₩{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">부가세 (10%)</span>
                      <span>₩{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>총 금액</span>
                      <span className="text-primary">₩{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isCreatingOrder || !isAllAgreed}
                  >
                    {isCreatingOrder ? '주문 중...' : '주문하기'}
                  </Button>

                  {!isAllAgreed && (
                    <p className="text-xs text-destructive text-center">
                      필수 약관에 모두 동의해주세요
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    주문 버튼을 클릭하시면 주문이 완료됩니다
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />

        {/* 우편번호 검색 Dialog */}
        <Dialog open={isPostcodeOpen} onOpenChange={setIsPostcodeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>우편번호 검색</DialogTitle>
            </DialogHeader>
            <DaumPostcode onComplete={handlePostcodeComplete} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
