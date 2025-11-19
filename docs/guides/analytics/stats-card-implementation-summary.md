# StatsCard 컴포넌트 구현 완료 보고서

## 개요

Analytics 대시보드에서 사용할 범용 KPI 통계 카드 컴포넌트를 생성했습니다.

**작업 일자**: 2025-11-19
**작업 시간**: ~1시간
**커밋**: (작성 예정)

---

## 생성된 파일

### 1. 컴포넌트
- **`src/components/analytics/StatsCard.tsx`** (163줄)
  - `StatsCard` 컴포넌트: 개별 통계 카드
  - `StatsCardGrid` 컴포넌트: 그리드 레이아웃
  - 트렌드 헬퍼 함수 (색상, 아이콘, 배경)

### 2. 타입 정의 및 유틸리티
- **`src/types/analytics.ts`** (185줄)
  - `TrendDirection`, `StatItem` 타입
  - `formatNumber()` - 천 단위 구분자
  - `formatCurrency()` - 원화 포맷
  - `formatPercent()` - 백분율 포맷
  - `formatKoreanCurrency()` - 한국식 억/만 축약
  - `formatCompactNumber()` - K/M/B 축약
  - 차트 데이터, KPI, 날짜 범위, 필터 타입

### 3. 사용 예시
- **`src/components/analytics/StatsCard.examples.tsx`** (326줄)
  - 13개 사용 예시 컴포넌트
  - 기본, 아이콘, 트렌드, 로딩, 그리드, 축약 등
  - Admin/Analytics/Revenue 대시보드 스타일

### 4. 문서
- **`docs/guides/design-system/components/stats-card.md`** (420줄)
  - Props 설명
  - 트렌드 색상 가이드
  - 숫자 포맷팅 유틸리티 설명
  - 실전 예시 (Dashboard, Analytics, Revenue)
  - 접근성, 다크 모드, 관련 파일

### 5. 구현 요약
- **`docs/guides/analytics/stats-card-implementation-summary.md`** (현재 파일)

---

## 수정된 파일

### 1. Admin Dashboard (`src/pages/admin/Dashboard.tsx`)
**변경 사항**:
- `statCards` 배열 제거 (47줄 → 1줄)
- 기존 Card 패턴 → `StatsCard` 컴포넌트로 교체
- `StatsCardGrid` 사용하여 4컬럼 그리드 배치
- `formatKoreanCurrency()` 유틸리티 사용

**Before** (19줄):
```tsx
const statCards = [
  {
    title: '전체 서비스',
    value: stats?.totalServices || 0,
    icon: Package,
    description: `활성: ${stats?.activeServices || 0}`,
    color: 'text-blue-600',
  },
  // ... 3개 더
]

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {statCards.map((stat) => {
    const Icon = stat.icon
    return (
      <Card key={stat.title}>
        <CardHeader>...</CardHeader>
        <CardContent>...</CardContent>
      </Card>
    )
  })}
</div>
```

**After** (12줄):
```tsx
const isLoading = !stats

<StatsCardGrid columns={4}>
  <StatsCard
    title="전체 서비스"
    value={stats?.totalServices || 0}
    icon={<Package className="h-5 w-5 text-blue-600" />}
    description={`활성: ${stats?.activeServices || 0}`}
    loading={isLoading}
  />
  {/* ... 3개 더 */}
</StatsCardGrid>
```

**코드 감소**: -7줄 (-36%)

---

### 2. Analytics Dashboard (`src/pages/admin/Analytics.tsx`)
**변경 사항**:
- 기존 Card 3개 → `StatsCard` 컴포넌트로 교체
- `StatsCardGrid` 사용하여 3컬럼 그리드 배치
- `formatNumber()` 유틸리티 사용

**Before** (42줄):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <BounceRateCard data={bounceData} loading={bounceLoading} />

  <Card>
    <CardHeader>
      <CardTitle>총 이벤트</CardTitle>
    </CardHeader>
    <CardContent>
      {eventCountsLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600">
            {eventCounts?.reduce((sum, e) => sum + Number(e.event_count), 0).toLocaleString() || 0}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            선택한 기간 동안 발생한 이벤트
          </div>
        </div>
      )}
    </CardContent>
  </Card>

  {/* 고유 사용자 수 - 동일 구조 */}
