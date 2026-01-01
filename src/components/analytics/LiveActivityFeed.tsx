/**
 * Phase 14 Week 3: 실시간 활동 피드 컴포넌트
 * 최근 주문, 이벤트 실시간 표시
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ShoppingCart, CreditCard, Package, XCircle, Clock } from 'lucide-react'
import { LiveOrder } from '@/hooks/realtime/useRealtimeDashboard'

interface LiveActivityFeedProps {
  orders: LiveOrder[]
  isLoading?: boolean
}

export function LiveActivityFeed({ orders, isLoading }: LiveActivityFeedProps) {
  // 주문 상태별 아이콘 매핑
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />
      case 'processing':
        return <CreditCard className="h-5 w-5 text-blue-500" />
      case 'completed':
        return <Package className="h-5 w-5 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <ShoppingCart className="h-5 w-5 text-gray-500" />
    }
  }

  // 주문 상태별 라벨 매핑
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'processing':
        return '처리중'
      case 'completed':
        return '완료'
      case 'cancelled':
        return '취소됨'
      default:
        return status
    }
  }

  // 주문 상태별 배지 variant 매핑
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      default:
        return 'default'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>실시간 활동</CardTitle>
          <CardDescription>최근 주문 및 이벤트</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
                  <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
                </div>
                <div className="h-5 w-16 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>실시간 활동</CardTitle>
        <CardDescription>최근 주문 및 이벤트 (최대 10개)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">최근 활동이 없습니다.</p>
              <p className="text-sm text-muted-foreground mt-1">
                새로운 주문이 생성되면 여기에 실시간으로 표시됩니다.
              </p>
            </div>
          ) : (
            orders.map((order, index) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors animate-in slide-in-from-top duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* 아이콘 */}
                <div className="p-2 rounded-full bg-background border border-border">
                  {getStatusIcon(order.status)}
                </div>

                {/* 주문 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    새 주문 #{order.order_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ₩{order.total_amount.toLocaleString()} · {order.items_count}개 항목
                  </p>
                </div>

                {/* 상태 및 시간 */}
                <div className="text-right flex-shrink-0">
                  <Badge variant={getStatusVariant(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(order.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 간단한 활동 피드 (사이드바용)
// ============================================

interface CompactActivityFeedProps {
  orders: LiveOrder[]
  maxItems?: number
}

export function CompactActivityFeed({ orders, maxItems = 5 }: CompactActivityFeedProps) {
  const recentOrders = orders.slice(0, maxItems)

  return (
    <div className="space-y-2">
      {recentOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          최근 활동 없음
        </p>
      ) : (
        recentOrders.map((order) => (
          <div
            key={order.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">#{order.order_number}</p>
              <p className="text-xs text-muted-foreground">
                ₩{order.total_amount.toLocaleString()}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(order.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
