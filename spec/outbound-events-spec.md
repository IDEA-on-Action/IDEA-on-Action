# Minu Find Outbound 이벤트 연동 명세

> **프로젝트**: Minu Find
> **버전**: 0.8.x
> **목적**: Minu Find 서비스 데이터를 ideaonaction.ai로 전송
> **의존성**: `@idea-on-action/events` 패키지

---

## 1. 개요

### 1.1 배경

현재 Minu Find는 ideaonaction.ai로부터 **Inbound 데이터(구독, 사용자)**만 수신하고 있습니다. 플랜별 기능 제한 및 사용량 분석을 위해 **Outbound 이벤트 발송**이 필요합니다.

### 1.2 목표

- 사용량 이벤트 발송으로 플랜별 기능 제한 지원
- 사용자 활동 이벤트로 서비스 분석 지원
- 시스템 이벤트로 운영 모니터링 지원

### 1.3 범위

| 포함 | 미포함 |
|------|--------|
| `@idea-on-action/events` 패키지 통합 | 패키지 개발 (Minu-Shared) |
| 이벤트 발송 포인트 구현 | 이벤트 수신 API (Portal) |
| 환경 변수 설정 | 대시보드 UI |

---

## 2. 아키텍처

### 2.1 데이터 흐름

```
Minu Find
    │
    ├── API Routes (/api/*)
    │   └── 이벤트 발생
    │
    ├── EventClient (싱글톤)
    │   ├── enqueue() - 배치 큐에 추가
    │   └── send() - 즉시 발송
    │
    └── 자동 플러시 (5초 간격)
            │
            ▼
    ideaonaction.ai
    POST /api/events
```

### 2.2 파일 구조

```
src/
├── lib/
│   └── events/
│       ├── client.ts         # EventClient 싱글톤
│       ├── types.ts          # Find 전용 이벤트 타입 확장
│       └── middleware.ts     # 이벤트 발송 미들웨어 (선택)
├── app/
│   └── api/
│       ├── agents/*/route.ts      # Agent 이벤트 발송
│       ├── opportunities/route.ts  # 검색 이벤트 발송
│       └── cron/collect/route.ts   # 시스템 이벤트 발송
```

---

## 3. 구현 상세

### 3.1 EventClient 싱글톤 (src/lib/events/client.ts)

```typescript
import { createEventClient, EventClient } from '@idea-on-action/events';

let eventClient: EventClient | null = null;

/**
 * EventClient 싱글톤 인스턴스 반환
 */
export function getEventClient(): EventClient {
  if (!eventClient) {
    eventClient = createEventClient({
      endpoint: process.env.IDEAONACTION_EVENTS_ENDPOINT!,
      getToken: async () => {
        return process.env.IDEAONACTION_SERVICE_TOKEN!;
      },
      service: 'find',
      environment: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',
      debug: process.env.NODE_ENV === 'development',
      disabled: process.env.DISABLE_EVENTS === 'true',
    });
  }
  return eventClient;
}

/**
 * 이벤트 클라이언트 종료 (graceful shutdown)
 */
export async function shutdownEventClient(): Promise<void> {
  if (eventClient) {
    await eventClient.shutdown();
    eventClient = null;
  }
}
```

### 3.2 Find 전용 타입 확장 (src/lib/events/types.ts)

```typescript
import { EventPayload } from '@idea-on-action/events';

/**
 * Find 서비스 전용 Agent 타입
 */
export type FindAgentType =
  | 'discovery'
  | 'ranking'
  | 'research'
  | 'solution'
  | 'briefing'
  | 'proposal'
  | 'weak-signal';

/**
 * Find 서비스 전용 이벤트 페이로드 헬퍼
 */
export interface FindEventPayloads {
  'agent.executed': EventPayload<'agent.executed', {
    agentType: FindAgentType;
    action?: string;
    executionTimeMs: number;
    tokenUsage?: { input: number; output: number };
    status: 'success' | 'failed' | 'partial';
    errorCode?: string;
  }>;

  'opportunity.searched': EventPayload<'opportunity.searched', {
    query?: string;
    filters?: Record<string, unknown>;
    resultCount: number;
    searchType: 'keyword' | 'semantic' | 'filter';
    responseTimeMs: number;
  }>;

  'user.opportunity_viewed': EventPayload<'user.opportunity_viewed', {
    opportunityId: string;
    opportunityTitle?: string;
    source?: string;
    domain?: string;
  }>;

  'user.filter_created': EventPayload<'user.filter_created', {
    filterId: string;
    filterName?: string;
    filterType: string;
    criteria: Record<string, unknown>;
  }>;

  'user.briefing_shared': EventPayload<'user.briefing_shared', {
    briefingId: string;
    briefingType: 'morning' | 'evening' | 'weekly';
    shareChannel: 'email' | 'slack' | 'link';
    recipientCount?: number;
  }>;

  'source.synced': EventPayload<'source.synced', {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    recordsIngested: number;
    recordsUpdated: number;
    recordsSkipped: number;
    durationMs: number;
    status: 'success' | 'partial' | 'failed';
    errorMessage?: string;
  }>;
}

/**
 * 타입 안전 이벤트 발송 헬퍼
 */
export function createFindEvent<K extends keyof FindEventPayloads>(
  type: K,
  data: FindEventPayloads[K]['data'],
  metadata?: Partial<FindEventPayloads[K]['metadata']>
): FindEventPayloads[K] {
  return { type, data, metadata } as FindEventPayloads[K];
}
```

---

