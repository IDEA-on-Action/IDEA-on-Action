# Phase 14: 고급 분석 대시보드 아카이브

> **완료일**: 2025-11-04
> **버전**: v1.7.3 → v1.8.0
> **기간**: 3주
> **상태**: ✅ 완료

---

## 📋 목차

- [개요](#개요)
- [Week 1: 사용자 행동 분석](#week-1-사용자-행동-분석)
- [Week 2: 매출 차트 & KPI](#week-2-매출-차트--kpi)
- [Week 3: 실시간 대시보드](#week-3-실시간-대시보드)
- [테스트 및 검증](#테스트-및-검증)
- [기술 스택](#기술-스택)
- [성능 분석](#성능-분석)
- [학습 포인트](#학습-포인트)
- [다음 단계](#다음-단계)

---

## 개요

Phase 14에서는 데이터 기반 의사결정을 위한 고급 분석 대시보드를 구축했습니다:

1. **사용자 행동 분석** - GA4 이벤트 추적, 퍼널 분석, 이탈률 계산
2. **매출 차트 & KPI** - 일/주/월별 매출, 서비스별 수익, 6개 KPI 지표
3. **실시간 대시보드** - Supabase Realtime 구독, 실시간 메트릭, 활동 피드

### 주요 성과

- ✅ **32개 파일**: 24개 신규, 8개 수정
- ✅ **6,531줄 코드** 추가
- ✅ **SQL 함수 7개**: 퍼널, 이탈률, 이벤트 집계, 매출 집계, KPI
- ✅ **차트 11개**: Funnel, BounceRate, Revenue, ServiceRevenue, Orders 등
- ✅ **3개 페이지**: /admin/analytics, /admin/revenue, /admin/realtime
- ✅ **Bundle 증가**: pages-admin 50.28 kB → 61.23 kB gzip (+10.95 kB, +21.8%)
- ✅ **Total**: 552 kB → 602 kB gzip (+50 kB, +9.1%)

---

## Week 1: 사용자 행동 분석

**완료일**: 2025-11-04
**버전**: v1.7.4

### 구현 내역

#### 1. GA4 이벤트 확장 (15개 추가)

**파일**: `src/lib/analytics.ts`

**새로운 이벤트**:
```typescript
// 사용자 행동 이벤트
export const trackEvent = {
  // 회원가입
  signup: (method: string) => {
    gtag('event', 'sign_up', { method })
  },

  // 서비스 조회
  viewService: (serviceId: string, serviceName: string) => {
    gtag('event', 'view_item', {
      item_id: serviceId,
      item_name: serviceName
    })
  },

  // 장바구니
  addToCart: (serviceId: string, serviceName: string, price: number) => {
    gtag('event', 'add_to_cart', {
      currency: 'KRW',
      value: price,
      items: [{ item_id: serviceId, item_name: serviceName, price }]
    })
  },

  removeFromCart: (serviceId: string) => {
    gtag('event', 'remove_from_cart', { item_id: serviceId })
  },

  // 결제 퍼널
  beginCheckout: (value: number, items: number) => {
    gtag('event', 'begin_checkout', { currency: 'KRW', value, items })
  },

  addPaymentInfo: (paymentType: string) => {
    gtag('event', 'add_payment_info', { payment_type: paymentType })
  },

  purchase: (transactionId: string, value: number, items: number) => {
    gtag('event', 'purchase', {
      transaction_id: transactionId,
      currency: 'KRW',
      value,
      items
    })
  },

  // 콘텐츠 이벤트
  viewBlogPost: (postId: string, postTitle: string) => {
    gtag('event', 'view_item', {
      item_id: postId,
      item_name: postTitle,
      item_category: 'blog'
    })
  },

  search: (searchTerm: string, resultsCount: number) => {
    gtag('event', 'search', {
      search_term: searchTerm,
      results_count: resultsCount
    })
  },

  clickCTA: (ctaName: string, ctaLocation: string) => {
    gtag('event', 'select_promotion', {
      promotion_name: ctaName,
      promotion_id: ctaLocation
    })
  },

  shareContent: (contentType: string, contentId: string, method: string) => {
    gtag('event', 'share', {
      content_type: contentType,
      content_id: contentId,
      method
    })
  },

  downloadFile: (fileName: string, fileType: string) => {
    gtag('event', 'file_download', {
      file_name: fileName,
      file_extension: fileType
    })
  },

  error: (errorMessage: string, errorLocation: string) => {
    gtag('event', 'exception', {
      description: errorMessage,
      fatal: false,
      error_location: errorLocation
    })
  },

  customEvent: (eventName: string, params?: Record<string, any>) => {
    gtag('event', eventName, params)
  }
}
```

#### 2. analytics_events 테이블 마이그레이션

**파일**: `supabase/migrations/20251111000001_create_analytics_events.sql`

**스키마**:
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_params JSONB,
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 4개
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_params ON analytics_events USING gin(event_params);

-- RLS 정책 2개
CREATE POLICY "관리자는 모든 분석 이벤트 조회 가능"
  ON analytics_events FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "service_role은 분석 이벤트 삽입 가능"
  ON analytics_events FOR INSERT
  WITH CHECK (true);
```

#### 3. SQL 함수 4개

**파일**: `supabase/migrations/20251111000002_analytics_functions.sql`

##### 3-1. calculate_funnel() - 퍼널 분석
```sql
CREATE OR REPLACE FUNCTION calculate_funnel(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  step TEXT,
  count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT
      'viewService' AS step, COUNT(DISTINCT session_id) AS count
    FROM analytics_events
    WHERE event_name = 'view_item'
      AND created_at BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'addToCart', COUNT(DISTINCT session_id)
    FROM analytics_events
    WHERE event_name = 'add_to_cart'
      AND created_at BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'beginCheckout', COUNT(DISTINCT session_id)
    FROM analytics_events
    WHERE event_name = 'begin_checkout'
      AND created_at BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'addPaymentInfo', COUNT(DISTINCT session_id)
    FROM analytics_events
    WHERE event_name = 'add_payment_info'
      AND created_at BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'purchase', COUNT(DISTINCT session_id)
    FROM analytics_events
    WHERE event_name = 'purchase'
      AND created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT
    f.step,
    f.count,
    ROUND((f.count::NUMERIC / FIRST_VALUE(f.count) OVER (ORDER BY f.step)) * 100, 2) AS conversion_rate
  FROM funnel_steps f;
END;
$$ LANGUAGE plpgsql;
```

##### 3-2. calculate_bounce_rate() - 이탈률 계산
```sql
CREATE OR REPLACE FUNCTION calculate_bounce_rate(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC AS $$
DECLARE
  total_sessions BIGINT;
  bounced_sessions BIGINT;
BEGIN
  -- 전체 세션 수
  SELECT COUNT(DISTINCT session_id)
  INTO total_sessions
  FROM analytics_events
  WHERE created_at BETWEEN p_start_date AND p_end_date;

  -- 단일 페이지 세션 (이탈)
  SELECT COUNT(*)
  INTO bounced_sessions
  FROM (
    SELECT session_id, COUNT(*) AS event_count
    FROM analytics_events
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY session_id
    HAVING COUNT(*) = 1
  ) single_page_sessions;

  IF total_sessions = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((bounced_sessions::NUMERIC / total_sessions) * 100, 2);
END;
$$ LANGUAGE plpgsql;
```

##### 3-3. get_event_counts() - 이벤트 집계
```sql
CREATE OR REPLACE FUNCTION get_event_counts(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  event_name TEXT,
  count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_name,
    COUNT(*) AS count,
    COUNT(DISTINCT e.user_id) AS unique_users
  FROM analytics_events e
  WHERE e.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY e.event_name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;
```

##### 3-4. get_session_timeline() - 세션 타임라인
```sql
CREATE OR REPLACE FUNCTION get_session_timeline(
  p_session_id TEXT
)
RETURNS TABLE (
  event_name TEXT,
  event_params JSONB,
  page_path TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_name,
    e.event_params,
    e.page_path,
    e.created_at
  FROM analytics_events e
  WHERE e.session_id = p_session_id
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql;
```

#### 4. useAnalyticsEvents 훅 (7개 함수)

**파일**: `src/hooks/useAnalyticsEvents.ts`

```typescript
// 1. 이벤트 조회
export function useAnalyticsEvents(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['analytics-events', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000 // 5분 캐싱
  })
}

// 2. 퍼널 분석
export function useFunnelAnalysis(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['funnel-analysis', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_funnel', {
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        })

      if (error) throw error
      return data
    }
  })
}

// 3. 이탈률 계산
export function useBounceRate(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['bounce-rate', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_bounce_rate', {
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        })

      if (error) throw error
      return data as number
    }
  })
}

// 4. 이벤트 집계
export function useEventCounts(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['event-counts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_event_counts', {
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        })

      if (error) throw error
      return data
    }
  })
}

// 5. 세션 타임라인
export function useSessionTimeline(sessionId: string) {
  return useQuery({
    queryKey: ['session-timeline', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_session_timeline', {
          p_session_id: sessionId
        })

      if (error) throw error
      return data
    }
  })
}

