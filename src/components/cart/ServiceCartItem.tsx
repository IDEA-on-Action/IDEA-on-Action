/**
 * ServiceCartItem Component
 *
 * 서비스 패키지/플랜 장바구니 항목
 * (일반 CartItem과 별도로 표시)
 */

import { X, Package, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cartStore'
import type { ServiceCartItem as ServiceCartItemType, BillingCycle } from '@/types/services-platform'

interface ServiceCartItemProps {
  item: ServiceCartItemType
}

// 한글 청구 주기 매핑
const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: '월간',
  quarterly: '분기',
  yearly: '연간',
}

export function ServiceCartItem({ item }: ServiceCartItemProps) {
  const { removeServiceItem } = useCartStore()

  const handleRemove = () => {
    removeServiceItem(item.item_id)
  }

  return (
    <div className="flex gap-4 py-4 border-b last:border-b-0">
      {/* 아이콘 */}
      <div className="flex-shrink-0">
        <div className="w-20 h-20 rounded-md bg-primary/10 flex items-center justify-center">
          {item.type === 'package' ? (
            <Package className="h-8 w-8 text-primary" />
          ) : (
            <Calendar className="h-8 w-8 text-primary" />
          )}
        </div>
      </div>

      {/* 서비스 정보 */}
      <div className="flex-1 min-w-0">
        {/* 서비스 타이틀 */}
        <h4 className="font-medium truncate">{item.service_title}</h4>

        {/* 패키지/플랜 이름 */}
        <p className="text-sm text-muted-foreground mt-0.5">{item.item_name}</p>

        {/* 가격 */}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-semibold">₩{item.price.toLocaleString()}</p>

          {/* 청구 주기 배지 (플랜인 경우) */}
          {item.type === 'plan' && item.billing_cycle && (
            <Badge variant="secondary" className="text-xs">
              {BILLING_CYCLE_LABELS[item.billing_cycle]}
            </Badge>
          )}
        </div>

        {/* 타입 배지 */}
        <div className="mt-2">
          <Badge variant={item.type === 'package' ? 'default' : 'outline'} className="text-xs">
            {item.type === 'package' ? '일회성 프로젝트' : '정기 구독'}
          </Badge>
        </div>
      </div>

      {/* 삭제 버튼 */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRemove}
          aria-label="삭제"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
