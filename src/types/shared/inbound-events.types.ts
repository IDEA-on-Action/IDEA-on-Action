/**
 * Inbound 이벤트 타입 정의
 *
 * Minu 서비스들(Find, Frame, Build, Keep, Portal)에서 발송하는
 * Outbound 이벤트를 ideaonaction.ai에서 수신하기 위한 타입 정의
 *
 * @see spec/events-package-spec.md
 * @see spec/outbound-events-spec.md
 */

// ============================================================================
// 기본 타입
// ============================================================================

/**
 * Minu 서비스 식별자
 */
export type ServiceName = 'find' | 'frame' | 'build' | 'keep' | 'portal';

/**
 * 환경 구분
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * 이벤트 메타데이터
 */
export interface EventMetadata {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  correlationId?: string;
  environment: Environment;
}

/**
 * 기본 이벤트 인터페이스
 */
export interface BaseEvent<T extends string = string, D = Record<string, unknown>> {
  /** 고유 이벤트 ID (nanoid) */
  id: string;
  /** 이벤트 타입 */
  type: T;
  /** 발신 서비스 */
  service: ServiceName;
  /** ISO 8601 타임스탬프 */
  timestamp: string;
  /** 스키마 버전 (예: '1.0') */
  version: string;
  /** 이벤트 메타데이터 */
  metadata: EventMetadata;
  /** 이벤트 페이로드 */
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

// ============================================================================
// 사용량 이벤트 (Usage Events)
// ============================================================================

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
export type UsageEvent = ApiUsageEvent | AgentExecutedEvent | OpportunitySearchedEvent;

/**
 * 사용량 이벤트 타입
 */
export type UsageEventType = UsageEvent['type'];

// ============================================================================
// 사용자 활동 이벤트 (Activity Events)
// ============================================================================

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
 * 사용자 활동 이벤트 타입
 */
export type ActivityEventType = ActivityEvent['type'];

// ============================================================================
// 시스템 이벤트 (System Events)
// ============================================================================

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
export type SystemEvent = SourceSyncedEvent | OpportunityIngestedEvent | HealthCheckEvent;

/**
 * 시스템 이벤트 타입
 */
export type SystemEventType = SystemEvent['type'];

// ============================================================================
// 통합 타입
// ============================================================================

/**
 * 모든 Inbound 이벤트 유니온
 */
export type InboundEvent = UsageEvent | ActivityEvent | SystemEvent;

/**
 * 모든 Inbound 이벤트 타입
 */
export type InboundEventType = InboundEvent['type'];

/**
 * 이벤트 타입별 데이터 타입 매핑
 */
export type EventDataMap = {
  'api.usage_reported': ApiUsageEvent['data'];
  'agent.executed': AgentExecutedEvent['data'];
  'opportunity.searched': OpportunitySearchedEvent['data'];
  'user.opportunity_viewed': OpportunityViewedEvent['data'];
  'user.filter_created': FilterCreatedEvent['data'];
  'user.briefing_shared': BriefingSharedEvent['data'];
  'user.favorite_added': FavoriteAddedEvent['data'];
  'source.synced': SourceSyncedEvent['data'];
  'opportunity.ingested': OpportunityIngestedEvent['data'];
  'system.health_check': HealthCheckEvent['data'];
};

// ============================================================================
// 유틸리티 타입
// ============================================================================

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
 * 이벤트 우선순위
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * 이벤트 처리 상태
 */
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed';
