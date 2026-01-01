/**
 * Admin Orders Page
 *
 * 관리자 주문 관리 페이지 (목록, 상태 변경, 필터링)
 */

import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/payments/useOrders'
import { OrderFilter } from '@/components/admin/OrderFilter'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package, Loader2, AlertCircle } from 'lucide-react'
import type { OrderWithItems } from '@/types/shared/database'

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export default function AdminOrders() {
  const { data: orders, isLoading, error } = useAdminOrders()
  const { mutate: updateOrderStatus, isPending: isUpdatingStatus } = useUpdateOrderStatus()

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  // 상세보기 다이얼로그
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)

  // 필터링된 주문 목록
  const filteredOrders = useMemo(() => {
    if (!orders) return []

    return orders.filter((order) => {
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesOrderNumber = order.order_number?.toLowerCase().includes(query)
        const matchesEmail = order.contact_email?.toLowerCase().includes(query)
        const matchesName = order.shipping_name?.toLowerCase().includes(query)

        if (!matchesOrderNumber && !matchesEmail && !matchesName) {
          return false
        }
      }

      // 상태 필터
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }

      // 결제 수단 필터
      if (paymentFilter !== 'all') {
        const paymentProvider = order.payment?.[0]?.provider
        if (paymentProvider !== paymentFilter) {
          return false
        }
      }

      return true
    })
  }, [orders, searchQuery, statusFilter, paymentFilter])

  // 주문 상태 변경
  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus({ orderId, status })
  }

  // 주문 상세보기
  const handleViewDetails = (order: OrderWithItems) => {
    setSelectedOrder(order)
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex-1 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            주문 목록을 불러오는데 실패했습니다: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>주문 관리 - Admin</title>
      </Helmet>

      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">주문 관리</h2>
            <p className="text-muted-foreground">
              전체 {orders?.length || 0}개 주문 / 필터링 결과 {filteredOrders.length}개
            </p>
          </div>
        </div>

        {/* 필터 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              주문 검색 및 필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrderFilter
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              paymentFilter={paymentFilter}
              onPaymentFilterChange={setPaymentFilter}
            />
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>주문 목록</CardTitle>
            <CardDescription>
              주문 상태를 변경하거나 상세 정보를 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                주문이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>주문일시</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>결제 수단</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>상태 변경</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.shipping_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.contact_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm', {
                            locale: ko,
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₩{order.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {order.payment?.[0]?.provider || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) =>
                              handleStatusChange(order.id, value as OrderStatus)
                            }
                            disabled={isUpdatingStatus}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">결제 대기</SelectItem>
                              <SelectItem value="confirmed">주문 확인</SelectItem>
                              <SelectItem value="processing">처리 중</SelectItem>
                              <SelectItem value="shipped">배송 중</SelectItem>
                              <SelectItem value="delivered">배송 완료</SelectItem>
                              <SelectItem value="cancelled">취소됨</SelectItem>
                              <SelectItem value="refunded">환불됨</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                          >
                            상세보기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 주문 상세보기 다이얼로그 */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>주문 상세 정보</DialogTitle>
                <DialogDescription>
                  주문번호: {selectedOrder.order_number}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* 주문 정보 */}
                <div>
                  <h3 className="font-semibold mb-2">주문 정보</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>주문일시:</div>
                    <div>
                      {format(new Date(selectedOrder.created_at), 'yyyy-MM-dd HH:mm:ss', {
                        locale: ko,
                      })}
                    </div>
                    <div>상태:</div>
                    <div>
                      <OrderStatusBadge status={selectedOrder.status as OrderStatus} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 주문 항목 */}
                <div>
                  <h3 className="font-semibold mb-2">주문 항목</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.service_title} x {item.quantity}
                        </span>
                        <span className="font-medium">
                          ₩{item.subtotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 금액 정보 */}
                <div>
                  <h3 className="font-semibold mb-2">금액 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>소계</span>
                      <span>₩{selectedOrder.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>세금</span>
                      <span>₩{selectedOrder.tax_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>총 금액</span>
                      <span className="text-primary">
                        ₩{selectedOrder.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 배송 정보 */}
                <div>
                  <h3 className="font-semibold mb-2">배송 정보</h3>
                  <div className="space-y-1 text-sm">
                    <div>받는 사람: {selectedOrder.shipping_name}</div>
                    <div>연락처: {selectedOrder.shipping_phone}</div>
                    <div>
                      주소: {(selectedOrder.shipping_address as { address?: string; addressDetail?: string })?.address}{' '}
                      {(selectedOrder.shipping_address as { address?: string; addressDetail?: string })?.addressDetail}
                    </div>
                    {selectedOrder.shipping_note && (
                      <div>배송 요청사항: {selectedOrder.shipping_note}</div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 결제 정보 */}
                {selectedOrder.payment?.[0] && (
                  <div>
                    <h3 className="font-semibold mb-2">결제 정보</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>결제 수단</span>
                        <span className="capitalize">
                          {selectedOrder.payment[0].provider}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>결제 금액</span>
                        <span>₩{selectedOrder.payment[0].amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>결제 상태</span>
                        <span className="capitalize">
                          {selectedOrder.payment[0].status}
                        </span>
                      </div>
                      {selectedOrder.payment[0].paid_at && (
                        <div className="flex justify-between">
                          <span>결제 완료 시각</span>
                          <span>
                            {format(
                              new Date(selectedOrder.payment[0].paid_at),
                              'yyyy-MM-dd HH:mm:ss',
                              { locale: ko }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
