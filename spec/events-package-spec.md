# @idea-on-action/events 패키지 명세

> **패키지명**: `@idea-on-action/events`
> **버전**: 1.0.0
> **위치**: Minu-Shared 저장소 (`packages/events/`)
> **목적**: Minu 시리즈 서비스 → ideaonaction.ai Outbound 이벤트 발송

---

## 1. 개요

### 1.1 배경

Minu 시리즈 서비스들(Find, Frame, Build, Keep, Portal)에서 생성된 서비스 데이터를 ideaonaction.ai로 전송하기 위한 공통 이벤트 클라이언트 패키지입니다.

### 1.2 목표

- 5개 서비스에서 동일한 이벤트 발송 패턴 사용
- 재시도, 배치 발송, 버퍼링 등 안정적인 이벤트 전송
- TypeScript 타입 안전성 보장
- 기존 `@idea-on-action/*` 패키지 체계와 일관성 유지

### 1.3 범위

| 포함 | 미포함 |
|------|--------|
| 이벤트 타입 정의 | 이벤트 수신 (ideaonaction.ai 측) |
| EventClient 클래스 | 서비스별 비즈니스 로직 |
| 재시도/백오프 로직 | 데이터베이스 연동 |
| 배치 발송 | UI 컴포넌트 |
| 메모리 버퍼링 | - |

---

## 2. 패키지 구조

```
packages/events/
├── src/
│   ├── types/
│   │   ├── index.ts          # 타입 re-export
│   │   ├── base.ts           # BaseEvent, EventMetadata, ServiceName
│   │   ├── usage.ts          # 사용량 이벤트 타입
│   │   ├── activity.ts       # 사용자 활동 이벤트 타입
│   │   └── system.ts         # 시스템 이벤트 타입
│   ├── client/
│   │   ├── index.ts          # 클라이언트 re-export
│   │   ├── event-client.ts   # EventClient 클래스
│   │   ├── config.ts         # EventClientConfig 인터페이스
│   │   └── retry.ts          # 재시도/백오프 유틸리티
│   ├── buffer/
│   │   ├── index.ts          # 버퍼 re-export
│   │   ├── types.ts          # 버퍼 인터페이스
│   │   └── memory-buffer.ts  # 인메모리 버퍼 구현
│   ├── batch/
│   │   ├── index.ts          # 배치 re-export
│   │   └── batch-processor.ts # 배치 발송 처리
│   ├── utils/
│   │   ├── index.ts          # 유틸리티 re-export
│   │   └── id.ts             # 이벤트 ID 생성
│   └── index.ts              # 패키지 진입점
├── __tests__/
│   ├── event-client.test.ts
│   ├── retry.test.ts
│   ├── memory-buffer.test.ts
│   └── batch-processor.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

---

## 3. 타입 정의

### 3.1 기본 타입 (base.ts)

```typescript
/**
 * 서비스 식별자
 */
export type ServiceName = 'find' | 'frame' | 'build' | 'keep' | 'portal';

/**
 * 이벤트 메타데이터
 */
export interface EventMetadata {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  correlationId?: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * 기본 이벤트 인터페이스
 */
export interface BaseEvent<T extends string = string, D = Record<string, unknown>> {
  id: string;                    // 고유 이벤트 ID (nanoid)
  type: T;                       // 이벤트 타입
  service: ServiceName;          // 발신 서비스
  timestamp: string;             // ISO 8601
  version: string;               // 스키마 버전 (예: '1.0')
  metadata: EventMetadata;
  data: D;
}

/**
 * 이벤트 생성 페이로드 (id, timestamp, service, version 자동 생성)
 */
export type EventPayload<T extends string = string, D = Record<string, unknown>> = {
  type: T;
  metadata?: Partial<EventMetadata>;
  data: D;
};
```

### 3.2 사용량 이벤트 (usage.ts)

```typescript
import { BaseEvent, EventPayload } from './base';

/**
 * API 사용량 보고 이벤트
 */
export interface ApiUsageEvent extends BaseEvent<'api.usage_reported'> {
  data: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    statusCode: number;
    responseTimeMs: number;
    requestSize?: number;
    responseSize?: number;
  };
}

/**
 * Agent 실행 이벤트
 */
export interface AgentExecutedEvent extends BaseEvent<'agent.executed'> {
  data: {
    agentType: string;
    action?: string;
    executionTimeMs: number;
    tokenUsage?: {
      input: number;
      output: number;
    };
    status: 'success' | 'failed' | 'partial';
    errorCode?: string;
  };
}

