/**
 * Newsletter Send Edge Function
 *
 * 뉴스레터 자동/수동 발송을 처리하는 Supabase Edge Function
 * Resend API를 사용하여 이메일 발송 (서버 사이드)
 *
 * 기능:
 * - 수동 발송: POST /newsletter-send { newsletter_id, test_mode }
 * - 스케줄 발송: pg_cron에서 호출
 * - 배치 발송: 50명씩 발송 (Resend 제한 준수)
 *
 * 실행 방법:
 * 1. Supabase Secret 설정: supabase secrets set RESEND_API_KEY=re_xxx
 * 2. 수동 발송: supabase functions invoke newsletter-send --body '{"newsletter_id":"..."}'
 * 3. 스케줄 발송: pg_cron 설정
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// 타입 정의
interface NewsletterArchive {
  id: string
  subject: string
  content: string
  preview?: string
  sent_at?: string
  recipient_count: number
  created_at: string
  created_by?: string
}

interface NewsletterSubscriber {
  id: string
  email: string
  status: 'pending' | 'confirmed' | 'unsubscribed'
  preferences?: {
    topics?: string[]
    frequency?: 'daily' | 'weekly' | 'monthly'
  }
}

interface SendRequest {
  newsletter_id: string
  test_mode?: boolean
  test_email?: string
  segment?: {
    status?: string
    topics?: string[]
  }
}

interface SendResult {
  success: boolean
  sent_count: number
  failed_count: number
  newsletter_id: string
  errors?: string[]
}

// 상수
const BATCH_SIZE = 50 // Resend API 배치 제한
const RESEND_API_URL = 'https://api.resend.com/emails/batch'

/**
 * HTML 이메일 템플릿 래퍼
 */
function wrapEmailContent(content: string, unsubscribeUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .footer a { color: #3b82f6; text-decoration: none; }
        .unsubscribe { margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>IDEA on Action</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} IDEA on Action. All rights reserved.</p>
          <p><a href="https://www.ideaonaction.ai">www.ideaonaction.ai</a></p>
          <p class="unsubscribe">
            <a href="${unsubscribeUrl}">구독 취소</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Resend API로 배치 이메일 발송
 */
async function sendBatchEmails(
  emails: { to: string; subject: string; html: string }[],
  fromEmail: string,
  apiKey: string
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        emails.map((email) => ({
          from: fromEmail,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }))
      ),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, errors: [JSON.stringify(error)] }
    }

    return { success: true }
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}

/**
 * Edge Function 핸들러
 */
Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS Preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경 변수 확인
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in Supabase Secrets')
    }

    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'newsletter@ideaonaction.ai'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    // Supabase 클라이언트 생성 (Service Role)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 요청 본문 파싱
    const body: SendRequest = await req.json()
    const { newsletter_id, test_mode = false, test_email, segment } = body

    if (!newsletter_id) {
      return new Response(
        JSON.stringify({ error: 'newsletter_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 뉴스레터 조회
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletter_archive')
      .select('*')
      .eq('id', newsletter_id)
      .single()

    if (newsletterError || !newsletter) {
      return new Response(
        JSON.stringify({ error: 'Newsletter not found', details: newsletterError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const typedNewsletter = newsletter as NewsletterArchive

    // 테스트 모드: 단일 이메일만 발송
    if (test_mode) {
      const targetEmail = test_email || Deno.env.get('ADMIN_EMAIL') || 'sinclairseo@gmail.com'
      const unsubscribeUrl = `https://www.ideaonaction.ai/newsletter/unsubscribe?email=${encodeURIComponent(targetEmail)}`
      const htmlContent = wrapEmailContent(typedNewsletter.content, unsubscribeUrl)

      const result = await sendBatchEmails(
        [{ to: targetEmail, subject: `[테스트] ${typedNewsletter.subject}`, html: htmlContent }],
        FROM_EMAIL,
        RESEND_API_KEY
      )

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? `Test email sent to ${targetEmail}` : 'Failed to send test email',
          errors: result.errors,
        }),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 구독자 목록 조회
    let query = supabase
      .from('newsletter_subscriptions')
      .select('id, email, preferences')
      .eq('status', 'confirmed')

    // 세그먼트 필터링
    if (segment?.topics && segment.topics.length > 0) {
      query = query.contains('preferences->topics', segment.topics)
    }

    const { data: subscribers, error: subscribersError } = await query

    if (subscribersError) {
      throw new Error(`Failed to fetch subscribers: ${subscribersError.message}`)
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, failed_count: 0, message: 'No subscribers found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending newsletter to ${subscribers.length} subscribers`)

    // 배치 발송
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE)
      const emails = batch.map((sub) => {
        const unsubscribeUrl = `https://www.ideaonaction.ai/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`
        return {
          to: sub.email,
          subject: typedNewsletter.subject,
          html: wrapEmailContent(typedNewsletter.content, unsubscribeUrl),
        }
      })

      const result = await sendBatchEmails(emails, FROM_EMAIL, RESEND_API_KEY)

      if (result.success) {
        sentCount += batch.length
      } else {
        failedCount += batch.length
        if (result.errors) {
          errors.push(...result.errors)
        }
      }

      // Rate limiting: 배치 간 100ms 대기
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // newsletter_archive 업데이트
    await supabase
      .from('newsletter_archive')
      .update({
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
      })
      .eq('id', newsletter_id)

    const result: SendResult = {
      success: failedCount === 0,
      sent_count: sentCount,
      failed_count: failedCount,
      newsletter_id,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log(`Newsletter sent: ${sentCount} success, ${failedCount} failed`)

    return new Response(JSON.stringify(result), {
      status: failedCount === 0 ? 200 : 207, // 207 Multi-Status for partial success
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending newsletter:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
