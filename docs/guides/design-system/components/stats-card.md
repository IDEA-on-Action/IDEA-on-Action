# StatsCard 컴포넌트

Analytics 대시보드에서 사용하는 KPI 통계 카드 컴포넌트입니다.

## 위치
- `src/components/analytics/StatsCard.tsx`
- `src/types/analytics.ts` (타입 정의 및 유틸리티)

## 기본 사용법

```tsx
import { StatsCard } from '@/components/analytics/StatsCard'
import { DollarSign } from 'lucide-react'

<StatsCard
  title="총 매출"
  value="₩165,000"
  description="지난 달 대비"
  change={12.5}
  trend="up"
  icon={<DollarSign className="h-5 w-5 text-green-600" />}
/>
```

## Props

### StatsCardProps

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `title` | `string` | ✅ | - | 카드 제목 (예: "총 매출") |
| `value` | `string \| number` | ✅ | - | 표시할 값 (예: "₩165,000" 또는 1234) |
| `change` | `number` | ❌ | - | 변화율 퍼센트 (예: 12.5 → "+12.5%") |
| `trend` | `'up' \| 'down' \| 'neutral'` | ❌ | `'neutral'` | 트렌드 방향 |
| `icon` | `React.ReactNode` | ❌ | - | 좌측 상단 아이콘 |
| `description` | `string` | ❌ | - | 하단 설명 텍스트 |
| `loading` | `boolean` | ❌ | `false` | 로딩 상태 (Skeleton 표시) |
| `className` | `string` | ❌ | - | 추가 CSS 클래스 |

## 트렌드 색상 가이드

### `trend="up"` (증가)
- **색상**: 녹색 (`text-green-600`)
- **아이콘**: `TrendingUp`
- **배경**: `bg-green-50 dark:bg-green-950/30`
- **사용 예**: 매출 증가, 사용자 증가

```tsx
<StatsCard
  title="총 매출"
  value="₩165,000"
  change={12.5}
  trend="up"
/>
```

### `trend="down"` (감소)
- **색상**: 빨강 (`text-red-600`)
- **아이콘**: `TrendingDown`
- **배경**: `bg-red-50 dark:bg-red-950/30`
- **사용 예**: 이탈률 증가, 매출 감소

```tsx
<StatsCard
  title="이탈률"
  value="23.4%"
  change={-5.2}
  trend="down"
/>
```

### `trend="neutral"` (변화 없음)
- **색상**: 회색 (`text-gray-600`)
- **아이콘**: `Minus`
- **배경**: `bg-gray-50 dark:bg-gray-950/30`
- **사용 예**: 변화 없는 지표

```tsx
<StatsCard
  title="평균 주문 금액"
  value="₩52,000"
  change={0.1}
  trend="neutral"
/>
```

## 로딩 상태

`loading={true}`일 때 Skeleton UI를 표시합니다.

```tsx
<StatsCard
  title="총 매출"
  value="₩0"
  loading={true}
/>
```

## StatsCardGrid 컴포넌트

여러 StatsCard를 그리드 레이아웃으로 배치하는 컴포넌트입니다.

### Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `children` | `React.ReactNode` | ✅ | - | StatsCard 컴포넌트들 |
| `columns` | `1 \| 2 \| 3 \| 4` | ❌ | `4` | 그리드 컬럼 수 |
| `className` | `string` | ❌ | - | 추가 CSS 클래스 |

### 사용 예시

```tsx
import { StatsCardGrid } from '@/components/analytics/StatsCard'

<StatsCardGrid columns={4}>
  <StatsCard title="총 매출" value="₩165,000" />
  <StatsCard title="총 주문" value={1234} />
  <StatsCard title="활성 사용자" value={567} />
  <StatsCard title="전환율" value="3.2%" />
</StatsCardGrid>
```

## 숫자 포맷팅 유틸리티

`src/types/analytics.ts`에서 제공하는 유틸리티 함수들:

### `formatNumber(value, options?)`

천 단위 구분자로 숫자 포맷팅

```tsx
import { formatNumber } from '@/types/analytics'

formatNumber(1234567) // "1,234,567"
formatNumber(1234.56, { maximumFractionDigits: 1 }) // "1,234.6"
```

### `formatCurrency(value, options?)`

원화 포맷으로 변환

