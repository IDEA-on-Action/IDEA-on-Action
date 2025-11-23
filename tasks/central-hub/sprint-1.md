# Central Hub Sprint 1: 웹훅 수신 인프라

> 외부 Minu 서비스로부터 이벤트를 수신하기 위한 기반 인프라 구축

**시작일**: 2025-11-23
**예상 소요**: 2-3시간
**관련 명세**: [spec/central-hub/requirements.md](../../spec/central-hub/requirements.md)
**관련 설계**: [plan/central-hub/architecture.md](../../plan/central-hub/architecture.md)

---

## 목표

1. 외부 서비스에서 진행 상태와 이슈를 전송할 수 있는 웹훅 엔드포인트 구축
2. 이벤트 데이터를 저장할 데이터베이스 테이블 생성
3. 보안을 위한 HMAC 서명 검증 구현

---

## 작업 목록

### TASK-CH-001: service_events 테이블 생성
**예상 시간**: 20분
**상태**: 대기

**작업 내용**:
```sql
-- 마이그레이션 파일: 20251123100000_create_service_events.sql

CREATE TABLE service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  project_id UUID,
  user_id UUID REFERENCES auth.users,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_service CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep'))
);

CREATE INDEX idx_service_events_service ON service_events(service_id);
CREATE INDEX idx_service_events_type ON service_events(event_type);
CREATE INDEX idx_service_events_created ON service_events(created_at DESC);

-- RLS 정책
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service functions can insert events"
ON service_events FOR INSERT
WITH CHECK (true);  -- Edge Function에서 service_role 사용

CREATE POLICY "Admins can read events"
ON service_events FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] 로컬 DB에 적용 테스트
- [ ] RLS 정책 작동 확인

---

### TASK-CH-002: service_issues 테이블 생성
**예상 시간**: 20분
**상태**: 대기

**작업 내용**:
```sql
-- 마이그레이션 파일: 20251123100001_create_service_issues.sql

CREATE TABLE service_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  project_id UUID,
  reported_by UUID REFERENCES auth.users,
  assigned_to UUID REFERENCES auth.users,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_service CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX idx_service_issues_service ON service_issues(service_id);
CREATE INDEX idx_service_issues_status ON service_issues(status);
CREATE INDEX idx_service_issues_severity ON service_issues(severity);

-- RLS 정책
ALTER TABLE service_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service functions can insert issues"
ON service_issues FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can read related issues"
ON service_issues FOR SELECT
TO authenticated
USING (
  reported_by = auth.uid()
  OR assigned_to = auth.uid()
  OR is_admin(auth.uid())
);

CREATE POLICY "Admins can update issues"
ON service_issues FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] 로컬 DB에 적용 테스트
- [ ] RLS 정책 작동 확인

---

### TASK-CH-003: service_health 테이블 생성
**예상 시간**: 15분
**상태**: 대기

**작업 내용**:
```sql
-- 마이그레이션 파일: 20251123100002_create_service_health.sql

CREATE TABLE service_health (
  service_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_health_status CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown'))
);

-- 초기 데이터
INSERT INTO service_health (service_id, status) VALUES
  ('minu-find', 'unknown'),
  ('minu-frame', 'unknown'),
  ('minu-build', 'unknown'),
  ('minu-keep', 'unknown');

-- RLS
ALTER TABLE service_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read health"
ON service_health FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service functions can update health"
ON service_health FOR UPDATE
USING (true);
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] 초기 데이터 삽입 확인
- [ ] RLS 정책 작동 확인

---

### TASK-CH-004: receive-service-event Edge Function 생성
**예상 시간**: 45분
**상태**: 대기

**작업 내용**:
```typescript
// supabase/functions/receive-service-event/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-service-id, x-signature, x-timestamp, content-type',
}