## 4. 이벤트 발송 포인트

### 4.1 사용량 이벤트 (P0 - 필수)

#### Agent 실행 이벤트

**파일**: `src/app/api/agents/*/route.ts`

| 라우트 | Agent 타입 |
|--------|-----------|
| `/api/agents/discovery` | discovery |
| `/api/agents/ranking` | ranking |
| `/api/agents/research` | research |
| `/api/agents/solution` | solution |
| `/api/agents/briefing` | briefing |
| `/api/agents/proposal` | proposal |
| `/api/agents/weak-signal` | weak-signal |

```typescript
// 예시: src/app/api/agents/discovery/route.ts
getEventClient().enqueue(
  createFindEvent('agent.executed', {
    agentType: 'discovery',
    executionTimeMs: Date.now() - startTime,
    status: 'success',
  }, { userId, sessionId })
);
```

#### 기회 검색 이벤트

**파일**: `src/app/api/opportunities/route.ts`

```typescript
getEventClient().enqueue(
  createFindEvent('opportunity.searched', {
    query: query || undefined,
    filters: filters,
    resultCount: result.total,
    searchType: query ? 'keyword' : 'filter',
    responseTimeMs: Date.now() - startTime,
  }, { userId, sessionId })
);
```

---

### 4.2 사용자 활동 이벤트 (P1 - 분석용)

| 이벤트 | 파일 |
|--------|------|
| `user.opportunity_viewed` | `src/app/api/opportunities/[id]/route.ts` |
| `user.filter_created` | `src/app/api/filters/presets/route.ts` |
| `user.briefing_shared` | `src/app/api/share/route.ts` |

---

### 4.3 시스템 이벤트 (P2 - 모니터링)

| 이벤트 | 파일 |
|--------|------|
| `source.synced` | `src/app/api/cron/collect/route.ts` |

---

## 5. 환경 변수

### 5.1 필수 환경 변수

```bash
# ideaonaction.ai 이벤트 수신 엔드포인트
IDEAONACTION_EVENTS_ENDPOINT=https://api.ideaonaction.ai/events

# 서비스 인증 토큰 (JWT)
IDEAONACTION_SERVICE_TOKEN=eyJhbGciOiJIUzI1NiIs...
```

### 5.2 선택 환경 변수

```bash
# 이벤트 발송 비활성화 (테스트용)
DISABLE_EVENTS=false
```

---

## 6. 에러 처리

### 6.1 이벤트 발송 실패 시

```typescript
// 이벤트 발송 실패는 비즈니스 로직에 영향을 주지 않음
try {
  getEventClient().enqueue(event);
} catch (error) {
  logger.warn('Event enqueue failed', { error, event });
}
```

### 6.2 EventClient 초기화 실패 시

```typescript
export function getEventClient(): EventClient {
  if (!eventClient) {
    try {
      eventClient = createEventClient(config);
    } catch (error) {
      logger.error('EventClient initialization failed', { error });
      return createNoOpClient(); // NoOp 클라이언트 반환
    }
  }
  return eventClient;
}
```

---

## 7. 구현 일정

| 단계 | 작업 | 예상 기간 |
|------|------|----------|
| 1 | 패키지 설치 및 환경 변수 설정 | 0.5일 |
| 2 | EventClient 싱글톤 및 타입 구현 | 0.5일 |
| 3 | Agent 라우트 이벤트 통합 (7개) | 1일 |
| 4 | 기회 검색 이벤트 통합 | 0.5일 |
| 5 | 사용자 활동 이벤트 통합 | 0.5일 |
| 6 | 시스템 이벤트 통합 | 0.5일 |
| 7 | 테스트 및 검증 | 1일 |
| **총계** | | **4.5일** |

---

## 8. 체크리스트

### 구현 전

- [ ] `@idea-on-action/events` 패키지 배포 완료 확인
- [ ] ideaonaction.ai 이벤트 수신 API 준비 확인
- [ ] 환경 변수 값 준비 (endpoint, token)

### 구현 중

- [ ] `src/lib/events/client.ts` 생성
- [ ] `src/lib/events/types.ts` 생성
- [ ] Agent 라우트 이벤트 통합 (7개)
- [ ] 기회 검색 이벤트 통합
- [ ] 기회 상세 조회 이벤트 통합
- [ ] 필터 생성 이벤트 통합
- [ ] 브리핑 공유 이벤트 통합
- [ ] 소스 동기화 이벤트 통합

### 구현 후

- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] staging 환경 검증
- [ ] production 배포

---

## 9. 관련 파일

### 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `package.json` | `@idea-on-action/events` 의존성 추가 |
| `.env.example` | 이벤트 관련 환경 변수 추가 |
| `src/app/api/agents/*/route.ts` | Agent 이벤트 발송 추가 |
| `src/app/api/opportunities/route.ts` | 검색 이벤트 발송 추가 |
| `src/app/api/opportunities/[id]/route.ts` | 조회 이벤트 발송 추가 |
| `src/app/api/filters/presets/route.ts` | 필터 생성 이벤트 추가 |
| `src/app/api/share/route.ts` | 공유 이벤트 발송 추가 |
| `src/app/api/cron/collect/route.ts` | 동기화 이벤트 발송 추가 |

### 신규 생성 파일

| 파일 | 설명 |
|------|------|
| `src/lib/events/client.ts` | EventClient 싱글톤 |
| `src/lib/events/types.ts` | Find 전용 이벤트 타입 |
| `src/lib/events/__tests__/client.test.ts` | 단위 테스트 |
