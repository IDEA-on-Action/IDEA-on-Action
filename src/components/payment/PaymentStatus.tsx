// ===================================================================
// PaymentStatus Component
// 작성일: 2025-10-19
// 목적: 결제 상태 표시 (성공/실패/처리 중)
// ===================================================================

import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ===================================================================
// Types
// ===================================================================

type PaymentStatusType = 'success' | 'failed' | 'processing' | 'cancelled'

interface PaymentStatusProps {
  status: PaymentStatusType
  orderId?: string
  orderNumber?: string
  amount?: number
  message?: string
  onGoToOrders?: () => void
  onRetry?: () => void
  onGoToHome?: () => void
}

// ===================================================================
// Component
// ===================================================================

export function PaymentStatus({
  status,
  orderId,
  orderNumber,
  amount,
  message,
  onGoToOrders,
  onRetry,
  onGoToHome,
}: PaymentStatusProps) {
  // 상태별 설정
  const config = {
    success: {
      icon: <CheckCircle className="h-16 w-16 text-green-500" />,
      title: '결제 완료',
      description: '결제가 성공적으로 완료되었습니다.',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    failed: {
      icon: <XCircle className="h-16 w-16 text-red-500" />,
      title: '결제 실패',
      description: '결제 처리 중 오류가 발생했습니다.',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    processing: {
      icon: <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />,
      title: '결제 처리 중',
      description: '결제를 처리하고 있습니다. 잠시만 기다려주세요.',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    cancelled: {
      icon: <AlertCircle className="h-16 w-16 text-orange-500" />,
      title: '결제 취소',
      description: '결제가 취소되었습니다.',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
  }

  const currentConfig = config[status]

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card className={`glass-card border-2 ${currentConfig.borderColor}`}>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">{currentConfig.icon}</div>
          <CardTitle className="text-3xl">{currentConfig.title}</CardTitle>
          <CardDescription className="text-lg">{currentConfig.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 주문 정보 */}
          {orderNumber && (
            <div className={`p-6 rounded-lg ${currentConfig.bgColor}`}>
              <div className="space-y-3">
                {orderNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">주문번호</span>
                    <span className="font-mono font-semibold">{orderNumber}</span>
                  </div>
                )}
                {amount !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">결제 금액</span>
                    <span className="text-2xl font-bold text-primary">
                      {amount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {message && status === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-3">
            {status === 'success' && onGoToOrders && (
              <Button onClick={onGoToOrders} size="lg" className="w-full">
                주문 내역 보기
              </Button>
            )}

            {status === 'failed' && onRetry && (
              <Button onClick={onRetry} size="lg" className="w-full">
                다시 시도
              </Button>
            )}

            {(status === 'failed' || status === 'cancelled') && onGoToHome && (
              <Button onClick={onGoToHome} variant="outline" size="lg" className="w-full">
                홈으로 돌아가기
              </Button>
            )}
          </div>

          {/* 안내 문구 */}
          {status === 'success' && (
            <p className="text-sm text-muted-foreground text-center">
              주문 내역은 마이페이지에서 확인하실 수 있습니다.
              <br />
              문의사항은 고객센터로 연락 주세요.
            </p>
          )}

          {status === 'processing' && (
            <p className="text-sm text-muted-foreground text-center">
              결제 처리가 완료될 때까지 창을 닫지 마세요.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
