/**
 * Zod 스키마 정의
 *
 * 이벤트 페이로드 검증을 위한 스키마를 정의합니다.
 *
 * @version 1.0.0
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { VALID_SERVICE_IDS, ENVIRONMENTS } from './constants.ts'

// ============================================================================
// 기본 스키마
// ============================================================================

/**
 * 이벤트 메타데이터 스키마
 */
export const EventMetadataSchema = z.object({
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
  environment: z.enum(ENVIRONMENTS),
})

/**
 * BaseEvent 스키마 (@idea-on-action/events 패키지)
 */
export const BaseEventSchema = z.object({
  id: z.string().min(1, '이벤트 ID는 필수입니다'),
  type: z.string().min(1, '이벤트 타입은 필수입니다'),
  service: z.enum(VALID_SERVICE_IDS),
  timestamp: z.string().datetime({ message: '유효한 ISO 8601 타임스탬프가 필요합니다' }),
  version: z.string().min(1, '버전은 필수입니다'),
  metadata: EventMetadataSchema,
  data: z.record(z.unknown()),
})

/**
 * Legacy 페이로드 스키마 (기존 webhook)
 */
export const LegacyPayloadSchema = z.object({
  event_type: z.string().min(1, '이벤트 타입은 필수입니다'),
  payload: z.record(z.unknown()).optional(),
  project_id: z.string().optional(),
  user_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ============================================================================
// 이벤트 타입별 스키마
// ============================================================================

/**
 * 이슈 생성 이벤트 데이터 스키마
 */
export const IssueCreatedDataSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
})

/**
 * 이슈 해결 이벤트 데이터 스키마
 */
export const IssueResolvedDataSchema = z.object({
  issue_id: z.string().uuid('유효한 이슈 ID가 필요합니다'),
  resolution: z.string().optional(),
})

/**
 * 서비스 헬스 이벤트 데이터 스키마
 */
export const ServiceHealthDataSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  metrics: z.record(z.unknown()).optional(),
})

/**
 * API 사용량 이벤트 데이터 스키마
 */
export const ApiUsageDataSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  statusCode: z.number().int().min(100).max(599),
  responseTimeMs: z.number().nonnegative(),
  requestSize: z.number().optional(),
  responseSize: z.number().optional(),
})

/**
 * Agent 실행 이벤트 데이터 스키마
 */
export const AgentExecutedDataSchema = z.object({
  agentType: z.string(),
  action: z.string().optional(),
  executionTimeMs: z.number().nonnegative(),
  tokenUsage: z
    .object({
      input: z.number().nonnegative(),
      output: z.number().nonnegative(),
    })
    .optional(),
  status: z.enum(['success', 'failed', 'partial']),
  errorCode: z.string().optional(),
})

/**
 * 기회 검색 이벤트 데이터 스키마
 */
export const OpportunitySearchedDataSchema = z.object({
  query: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  resultCount: z.number().int().nonnegative(),
  searchType: z.enum(['keyword', 'semantic', 'filter']),
  responseTimeMs: z.number().nonnegative(),
})

/**
 * 소스 동기화 이벤트 데이터 스키마
 */
export const SourceSyncedDataSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.string(),
  recordsIngested: z.number().int().nonnegative(),
  recordsUpdated: z.number().int().nonnegative(),
  recordsSkipped: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  status: z.enum(['success', 'partial', 'failed']),
  errorMessage: z.string().optional(),
})

// ============================================================================
// 타입 추론
// ============================================================================

export type BaseEventPayload = z.infer<typeof BaseEventSchema>
export type LegacyPayload = z.infer<typeof LegacyPayloadSchema>
export type EventMetadata = z.infer<typeof EventMetadataSchema>

// ============================================================================
// 검증 함수
// ============================================================================

/**
 * BaseEvent 형식인지 확인
 */
export function isBaseEventPayload(raw: unknown): raw is BaseEventPayload {
  const result = BaseEventSchema.safeParse(raw)
  return result.success
}

/**
 * Legacy 형식인지 확인
 */
export function isLegacyPayload(raw: unknown): raw is LegacyPayload {
  const result = LegacyPayloadSchema.safeParse(raw)
  return result.success
}

/**
 * 페이로드 검증 (BaseEvent 또는 Legacy)
 */
export function validatePayload(
  raw: unknown
): { success: true; data: BaseEventPayload | LegacyPayload; format: 'base_event' | 'legacy' } | { success: false; error: string } {
  // BaseEvent 형식 시도
  const baseResult = BaseEventSchema.safeParse(raw)
  if (baseResult.success) {
    return { success: true, data: baseResult.data, format: 'base_event' }
  }

  // Legacy 형식 시도
  const legacyResult = LegacyPayloadSchema.safeParse(raw)
  if (legacyResult.success) {
    return { success: true, data: legacyResult.data, format: 'legacy' }
  }

  // 둘 다 실패
  return {
    success: false,
    error: `유효하지 않은 페이로드 형식입니다. BaseEvent 또는 Legacy 형식이 필요합니다. BaseEvent 에러: ${baseResult.error.message}, Legacy 에러: ${legacyResult.error.message}`,
  }
}
