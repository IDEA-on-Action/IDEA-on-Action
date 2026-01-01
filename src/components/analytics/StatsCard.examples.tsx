/**
 * StatsCard 사용 예시
 * 다양한 사용 사례를 보여주는 예제 모음
 */

import { StatsCard, StatsCardGrid } from './StatsCard'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Activity,
  Package,
  UserPlus,
  Percent,
} from 'lucide-react'
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatKoreanCurrency,
  formatCompactNumber,
} from '@/types/shared/analytics'

// ============================================
// 예시 1: 기본 사용 (값만)
// ============================================

export function BasicStatsCardExample() {
  return (
    <StatsCard
      title="총 매출"
      value="₩165,000"
    />
  )
}

// ============================================
// 예시 2: 아이콘 + 설명
// ============================================

export function StatsCardWithIconExample() {
  return (
    <StatsCard
      title="총 매출"
      value="₩165,000"
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
      description="지난 달 대비"
    />
  )
}

// ============================================
// 예시 3: 트렌드 (증가)
// ============================================

export function StatsCardWithUpTrendExample() {
  return (
    <StatsCard
      title="총 매출"
      value="₩165,000"
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
      description="지난 달 대비"
      change={12.5}
      trend="up"
    />
  )
}

// ============================================
// 예시 4: 트렌드 (감소)
// ============================================

export function StatsCardWithDownTrendExample() {
  return (
    <StatsCard
      title="이탈률"
      value="23.4%"
      icon={<Activity className="h-5 w-5 text-red-600" />}
      description="지난 주 대비"
      change={-5.2}
      trend="down"
    />
  )
}

// ============================================
// 예시 5: 트렌드 (변화 없음)
// ============================================

export function StatsCardWithNeutralTrendExample() {
  return (
    <StatsCard
      title="평균 주문 금액"
      value="₩52,000"
      icon={<TrendingUp className="h-5 w-5 text-gray-600" />}
      description="지난 달과 동일"
      change={0.1}
      trend="neutral"
    />
  )
}

// ============================================
// 예시 6: 로딩 상태
// ============================================

export function StatsCardLoadingExample() {
  return (
    <StatsCard
      title="총 매출"
      value="₩0"
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
      description="지난 달 대비"
      change={0}
      trend="up"
      loading={true}
    />
  )
}

// ============================================
// 예시 7: StatsCardGrid (4컬럼)
// ============================================

export function StatsCardGridExample() {
  const isLoading = false

  return (
    <StatsCardGrid columns={4}>
      <StatsCard
        title="총 매출"
        value={formatKoreanCurrency(165000000)} // "₩1억 6,500만"
        icon={<DollarSign className="h-5 w-5 text-green-600" />}
        description="지난 달 대비"
        change={12.5}
        trend="up"
        loading={isLoading}
      />
      <StatsCard
        title="총 주문"
        value={1234}
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        description="완료된 주문"
        change={8.3}
        trend="up"
        loading={isLoading}
      />
      <StatsCard
        title="활성 사용자"
        value={formatNumber(5678)}
        icon={<Users className="h-5 w-5 text-purple-600" />}
        description="최근 7일"
        change={-2.1}
        trend="down"
        loading={isLoading}
      />
      <StatsCard
        title="전환율"
        value={formatPercent(0.0345)} // "3.45%"
        icon={<Percent className="h-5 w-5 text-orange-600" />}
        description="방문자 대비"
        change={0.5}
        trend="up"
        loading={isLoading}
      />
    </StatsCardGrid>
  )
}

// ============================================
// 예시 8: Admin Dashboard 스타일
// ============================================

export function AdminDashboardStatsExample() {
  const stats = {
    totalServices: 42,
    activeServices: 38,
    totalOrders: 1234,
    completedOrders: 1180,
    totalRevenue: 165000000,
    averageOrderValue: 52000,
  }
  const isLoading = false

  return (
    <StatsCardGrid columns={4}>
      <StatsCard
        title="전체 서비스"
        value={stats.totalServices}
        icon={<Package className="h-5 w-5 text-blue-600" />}
        description={`활성: ${stats.activeServices}`}
        loading={isLoading}
      />
      <StatsCard
        title="총 주문"
        value={stats.totalOrders}
        icon={<ShoppingCart className="h-5 w-5 text-green-600" />}
        description={`완료: ${stats.completedOrders}`}
        loading={isLoading}
      />
      <StatsCard
        title="총 매출"
        value={formatKoreanCurrency(stats.totalRevenue)}
        icon={<DollarSign className="h-5 w-5 text-purple-600" />}
        description="누적 매출"
        loading={isLoading}
      />
      <StatsCard
        title="평균 주문금액"
        value={formatKoreanCurrency(stats.averageOrderValue)}
        icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
        description="주문당"
        loading={isLoading}
      />
    </StatsCardGrid>
  )
}

// ============================================
// 예시 9: Analytics Dashboard 스타일 (트렌드 포함)
// ============================================