</div>
```

**After** (15줄):
```tsx
<StatsCardGrid columns={3}>
  <BounceRateCard data={bounceData} loading={bounceLoading} />

  <StatsCard
    title="총 이벤트"
    value={formatNumber(eventCounts?.reduce((sum, e) => sum + Number(e.event_count), 0) || 0)}
    icon={<Activity className="h-5 w-5 text-blue-600" />}
    description="선택한 기간 동안 발생한 이벤트"
    loading={eventCountsLoading}
  />

  <StatsCard
    title="고유 사용자"
    value={formatNumber(eventCounts?.reduce((sum, e) => sum + Number(e.unique_users), 0) || 0)}
    icon={<Users className="h-5 w-5 text-purple-600" />}
    description="활동한 사용자 수"
    loading={eventCountsLoading}
  />
</StatsCardGrid>
```

**코드 감소**: -27줄 (-64%)

---

## 빌드 결과

### 성공
```bash
npm run build
✓ 5430 modules transformed
✓ built in 34.59s

PWA v1.1.0
precache  26 entries (1648.89 KiB)
```

### 번들 크기 영향
- **Admin Pages 청크**: 2,824.84 kB (737.84 kB gzip)
- **StatsCard 컴포넌트 추가**: ~2 kB gzip (추정)
- **analytics.ts 유틸리티**: ~1 kB gzip (추정)
- **총 영향**: +3 kB gzip (0.4% 증가, 무시할 수준)

### 경고
- ✅ ESLint: 통과
- ✅ TypeScript: 타입 에러 없음
- ⚠️ Large chunk warning (기존 이슈, StatsCard와 무관)

---

## 주요 기능

### StatsCard 컴포넌트

#### Props
| Prop | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 카드 제목 |
| `value` | `string \| number` | 표시할 값 |
| `change` | `number` (optional) | 변화율 (%) |
| `trend` | `'up' \| 'down' \| 'neutral'` (optional) | 트렌드 방향 |
| `icon` | `React.ReactNode` (optional) | 아이콘 |
| `description` | `string` (optional) | 설명 텍스트 |
| `loading` | `boolean` (optional) | 로딩 상태 |
| `className` | `string` (optional) | 추가 CSS |

#### 트렌드 색상
- **`up`**: 녹색 (`text-green-600`, `TrendingUp` 아이콘)
- **`down`**: 빨강 (`text-red-600`, `TrendingDown` 아이콘)
- **`neutral`**: 회색 (`text-gray-600`, `Minus` 아이콘)

#### 로딩 상태
- `loading={true}` → Skeleton UI 표시
- 제목과 아이콘은 유지, 값과 설명은 Skeleton

#### 호버 효과
- `hover:shadow-md` - 카드 호버 시 그림자 증가

---

### StatsCardGrid 컴포넌트

#### Props
| Prop | 타입 | 설명 |
|------|------|------|
| `children` | `React.ReactNode` | StatsCard 컴포넌트들 |
| `columns` | `1 \| 2 \| 3 \| 4` | 그리드 컬럼 수 (기본: 4) |
| `className` | `string` (optional) | 추가 CSS |

#### 반응형 동작
- **1 column**: 모바일/태블릿/데스크톱 모두 1열
- **2 columns**: `md:grid-cols-2` (768px 이상 2열)
- **3 columns**: `md:grid-cols-2 lg:grid-cols-3` (768px 이상 2열, 1024px 이상 3열)
- **4 columns**: `md:grid-cols-2 lg:grid-cols-4` (768px 이상 2열, 1024px 이상 4열)

---

## 숫자 포맷팅 유틸리티

### `formatNumber(value, options?)`
```tsx
formatNumber(1234567) // "1,234,567"
formatNumber(1234.56, { maximumFractionDigits: 1 }) // "1,234.6"
```

### `formatCurrency(value, options?)`
```tsx
formatCurrency(12345) // "₩12,345"
formatCurrency(12345.67) // "₩12,346"
```

### `formatPercent(value, options?)`
```tsx
formatPercent(0.1234) // "12.34%"
formatPercent(12.34, { isDecimal: false }) // "12.34%"
formatPercent(0.1234, { decimals: 1 }) // "12.3%"
```

### `formatKoreanCurrency(value)`
```tsx
formatKoreanCurrency(12345678) // "₩1,234만"
formatKoreanCurrency(123456789) // "₩1억 2,345만"
formatKoreanCurrency(100000000) // "₩1억"
```

### `formatCompactNumber(value)`
```tsx
formatCompactNumber(1234) // "1.2K"
formatCompactNumber(1234567) // "1.2M"
formatCompactNumber(1234567890) // "1.2B"
```

---

## 사용 예시 (실전)

### Admin Dashboard
```tsx
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
  <StatsCard
    title="평균 주문금액"
    value={formatKoreanCurrency(52000)} // "₩5만 2,000"
    icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
    description="주문당"
    loading={isLoading}
  />
