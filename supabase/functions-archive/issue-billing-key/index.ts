/**
 * Toss Payments 빌링키 발급 Edge Function
 *
 * 토스페이먼츠 빌링키 발급 API를 호출하여 자동결제용 빌링키를 발급받습니다.
 *
 * @endpoint POST /functions/v1/issue-billing-key
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   Content-Type: application/json
 *
 * @request
 *   {
 *     authKey: string      // 카드 인증키 (토스페이먼츠 위젯에서 발급)
 *     customerKey: string  // 고객 고유키 (user.id)
 *   }
 *
 * @response (Success)
 *   {
 *     success: true
 *     billingKey: string
 *     customerKey: string
 *     cardCompany: string
 *     cardNumber: string
 *     authenticatedAt: string
 *   }
 *
 * @response (Error)
 *   {
 *     success: false
 *     error: {
 *       code: string
 *       message: string
 *     }
 *   }
 *
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'

// ============================================================================
// 상수 정의
// ============================================================================

const TOSS_BILLING_API_URL = 'https://api.tosspayments.com/v1/billing/authorizations/issue'

// ============================================================================
// 타입 정의
// ============================================================================

interface IssueBillingKeyRequest {
  authKey: string
  customerKey: string
}

interface TossBillingKeyResponse {
  mId: string
  customerKey: string
  authenticatedAt: string
  method: string
  billingKey: string
  card?: {
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: string
    ownerType: string
  }
}

interface TossErrorResponse {
  code: string
  message: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Supabase 사용자 인증 검증
 */
async function verifySupabaseAuth(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { valid: false, error: 'invalid_token' }
    }

    return { valid: true, userId: user.id }
  } catch (error) {
    console.error('Supabase 인증 검증 오류:', error)
    return { valid: false, error: 'auth_verification_failed' }
  }
}

/**
 * 민감 정보 마스킹 (로깅용)
 */
function maskSensitiveData(data: string, visibleLength = 4): string {
  if (!data || data.length <= visibleLength) {
    return '****'
  }
  return data.slice(0, visibleLength) + '*'.repeat(data.length - visibleLength)
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')

  // CORS Preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  try {
    // 1. Authorization 헤더 검증
    const token = extractBearerToken(req.headers.get('authorization'))
    if (!token) {
      console.error('Authorization 헤더 누락')
      return createErrorResponse('Authorization 헤더가 필요합니다', 401, origin)
    }

    // 2. Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경 변수 누락')
      return createErrorResponse('서버 설정 오류입니다', 500, origin)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. 사용자 인증 확인
    const authResult = await verifySupabaseAuth(token, supabase)
    if (!authResult.valid || !authResult.userId) {
      console.error('사용자 인증 실패:', authResult.error)
      return createErrorResponse('유효하지 않은 인증 토큰입니다', 401, origin)
    }

    const userId = authResult.userId

    // 4. 요청 본문 파싱
    let requestBody: IssueBillingKeyRequest
    try {
      requestBody = await req.json()
    } catch (error) {
      console.error('JSON 파싱 오류:', error)
      return createErrorResponse('유효하지 않은 요청 본문입니다', 400, origin)
    }

    const { authKey, customerKey } = requestBody

    // 5. 필수 파라미터 검증
    if (!authKey || !customerKey) {
      console.error('필수 파라미터 누락:', { authKey: !!authKey, customerKey: !!customerKey })
      return createErrorResponse('authKey와 customerKey는 필수입니다', 400, origin)
    }

    // 6. customerKey가 user.id와 일치하는지 검증
    if (customerKey !== userId) {
      console.error('customerKey 불일치:', {
        provided: maskSensitiveData(customerKey),
        expected: maskSensitiveData(userId),
      })
      return createErrorResponse('customerKey가 인증된 사용자와 일치하지 않습니다', 403, origin)
    }

    // 요청 파라미터 로깅 (민감 정보 마스킹)
    console.log('빌링키 발급 요청:', {
      userId: maskSensitiveData(userId),
      customerKey: maskSensitiveData(customerKey),
      authKey: maskSensitiveData(authKey, 8),
    })

    // 7. 토스페이먼츠 시크릿 키 확인
    const tossSecretKey = Deno.env.get('TOSS_PAYMENTS_SECRET_KEY')
    if (!tossSecretKey) {
      console.error('TOSS_PAYMENTS_SECRET_KEY 환경 변수 누락')
      return createErrorResponse('서버 설정 오류입니다', 500, origin)
    }

    // 8. Basic Auth 인증 헤더 생성 (Base64 인코딩)
    const encodedAuth = btoa(tossSecretKey + ':')

    // 9. 토스페이먼츠 API 호출
    console.log('토스페이먼츠 API 호출 시작:', TOSS_BILLING_API_URL)

    const tossResponse = await fetch(TOSS_BILLING_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    })

    const tossResponseData = await tossResponse.json()

    console.log('토스페이먼츠 API 응답 상태:', {
      status: tossResponse.status,
      ok: tossResponse.ok,
    })

    // 10. 토스 API 실패 처리
    if (!tossResponse.ok) {
      const errorData = tossResponseData as TossErrorResponse
      console.error('토스페이먼츠 API 오류:', {
        status: tossResponse.status,
        code: errorData.code,
        message: errorData.message,
      })

      return createResponse(
        {
          success: false,
          error: {
            code: errorData.code || 'UNKNOWN_ERROR',
            message: errorData.message || '빌링키 발급에 실패했습니다',
          },
        },
        tossResponse.status,
        origin
      )
    }

    // 11. 성공 응답 처리
    const billingData = tossResponseData as TossBillingKeyResponse

    console.log('빌링키 발급 성공:', {
      billingKey: maskSensitiveData(billingData.billingKey),
      customerKey: maskSensitiveData(billingData.customerKey),
      cardCompany: billingData.card?.issuerCode,
      cardNumber: billingData.card?.number,
      authenticatedAt: billingData.authenticatedAt,
    })

    return createResponse(
      {
        success: true,
        billingKey: billingData.billingKey,
        customerKey: billingData.customerKey,
        cardCompany: billingData.card?.issuerCode || 'UNKNOWN',
        cardNumber: billingData.card?.number || '',
        authenticatedAt: billingData.authenticatedAt,
      },
      200,
      origin
    )
  } catch (error) {
    console.error('빌링키 발급 처리 중 예외 발생:', error)
    return createErrorResponse(
      '서버 내부 오류가 발생했습니다',
      500,
      origin,
      {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      }
    )
  }
})
