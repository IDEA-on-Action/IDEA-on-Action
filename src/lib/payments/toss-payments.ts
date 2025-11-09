// ===================================================================
// Toss Payments SDK Client
// 작성일: 2025-10-19
// 목적: Toss Payments SDK 래퍼 함수
// 참고: https://docs.tosspayments.com/reference
// ===================================================================

import { loadTossPayments, TossPaymentsInstance } from '@tosspayments/payment-sdk'
import axios, { AxiosError } from 'axios'
import type {
  TossPaymentRequest,
  TossPaymentResponse,
  TossPaymentConfirmRequest,
  TossPaymentCancelRequest,
} from './types'
import { extractErrorMessage, devLog, devError } from '@/lib/errors'

// ===================================================================
// Constants
// ===================================================================

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || ''
const SECRET_KEY = import.meta.env.VITE_TOSS_SECRET_KEY || ''
const TOSS_API_BASE = 'https://api.tosspayments.com/v1/payments'

// ===================================================================
// SDK Instance
// ===================================================================

let tossPaymentsInstance: TossPaymentsInstance | null = null

/**
 * Toss Payments SDK 초기화
 */
export async function initializeTossPayments(): Promise<TossPaymentsInstance> {
  if (!CLIENT_KEY) {
    throw new Error('VITE_TOSS_CLIENT_KEY가 설정되지 않았습니다.')
  }

  if (!tossPaymentsInstance) {
    try {
      tossPaymentsInstance = await loadTossPayments(CLIENT_KEY)
      devLog('[Toss Payments] SDK initialized')
    } catch (error) {
      devError(error, { service: 'Toss Payments', operation: 'SDK 초기화' })
      throw new Error('Toss Payments SDK 초기화 실패')
    }
  }

  return tossPaymentsInstance
}

// ===================================================================
// Helper Functions
// ===================================================================

/**
 * Toss Payments API 요청 헤더 생성
 */
function getHeaders() {
  const auth = Buffer.from(`${SECRET_KEY}:`, 'utf-8').toString('base64')
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
}


// ===================================================================
// API Functions
// ===================================================================

/**
 * 1단계: 결제 요청 (Request)
 *
 * @description 결제창을 띄우고 사용자가 결제 수단을 선택하도록 합니다.
 * @returns Promise<void> (결제창으로 리다이렉트됨)
 */
export async function requestTossPayment(params: TossPaymentRequest): Promise<void> {
  try {
    const tossPayments = await initializeTossPayments()

    devLog('[Toss Payments] Request payment:', {
      orderId: params.orderId,
      amount: params.amount,
    })

    // 결제창 호출
    await tossPayments.requestPayment('카드', {
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
    })

    // 사용자가 결제 승인하면 successUrl로 리다이렉트됨
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Toss Payments', operation: '결제 요청' })
    throw new Error(`Toss Payments 결제 요청 실패: ${message}`)
  }
}

/**
 * 2단계: 결제 승인 (Confirm)
 *
 * @description 사용자가 결제를 승인하면, paymentKey를 받아 최종 승인합니다.
 * @returns 결제 승인 정보
 */
export async function confirmTossPayment(
  params: TossPaymentConfirmRequest
): Promise<TossPaymentResponse> {
  try {
    devLog('[Toss Payments] Confirm request:', {
      orderId: params.orderId,
      amount: params.amount,
    })

    const response = await axios.post<TossPaymentResponse>(
      `${TOSS_API_BASE}/confirm`,
      params,
      { headers: getHeaders() }
    )

    devLog('[Toss Payments] Confirm success:', {
      paymentKey: response.data.paymentKey,
      approvedAt: response.data.approvedAt,
      method: response.data.method,
    })

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Toss Payments', operation: '결제 승인' })
    throw new Error(`Toss Payments 결제 승인 실패: ${message}`)
  }
}

/**
 * 3단계: 결제 취소 (Cancel)
 *
 * @description 결제를 취소하거나 부분 취소합니다.
 * @returns 취소 정보
 */
export async function cancelTossPayment(
  params: TossPaymentCancelRequest
): Promise<TossPaymentResponse> {
  try {
    devLog('[Toss Payments] Cancel request:', {
      paymentKey: params.paymentKey,
      cancelReason: params.cancelReason,
      cancelAmount: params.cancelAmount,
    })

    const response = await axios.post<TossPaymentResponse>(
      `${TOSS_API_BASE}/${params.paymentKey}/cancel`,
      {
        cancelReason: params.cancelReason,
        cancelAmount: params.cancelAmount,
      },
      { headers: getHeaders() }
    )

    devLog('[Toss Payments] Cancel success:', {
      paymentKey: response.data.paymentKey,
      status: response.data.status,
    })

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Toss Payments', operation: '결제 취소' })
    throw new Error(`Toss Payments 결제 취소 실패: ${message}`)
  }
}

/**
 * 결제 조회 (Query)
 *
 * @description paymentKey로 결제 정보를 조회합니다.
 * @returns 결제 정보
 */
export async function getTossPayment(paymentKey: string): Promise<TossPaymentResponse> {
  try {
    devLog('[Toss Payments] Query payment:', { paymentKey })

    const response = await axios.get<TossPaymentResponse>(
      `${TOSS_API_BASE}/${paymentKey}`,
      { headers: getHeaders() }
    )

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Toss Payments', operation: '결제 조회' })
    throw new Error(`Toss Payments 결제 조회 실패: ${message}`)
  }
}

// ===================================================================
// Helper: Redirect URL 생성
// ===================================================================

/**
 * Redirect URL 생성 (프로덕션/개발 환경 자동 감지)
 */
export function getTossPaymentRedirectUrls(orderId: string) {
  const baseUrl = window.location.origin

  return {
    successUrl: `${baseUrl}/checkout/payment/toss/success?order_id=${orderId}`,
    failUrl: `${baseUrl}/checkout/payment/toss/fail?order_id=${orderId}`,
  }
}
