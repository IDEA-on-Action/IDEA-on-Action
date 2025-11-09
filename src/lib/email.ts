/**
 * Email Service using Resend
 *
 * 이메일 전송 라이브러리
 * - Resend API 통합
 * - 이메일 템플릿 렌더링
 * - 타입 안전 이메일 전송
 */

import { Resend } from 'resend'
import type { ReactElement } from 'react'
import { devWarn, devError } from '@/lib/errors'

// Resend 클라이언트 초기화
export const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)

// 발신자 이메일
export const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'noreply@ideaonaction.ai'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: ReactElement
}

export interface SendEmailResult {
  success: boolean
  data?: unknown
  error?: unknown
}

/**
 * 이메일 전송
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  try {
    // API 키 체크
    if (!import.meta.env.VITE_RESEND_API_KEY) {
      devWarn('VITE_RESEND_API_KEY is not set')
      return {
        success: false,
        error: 'Email API key is not configured',
      }
    }

    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      react: options.react,
    })

    return { success: true, data }
  } catch (error) {
    devError(error, { service: 'Email', operation: '이메일 전송' })
    return { success: false, error }
  }
}

/**
 * 주문 확인 이메일 전송
 */
export async function sendOrderConfirmationEmail(order: {
  id: string
  user_email: string
  total_amount: number
  items: Array<{ title: string; quantity: number; price: number }>
}): Promise<SendEmailResult> {
  // 이메일 템플릿은 나중에 구현 (현재는 간단한 텍스트)
  return sendEmail({
    to: order.user_email,
    subject: `주문 확인 - ${order.id}`,
    react: {
      type: 'div',
      props: {
        children: `주문이 완료되었습니다. 주문번호: ${order.id}`,
      },
    } as ReactElement,
  })
}

/**
 * 비밀번호 재설정 이메일 전송
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: '비밀번호 재설정',
    react: {
      type: 'div',
      props: {
        children: `비밀번호 재설정 링크: ${resetLink}`,
      },
    } as ReactElement,
  })
}

/**
 * 공지사항 이메일 전송
 */
export async function sendAnnouncementEmail(
  users: string[],
  announcement: {
    title: string
    content: string
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to: users,
    subject: announcement.title,
    react: {
      type: 'div',
      props: {
        children: announcement.content,
      },
    } as ReactElement,
  })
}

/**
 * 뉴스레터 구독 확인 이메일 전송
 */
export async function sendNewsletterConfirmationEmail(
  email: string,
  confirmationToken: string
): Promise<SendEmailResult> {
  const confirmUrl = `${window.location.origin}/newsletter/confirm?token=${confirmationToken}`

  return sendEmail({
    to: email,
    subject: 'IDEA on Action 뉴스레터 구독 확인',
    react: {
      type: 'div',
      props: {
        style: { fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' },
        children: [
          {
            type: 'h1',
            props: {
              style: { fontSize: '24px', marginBottom: '16px' },
              children: '뉴스레터 구독을 확인해주세요',
            },
          },
          {
            type: 'p',
            props: {
              style: { fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' },
              children: 'IDEA on Action 뉴스레터 구독 신청을 완료하려면 아래 버튼을 클릭해주세요.',
            },
          },
          {
            type: 'a',
            props: {
              href: confirmUrl,
              style: {
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
              },
              children: '구독 확인하기',
            },
          },
          {
            type: 'p',
            props: {
              style: { fontSize: '14px', color: '#666', marginTop: '24px' },
              children: '이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.',
            },
          },
        ],
      },
    } as ReactElement,
  })
}

/**
 * 뉴스레터 웰컴 이메일 전송
 */
export async function sendNewsletterWelcomeEmail(
  email: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: 'IDEA on Action 뉴스레터에 오신 것을 환영합니다!',
    react: {
      type: 'div',
      props: {
        style: { fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' },
        children: [
          {
            type: 'h1',
            props: {
              style: { fontSize: '24px', marginBottom: '16px' },
              children: '환영합니다! 🎉',
            },
          },
          {
            type: 'p',
            props: {
              style: { fontSize: '16px', lineHeight: '1.5', marginBottom: '16px' },
              children: 'IDEA on Action 뉴스레터 구독을 확인했습니다.',
            },
          },
          {
            type: 'p',
            props: {
              style: { fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' },
              children: '앞으로 새로운 프로젝트, 인사이트, 그리고 업데이트를 가장 먼저 받아보실 수 있습니다.',
            },
          },
          {
            type: 'p',
            props: {
              style: { fontSize: '14px', color: '#666' },
              children: 'Keep Awake, Live Passionate - IDEA on Action',
            },
          },
        ],
      },
    } as ReactElement,
  })
}