// 6. 실시간 이벤트 (최근 10분)
export function useRealtimeEvents() {
  return useQuery({
    queryKey: ['realtime-events'],
    queryFn: async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
    refetchInterval: 30000 // 30초마다 자동 새로고침
  })
}

// 7. 사용자 이벤트 히스토리
export function useUserEventHistory(userId: string) {
  return useQuery({
    queryKey: ['user-event-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    }
  })
}
```

#### 5. Session 관리 시스템

**파일**: `src/lib/session.ts`

```typescript
/**
 * 세션 ID 관리 (SessionStorage 기반)
 * 30분 타임아웃
 */

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30분

export function getSessionId(): string {
  const stored = sessionStorage.getItem('session_id')
  const timestamp = sessionStorage.getItem('session_timestamp')

  // 기존 세션이 유효한지 확인
  if (stored && timestamp) {
    const elapsed = Date.now() - parseInt(timestamp, 10)
    if (elapsed < SESSION_TIMEOUT) {
      // 타임스탬프 갱신
      sessionStorage.setItem('session_timestamp', Date.now().toString())
      return stored
    }
  }

  // 새 세션 생성
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  sessionStorage.setItem('session_id', newSessionId)
  sessionStorage.setItem('session_timestamp', Date.now().toString())

  return newSessionId
}

export function endSession(): void {
  sessionStorage.removeItem('session_id')
  sessionStorage.removeItem('session_timestamp')
}
```

#### 6. Analytics 페이지 (4개 탭)

**파일**: `src/pages/admin/Analytics.tsx`

**라우트**: `/admin/analytics`

**탭 구성**:
1. **개요 (Overview)** - 전체 통계 및 주요 지표
2. **퍼널 (Funnel)** - 결제 전환 퍼널 분석
3. **사용자 행동 (Behavior)** - 이벤트별 집계, 이탈률
4. **이벤트 타임라인 (Timeline)** - 실시간 이벤트 스트림

**주요 기능**:
- DateRangePicker (지난 7일/30일/90일/커스텀)
- 자동 새로고침 (30초 간격)
- CSV 내보내기
- 반응형 차트

#### 7. 차트 컴포넌트 4개

##### 7-1. DateRangePicker
**파일**: `src/components/analytics/DateRangePicker.tsx`

```typescript
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const presets = [
    { label: '지난 7일', days: 7 },
    { label: '지난 30일', days: 30 },
    { label: '지난 90일', days: 90 }
  ]

  return (
    <div className="flex gap-2">
      {presets.map(preset => (
        <Button
          key={preset.days}
          variant={isActive(preset.days) ? 'default' : 'outline'}
          onClick={() => onChange({
            from: subDays(new Date(), preset.days),
            to: new Date()
          })}
        >
          {preset.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            커스텀 범위
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <CalendarComponent
            mode="range"
            selected={value}
            onSelect={onChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

##### 7-2. FunnelChart
**파일**: `src/components/analytics/FunnelChart.tsx`

```typescript
export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="step" />
        <Tooltip
          content={({ payload }) => (
            <div className="glass-card p-3">
              <p className="font-semibold">{payload[0]?.payload.step}</p>
              <p>수: {payload[0]?.value}</p>
              <p>전환율: {payload[0]?.payload.conversion_rate}%</p>
            </div>
          )}
        />
        <Bar dataKey="count" fill="#3b82f6">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(${220 - index * 20}, 70%, 50%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

##### 7-3. BounceRateCard
**파일**: `src/components/analytics/BounceRateCard.tsx`

```typescript
export function BounceRateCard({ bounceRate }: BounceRateCardProps) {
  const getColor = (rate: number) => {
    if (rate < 40) return 'text-green-600'
    if (rate < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          이탈률
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${getColor(bounceRate)}`}>
          {bounceRate.toFixed(1)}%
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {bounceRate < 40 && '✅ 매우 양호'}
          {bounceRate >= 40 && bounceRate < 60 && '⚠️ 보통'}
          {bounceRate >= 60 && '❌ 개선 필요'}
        </p>
      </CardContent>
    </Card>
  )
}
```

##### 7-4. EventTimeline
**파일**: `src/components/analytics/EventTimeline.tsx`

```typescript
export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div
          key={index}
          className="flex items-start gap-4 p-4 glass-card hover:shadow-lg transition-shadow"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{event.event_name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {event.page_path}
            </p>
            {event.event_params && (
              <pre className="text-xs mt-2 p-2 bg-muted rounded">
                {JSON.stringify(event.event_params, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Week 2: 매출 차트 & KPI

**완료일**: 2025-11-04
**버전**: v1.7.5

### 구현 내역

#### 1. SQL 함수 3개

**파일**: `supabase/migrations/20251111000003_revenue_functions.sql`

##### 1-1. get_revenue_by_date() - 일/주/월별 매출
```sql
CREATE OR REPLACE FUNCTION get_revenue_by_date(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_interval TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
  period TEXT,
  revenue NUMERIC,
  order_count BIGINT,
  avg_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_interval = 'day' THEN TO_CHAR(o.created_at, 'YYYY-MM-DD')
      WHEN p_interval = 'week' THEN TO_CHAR(DATE_TRUNC('week', o.created_at), 'YYYY-MM-DD')
      WHEN p_interval = 'month' THEN TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM')
    END AS period,
    SUM(o.total_amount) AS revenue,
    COUNT(*)::BIGINT AS order_count,
    ROUND(AVG(o.total_amount), 2) AS avg_order_value
  FROM orders o
  WHERE o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed')
  GROUP BY period
  ORDER BY period ASC;
END;
$$ LANGUAGE plpgsql;
```

##### 1-2. get_revenue_by_service() - 서비스별 매출
```sql
CREATE OR REPLACE FUNCTION get_revenue_by_service(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  revenue NUMERIC,
  order_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_revenue NUMERIC;
BEGIN
  -- 전체 매출 계산
  SELECT COALESCE(SUM(o.total_amount), 0)
  INTO total_revenue
  FROM orders o
  WHERE o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed');

  RETURN QUERY
  SELECT
    oi.service_id,
    s.title AS service_name,
    SUM(oi.price * oi.quantity) AS revenue,
    COUNT(DISTINCT o.id)::BIGINT AS order_count,
    CASE
      WHEN total_revenue > 0 THEN
        ROUND((SUM(oi.price * oi.quantity) / total_revenue) * 100, 2)
      ELSE 0
    END AS percentage
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN services s ON oi.service_id = s.id
  WHERE o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed')
  GROUP BY oi.service_id, s.title
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql;
```

##### 1-3. get_kpis() - 전체 KPI 계산
```sql
CREATE OR REPLACE FUNCTION get_kpis(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders BIGINT,
  avg_order_value NUMERIC,
  conversion_rate NUMERIC,
  new_customers BIGINT,
  returning_customers BIGINT
) AS $$
DECLARE
  total_sessions BIGINT;
BEGIN
  -- 전체 세션 수 (퍼널 시작점)
  SELECT COUNT(DISTINCT session_id)
  INTO total_sessions
  FROM analytics_events
  WHERE event_name = 'view_item'
    AND created_at BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT
    -- 총 매출
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,

    -- 주문 수
    COUNT(*)::BIGINT AS total_orders,

    -- 평균 주문액
    ROUND(AVG(o.total_amount), 2) AS avg_order_value,

    -- 전환율 (주문 수 / 세션 수)
    CASE
      WHEN total_sessions > 0 THEN
        ROUND((COUNT(*)::NUMERIC / total_sessions) * 100, 2)
      ELSE 0
    END AS conversion_rate,

    -- 신규 고객 (첫 구매)
    COUNT(DISTINCT CASE
      WHEN (
        SELECT COUNT(*)
        FROM orders o2
        WHERE o2.user_id = o.user_id
          AND o2.created_at < o.created_at
      ) = 0 THEN o.user_id
    END)::BIGINT AS new_customers,

    -- 재구매 고객
    COUNT(DISTINCT CASE
      WHEN (
        SELECT COUNT(*)
        FROM orders o2
        WHERE o2.user_id = o.user_id
          AND o2.created_at < o.created_at
      ) > 0 THEN o.user_id
    END)::BIGINT AS returning_customers

  FROM orders o
  WHERE o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed');
END;
$$ LANGUAGE plpgsql;
```

#### 2. useRevenue 훅 (5개 함수)

**파일**: `src/hooks/useRevenue.ts`

```typescript
// 1. 일/주/월별 매출
export function useRevenueByDate(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month' = 'day'
) {
  return useQuery({
    queryKey: ['revenue-by-date', startDate, endDate, interval],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_by_date', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: interval
      })

      if (error) throw error
      return data
    }
  })
}

// 2. 서비스별 매출
export function useRevenueByService(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['revenue-by-service', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_by_service', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

      if (error) throw error
      return data
    }
  })
}

// 3. KPI 조회
export function useKPIs(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['kpis', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kpis', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

      if (error) throw error
      return data?.[0] || null
    }
  })
}

// 4. 총 매출 (단순 조회)
export function useTotalRevenue() {
  return useQuery({
    queryKey: ['total-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed'])

      if (error) throw error
      return data.reduce((sum, order) => sum + order.total_amount, 0)
    }
  })
}

// 5. 사용자별 지출액 (LTV 계산용)
export function useUserSpending(userId: string) {
  return useQuery({
    queryKey: ['user-spending', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', userId)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed'])

      if (error) throw error

      const totalSpent = data.reduce((sum, order) => sum + order.total_amount, 0)
      const orderCount = data.length
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0

      return {
        totalSpent,
        orderCount,
        avgOrderValue,
        ltv: totalSpent // 간단한 LTV (실제로는 더 복잡한 계산 필요)
      }
    }
  })
}
```

#### 3. Revenue 페이지 (4개 탭)

**파일**: `src/pages/admin/Revenue.tsx`

**라우트**: `/admin/revenue`

**탭 구성**:
1. **일별 (Daily)** - 일별 매출 추이
2. **주별 (Weekly)** - 주별 매출 추이
3. **월별 (Monthly)** - 월별 매출 추이
4. **서비스별 (By Service)** - 서비스별 매출 분포

**주요 기능**:
- 기간 선택 (지난 7일/30일/90일/커스텀)
- CSV 내보내기
- 비교 기간 분석 (전주/전월 대비)
- 반응형 차트

#### 4. KPICard 컴포넌트 (6개 카드)

**파일**: `src/components/revenue/KPICard.tsx`

```typescript
export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. 총 매출 */}
      <KPICard
        title="총 매출"
        value={kpis.total_revenue}
        format="currency"
        icon={<DollarSign className="h-6 w-6" />}
        trend={calculateTrend(kpis.total_revenue, previousKpis?.total_revenue)}
      />

      {/* 2. 주문 수 */}
      <KPICard
        title="주문 수"
        value={kpis.total_orders}
        format="number"
        icon={<ShoppingCart className="h-6 w-6" />}
        trend={calculateTrend(kpis.total_orders, previousKpis?.total_orders)}
      />

      {/* 3. 평균 주문액 */}
      <KPICard
        title="평균 주문액"
        value={kpis.avg_order_value}
        format="currency"
        icon={<TrendingUp className="h-6 w-6" />}
        trend={calculateTrend(kpis.avg_order_value, previousKpis?.avg_order_value)}
      />

      {/* 4. 전환율 */}
      <KPICard
        title="전환율"
        value={kpis.conversion_rate}
        format="percentage"
        icon={<Percent className="h-6 w-6" />}
        trend={calculateTrend(kpis.conversion_rate, previousKpis?.conversion_rate)}
      />

      {/* 5. 신규 고객 */}
      <KPICard
        title="신규 고객"
        value={kpis.new_customers}
        format="number"
        icon={<UserPlus className="h-6 w-6" />}
        trend={calculateTrend(kpis.new_customers, previousKpis?.new_customers)}
      />

      {/* 6. 재구매 고객 */}
      <KPICard
        title="재구매 고객"
        value={kpis.returning_customers}
        format="number"
        icon={<Users className="h-6 w-6" />}
        trend={calculateTrend(kpis.returning_customers, previousKpis?.returning_customers)}
      />
    </div>
  )
}

