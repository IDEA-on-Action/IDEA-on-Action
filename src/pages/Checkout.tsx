/**
 * Checkout Page
 *
 * 결제/주문 페이지
 * - 장바구니 요약
 * - 연락처 정보 입력
 * - 주문 생성
 */

import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCartStore } from '@/stores/cartStore'
import { useCreateOrder } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ArrowLeft, ShoppingBag, Loader2, AlertCircle } from 'lucide-react'

// 폼 스키마
const checkoutSchema = z.object({
  name: z.string().min(2, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  phone: z.string().min(10, '올바른 전화번호를 입력해주세요'),
  note: z.string().optional(),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const createOrder = useCreateOrder()

  const totalPrice = getTotalPrice()
  const taxAmount = Math.floor(totalPrice * 0.1)
  const finalPrice = totalPrice + taxAmount

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      email: user?.email || '',
      phone: '',
      note: '',
    },
  })

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } })
      return
    }

    if (items.length === 0) {
      return
    }

    try {
      const order = await createOrder.mutateAsync({
        contactInfo: {
          name: values.name,
          email: values.email,
          phone: values.phone,
        },
        shippingNote: values.note,
        items: items.map((item) => ({
          serviceId: item.serviceId,
          serviceTitle: item.service.title,
          quantity: item.quantity,
          unitPrice: item.service.price,
        })),
      })

      clearCart()
      // 결제 페이지로 이동
      navigate(`/payment?orderId=${order.id}`)
    } catch (error) {
      console.error('Order creation failed:', error)
    }
  }

  // 장바구니 비어있을 때
  if (items.length === 0) {
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
                <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <CardTitle>장바구니가 비어있습니다</CardTitle>
                <CardDescription>
                  결제할 서비스를 먼저 장바구니에 담아주세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate('/services')}
                >
                  서비스 둘러보기
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
            {/* 주문 정보 입력 */}
            <div className="lg:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>주문 정보</CardTitle>
                  <CardDescription>
                    서비스 이용을 위한 연락처 정보를 입력해주세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!user && (
                    <Alert className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        주문을 완료하려면{' '}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() =>
                            navigate('/login', {
                              state: { from: { pathname: '/checkout' } },
                            })
                          }
                        >
                          로그인
                        </Button>
                        이 필요합니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이름 *</FormLabel>
                            <FormControl>
                              <Input placeholder="홍길동" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일 *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="example@email.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>전화번호 *</FormLabel>
                            <FormControl>
                              <Input placeholder="010-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>요청사항</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="추가 요청사항이 있으시면 입력해주세요."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-primary"
                        disabled={createOrder.isPending || !user}
                      >
                        {createOrder.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            주문 처리중...
                          </>
                        ) : (
                          `${formatPrice(finalPrice)} 결제하기`
                        )}
                      </Button>

                      {createOrder.isError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.
                          </AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </Form>
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
                    {items.map((item) => (
                      <div key={item.serviceId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.service.title} x {item.quantity}
                        </span>
                        <span>{formatPrice(item.service.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* 금액 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">상품 금액</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">부가세 (10%)</span>
                      <span>{formatPrice(taxAmount)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-semibold">
                    <span>총 결제금액</span>
                    <span className="text-primary">{formatPrice(finalPrice)}</span>
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