/**
 * 기회 검색 이벤트 (Find 전용)
 */
export interface OpportunitySearchedEvent extends BaseEvent<'opportunity.searched'> {
  data: {
    query?: string;
    filters?: Record<string, unknown>;
    resultCount: number;
    searchType: 'keyword' | 'semantic' | 'filter';
    responseTimeMs: number;
  };
}

/**
 * 사용량 이벤트 유니온
 */
export type UsageEvent =
  | ApiUsageEvent
  | AgentExecutedEvent
  | OpportunitySearchedEvent;

/**
 * 사용량 이벤트 타입 열거형
 */
export type UsageEventType = UsageEvent['type'];
```

### 3.3 사용자 활동 이벤트 (activity.ts)

```typescript
import { BaseEvent } from './base';

/**
 * 기회 상세 조회 이벤트
 */
export interface OpportunityViewedEvent extends BaseEvent<'user.opportunity_viewed'> {
  data: {
    opportunityId: string;
    opportunityTitle?: string;
    source?: string;
    viewDurationMs?: number;
  };
}

/**
 * 필터 생성 이벤트
 */
export interface FilterCreatedEvent extends BaseEvent<'user.filter_created'> {
  data: {
    filterId: string;
    filterName?: string;
    filterType: string;
    criteria: Record<string, unknown>;
  };
}

/**
 * 브리핑 공유 이벤트
 */
export interface BriefingSharedEvent extends BaseEvent<'user.briefing_shared'> {
  data: {
    briefingId: string;
    briefingType: 'morning' | 'evening' | 'weekly';
    shareChannel: 'email' | 'slack' | 'link';
    recipientCount?: number;
  };
}

/**
 * 즐겨찾기 추가 이벤트
 */
export interface FavoriteAddedEvent extends BaseEvent<'user.favorite_added'> {
  data: {
    itemId: string;
    itemType: 'opportunity' | 'proposal' | 'project';
  };
}

/**
 * 사용자 활동 이벤트 유니온
 */
export type ActivityEvent =
  | OpportunityViewedEvent
  | FilterCreatedEvent
  | BriefingSharedEvent
  | FavoriteAddedEvent;

/**
 * 사용자 활동 이벤트 타입 열거형
 */
export type ActivityEventType = ActivityEvent['type'];
```

### 3.4 시스템 이벤트 (system.ts)

```typescript
import { BaseEvent } from './base';

/**
 * 소스 동기화 완료 이벤트
 */
export interface SourceSyncedEvent extends BaseEvent<'source.synced'> {
  data: {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    recordsIngested: number;
    recordsUpdated: number;
    recordsSkipped: number;
    durationMs: number;
    status: 'success' | 'partial' | 'failed';
    errorMessage?: string;
  };
}

/**
 * 기회 수집 이벤트
 */
export interface OpportunityIngestedEvent extends BaseEvent<'opportunity.ingested'> {
  data: {
    opportunityId: string;
    sourceId: string;
    isNew: boolean;
    category?: string;
    domain?: string;
  };
}

/**
 * 시스템 헬스 체크 이벤트
 */
export interface HealthCheckEvent extends BaseEvent<'system.health_check'> {
  data: {
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTimeMs: number;
    details?: Record<string, unknown>;
  };
}

/**
 * 시스템 이벤트 유니온
 */
export type SystemEvent =
  | SourceSyncedEvent
  | OpportunityIngestedEvent
  | HealthCheckEvent;

/**
 * 시스템 이벤트 타입 열거형
 */
export type SystemEventType = SystemEvent['type'];
```

---

## 4. EventClient 설계

### 4.1 설정 인터페이스 (config.ts)

```typescript
import { ServiceName } from '../types/base';

/**
 * 재시도 설정
 */
export interface RetryConfig {
  maxRetries: number;           // 기본: 3
  initialDelayMs: number;       // 기본: 1000
  maxDelayMs: number;           // 기본: 30000
  backoffMultiplier: number;    // 기본: 2
}

/**
 * 배치 설정
 */
export interface BatchConfig {
  maxBatchSize: number;         // 기본: 100
  flushIntervalMs: number;      // 기본: 5000 (5초)
}

/**
 * 버퍼 설정
 */