</StatsCardGrid>
```

### Analytics Dashboard (트렌드 포함)
```tsx
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
```

---

## 기존 컴포넌트와의 비교

### vs. KPICard
- **KPICard**: `useRevenue` 훅 전용, 매출 분석 페이지
- **StatsCard**: 범용, 모든 Admin 페이지에서 사용 가능
- **차이점**: StatsCard는 `change`, `trend` 자동 계산하지 않음 (명시적 전달)

### vs. LiveMetricCard
- **LiveMetricCard**: 실시간 데이터 전용, "LIVE" 배지, 펄스 애니메이션
- **StatsCard**: 정적 데이터, 로딩 상태 Skeleton
- **공통점**: 아이콘, 설명, 트렌드 지원

---

## 코드 개선 효과

### 코드 감소
- **Dashboard.tsx**: -7줄 (-36%)
- **Analytics.tsx**: -27줄 (-64%)
- **총 감소**: -34줄 (약 50% 감소)

### 일관성 향상
- 모든 Admin 페이지에서 동일한 스타일
- 색상, 간격, 호버 효과 일관성
- 트렌드 표시 방식 통일

### 유지보수성
- 통계 카드 스타일 변경 시 1곳만 수정
- 새로운 통계 추가 시 `StatsCard` 재사용
- 타입 안전성 (TypeScript)

### 재사용성
- 13개 사용 예시 컴포넌트 제공
- 다양한 컬럼 수 지원 (1~4)
- 커스텀 CSS 클래스 지원

---

## 접근성 (Accessibility)

### Semantic HTML
- Card 컴포넌트 기반 (의미 있는 구조)
- 제목-값-설명 계층 구조 명확

### 시각적 차별화
- 트렌드마다 고유 색상 (녹색/빨강/회색)
- 아이콘으로 추가 시각적 단서
- 다크 모드 지원

### 로딩 상태
- Skeleton UI로 로딩 중 명확히 표시
- 제목은 유지하여 컨텍스트 제공

---

## 다크 모드

모든 색상은 다크 모드를 지원합니다.

```tsx
// 자동 적용
text-green-600 dark:text-green-400
bg-green-50 dark:bg-green-950/30
```

---

## 다음 단계 (선택 사항)

### 1. Revenue 페이지 리팩토링
- `src/pages/admin/Revenue.tsx`
- `KPIGrid` → `StatsCardGrid` 교체 고려

### 2. 애니메이션 추가
- 값 변경 시 카운트업 애니메이션
- 트렌드 아이콘 애니메이션 (펄스)

### 3. 추가 유틸리티
- `formatDuration()` - 시간 포맷팅 (1h 30m)
- `formatFileSize()` - 파일 크기 (1.2 MB)

### 4. 테스트 추가
- Unit 테스트 (Jest)
- Visual 테스트 (Storybook)

---

## 참고 문서

- **컴포넌트**: `src/components/analytics/StatsCard.tsx`
- **타입**: `src/types/analytics.ts`
- **예시**: `src/components/analytics/StatsCard.examples.tsx`
- **문서**: `docs/guides/design-system/components/stats-card.md`
- **사용 예시**:
  - `src/pages/admin/Dashboard.tsx`
  - `src/pages/admin/Analytics.tsx`

---

## 커밋 메시지 (권장)

```
feat(analytics): add StatsCard component for KPI metrics

- Create StatsCard component with trend support (up/down/neutral)
- Create StatsCardGrid for grid layouts (1-4 columns)
- Add number formatting utilities (currency, percent, Korean format)
- Add comprehensive TypeScript types
- Refactor Dashboard and Analytics pages to use StatsCard
- Add 13 usage examples and full documentation

BREAKING CHANGE: None (backward compatible)

Files:
- src/components/analytics/StatsCard.tsx (new)
- src/types/analytics.ts (new)
- src/components/analytics/StatsCard.examples.tsx (new)
- docs/guides/design-system/components/stats-card.md (new)
- docs/guides/analytics/stats-card-implementation-summary.md (new)
- src/pages/admin/Dashboard.tsx (refactored -7 lines)
- src/pages/admin/Analytics.tsx (refactored -27 lines)

Code reduction: -34 lines (-50%)
Bundle impact: +3 kB gzip (0.4%)
```

---

**작성일**: 2025-11-19
**작성자**: Claude (AI Assistant)
**검토자**: (추가 예정)
