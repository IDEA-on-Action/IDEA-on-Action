// ===================================================================
// Kakao Pay API Client
// 작성일: 2025-10-19
// 목적: Kakao Pay REST API 래퍼 함수
// 참고: https://developers.kakaopay.com/docs/payment/online
// ===================================================================

import axios, { AxiosError } from 'axios'
import type {
  KakaoPayReadyRequest,
  KakaoPayReadyResponse,
  KakaoPayApproveRequest,
  KakaoPayApproveResponse,
  KakaoPayCancelRequest,
  KakaoPayCancelResponse,
} from './types'
import { extractErrorMessage, devLog, devError } from '@/lib/errors'

// ===================================================================
// Constants
// ===================================================================

const KAKAO_PAY_API_BASE = 'https://open-api.kakaopay.com/online/v1/payment'

const CID = import.meta.env.VITE_KAKAO_PAY_CID || 'TC0ONETIME' // 테스트용 가맹점 코드
const ADMIN_KEY = import.meta.env.VITE_KAKAO_PAY_ADMIN_KEY // Admin 키 (서버 사이드에서만 사용)

// ===================================================================
// Helper Functions
// ===================================================================

/**
 * Kakao Pay API 요청 헤더 생성
 */
function getHeaders() {
  return {
    Authorization: `KakaoAK ${ADMIN_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  }
}

/**
 * URL-encoded form data 생성
 */
function toFormData(params: Record<string, unknown>): string {
  return Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&')
}


// ===================================================================
// API Functions
// ===================================================================

/**
 * 1단계: 결제 준비 (Ready)
 *
 * @description 결제 정보를 등록하고 결제 고유번호(TID)를 받습니다.
 * @returns 결제 페이지 URL과 TID
 */
export async function prepareKakaoPayment(
  params: Omit<KakaoPayReadyRequest, 'cid'>
): Promise<KakaoPayReadyResponse> {
  try {
    const requestData: KakaoPayReadyRequest = {
      cid: CID,
      ...params,
    }

    devLog('[Kakao Pay] Ready request:', {
      ...requestData,
      cid: CID.substring(0, 5) + '***', // 보안을 위해 일부만 출력
    })

    const response = await axios.post<KakaoPayReadyResponse>(
      `${KAKAO_PAY_API_BASE}/ready`,
      toFormData(requestData),
      { headers: getHeaders() }
    )

    devLog('[Kakao Pay] Ready success:', {
      tid: response.data.tid,
      created_at: response.data.created_at,
    })

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Kakao Pay', operation: '결제 준비' })
    throw new Error(`Kakao Pay 결제 준비 실패: ${message}`)
  }
}

/**
 * 2단계: 결제 승인 (Approve)
 *
 * @description 사용자가 결제 수단을 선택하고 승인하면, pg_token을 받아 최종 승인합니다.
 * @returns 결제 승인 정보 (카드 정보, 승인 번호 등)
 */
export async function approveKakaoPayment(
  params: Omit<KakaoPayApproveRequest, 'cid'>
): Promise<KakaoPayApproveResponse> {
  try {
    const requestData: KakaoPayApproveRequest = {
      cid: CID,
      ...params,
    }

    devLog('[Kakao Pay] Approve request:', {
      tid: requestData.tid,
      partner_order_id: requestData.partner_order_id,
    })

    const response = await axios.post<KakaoPayApproveResponse>(
      `${KAKAO_PAY_API_BASE}/approve`,
      toFormData(requestData),
      { headers: getHeaders() }
    )

    devLog('[Kakao Pay] Approve success:', {
      aid: response.data.aid,
      approved_at: response.data.approved_at,
      amount: response.data.amount.total,
    })

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Kakao Pay', operation: '결제 승인' })
    throw new Error(`Kakao Pay 결제 승인 실패: ${message}`)
  }
}

/**
 * 3단계: 결제 취소 (Cancel)
 *
 * @description 결제를 취소하거나 부분 취소합니다.
 * @returns 취소 정보
 */
export async function cancelKakaoPayment(
  params: Omit<KakaoPayCancelRequest, 'cid'>
): Promise<KakaoPayCancelResponse> {
  try {
    const requestData: KakaoPayCancelRequest = {
      cid: CID,
      ...params,
    }

    devLog('[Kakao Pay] Cancel request:', {
      tid: requestData.tid,
      cancel_amount: requestData.cancel_amount,
    })

    const response = await axios.post<KakaoPayCancelResponse>(
      `${KAKAO_PAY_API_BASE}/cancel`,
      toFormData(requestData),
      { headers: getHeaders() }
    )

    devLog('[Kakao Pay] Cancel success:', {
      aid: response.data.aid,
      canceled_at: response.data.canceled_at,
      status: response.data.status,
    })

    return response.data
  } catch (error) {
    const message = extractErrorMessage(error)
    devError(error, { service: 'Kakao Pay', operation: '결제 취소' })
    throw new Error(`Kakao Pay 결제 취소 실패: ${message}`)
  }
}

// ===================================================================
// Helper: Redirect URL 생성
// ===================================================================

/**
 * Redirect URL 생성 (프로덕션/개발 환경 자동 감지)
 */
export function getKakaoPayRedirectUrls(orderId: string) {
  const baseUrl = window.location.origin

  return {
    approval_url: `${baseUrl}/checkout/payment/kakao/success?order_id=${orderId}`,
    cancel_url: `${baseUrl}/checkout/payment/kakao/cancel?order_id=${orderId}`,
    fail_url: `${baseUrl}/checkout/payment/kakao/fail?order_id=${orderId}`,
  }
}
