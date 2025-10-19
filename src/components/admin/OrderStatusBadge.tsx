/**
 * OrderStatusBadge Component
 *
 * 주문 상태 배지 (7단계 워크플로우)
 */

import { Badge } from '@/components/ui/badge'

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '결제 대기', variant: 'outline' },
  confirmed: { label: '주문 확인', variant: 'default' },
  processing: { label: '처리 중', variant: 'secondary' },
  shipped: { label: '배송 중', variant: 'default' },
  delivered: { label: '배송 완료', variant: 'secondary' },
  cancelled: { label: '취소됨', variant: 'destructive' },
  refunded: { label: '환불됨', variant: 'destructive' },
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.label}
    </Badge>
  )
}