export function AnalyticsDashboardStatsExample() {
  const isLoading = false

  return (
    <StatsCardGrid columns={3}>
      <StatsCard
        title="총 이벤트"
        value={formatNumber(45678)} // "45,678"
        icon={<Activity className="h-5 w-5 text-blue-600" />}
        description="선택한 기간 동안 발생한 이벤트"
        change={18.5}
        trend="up"
        loading={isLoading}
      />
      <StatsCard
        title="고유 사용자"
        value={formatNumber(1234)} // "1,234"
        icon={<Users className="h-5 w-5 text-purple-600" />}
        description="활동한 사용자 수"
        change={-3.2}
        trend="down"
        loading={isLoading}
      />
      <StatsCard
        title="전환율"
        value={formatPercent(0.0345)} // "3.45%"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        description="방문자 대비 구매율"
        change={0.8}
        trend="up"
        loading={isLoading}
      />
    </StatsCardGrid>
  )
}

// ============================================
// 예시 10: Revenue Dashboard 스타일 (월별 비교)
// ============================================

export function RevenueDashboardStatsExample() {
  const isLoading = false

  return (
    <StatsCardGrid columns={3}>
      <StatsCard
        title="총 매출"
        value={formatCurrency(52340000)} // "₩52,340,000"
        icon={<DollarSign className="h-5 w-5 text-green-600" />}
        description="이번 달"
        change={25.3}
        trend="up"
        loading={isLoading}
      />
      <StatsCard
        title="주문 건수"
        value={`${formatNumber(856)}건`} // "856건"
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        description="완료된 주문"
        change={12.1}
        trend="up"
        loading={isLoading}
      />
      <StatsCard
        title="평균 주문 금액"
        value={formatCurrency(61145)} // "₩61,145"
        icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        description="AOV (Average Order Value)"
        change={5.7}
        trend="up"
        loading={isLoading}
      />
    </StatsCardGrid>
  )
}

// ============================================
// 예시 11: 큰 숫자 축약 (K/M/B)
// ============================================

export function StatsCardCompactNumberExample() {
  return (
    <StatsCardGrid columns={3}>
      <StatsCard
        title="총 방문자"
        value={formatCompactNumber(1234567)} // "1.2M"
        icon={<Users className="h-5 w-5 text-blue-600" />}
        description="총 누적 방문자"
      />
      <StatsCard
        title="페이지뷰"
        value={formatCompactNumber(45678)} // "45.7K"
        icon={<Activity className="h-5 w-5 text-purple-600" />}
        description="최근 30일"
      />
      <StatsCard
        title="신규 가입자"
        value={formatCompactNumber(9876)} // "9.9K"
        icon={<UserPlus className="h-5 w-5 text-green-600" />}
        description="최근 90일"
      />
    </StatsCardGrid>
  )
}

// ============================================
// 예시 12: 다양한 컬럼 수 (1~4)
// ============================================

export function StatsCardGridColumnsExample() {
  return (
    <div className="space-y-6">
      {/* 1컬럼 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">1 Column Grid</h3>
        <StatsCardGrid columns={1}>
          <StatsCard
            title="총 매출"
            value={formatKoreanCurrency(165000000)}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            change={12.5}
            trend="up"
          />
        </StatsCardGrid>
      </div>

      {/* 2컬럼 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">2 Column Grid</h3>
        <StatsCardGrid columns={2}>
          <StatsCard
            title="총 매출"
            value={formatKoreanCurrency(165000000)}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
          />
          <StatsCard
            title="총 주문"
            value={1234}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          />
        </StatsCardGrid>
      </div>

      {/* 3컬럼 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">3 Column Grid</h3>
        <StatsCardGrid columns={3}>
          <StatsCard
            title="총 매출"
            value={formatKoreanCurrency(165000000)}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
          />
          <StatsCard
            title="총 주문"
            value={1234}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          />
          <StatsCard
            title="활성 사용자"
            value={5678}
            icon={<Users className="h-5 w-5 text-purple-600" />}
          />
        </StatsCardGrid>
      </div>

      {/* 4컬럼 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">4 Column Grid</h3>
        <StatsCardGrid columns={4}>
          <StatsCard
            title="총 매출"
            value={formatKoreanCurrency(165000000)}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
          />
          <StatsCard
            title="총 주문"
            value={1234}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          />
          <StatsCard
            title="활성 사용자"
            value={5678}
            icon={<Users className="h-5 w-5 text-purple-600" />}
          />
          <StatsCard
            title="전환율"
            value={formatPercent(0.0345)}
            icon={<Percent className="h-5 w-5 text-orange-600" />}
          />
        </StatsCardGrid>
      </div>
    </div>
  )
}

// ============================================
// 예시 13: 커스텀 CSS 클래스
// ============================================

export function StatsCardCustomClassExample() {
  return (
    <StatsCard
      title="총 매출"
      value="₩165,000"
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
      description="지난 달 대비"
      change={12.5}
      trend="up"
      className="border-2 border-green-200 dark:border-green-800"
    />
  )
}
