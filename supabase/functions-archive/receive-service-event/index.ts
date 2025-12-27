/**
 * receive-service-event Edge Function
 *
 * 외부 Minu 서비스에서 발생한 이벤트를 수신하고 저장합니다.
 *
 * 인증 방식 (하이브리드):
 * 1. JWT Bearer 토큰 (Authorization: Bearer <token>)
 * 2. HMAC-SHA256 서명 (X-Signature 헤더)
 *
 * 페이로드 형식 (두 가지 모두 지원):
 * 1. BaseEvent 형식 (@idea-on-action/events 패키지)
 * 2. Legacy 형식 (기존 webhook)
 *
 * @endpoint POST /functions/v1/receive-service-event
 *
 * @headers (JWT 방식)
 *   Authorization: Bearer <JWT_TOKEN>
 *
 * @headers (HMAC 방식)
 *   X-Service-Id: 서비스 ID (minu-find, minu-frame, minu-build, minu-keep)
 *   X-Signature: HMAC-SHA256 서명 (sha256=...)
 *   X-Timestamp: 요청 타임스탬프 (ISO 8601, 선택)
 *
 * @body BaseEventPayload | LegacyPayload
 *
 * @version 2.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { updateUsageCount } from '../_shared/usage-tracker.ts'
import { verifyJWTToken, hasRequiredScopes } from '../_shared/jwt-verify.ts'
import { VALID_SERVICE_IDS, TIMESTAMP_TOLERANCE_MS } from '../_shared/constants.ts'
import { ErrorCodes, ErrorMessages } from '../_shared/error-codes.ts'
import {
  validatePayload,
  type BaseEventPayload,
  type LegacyPayload,
} from '../_shared/schemas.ts'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 인증 방식
 */
type AuthMethod = 'jwt' | 'hmac'

/**
 * 정규화된 이벤트
 */
interface NormalizedEvent {
  event_type: string
  payload: Record<string, unknown>
  project_id?: string
  user_id?: string
  metadata?: Record<string, unknown>
  schema_version: 'legacy' | 'base_event'
  event_id?: string // BaseEvent의 경우 원본 이벤트 ID
}

// ============================================================================
// CORS 헤더 (전역)
// ============================================================================

const defaultCorsHeaders = getCorsHeaders(null)

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * HMAC-SHA256 서명 검증
 */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    )

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return `sha256=${expectedSignature}` === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * 타임스탬프 검증 (5분 이내)
 */
function verifyTimestamp(timestamp: string): boolean {
  try {
    const requestTime = new Date(timestamp).getTime()
    const now = Date.now()
    return Math.abs(now - requestTime) <= TIMESTAMP_TOLERANCE_MS
  } catch {
    return false
  }
}

/**
 * BaseEvent 형식인지 확인 (간단한 타입 가드)
 */
function isBaseEventFormat(raw: unknown): raw is BaseEventPayload {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  return (
    typeof obj.type === 'string' &&
    typeof obj.data === 'object' &&
    typeof obj.metadata === 'object' &&
    typeof obj.service === 'string'
  )
}

/**
 * 페이로드 정규화 (두 스키마 지원)
 */
function normalizePayload(raw: LegacyPayload | BaseEventPayload): NormalizedEvent {
  // BaseEvent 형식
  if (isBaseEventFormat(raw)) {
    const baseEvent = raw as BaseEventPayload
    return {
      event_type: baseEvent.type,
      payload: baseEvent.data as Record<string, unknown>,
      project_id: undefined,
      user_id: baseEvent.metadata?.userId,
      metadata: baseEvent.metadata as Record<string, unknown>,
      schema_version: 'base_event',
      event_id: baseEvent.id, // 원본 이벤트 ID 보존
    }
  }

  // Legacy 형식
  const legacy = raw as LegacyPayload
  return {
    event_type: legacy.event_type,
    payload: (legacy.payload || {}) as Record<string, unknown>,
    project_id: legacy.project_id,
    user_id: legacy.user_id || legacy.metadata?.userId,
    metadata: legacy.metadata as Record<string, unknown>,
    schema_version: 'legacy',
  }
}

/**
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({
      error: { code, message },
      received: false,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * 성공 응답 생성
 */
