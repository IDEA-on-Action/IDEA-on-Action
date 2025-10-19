// ===================================================================
// PaymentMethodSelector Component
// 작성일: 2025-10-19
// 목적: 결제 수단 선택 UI (Kakao Pay / Toss Payments)
// ===================================================================

import { useState } from 'react'
import { CreditCard, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import type { PaymentProvider } from '@/lib/payments/types'

// ===================================================================
// Types
// ===================================================================

interface PaymentMethodSelectorProps {
  amount: number
  onSelectMethod: (provider: PaymentProvider) => void
  isProcessing?: boolean
}

// ===================================================================
// Component
// ===================================================================

export function PaymentMethodSelector({
  amount,
  onSelectMethod,
  isProcessing = false,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentProvider>('toss')

  const handlePayment = () => {
    onSelectMethod(selectedMethod)
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-2xl">결제 수단 선택</CardTitle>
        <CardDescription>
          결제할 수단을 선택하고 결제하기 버튼을 클릭하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 결제 금액 */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-muted-foreground">결제 금액</span>
            <span className="text-3xl font-bold text-primary">
              {amount.toLocaleString('ko-KR')}원
            </span>
          </div>
        </div>

        {/* 결제 수단 선택 */}
        <RadioGroup
          value={selectedMethod}
          onValueChange={(value) => setSelectedMethod(value as PaymentProvider)}
          className="space-y-4"
        >
          {/* Toss Payments */}
          <Label
            htmlFor="toss"
            className={`
              flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
              ${selectedMethod === 'toss' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
          >
            <RadioGroupItem value="toss" id="toss" className="mr-4" />
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 bg-blue-500 rounded-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-lg">Toss Payments</div>
                <div className="text-sm text-muted-foreground">
                  신용카드, 체크카드, 간편결제
                </div>
              </div>
            </div>
          </Label>

          {/* Kakao Pay */}
          <Label
            htmlFor="kakao"
            className={`
              flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
              ${selectedMethod === 'kakao' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
          >
            <RadioGroupItem value="kakao" id="kakao" className="mr-4" />
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 bg-yellow-400 rounded-lg">
                <Smartphone className="h-6 w-6 text-black" />
              </div>
              <div>
                <div className="font-semibold text-lg">Kakao Pay</div>
                <div className="text-sm text-muted-foreground">
                  카카오페이로 간편하게 결제
                </div>
              </div>
            </div>
          </Label>
        </RadioGroup>

        {/* 결제하기 버튼 */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              결제 처리 중...
            </>
          ) : (
            `${amount.toLocaleString('ko-KR')}원 결제하기`
          )}
        </Button>

        {/* 안내 문구 */}
        <p className="text-xs text-muted-foreground text-center">
          결제하기 버튼을 클릭하면 결제 페이지로 이동합니다.
          <br />
          테스트 환경이므로 실제 결제는 발생하지 않습니다.
        </p>
      </CardContent>
    </Card>
  )
}