```tsx
import { formatCurrency } from '@/types/analytics'

formatCurrency(12345) // "₩12,345"
formatCurrency(12345.67) // "₩12,346" (반올림)
```

### `formatPercent(value, options?)`

백분율 포맷

```tsx
import { formatPercent } from '@/types/analytics'

formatPercent(0.1234) // "12.34%"
formatPercent(12.34, { isDecimal: false }) // "12.34%"
formatPercent(0.1234, { decimals: 1 }) // "12.3%"
```

### `formatKoreanCurrency(value)`

한국식 원화 축약 (억/만)

```tsx
import { formatKoreanCurrency } from '@/types/analytics'

formatKoreanCurrency(12345678) // "₩1,234만"
formatKoreanCurrency(123456789) // "₩1억 2,345만"
formatKoreanCurrency(100000000) // "₩1억"
```

### `formatCompactNumber(value)`

숫자 축약 (K/M/B)

```tsx
import { formatCompactNumber } from '@/types/analytics'

formatCompactNumber(1234) // "1.2K"
formatCompactNumber(1234567) // "1.2M"
formatCompactNumber(1234567890) // "1.2B"
```

## 실전 예시

### Admin Dashboard (전체 서비스, 총 주문, 총 매출)

```tsx
import { StatsCard, StatsCardGrid } from '@/components/analytics/StatsCard'
import { formatKoreanCurrency } from '@/types/analytics'
import { Package, ShoppingCart, DollarSign } from 'lucide-react'

<StatsCardGrid columns={4}>
  <StatsCard
    title="전체 서비스"
    value={42}
    icon={<Package className="h-5 w-5 text-blue-600" />}
    description="활성: 38"
    loading={isLoading}
  />
  <StatsCard
    title="총 주문"
    value={1234}
    icon={<ShoppingCart className="h-5 w-5 text-green-600" />}
    description="완료: 1180"
    loading={isLoading}
  />
  <StatsCard
    title="총 매출"
    value={formatKoreanCurrency(165000000)} // "₩1억 6,500만"
    icon={<DollarSign className="h-5 w-5 text-purple-600" />}
    description="누적 매출"
    loading={isLoading}
  />
</StatsCardGrid>
```

### Analytics Dashboard (트렌드 포함)

```tsx
import { StatsCard, StatsCardGrid } from '@/components/analytics/StatsCard'
import { formatNumber } from '@/types/analytics'
import { Activity, Users, TrendingUp } from 'lucide-react'

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
    value="3.45%"
    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
    description="방문자 대비 구매율"
    change={0.8}
    trend="up"
    loading={isLoading}
  />
</StatsCardGrid>
```

### Revenue Dashboard (월별 비교)

```tsx
import { StatsCard, StatsCardGrid } from '@/components/analytics/StatsCard'
import { formatCurrency, formatPercent } from '@/types/analytics'
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'

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
```

## 접근성 (Accessibility)

- **Semantic HTML**: Card 컴포넌트는 `<div>` 기반이지만 의미 있는 구조
- **아이콘 색상**: 각 트렌드마다 고유 색상으로 시각적 차별화
- **로딩 상태**: Skeleton UI로 로딩 중임을 명확히 표시
- **호버 효과**: `hover:shadow-md`로 인터랙션 피드백

## 다크 모드

모든 색상은 다크 모드를 지원합니다.

```tsx
// 자동으로 적용됨
<StatsCard
  title="총 매출"
  value="₩165,000"
  trend="up" // dark:text-green-400
/>
```

## 참고

- **기존 컴포넌트와의 관계**:
  - `KPICard` (useRevenue 전용) vs `StatsCard` (범용)
  - `LiveMetricCard` (실시간 전용) vs `StatsCard` (정적)
- **재사용성**: 모든 Admin 페이지에서 동일한 스타일 유지
- **확장성**: 새로운 통계 지표 추가 시 StatsCard 재사용

## 관련 파일

- `src/components/analytics/StatsCard.tsx` - 컴포넌트
- `src/types/analytics.ts` - 타입 및 유틸리티
- `src/pages/admin/Dashboard.tsx` - 사용 예시
- `src/pages/admin/Analytics.tsx` - 사용 예시
- `src/pages/admin/Revenue.tsx` - 사용 예시
