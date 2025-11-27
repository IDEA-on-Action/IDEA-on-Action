/**
 * Webhook 서명 검증
 *
 * HMAC-SHA256 기반 Webhook 서명 검증을 수행합니다.
 * 타임스탬프를 포함하여 리플레이 공격을 방지합니다.
 */

export interface WebhookVerificationResult {
  valid: boolean
  error?: 'missing_signature' | 'missing_secret' | 'timestamp_expired' | 'invalid_signature'
}

/**
 * Webhook 서명 검증
 *
 * @param payload - Webhook 페이로드 (문자열)
 * @param signature - X-Webhook-Signature 헤더 값
 * @param timestamp - X-Webhook-Timestamp 헤더 값 (Unix timestamp, 초 단위)
 * @param secret - Webhook 서명 검증용 비밀키
 * @returns 검증 결과
 *
 * @example
 * ```typescript
 * const result = await verifyWebhookSignature(
 *   JSON.stringify(payload),
 *   req.headers.get('x-webhook-signature'),
 *   req.headers.get('x-webhook-timestamp'),
 *   Deno.env.get('WEBHOOK_SECRET')
 * )
 *
 * if (!result.valid) {
 *   return new Response(JSON.stringify({ error: result.error }), { status: 401 })
 * }
 * ```
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): Promise<WebhookVerificationResult> {
  // 1. 필수 파라미터 검증
  if (!signature) {
    return { valid: false, error: 'missing_signature' }
  }

  if (!secret) {
    return { valid: false, error: 'missing_secret' }
  }

  if (!timestamp) {
    return { valid: false, error: 'timestamp_expired' }
  }

  // 2. 타임스탬프 검증 (5분 이내)
  const now = Math.floor(Date.now() / 1000)
  const timestampNum = parseInt(timestamp, 10)

  if (isNaN(timestampNum)) {
    return { valid: false, error: 'timestamp_expired' }
  }

  const timeDiff = Math.abs(now - timestampNum)
  if (timeDiff > 300) { // 5분 = 300초
    return { valid: false, error: 'timestamp_expired' }
  }

  // 3. HMAC-SHA256 서명 계산
  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(signedPayload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  )

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // 4. Timing-safe 비교
  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, error: 'invalid_signature' }
  }

  return { valid: true }
}

/**
 * Timing-safe 문자열 비교
 *
 * 타이밍 공격을 방지하기 위해 상수 시간 복잡도로 비교합니다.
 *
 * @param a - 첫 번째 문자열
 * @param b - 두 번째 문자열
 * @returns 두 문자열이 동일한지 여부
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
