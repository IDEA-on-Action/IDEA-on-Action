/**
 * 프로필 동기화 Edge Function
 *
 * ideaonaction ↔ Minu 프로필 실시간 동기화를 담당합니다.
 * HMAC-SHA256 서명 검증을 통해 보안을 강화합니다.
 *
 * @endpoint POST /functions/v1/profile-sync/sync - 프로필 동기화 트리거
 * @endpoint POST /functions/v1/profile-sync/webhook - Minu 변경 사항 수신
 * @endpoint GET /functions/v1/profile-sync/status/:user_id - 동기화 상태 조회
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   X-Webhook-Signature: <HMAC-SHA256> (Webhook 전용)
 *   X-Webhook-Timestamp: <Unix timestamp> (Webhook 전용)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verify.ts'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 동기화 상태
 */
type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'

/**
 * 동기화 방향
 */
type SyncDirection = 'ideaonaction_to_minu' | 'minu_to_ideaonaction' | 'bidirectional'

/**
 * 동기화 결과
 */
type SyncResult = 'success' | 'partial' | 'conflict' | 'failed'

/**
 * 동기화 트리거
 */
type TriggeredBy = 'user' | 'webhook' | 'scheduled' | 'manual'

/**
 * 프로필 데이터 (ideaonaction)
 */
interface IdeaOnActionProfile {
  email: string
  name?: string
  avatar_url?: string
  company?: string
  job_title?: string
  updated_at?: string
}

/**
 * 프로필 데이터 (Minu)
 */
interface MinuProfile {
  email: string
  name?: string
  avatar_url?: string
  company?: string
  job_title?: string
  updated_at?: string
}

/**
 * 동기화 요청 (POST /sync)
 */
interface SyncRequest {
  user_id: string
  direction?: SyncDirection
  force?: boolean
}

/**
 * Webhook 페이로드 (POST /webhook)
 */
interface WebhookPayload {
  user_id: string
  profile: MinuProfile
  event_type: 'profile.updated' | 'profile.created'
  timestamp: string
}

/**
 * 동기화 상태 레코드 (DB)
 */
interface ProfileSyncStatus {
  id: string
  user_id: string
  sync_status: SyncStatus
  last_sync_direction: SyncDirection | null
  last_synced_at: string | null
  ideaonaction_updated_at: string | null
  minu_updated_at: string | null
  conflict_fields: Record<string, unknown> | null
  conflict_resolved_at: string | null
  error_message: string | null
  error_count: number
  last_error_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 동기화 필드 매핑
 */
const SYNC_FIELDS = {
  required: ['email', 'name'] as const,
  optional: ['avatar_url', 'company', 'job_title'] as const,
}

/**
 * Minu API 엔드포인트
 */
const MINU_API_BASE_URL = Deno.env.get('MINU_API_BASE_URL') || 'https://api.minu.best'
const MINU_API_KEY = Deno.env.get('MINU_API_KEY')

/**
 * Webhook 검증 시크릿
 */
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  requestId?: string
) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        details,
        request_id: requestId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * 성공 응답 생성
 */
function successResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Bearer 토큰 추출
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * 충돌 감지
 *
 * @param ideaonactionProfile - ideaonaction 프로필
 * @param minuProfile - Minu 프로필
 * @param ideaonactionUpdatedAt - ideaonaction 업데이트 시각
 * @param minuUpdatedAt - Minu 업데이트 시각
 * @returns 충돌 필드
 */
function detectConflicts(
  ideaonactionProfile: IdeaOnActionProfile,
  minuProfile: MinuProfile,
  ideaonactionUpdatedAt: string | null,
  minuUpdatedAt: string | null
): Record<string, { ideaonaction: unknown; minu: unknown }> | null {
  const conflicts: Record<string, { ideaonaction: unknown; minu: unknown }> = {}

  // timestamp 기반 충돌 검사
  if (ideaonactionUpdatedAt && minuUpdatedAt) {
    const ideaonactionTime = new Date(ideaonactionUpdatedAt).getTime()
    const minuTime = new Date(minuUpdatedAt).getTime()

    // 5초 이내 동시 업데이트 = 충돌 가능성
    if (Math.abs(ideaonactionTime - minuTime) < 5000) {
      // 필드별 값 비교
      const allFields = [...SYNC_FIELDS.required, ...SYNC_FIELDS.optional]
      for (const field of allFields) {
        const ideaonactionValue = ideaonactionProfile[field]
        const minuValue = minuProfile[field]

        if (ideaonactionValue !== minuValue && ideaonactionValue && minuValue) {
          conflicts[field] = {
            ideaonaction: ideaonactionValue,
            minu: minuValue,
          }
        }
      }
    }
  }

  return Object.keys(conflicts).length > 0 ? conflicts : null
}