// HMAC 검증
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${expectedSignature}` === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const serviceId = req.headers.get('x-service-id')
    const signature = req.headers.get('x-signature')
    const timestamp = req.headers.get('x-timestamp')

    if (!serviceId || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Timestamp 검증 (5분 이내)
    if (timestamp) {
      const requestTime = new Date(timestamp).getTime()
      const now = Date.now()
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: 'Request timestamp too old' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const body = await req.text()

    // HMAC 서명 검증
    const secret = Deno.env.get(`WEBHOOK_SECRET_${serviceId.toUpperCase().replace('-', '_')}`)
    if (!secret) {
      return new Response(
        JSON.stringify({ error: 'Unknown service' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isValid = await verifySignature(body, signature, secret)
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.parse(body)

    // Supabase 클라이언트 생성
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 이벤트 유형에 따른 처리
    let eventId: string | null = null

    if (payload.event_type === 'issue.created') {
      // 이슈 테이블에 저장
      const { data, error } = await supabase
        .from('service_issues')
        .insert({
          service_id: serviceId,
          severity: payload.payload?.severity || 'medium',
          title: payload.payload?.title || 'Untitled Issue',
          description: payload.payload?.description,
          project_id: payload.project_id,
        })
        .select('id')
        .single()

      if (error) throw error
      eventId = data.id
    } else if (payload.event_type === 'service.health') {
      // 헬스 테이블 업데이트
      const { error } = await supabase
        .from('service_health')
        .upsert({
          service_id: serviceId,
          status: payload.payload?.status || 'healthy',
          last_ping: new Date().toISOString(),
          metrics: payload.payload?.metrics || {},
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    }

    // 모든 이벤트를 이벤트 로그에 저장
    const { data: eventData, error: eventError } = await supabase
      .from('service_events')
      .insert({
        service_id: serviceId,
        event_type: payload.event_type,
        project_id: payload.project_id,
        payload: payload.payload || {},
      })
      .select('id')
      .single()

    if (eventError) throw eventError
    eventId = eventId || eventData.id

    return new Response(
      JSON.stringify({ received: true, event_id: eventId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**완료 조건**:
- [ ] Edge Function 파일 생성
- [ ] HMAC 서명 검증 로직 구현
- [ ] 이벤트 유형별 분기 처리
- [ ] 에러 핸들링

---

### TASK-CH-005: TypeScript 타입 정의
**예상 시간**: 15분
**상태**: 대기

**작업 내용**:
```typescript
// src/types/central-hub.types.ts

export type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';

export type EventType =
  | 'progress.updated'
  | 'task.completed'
  | 'issue.created'
  | 'issue.resolved'
  | 'service.health';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceEvent {
  id: string;
  service_id: ServiceId;
  event_type: EventType;
  project_id?: string;
  user_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ServiceIssue {
  id: string;
  service_id: ServiceId;
  severity: IssueSeverity;
  title: string;
  description?: string;
  status: IssueStatus;
  project_id?: string;
  reported_by?: string;
  assigned_to?: string;
  resolved_at?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceHealth {
  service_id: ServiceId;
  status: HealthStatus;
  last_ping?: string;
  metrics: Record<string, unknown>;
  updated_at: string;
}

export interface WebhookPayload {
  event_type: EventType;
  project_id?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
```

**완료 조건**:
- [ ] 타입 파일 생성
- [ ] 모든 엔티티 타입 정의
- [ ] 웹훅 페이로드 타입 정의

---

### TASK-CH-006: React 훅 생성
**예상 시간**: 30분
**상태**: 대기

**작업 내용**:
```typescript
// src/hooks/useServiceEvents.ts
// src/hooks/useServiceIssues.ts
// src/hooks/useServiceHealth.ts
```

**완료 조건**:
- [ ] useServiceEvents 훅 생성
- [ ] useServiceIssues 훅 생성
- [ ] useServiceHealth 훅 생성
- [ ] Realtime 구독 기능 포함

---

## 검증 계획

### 단위 테스트
- [ ] HMAC 서명 검증 함수 테스트
- [ ] 페이로드 파싱 테스트

### 통합 테스트
- [ ] Edge Function 배포 및 호출 테스트
- [ ] DB 저장 확인
- [ ] Realtime 이벤트 수신 확인

### 보안 테스트
- [ ] 잘못된 서명으로 요청 시 거부 확인
- [ ] 만료된 타임스탬프 요청 거부 확인
- [ ] RLS 정책 동작 확인

---

## 완료 조건

- [ ] 3개 테이블 마이그레이션 완료
- [ ] Edge Function 배포 완료
- [ ] TypeScript 타입 정의 완료
- [ ] React 훅 생성 완료
- [ ] 기본 테스트 통과

---

## 다음 Sprint

Sprint 2: MCP 통합 확대 (Minu Frame, Build, Keep 페이지)