interface KPICardProps {
  title: string
  value: number
  format: 'currency' | 'number' | 'percentage'
  icon: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

export function KPICard({ title, value, format, icon, trend }: KPICardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW'
        }).format(val)
      case 'percentage':
        return `${val.toFixed(2)}%`
      default:
        return val.toLocaleString('ko-KR')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {trend && (
          <div className={`flex items-center text-sm mt-2 ${
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.direction === 'up' ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            <span>{Math.abs(trend.value).toFixed(1)}% vs 이전 기간</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 5. 차트 컴포넌트 4개

##### 5-1. RevenueChart (LineChart)
**파일**: `src/components/revenue/RevenueChart.tsx`

```typescript
export function RevenueChart({ data, interval }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="period"
          tickFormatter={(value) => {
            if (interval === 'day') return format(new Date(value), 'MM/dd')
            if (interval === 'week') return format(new Date(value), 'MM/dd')
            return format(new Date(value), 'yyyy-MM')
          }}
        />
        <YAxis
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null
            return (
              <div className="glass-card p-3">
                <p className="font-semibold">
                  {format(new Date(payload[0].payload.period), 'yyyy-MM-dd')}
                </p>
                <p className="text-blue-600">
                  매출: {formatCurrency(payload[0].value as number)}
                </p>
                <p className="text-sm text-muted-foreground">
                  주문: {payload[0].payload.order_count}건
                </p>
              </div>
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

##### 5-2. ServiceRevenueChart (PieChart)
**파일**: `src/components/revenue/ServiceRevenueChart.tsx`

```typescript
export function ServiceRevenueChart({ data }: ServiceRevenueChartProps) {
  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          dataKey="revenue"
          nameKey="service_name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ service_name, percentage }) =>
            `${service_name}: ${percentage}%`
          }
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null
            const data = payload[0].payload
            return (
              <div className="glass-card p-3">
                <p className="font-semibold">{data.service_name}</p>
                <p className="text-blue-600">{formatCurrency(data.revenue)}</p>
                <p className="text-sm text-muted-foreground">
                  {data.order_count}건 ({data.percentage}%)
                </p>
              </div>
            )
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

##### 5-3. OrdersChart (BarChart)
**파일**: `src/components/revenue/OrdersChart.tsx`

```typescript
export function OrdersChart({ data }: OrdersChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="order_count" fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

##### 5-4. RevenueComparisonChart
**파일**: `src/components/revenue/RevenueComparisonChart.tsx`

```typescript
export function RevenueComparisonChart({
  currentData,
  previousData
}: RevenueComparisonChartProps) {
  const combinedData = currentData.map((current, index) => ({
    period: current.period,
    current: current.revenue,
    previous: previousData[index]?.revenue || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={combinedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null
            return (
              <div className="glass-card p-3">
                <p className="font-semibold">{payload[0].payload.period}</p>
                <p className="text-blue-600">
                  현재: {formatCurrency(payload[0].payload.current)}
                </p>
                <p className="text-gray-600">
                  이전: {formatCurrency(payload[0].payload.previous)}
                </p>
                <p className="text-sm mt-1">
                  차이: {formatCurrency(payload[0].payload.current - payload[0].payload.previous)}
                  ({((payload[0].payload.current / payload[0].payload.previous - 1) * 100).toFixed(1)}%)
                </p>
              </div>
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="current"
          stroke="#3b82f6"
          strokeWidth={2}
          name="현재 기간"
        />
        <Line
          type="monotone"
          dataKey="previous"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="이전 기간"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## Week 3: 실시간 대시보드

**완료일**: 2025-11-04
**버전**: v1.8.0

### 구현 내역

#### 1. useRealtimeDashboard 훅 (3개 함수)

**파일**: `src/hooks/useRealtimeDashboard.ts`

```typescript
// 1. Supabase Realtime 구독
export function useRealtimeOrders() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change:', payload)
          // KPI 쿼리 무효화 (자동 새로고침)
          queryClient.invalidateQueries({ queryKey: ['kpis'] })
          queryClient.invalidateQueries({ queryKey: ['realtime-metrics'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

// 2. 자동 새로고침
export function useAutoRefresh(interval: number = 30000) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['realtime-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
    }, interval)

    return () => clearInterval(timer)
  }, [interval, queryClient])
}

// 3. 실시간 메트릭
export function useRealtimeMetrics() {
  return useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: async () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // 오늘 주문
      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', today.toISOString())
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed'])

      if (ordersError) throw ordersError

      // 오늘 이벤트
      const { data: todayEvents, error: eventsError } = await supabase
        .from('analytics_events')
        .select('event_name, session_id')
        .gte('created_at', today.toISOString())

      if (eventsError) throw eventsError

      // 온라인 사용자 (최근 10분)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const { data: activeUsers, error: usersError } = await supabase
        .from('analytics_events')
        .select('user_id')
        .gte('created_at', tenMinutesAgo.toISOString())

      if (usersError) throw usersError

      const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0)
      const totalOrders = todayOrders.length
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      const uniqueSessions = new Set(todayEvents.map(e => e.session_id))
      const conversionRate = uniqueSessions.size > 0
        ? (totalOrders / uniqueSessions.size) * 100
        : 0

      const activeUserCount = new Set(
        activeUsers.filter(u => u.user_id).map(u => u.user_id)
      ).size

      return {
        todayRevenue: totalRevenue,
        todayOrders: totalOrders,
        avgOrderValue,
        conversionRate,
        activeUsers: activeUserCount
      }
    },
    refetchInterval: 30000 // 30초마다 자동 새로고침
  })
}
```

#### 2. Presence API (온라인 사용자 추적)

**파일**: `src/hooks/usePresence.ts`

```typescript
export function usePresence() {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { onlineUsers, count: onlineUsers.length }
}
```

#### 3. RealtimeDashboard 페이지

**파일**: `src/pages/admin/RealtimeDashboard.tsx`

**라우트**: `/admin/realtime`

**주요 기능**:
- 실시간 KPI 4개 (오늘 매출/주문/평균 주문액/전환율)
- 온라인 사용자 카운트
- 최근 10개 주문 활동 피드
- LIVE 배지 (펄스 애니메이션)
- 자동 새로고침 간격 설정 (10초/30초/1분)

**UI 구성**:
```tsx
export default function RealtimeDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(30000)

  useRealtimeOrders()
  useAutoRefresh(refreshInterval)

  const { data: metrics, isLoading } = useRealtimeMetrics()
  const { data: recentOrders } = useRecentOrders(10)
  const { count: onlineCount } = usePresence()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">실시간 대시보드</h1>
          <Badge variant="destructive" className="animate-pulse">
            LIVE
          </Badge>
        </div>

        {/* 새로고침 간격 설정 */}
        <Select
          value={refreshInterval.toString()}
          onValueChange={(v) => setRefreshInterval(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10000">10초</SelectItem>
            <SelectItem value="30000">30초</SelectItem>
            <SelectItem value="60000">1분</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 실시간 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <LiveMetricCard
          title="오늘 매출"
          value={metrics?.todayRevenue || 0}
          format="currency"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <LiveMetricCard
          title="오늘 주문"
          value={metrics?.todayOrders || 0}
          format="number"
          icon={<ShoppingCart className="h-6 w-6" />}
        />
        <LiveMetricCard
          title="평균 주문액"
          value={metrics?.avgOrderValue || 0}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <LiveMetricCard
          title="전환율"
          value={metrics?.conversionRate || 0}
          format="percentage"
          icon={<Percent className="h-6 w-6" />}
        />
      </div>

      {/* 온라인 사용자 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            온라인 사용자
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            {onlineCount}명
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            최근 10분 이내 활동
          </p>
        </CardContent>
      </Card>

      {/* 최근 주문 활동 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            최근 주문 활동
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveActivityFeed orders={recentOrders || []} />
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 4. LiveMetricCard 컴포넌트

**파일**: `src/components/realtime/LiveMetricCard.tsx`

```typescript
export function LiveMetricCard({ title, value, format, icon }: LiveMetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW'
        }).format(val)
      case 'percentage':
        return `${val.toFixed(2)}%`
      default:
        return val.toLocaleString('ko-KR')
    }
  }

  return (
    <Card className="relative overflow-hidden">
      {/* LIVE 배지 */}
      <div className="absolute top-2 right-2">
        <Badge variant="destructive" className="animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-1 animate-ping" />
          LIVE
        </Badge>
      </div>

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <p className="text-xs text-muted-foreground mt-2">
          {format(new Date(), 'HH:mm:ss')} 기준
        </p>
      </CardContent>

      {/* 펄스 애니메이션 */}
      <div className="absolute inset-0 bg-blue-500 opacity-0 animate-pulse-slow" />
    </Card>
  )
}
```

#### 5. LiveActivityFeed 컴포넌트

**파일**: `src/components/realtime/LiveActivityFeed.tsx`

```typescript
export function LiveActivityFeed({ orders }: LiveActivityFeedProps) {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'processing':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-indigo-500" />
      case 'delivered':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          최근 주문이 없습니다
        </p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center gap-4 p-4 glass-card hover:shadow-lg transition-all animate-slide-in-from-top"
          >
            {/* 상태 아이콘 */}
            <div className="flex-shrink-0">
              {getStatusIcon(order.status)}
            </div>

            {/* 주문 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">
                  주문 #{order.order_number}
                </p>
                <Badge variant="outline">{order.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(order.total_amount)} · {order.items?.length}개 항목
              </p>
            </div>

            {/* 시간 */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

---

## 테스트 및 검증

### 빌드 검증

**명령어**: `npm run build`

**결과**:
```
dist/manifest.webmanifest                          0.50 kB
dist/index.html                                    2.67 kB │ gzip:   0.99 kB
dist/assets/index-BYlDLVBQ.css                    90.25 kB │ gzip:  15.00 kB
...
dist/assets/pages-admin-D5O_tdOD.js              241.44 kB │ gzip:  61.23 kB 📊
dist/assets/vendor-charts-Dj6EVShV.js            394.13 kB │ gzip: 105.30 kB

Total (gzip): ~602 kB (30개 chunk)
Build Time: 14.76s
PWA: 43 entries (2912.92 KiB) cached
```

**번들 크기 분석**:
- pages-admin: 50.28 kB → **61.23 kB gzip** (+10.95 kB, +21.8%)
  - Analytics 페이지 추가
  - Revenue 페이지 추가
  - RealtimeDashboard 페이지 추가
- vendor-charts: **105.30 kB gzip** (recharts 라이브러리)
- Total: 552 kB → **602 kB gzip** (+50 kB, +9.1%)

### 테스트 작성 계획

#### E2E 테스트 (예정)
- [ ] analytics.spec.ts (8개)
  - Analytics 페이지 접근
  - 날짜 범위 선택
  - 탭 전환 (개요/퍼널/행동/타임라인)
  - 차트 렌더링 확인
  - CSV 내보내기
- [ ] revenue.spec.ts (6개)
  - Revenue 페이지 접근
  - 일/주/월 탭 전환
  - KPI 카드 표시
  - 서비스별 매출 차트
- [ ] realtime.spec.ts (4개)
  - RealtimeDashboard 페이지 접근
  - 실시간 메트릭 표시
  - 활동 피드 렌더링
  - 새로고침 간격 설정

#### 유닛 테스트 (예정)
- [ ] useAnalyticsEvents.test.ts (7개)
  - 각 훅 함수별 테스트
- [ ] useRevenue.test.ts (5개)
  - 매출 조회 훅 테스트
- [ ] useRealtimeDashboard.test.ts (3개)
  - Realtime 훅 테스트

**목표**: E2E 18개, Unit 15개 추가 (총 325+ 테스트)

---

## 기술 스택

### 주요 라이브러리

#### 차트
- **recharts** (v2.15.4)
  - React 기반 차트 라이브러리
  - LineChart, BarChart, PieChart 사용
  - 반응형 차트 지원

#### 날짜 유틸리티
- **date-fns** (v3.6.0)
  - 날짜 포맷팅
  - 날짜 계산 (subDays, format, formatDistanceToNow)
  - 로케일 지원 (ko)

#### 실시간
- **Supabase Realtime**
  - postgres_changes 구독
  - Presence API (온라인 사용자)
  - Channel 기반 실시간 업데이트

#### 분석
- **Google Analytics 4**
  - 15개 이벤트 추적
  - 퍼널 분석 데이터 소스
  - 전환율 계산 기초

### 데이터베이스

#### 새 테이블
```sql
analytics_events (
  id, user_id, session_id,
  event_name, event_params,
  page_path, referrer, user_agent, ip_address,
  created_at
)
```

#### SQL 함수 7개
1. `calculate_funnel()` - 퍼널 분석
2. `calculate_bounce_rate()` - 이탈률 계산
3. `get_event_counts()` - 이벤트 집계
4. `get_session_timeline()` - 세션 타임라인
5. `get_revenue_by_date()` - 일/주/월별 매출
6. `get_revenue_by_service()` - 서비스별 매출
7. `get_kpis()` - 전체 KPI 계산

---

## 성능 분석

### 번들 크기 영향

**Before (v1.7.3)**:
- pages-admin: 50.28 kB gzip
- Total: 552 kB gzip

**After (v1.8.0)**:
- pages-admin: **61.23 kB gzip** (+10.95 kB, +21.8%)
- vendor-charts: **105.30 kB gzip** (신규)
- Total: **602 kB gzip** (+50 kB, +9.1%)

**원인**:
- recharts 라이브러리 추가 (105.30 kB gzip)
- 3개 페이지 추가 (Analytics, Revenue, Realtime)
- 11개 차트 컴포넌트

**최적화 방안** (향후):
- recharts를 동적 import로 분리
- 차트 컴포넌트 Code Splitting
- 또는 경량 차트 라이브러리 고려 (Chart.js, Plotly)

### 쿼리 성능

**SQL 함수 최적화**:
- 인덱스 4개 활용 (event_name, created_at, user_id, session_id)
- JSONB GIN 인덱스로 event_params 검색 최적화
- 날짜 범위 쿼리 최적화 (BETWEEN 사용)

**React Query 캐싱**:
- staleTime: 5분 (Analytics, Revenue)
- refetchInterval: 30초 (Realtime)
- 쿼리 무효화 전략 (Realtime 구독 시)

---

## 학습 포인트

### 1. Supabase RPC (Remote Procedure Call)

**장점**:
- 복잡한 비즈니스 로직을 DB에서 처리
- 네트워크 왕복 횟수 감소
- SQL 함수로 성능 최적화

**예시**:
```typescript
const { data } = await supabase.rpc('get_kpis', {
  p_start_date: startDate.toISOString(),
  p_end_date: endDate.toISOString()
})
```

### 2. Supabase Realtime Channels

**패턴**:
```typescript
const channel = supabase
  .channel('realtime-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders'
  }, (payload) => {
    // 변경 감지 → 쿼리 무효화
    queryClient.invalidateQueries({ queryKey: ['kpis'] })
  })
  .subscribe()
```

**주의사항**:
- useEffect cleanup에서 channel 제거 필수
- 너무 많은 채널 구독 시 성능 이슈
- RLS 정책 적용 (보안)

### 3. Presence API (온라인 사용자 추적)

**구현**:
```typescript
channel.track({
  user_id: user.id,
  online_at: new Date().toISOString()
})

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  const users = Object.keys(state)
  setOnlineUsers(users)
})
```

**활용**:
- 실시간 온라인 사용자 카운트
- 협업 도구 (누가 페이지를 보고 있는지)
- 타이핑 인디케이터

### 4. Recharts 커스터마이징

**Tooltip 커스텀**:
```typescript
<Tooltip
  content={({ payload }) => (
    <div className="glass-card p-3">
      <p className="font-semibold">{payload[0]?.payload.period}</p>
      <p className="text-blue-600">{formatCurrency(payload[0]?.value)}</p>
    </div>
  )}
/>
```

**반응형**:
```typescript
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    ...
  </LineChart>
</ResponsiveContainer>
```

### 5. 세션 관리 (SessionStorage)

**타임아웃 구현**:
```typescript
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30분

export function getSessionId(): string {
  const stored = sessionStorage.getItem('session_id')
  const timestamp = sessionStorage.getItem('session_timestamp')

  if (stored && timestamp) {
    const elapsed = Date.now() - parseInt(timestamp, 10)
    if (elapsed < SESSION_TIMEOUT) {
      // 타임스탬프 갱신 (활동 연장)
      sessionStorage.setItem('session_timestamp', Date.now().toString())
      return stored
    }
  }

  // 새 세션 생성
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  sessionStorage.setItem('session_id', newSessionId)
  sessionStorage.setItem('session_timestamp', Date.now().toString())

  return newSessionId
}
```

**LocalStorage vs SessionStorage**:
- LocalStorage: 브라우저 종료 후에도 유지
- SessionStorage: 탭 종료 시 삭제 (세션 추적에 적합)

---

## 다음 단계

### 즉시 가능 작업
- [ ] Phase 14 E2E 테스트 작성 (analytics, revenue, realtime)
- [ ] Phase 14 유닛 테스트 작성 (useRevenue, useRealtimeDashboard)
- [ ] 번들 크기 최적화 (recharts 동적 import)

### Phase 15 계획
- [ ] 모니터링 강화 (APM, 로그 수집)
- [ ] 성능 최적화 (쿼리 최적화, 캐싱 전략)
- [ ] 알림 자동화 (매출 목표, 이상 감지)
- [ ] 고급 분석 (코호트 분석, RFM 분석)

### 개선 사항
- [ ] 차트 애니메이션 개선
- [ ] PDF 리포트 생성 (매출 리포트)
- [ ] 대시보드 커스터마이징 (위젯 배치)
- [ ] A/B 테스트 결과 분석 통합

---

**최종 업데이트**: 2025-11-04
**작성자**: Claude Code
**버전**: v1.8.0