/**
 * 충돌 해결 (최신 timestamp 우선)
 *
 * @param ideaonactionProfile - ideaonaction 프로필
 * @param minuProfile - Minu 프로필
 * @param ideaonactionUpdatedAt - ideaonaction 업데이트 시각
 * @param minuUpdatedAt - Minu 업데이트 시각
 * @returns 해결된 프로필
 */
function resolveConflict(
  ideaonactionProfile: IdeaOnActionProfile,
  minuProfile: MinuProfile,
  ideaonactionUpdatedAt: string | null,
  minuUpdatedAt: string | null
): { profile: IdeaOnActionProfile; winner: 'ideaonaction' | 'minu' } {
  // timestamp 비교 (최신 우선)
  if (ideaonactionUpdatedAt && minuUpdatedAt) {
    const ideaonactionTime = new Date(ideaonactionUpdatedAt).getTime()
    const minuTime = new Date(minuUpdatedAt).getTime()

    if (ideaonactionTime >= minuTime) {
      return { profile: ideaonactionProfile, winner: 'ideaonaction' }
    } else {
      return { profile: minuProfile as IdeaOnActionProfile, winner: 'minu' }
    }
  }

  // timestamp 없으면 ideaonaction 우선
  return { profile: ideaonactionProfile, winner: 'ideaonaction' }
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /sync - 프로필 동기화 트리거
 */
async function handleSync(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 인증 확인
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId)
  }

  // 요청 본문 파싱
  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, undefined, requestId)
  }

  if (!body.user_id) {
    return errorResponse('missing_field', 'user_id 필드가 필요합니다.', 400, undefined, requestId)
  }

  const direction = body.direction || 'bidirectional'
  const force = body.force || false

  try {
    // 1. 동기화 상태 업데이트 (syncing)
    await supabase
      .from('profile_sync_status')
      .upsert({
        user_id: body.user_id,
        sync_status: 'syncing',
        last_sync_direction: direction,
      }, { onConflict: 'user_id' })

    // 2. ideaonaction 프로필 조회
    const { data: ideaProfile, error: ideaError } = await supabase
      .from('user_profiles')
      .select('email:user_id, display_name, avatar_url, metadata')
      .eq('user_id', body.user_id)
      .single()

    if (ideaError) throw ideaError

    // user_id로 email 가져오기
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(body.user_id)
    if (userError) throw userError

    const ideaonactionProfile: IdeaOnActionProfile = {
      email: userData.user.email || '',
      name: ideaProfile.display_name || '',
      avatar_url: ideaProfile.avatar_url || undefined,
      company: ideaProfile.metadata?.company || undefined,
      job_title: ideaProfile.metadata?.job_title || undefined,
      updated_at: ideaProfile.updated_at || undefined,
    }

    // 3. Minu 프로필 조회
    if (!MINU_API_KEY) {
      throw new Error('MINU_API_KEY가 설정되지 않았습니다.')
    }

    const minuResponse = await fetch(`${MINU_API_BASE_URL}/v1/profiles/${userData.user.email}`, {
      headers: {
        'Authorization': `Bearer ${MINU_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!minuResponse.ok && minuResponse.status !== 404) {
      throw new Error(`Minu API 오류: ${minuResponse.status}`)
    }

    const minuProfile: MinuProfile | null = minuResponse.ok ? await minuResponse.json() : null

    // 4. 충돌 감지
    let syncResult: SyncResult = 'success'
    let conflictFields: Record<string, unknown> | null = null
    let finalProfile = ideaonactionProfile

    if (minuProfile && !force) {
      conflictFields = detectConflicts(
        ideaonactionProfile,
        minuProfile,
        ideaonactionProfile.updated_at || null,
        minuProfile.updated_at || null
      )

      if (conflictFields) {
        // 충돌 해결 (최신 우선)
        const resolved = resolveConflict(
          ideaonactionProfile,
          minuProfile,
          ideaonactionProfile.updated_at || null,
          minuProfile.updated_at || null
        )
        finalProfile = resolved.profile
        syncResult = 'conflict'

        console.log(`Conflict resolved: ${resolved.winner} wins`)
      }
    }

    // 5. 동기화 수행
    const syncedFields: string[] = []

    // ideaonaction → Minu
    if (direction === 'ideaonaction_to_minu' || direction === 'bidirectional') {
      const minuUpdateResponse = await fetch(`${MINU_API_BASE_URL}/v1/profiles/${userData.user.email}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MINU_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalProfile),
      })

      if (!minuUpdateResponse.ok) {
        throw new Error(`Minu 프로필 업데이트 실패: ${minuUpdateResponse.status}`)
      }

      syncedFields.push(...Object.keys(finalProfile))
    }

    // Minu → ideaonaction
    if (direction === 'minu_to_ideaonaction' || direction === 'bidirectional') {
      if (minuProfile) {
        await supabase
          .from('user_profiles')
          .update({
            display_name: finalProfile.name,
            avatar_url: finalProfile.avatar_url,
            metadata: {
              company: finalProfile.company,
              job_title: finalProfile.job_title,
            },
          })
          .eq('user_id', body.user_id)

        syncedFields.push(...Object.keys(finalProfile))
      }
    }

    // 6. 동기화 상태 업데이트 (synced or conflict)
    await supabase
      .from('profile_sync_status')
      .upsert({
        user_id: body.user_id,
        sync_status: syncResult === 'conflict' ? 'conflict' : 'synced',
        last_sync_direction: direction,
        last_synced_at: new Date().toISOString(),
        ideaonaction_updated_at: ideaonactionProfile.updated_at,
        minu_updated_at: minuProfile?.updated_at,
        conflict_fields: conflictFields,
        conflict_resolved_at: conflictFields ? new Date().toISOString() : null,
        error_count: 0,
        error_message: null,
      }, { onConflict: 'user_id' })

    // 7. 동기화 이력 기록
    await supabase
      .from('profile_sync_history')
      .insert({
        user_id: body.user_id,
        sync_direction: direction,
        sync_result: syncResult,
        synced_fields: Array.from(new Set(syncedFields)),
        conflict_fields: conflictFields,
        before_data: { ideaonaction: ideaonactionProfile, minu: minuProfile },
        after_data: finalProfile,
        triggered_by: 'user',
      })

    console.log(`Profile synced: ${body.user_id}, result: ${syncResult}`)

    return successResponse({
      synced: true,
      user_id: body.user_id,
      sync_direction: direction,
      sync_result: syncResult,
      synced_fields: Array.from(new Set(syncedFields)),
      conflict_fields: conflictFields,
      synced_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Sync error:', error)

    // 에러 상태 업데이트
    const { data: currentStatus } = await supabase
      .from('profile_sync_status')
      .select('error_count')
      .eq('user_id', body.user_id)
      .single()

    await supabase
      .from('profile_sync_status')
      .upsert({
        user_id: body.user_id,
        sync_status: 'failed',
        error_message: String(error),
        error_count: (currentStatus?.error_count || 0) + 1,
        last_error_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    return errorResponse(
      'sync_failed',
      '프로필 동기화에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    )
  }
}

/**
 * POST /webhook - Minu 변경 사항 수신
 */
async function handleWebhook(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // Webhook 서명 검증
  const signature = req.headers.get('x-webhook-signature')
  const timestamp = req.headers.get('x-webhook-timestamp')
  const payload = await req.text()

  const verification = await verifyWebhookSignature(payload, signature, timestamp, WEBHOOK_SECRET)

  if (!verification.valid) {
    return errorResponse(
      verification.error || 'invalid_signature',
      'Webhook 서명 검증 실패',
      401,
      undefined,
      requestId
    )
  }

  // 페이로드 파싱
  let webhookPayload: WebhookPayload
  try {
    webhookPayload = JSON.parse(payload)
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, undefined, requestId)
  }

  if (!webhookPayload.user_id || !webhookPayload.profile) {
    return errorResponse('missing_field', 'user_id와 profile 필드가 필요합니다.', 400, undefined, requestId)
  }

  try {
    // Minu → ideaonaction 동기화
    const minuProfile = webhookPayload.profile

    await supabase
      .from('user_profiles')
      .update({
        display_name: minuProfile.name,
        avatar_url: minuProfile.avatar_url,
        metadata: {
          company: minuProfile.company,
          job_title: minuProfile.job_title,
        },
      })
      .eq('user_id', webhookPayload.user_id)

    // 동기화 상태 업데이트
    await supabase
      .from('profile_sync_status')
      .upsert({
        user_id: webhookPayload.user_id,
        sync_status: 'synced',
        last_sync_direction: 'minu_to_ideaonaction',
        last_synced_at: new Date().toISOString(),
        minu_updated_at: minuProfile.updated_at,
        error_count: 0,
        error_message: null,
      }, { onConflict: 'user_id' })

    // 동기화 이력 기록
    await supabase
      .from('profile_sync_history')
      .insert({
        user_id: webhookPayload.user_id,
        sync_direction: 'minu_to_ideaonaction',
        sync_result: 'success',
        synced_fields: Object.keys(minuProfile),
        after_data: minuProfile,
        triggered_by: 'webhook',
        metadata: {
          event_type: webhookPayload.event_type,
          webhook_timestamp: webhookPayload.timestamp,
        },
      })

    console.log(`Webhook processed: ${webhookPayload.user_id}`)

    return successResponse({
      received: true,
      user_id: webhookPayload.user_id,
      event_type: webhookPayload.event_type,
      processed_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return errorResponse(
      'webhook_failed',
      'Webhook 처리에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    )
  }
}

/**
 * GET /status/:user_id - 동기화 상태 조회
 */
async function handleGetStatus(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requestId: string
): Promise<Response> {
  // 인증 확인
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId)
  }

  try {
    // 동기화 상태 조회
    const { data: status, error } = await supabase
      .from('profile_sync_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      return errorResponse('not_found', '동기화 상태를 찾을 수 없습니다.', 404, undefined, requestId)
    }
    if (error) throw error

    return successResponse({
      user_id: userId,
      sync_status: status.sync_status,
      last_sync_direction: status.last_sync_direction,
      last_synced_at: status.last_synced_at,
      conflict_fields: status.conflict_fields,
      error_message: status.error_message,
      error_count: status.error_count,
    })

  } catch (error) {
    console.error('Get status error:', error)
    return errorResponse(
      'fetch_failed',
      '동기화 상태 조회에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    )
  }
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

  // 요청 ID 생성
  const requestId = crypto.randomUUID()

  // URL 파싱
  const url = new URL(req.url)
  const path = url.pathname
    .replace(/^\/functions\/v1\/profile-sync/, '')
    .replace(/^\/profile-sync/, '')

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, undefined, requestId)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 라우팅
  try {
    // POST /sync - 프로필 동기화 트리거
    if (req.method === 'POST' && path === '/sync') {
      const response = await handleSync(req, supabase, requestId)
      return new Response(response.body, { ...response, headers: { ...response.headers, ...corsHeaders } })
    }

    // POST /webhook - Minu 변경 사항 수신
    if (req.method === 'POST' && path === '/webhook') {
      const response = await handleWebhook(req, supabase, requestId)
      return new Response(response.body, { ...response, headers: { ...response.headers, ...corsHeaders } })
    }

    // GET /status/:user_id - 동기화 상태 조회
    const statusMatch = path.match(/^\/status\/([a-f0-9-]+)$/)
    if (req.method === 'GET' && statusMatch) {
      const userId = statusMatch[1]
      const response = await handleGetStatus(req, supabase, userId, requestId)
      return new Response(response.body, { ...response, headers: { ...response.headers, ...corsHeaders } })
    }

    // 지원하지 않는 엔드포인트
    return errorResponse(
      'not_found',
      '요청한 엔드포인트를 찾을 수 없습니다.',
      404,
      { path, method: req.method },
      requestId
    )

  } catch (error) {
    console.error('Unhandled error:', error)
    return errorResponse(
      'internal_error',
      '서버 내부 오류가 발생했습니다.',
      500,
      { error: String(error) },
      requestId
    )
  }
})