function successResponse(eventId: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ received: true, event_id: eventId }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // POST만 허용
  if (req.method !== 'POST') {
    return errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, ErrorMessages[ErrorCodes.METHOD_NOT_ALLOWED], 405, corsHeaders)
  }

  try {
    // ========================================================================
    // 1. 인증 (하이브리드: JWT 또는 HMAC)
    // ========================================================================

    const authHeader = req.headers.get('authorization')
    const signature = req.headers.get('x-signature')
    const timestamp = req.headers.get('x-timestamp')

    let serviceId: string | null = null
    let authMethod: AuthMethod | null = null

    // 요청 본문 읽기 (인증 검증에 필요)
    const body = await req.text()

    if (!body) {
      return errorResponse(ErrorCodes.EMPTY_BODY, ErrorMessages[ErrorCodes.EMPTY_BODY], 400, corsHeaders)
    }

    // 방법 1: JWT Bearer 토큰
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const result = await verifyJWTToken(token)

      if (!result.valid) {
        console.warn(`JWT authentication failed: ${result.errorCode}`)
        return errorResponse(result.errorCode || ErrorCodes.UNAUTHORIZED, result.error || ErrorMessages[ErrorCodes.UNAUTHORIZED], 401, corsHeaders)
      }

      // events:write scope 확인
      if (!hasRequiredScopes(result.payload!, ['events:write'])) {
        return errorResponse(ErrorCodes.INSUFFICIENT_SCOPE, 'events:write 권한이 필요합니다.', 403, corsHeaders)
      }

      serviceId = result.payload!.sub
      authMethod = 'jwt'
      console.log(`JWT auth success: service=${serviceId}, client=${result.payload!.client_id}`)
    }
    // 방법 2: HMAC-SHA256 서명
    else if (signature) {
      serviceId = req.headers.get('x-service-id')

      if (!serviceId) {
        return errorResponse(ErrorCodes.MISSING_HEADER, 'X-Service-Id 헤더가 필요합니다.', 400, corsHeaders)
      }

      if (!VALID_SERVICE_IDS.includes(serviceId as typeof VALID_SERVICE_IDS[number])) {
        return errorResponse(ErrorCodes.INVALID_SERVICE, ErrorMessages[ErrorCodes.INVALID_SERVICE], 400, corsHeaders)
      }

      // 타임스탬프 검증 (있으면)
      if (timestamp && !verifyTimestamp(timestamp)) {
        return errorResponse(ErrorCodes.INVALID_TIMESTAMP, ErrorMessages[ErrorCodes.INVALID_TIMESTAMP], 401, corsHeaders)
      }

      // 웹훅 시크릿 조회
      const secretEnvName = `WEBHOOK_SECRET_${serviceId.toUpperCase().replace(/-/g, '_')}`
      const secret = Deno.env.get(secretEnvName)

      if (!secret) {
        console.error(`Missing webhook secret for service: ${serviceId}`)
        return errorResponse(ErrorCodes.CONFIG_ERROR, ErrorMessages[ErrorCodes.CONFIG_ERROR], 500, corsHeaders)
      }

      // HMAC 서명 검증
      const isValidSignature = await verifySignature(body, signature, secret)

      if (!isValidSignature) {
        console.warn(`Invalid HMAC signature for service: ${serviceId}`)
        return errorResponse(ErrorCodes.INVALID_SIGNATURE, ErrorMessages[ErrorCodes.INVALID_SIGNATURE], 401, corsHeaders)
      }

      authMethod = 'hmac'
      console.log(`HMAC auth success: service=${serviceId}`)
    }
    // 인증 정보 없음
    else {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '인증 정보가 필요합니다. (Authorization 헤더 또는 X-Signature)', 401, corsHeaders)
    }

    // ========================================================================
    // 2. 페이로드 파싱 및 정규화
    // ========================================================================

    let rawPayload: unknown
    try {
      rawPayload = JSON.parse(body)
    } catch {
      return errorResponse(ErrorCodes.INVALID_JSON, ErrorMessages[ErrorCodes.INVALID_JSON], 400, corsHeaders)
    }

    // 스키마 검증
    const validationResult = validatePayload(rawPayload)
    if (!validationResult.success) {
      console.warn(`Payload validation failed: ${validationResult.error}`)
      return errorResponse(ErrorCodes.INVALID_PAYLOAD, validationResult.error, 400, corsHeaders)
    }

    // 정규화
    const normalized = normalizePayload(validationResult.data)

    // 필수 필드 검증 (추가 안전장치)
    if (!normalized.event_type) {
      return errorResponse(ErrorCodes.INVALID_PAYLOAD, 'event_type (또는 type) 필드가 필요합니다.', 400, corsHeaders)
    }

    console.log(`Event: ${normalized.event_type} from ${serviceId} (schema: ${normalized.schema_version})`)

    // ========================================================================
    // 3. Supabase 클라이언트 생성
    // ========================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return errorResponse(ErrorCodes.CONFIG_ERROR, ErrorMessages[ErrorCodes.CONFIG_ERROR], 500, corsHeaders)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let eventId: string | null = null

    // ========================================================================
    // 4. 이벤트 유형별 처리
    // ========================================================================

    switch (normalized.event_type) {
      case 'issue.created': {
        const { data: issueData, error: issueError } = await supabase
          .from('service_issues')
          .insert({
            service_id: serviceId,
            severity: normalized.payload?.severity || 'medium',
            title: normalized.payload?.title || 'Untitled Issue',
            description: normalized.payload?.description,
            project_id: normalized.project_id,
            reported_by: normalized.user_id,
          })
          .select('id')
          .single()

        if (issueError) {
          console.error('Error inserting issue:', issueError)
          throw issueError
        }

        eventId = issueData.id

        // Critical/High 이슈는 알림 생성
        if (['critical', 'high'].includes(String(normalized.payload?.severity))) {
          await createNotification(
            supabase,
            `[${serviceId}] ${String(normalized.payload?.severity).toUpperCase()} 이슈: ${normalized.payload?.title}`,
            String(normalized.payload?.description || '')
          )
        }
        break
      }

      case 'issue.resolved': {
        if (normalized.payload?.issue_id) {
          const { error: updateError } = await supabase
            .from('service_issues')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              resolution: normalized.payload?.resolution,
            })
            .eq('id', normalized.payload.issue_id)

          if (updateError) {
            console.error('Error updating issue:', updateError)
          }
        }
        break
      }

      case 'service.health':
      case 'system.health_check': {
        const { error: healthError } = await supabase
          .from('service_health')
          .upsert({
            service_id: serviceId,
            status: normalized.payload?.status || 'healthy',
            last_ping: new Date().toISOString(),
            metrics: normalized.payload?.metrics || normalized.payload || {},
          })

        if (healthError) {
          console.error('Error updating health:', healthError)
          throw healthError
        }

        // unhealthy 상태면 알림 생성
        if (normalized.payload?.status === 'unhealthy') {
          await createNotification(
            supabase,
            `[${serviceId}] 서비스 상태 이상`,
            '서비스가 unhealthy 상태입니다. 확인이 필요합니다.'
          )
        }
        break
      }

      // 사용량 이벤트 (Minu 서비스 → ideaonaction.ai)
      case 'api.usage_reported':
      case 'agent.executed':
      case 'opportunity.searched': {
        // 사용량 집계 업데이트 (subscription_usage)
        const userId = normalized.user_id || (normalized.metadata as Record<string, string>)?.userId
        if (userId) {
          await updateUsageCount(supabase, userId, normalized.event_type, serviceId!)
        }
        break
      }

      // 시스템 이벤트
      case 'source.synced': {
        // 소스 동기화 완료 알림 (partial/failed 상태만)
        if (['partial', 'failed'].includes(String(normalized.payload?.status))) {
          await createNotification(
            supabase,
            `[${serviceId}] 소스 동기화 ${normalized.payload?.status}`,
            `${normalized.payload?.sourceName}: ${normalized.payload?.errorMessage || '동기화 문제 발생'}`
          )
        }
        break
      }

      case 'opportunity.ingested': {
        // 기회 수집 이벤트는 로그만 저장
        break
      }

      // 사용자 활동 이벤트 (user.*)
      case 'user.opportunity_viewed':
      case 'user.filter_created':
      case 'user.briefing_shared':
      case 'user.favorite_added': {
        // 사용자 활동 이벤트는 service_events에 저장 (기본 처리)
        break
      }

      default:
        // 기타 이벤트는 로그만 저장
        break
    }

    // ========================================================================
    // 5. 모든 이벤트를 이벤트 로그에 저장
    // ========================================================================

    const { data: eventData, error: eventError } = await supabase
      .from('service_events')
      .insert({
        service_id: serviceId,
        event_type: normalized.event_type,
        project_id: normalized.project_id,
        user_id: normalized.user_id,
        payload: normalized.payload || {},
      })
      .select('id')
      .single()

    if (eventError) {
      console.error('Error inserting event:', eventError)
      throw eventError
    }

    eventId = eventId || eventData.id

    console.log(`Event saved: ${normalized.event_type} from ${serviceId} (id: ${eventId}, auth: ${authMethod})`)

    return successResponse(eventId, corsHeaders)

  } catch (error) {
    console.error('Error processing event:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, ErrorMessages[ErrorCodes.INTERNAL_ERROR], 500, corsHeaders)
  }
})

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 관리자 알림 생성 헬퍼
 */
async function createNotification(
  supabase: ReturnType<typeof createClient>,
  title: string,
  message?: string
) {
  try {
    // 관리자 목록 조회
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])

    if (!admins || admins.length === 0) return

    // 각 관리자에게 알림 생성
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title,
      message: message || '',
      type: 'system',
      read: false,
    }))

    await supabase.from('notifications').insert(notifications)
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}