export interface BufferConfig {
  maxSize: number;              // 기본: 10000
  onOverflow: 'drop-oldest' | 'drop-newest' | 'error';
}

/**
 * EventClient 설정
 */
export interface EventClientConfig {
  /** ideaonaction.ai 이벤트 수신 엔드포인트 */
  endpoint: string;

  /** 서비스 JWT 토큰 또는 토큰 제공 함수 */
  getToken: () => string | Promise<string>;

  /** 발신 서비스 식별자 */
  service: ServiceName;

  /** 환경 */
  environment: 'development' | 'staging' | 'production';

  /** 스키마 버전 (기본: '1.0') */
  schemaVersion?: string;

  /** 재시도 설정 */
  retry?: Partial<RetryConfig>;

  /** 배치 설정 */
  batch?: Partial<BatchConfig>;

  /** 버퍼 설정 */
  buffer?: Partial<BufferConfig>;

  /** 디버그 모드 (로깅 활성화) */
  debug?: boolean;

  /** 비활성화 (이벤트 발송 안함, 테스트용) */
  disabled?: boolean;
}

/**
 * 기본 설정값
 */
export const DEFAULT_CONFIG = {
  schemaVersion: '1.0',
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  batch: {
    maxBatchSize: 100,
    flushIntervalMs: 5000,
  },
  buffer: {
    maxSize: 10000,
    onOverflow: 'drop-oldest' as const,
  },
  debug: false,
  disabled: false,
} as const;
```

### 4.2 EventClient API

```typescript
class EventClient {
  // 즉시 발송 (중요 이벤트)
  async send<T, D>(payload: EventPayload<T, D>): Promise<SendResult>;

  // 배치 큐에 추가 (일반 이벤트)
  enqueue<T, D>(payload: EventPayload<T, D>): void;

  // 수동 플러시
  async flush(): Promise<FlushResult>;

  // 상태 확인
  isHealthy(): boolean;
  getPendingCount(): number;
  getStatus(): ClientStatus;

  // 클린업
  async shutdown(): Promise<void>;
}

// 팩토리 함수
function createEventClient(config: EventClientConfig): EventClient;
```

---

## 5. 사용 예시

### 5.1 기본 사용법

```typescript
import { createEventClient } from '@idea-on-action/events';

const eventClient = createEventClient({
  endpoint: process.env.IDEAONACTION_EVENTS_ENDPOINT!,
  getToken: () => process.env.SERVICE_JWT_TOKEN!,
  service: 'find',
  environment: process.env.NODE_ENV as 'development' | 'production',
});

// 즉시 발송 (중요 이벤트)
await eventClient.send({
  type: 'agent.executed',
  data: {
    agentType: 'discovery',
    executionTimeMs: 1234,
    status: 'success',
  },
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
  },
});

// 배치 큐에 추가 (일반 이벤트)
eventClient.enqueue({
  type: 'user.opportunity_viewed',
  data: {
    opportunityId: 'opp-789',
    opportunityTitle: 'AI 시스템 구축',
  },
  metadata: {
    userId: 'user-123',
  },
});

// 종료 시 클린업
await eventClient.shutdown();
```

---

## 6. 패키지 설정

### 6.1 package.json

```json
{
  "name": "@idea-on-action/events",
  "version": "1.0.0",
  "description": "Event client for Minu services to ideaonaction.ai",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/IDEA-on-Action/Minu-Shared.git",
    "directory": "packages/events"
  },
  "keywords": ["minu", "events", "ideaonaction", "analytics"],
  "license": "MIT"
}
```

---

## 7. 구현 일정

| 단계 | 작업 | 예상 기간 |
|------|------|----------|
| 1 | 프로젝트 설정 (package.json, tsconfig) | 0.5일 |
| 2 | 타입 정의 (base, usage, activity, system) | 1일 |
| 3 | EventClient 코어 구현 | 1.5일 |
| 4 | 재시도/백오프 로직 | 0.5일 |
| 5 | 메모리 버퍼 & 배치 프로세서 | 0.5일 |
| 6 | 단위 테스트 | 1일 |
| 7 | 문서화 & 패키지 배포 | 0.5일 |
| **총계** | | **5.5일** |

---

## 8. 의존성

### 런타임 의존성

- `nanoid` - 이벤트 ID 생성

### 개발 의존성

- `typescript` ^5.3.0
- `tsup` ^8.0.0
- `vitest` ^1.0.0
- `@types/node` ^20.0.0
