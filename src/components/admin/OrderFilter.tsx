/**
 * OrderFilter Component
 *
 * 주문 필터링 UI (날짜, 상태, 결제 수단)
 */

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface OrderFilterProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  paymentFilter: string
  onPaymentFilterChange: (payment: string) => void
}

export function OrderFilter({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
}: OrderFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* 검색 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="주문번호, 고객명, 이메일 검색..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 상태 필터 */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="상태 필터" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="pending">결제 대기</SelectItem>
          <SelectItem value="confirmed">주문 확인</SelectItem>
          <SelectItem value="processing">처리 중</SelectItem>
          <SelectItem value="shipped">배송 중</SelectItem>
          <SelectItem value="delivered">배송 완료</SelectItem>
          <SelectItem value="cancelled">취소됨</SelectItem>
          <SelectItem value="refunded">환불됨</SelectItem>
        </SelectContent>
      </Select>

      {/* 결제 수단 필터 */}
      <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="결제 수단" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 결제 수단</SelectItem>
          <SelectItem value="kakao">Kakao Pay</SelectItem>
          <SelectItem value="toss">Toss Payments</SelectItem>
          <SelectItem value="card">신용카드</SelectItem>
          <SelectItem value="bank">계좌이체</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
