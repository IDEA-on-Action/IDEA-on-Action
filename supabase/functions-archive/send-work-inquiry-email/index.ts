/**
 * Send Work Inquiry Email Edge Function
 *
 * Work with Us 문의 이메일을 발송하는 Supabase Edge Function
 * Resend API를 사용하여 이메일 발송 (서버 사이드)
 *
 * 보안:
 * - RESEND_API_KEY는 Supabase Secret으로 관리
 * - 클라이언트에 API 키 노출 없음
 *
 * 실행 방법:
 * 1. Supabase Secret 설정: supabase secrets set RESEND_API_KEY=re_xxx
 * 2. 클라이언트 호출: supabase.functions.invoke('send-work-inquiry-email', { body: {...} })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

// Work Inquiry 인터페이스
interface WorkInquiryData {
  name: string
  email: string
  company?: string
  package: string
  budget?: string
  brief: string
}

// Resend API 응답 인터페이스
interface ResendResponse {
  id: string
  from: string
  to: string[]
  created_at: string
}

/**
 * HTML 이메일 템플릿 생성
 */
function generateEmailHTML(data: WorkInquiryData): string {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Work with Us 문의</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <table style="width: 100%; border-collapse: collapse; background: white; padding: 20px; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">이름</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">이메일</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${data.email}">${data.email}</a></td>
          </tr>
          ${data.company ? `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">회사</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.company}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">패키지</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>${data.package}</strong></td>
          </tr>
          ${data.budget ? `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">예산</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.budget}</td>
          </tr>
          ` : ''}
        </table>
        <div style="margin-top: 20px; background: white; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0;">상세 설명</h3>
          <p style="white-space: pre-wrap;">${data.brief}</p>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
          IDEA on Action | www.ideaonaction.ai
        </p>
      </div>
    </body>
    </html>
  `
}

/**
 * Resend API로 이메일 발송
 */
async function sendEmail(data: WorkInquiryData): Promise<ResendResponse> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set in Supabase Secrets')
  }

  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@ideaonaction.ai'
  const TO_EMAIL = Deno.env.get('WORK_INQUIRY_TO_EMAIL') || 'sinclairseo@gmail.com'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: `[Work with Us] ${data.name} - ${data.package}`,
      html: generateEmailHTML(data),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Resend API error: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

/**
 * Edge Function 핸들러
 */
serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS Preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 요청 본문 파싱
    const data: WorkInquiryData = await req.json()

    // 필수 필드 검증
    if (!data.name || !data.email || !data.package || !data.brief) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 이메일 주소 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Resend API로 이메일 발송
    const result = await sendEmail(data)

    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error sending work inquiry email:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
