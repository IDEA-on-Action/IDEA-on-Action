# Central Hub 차트 컴포넌트

Central Hub 대시보드에서 사용하는 분석 차트 컴포넌트입니다.

## 컴포넌트 목록

### 1. UsageChart

서비스별 일간/주간/월간 사용량을 표시하는 막대 차트 컴포넌트입니다.

#### Props

```typescript
interface UsageChartProps {
  serviceId?: ServiceId;  // 특정 서비스 필터링 (선택사항)
  period: 'daily' | 'weekly' | 'monthly';  // 집계 기간
  className?: string;  // 추가 CSS 클래스
}
```

#### 사용 예제

```tsx
import { UsageChart } from '@/components/central-hub';

// 전체 서비스 일간 사용량
<UsageChart period="daily" />

// 특정 서비스 주간 사용량
<UsageChart serviceId="minu-find" period="weekly" />

// 전체 서비스 월간 사용량
<UsageChart period="monthly" />
```

#### 기능

- **서비스별 색상 구분**: 4개 서비스를 각각 다른 색상으로 표시
- **반응형 디자인**: 모바일/태블릿/데스크톱 대응
- **다크모드 지원**: 자동 테마 감지 및 색상 조정
- **인터랙티브 툴팁**: 마우스 호버 시 상세 정보 표시
- **기간별 집계**:
  - daily: 최근 7일
  - weekly: 최근 4주
  - monthly: 최근 6개월

### 2. TrendChart

이벤트/이슈 발생 추이 및 응답 시간을 표시하는 라인 차트 컴포넌트입니다.

#### Props

```typescript
interface TrendChartProps {
  metric: 'events' | 'issues' | 'response_time';  // 표시할 메트릭
  period: 'week' | 'month';  // 조회 기간
  className?: string;  // 추가 CSS 클래스
}
```

#### 사용 예제

```tsx
import { TrendChart } from '@/components/central-hub';

// 이벤트 발생 추이 (주간)
<TrendChart metric="events" period="week" />

// 이슈 발생 추이 (월간)
<TrendChart metric="issues" period="month" />

// 응답 시간 추이 (주간)
<TrendChart metric="response_time" period="week" />
```

#### 기능

- **메트릭별 색상**: 각 메트릭마다 고유한 색상 사용
- **트렌드 인디케이터**: 이전 데이터 대비 증감률 표시
- **평균값 표시**: 기간 내 평균값 계산 및 표시
- **반응형 디자인**: 모바일/태블릿/데스크톱 대응
- **다크모드 지원**: 자동 테마 감지 및 색상 조정
- **기간별 데이터**:
  - week: 최근 7일
  - month: 최근 30일

#### 메트릭 설명

- **events**: 서비스 이벤트 발생 건수
- **issues**: 서비스 이슈 발생 건수
- **response_time**: 서비스 평균 응답 시간 (ms)

### 3. StatisticsChart (기존)

KPI 카드 및 서비스별 이벤트/이슈 분포를 표시하는 컴포넌트입니다.

#### 사용 예제

```tsx
import { StatisticsChart } from '@/components/central-hub';

<StatisticsChart />
```

## 대시보드 통합 예제

```tsx
import {
  StatisticsChart,
  UsageChart,
  TrendChart
} from '@/components/central-hub';

function CentralHubDashboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  return (
    <div className="space-y-6">
      {/* KPI 및 분포 차트 */}
      <StatisticsChart />

      {/* 사용량 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart period={period} />
        <TrendChart metric="events" period={period === 'monthly' ? 'month' : 'week'} />
      </div>

      {/* 서비스별 상세 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart serviceId="minu-find" period="weekly" />
        <TrendChart metric="response_time" period="week" />
      </div>

      {/* 이슈 트렌드 */}
      <TrendChart metric="issues" period="month" />
    </div>
  );
}
```

## 데이터 소스

모든 차트 컴포넌트는 다음 훅을 통해 데이터를 조회합니다:

- `useServiceEvents`: 서비스 이벤트 데이터
- `useServiceIssues`: 서비스 이슈 데이터
- `useServiceHealth`: 서비스 헬스 메트릭

## 스타일링

차트 컴포넌트는 다음 디자인 시스템을 사용합니다:

- **UI 프레임워크**: shadcn/ui
- **차트 라이브러리**: recharts
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **날짜 처리**: date-fns

## 브라우저 호환성

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 성능 최적화

- `useMemo`를 통한 차트 데이터 메모이제이션
- React Query 캐싱을 통한 불필요한 API 호출 방지
- 반응형 컨테이너를 통한 효율적인 리렌더링

## 접근성

- 키보드 네비게이션 지원
- 스크린 리더 호환
- 고대비 모드 지원
- ARIA 레이블 적용
