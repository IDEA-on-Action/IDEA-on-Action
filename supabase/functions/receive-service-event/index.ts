/**
 * receive-service-event Edge Function
 *
 * 외부 Minu 서비스에서 발생한 이벤트를 수신하고 저장합니다.
 * HMAC-SHA256 서명으로 요청을 검증합니다.
 *
 * @endpoint POST /functions/v1/receive-service-event
 *
 * @headers
 *   X-Service-Id: 서비스 ID (minu-find, minu-frame, minu-build, minu-keep)
 *   X-Signature: HMAC-SHA256 서명 (sha256=...)
 *   X-Timestamp: 요청 타임스탬프 (ISO 8601)
 *
 * @body WebhookPayload
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// 유효한 서비스 ID 목록
const VALID_SERVICE_IDS = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep']

// 타임스탬프 유효 기간 (5분)
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

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
 * 에러 응답 생성
 */
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message, received: false }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * 성공 응답 생성
 */
function successResponse(eventId: string) {
  return new Response(
    JSON.stringify({ received: true, event_id: eventId }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // POST만 허용
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // 헤더 추출
    const serviceId = req.headers.get('x-service-id')
    const signature = req.headers.get('x-signature')
    const timestamp = req.headers.get('x-timestamp')

    // 필수 헤더 검증
    if (!serviceId) {
      return errorResponse('Missing X-Service-Id header', 400)
    }

    if (!signature) {
      return errorResponse('Missing X-Signature header', 400)
    }

    // 서비스 ID 유효성 검증
    if (!VALID_SERVICE_IDS.includes(serviceId)) {
      return errorResponse('Invalid service ID', 400)
    }

    // 타임스탬프 검증 (선택적이지만 있으면 검증)
    if (timestamp && !verifyTimestamp(timestamp)) {
      return errorResponse('Request timestamp too old or invalid', 401)
    }

    // 요청 본문 읽기
    const body = await req.text()

    if (!body) {
      return errorResponse('Empty request body', 400)
    }

    // 웹훅 시크릿 조회
    const secretEnvName = `WEBHOOK_SECRET_${serviceId.toUpperCase().replace(/-/g, '_')}`
    const secret = Deno.env.get(secretEnvName)

    if (!secret) {
      console.error(`Missing webhook secret for service: ${serviceId}`)
      return errorResponse('Service configuration error', 500)
    }

    // HMAC 서명 검증
    const isValidSignature = await verifySignature(body, signature, secret)

    if (!isValidSignature) {
      console.warn(`Invalid signature for service: ${serviceId}`)
      return errorResponse('Invalid signature', 401)
    }

    // 페이로드 파싱
    let payload
    try {
      payload = JSON.parse(body)
    } catch {
      return errorResponse('Invalid JSON payload', 400)
    }

    // 필수 필드 검증
    if (!payload.event_type) {
      return errorResponse('Missing event_type in payload', 400)
    }

    // Supabase 클라이언트 생성 (service_role 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return errorResponse('Server configuration error', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let eventId: string | null = null

    // 이벤트 유형별 처리
    switch (payload.event_type) {
      case 'issue.created': {
        // 이슈 테이블에 저장
        const { data: issueData, error: issueError } = await supabase
          .from('service_issues')
          .insert({
            service_id: serviceId,
            severity: payload.payload?.severity || 'medium',
            title: payload.payload?.title || 'Untitled Issue',
            description: payload.payload?.description,
            project_id: payload.project_id,
            reported_by: payload.user_id,
          })
          .select('id')
          .single()

        if (issueError) {
          console.error('Error inserting issue:', issueError)
          throw issueError
        }

        eventId = issueData.id

        // Critical/High 이슈는 알림 생성
        if (['critical', 'high'].includes(payload.payload?.severity)) {
          await createNotification(
            supabase,
            `[${serviceId}] ${payload.payload?.severity?.toUpperCase()} 이슈: ${payload.payload?.title}`,
            payload.payload?.description
          )
        }
        break
      }

      case 'issue.resolved': {
        // 이슈 상태 업데이트
        if (payload.payload?.issue_id) {
          const { error: updateError } = await supabase
            .from('service_issues')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              resolution: payload.payload?.resolution,
            })
            .eq('id', payload.payload.issue_id)

          if (updateError) {
            console.error('Error updating issue:', updateError)
          }
        }
        break
      }

      case 'service.health': {
        // 헬스 상태 업데이트
        const { error: healthError } = await supabase
          .from('service_health')
          .upsert({
            service_id: serviceId,
            status: payload.payload?.status || 'healthy',
            last_ping: new Date().toISOString(),
            metrics: payload.payload?.metrics || {},
          })

        if (healthError) {
          console.error('Error updating health:', healthError)
          throw healthError
        }

        // unhealthy 상태면 알림 생성
        if (payload.payload?.status === 'unhealthy') {
          await createNotification(
            supabase,
            `[${serviceId}] 서비스 상태 이상`,
            '서비스가 unhealthy 상태입니다. 확인이 필요합니다.'
          )
        }
        break
      }

      default:
        // 기타 이벤트는 로그만 저장
        break
    }

    // 모든 이벤트를 이벤트 로그에 저장
    const { data: eventData, error: eventError } = await supabase
      .from('service_events')
      .insert({
        service_id: serviceId,
        event_type: payload.event_type,
        project_id: payload.project_id,
        user_id: payload.user_id,
        payload: payload.payload || {},
      })
      .select('id')
      .single()

    if (eventError) {
      console.error('Error inserting event:', eventError)
      throw eventError
    }

    eventId = eventId || eventData.id

    console.log(`Event received: ${payload.event_type} from ${serviceId}`)

    return successResponse(eventId)

  } catch (error) {
    console.error('Error processing webhook:', error)
    return errorResponse('Internal server error', 500)
  }
})

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
