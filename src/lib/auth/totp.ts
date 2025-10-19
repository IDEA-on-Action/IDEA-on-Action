/**
 * TOTP (Time-based One-Time Password) Utility
 *
 * 2FA 인증을 위한 TOTP 생성 및 검증 함수
 * - 비밀키 생성
 * - QR 코드 생성 (Google Authenticator, Authy 등)
 * - TOTP 토큰 검증
 * - 백업 코드 생성
 */

import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

// ===================================================================
// Types
// ===================================================================

export interface TOTPSecret {
  secret: string // Base32 인코딩된 비밀키
  uri: string // otpauth:// URI
  qrCode: string // Data URL (QR 코드 이미지)
}

export interface TOTPVerifyResult {
  valid: boolean
  delta?: number // 시간 차이 (음수: 과거, 0: 현재, 양수: 미래)
}

// ===================================================================
// Configuration
// ===================================================================

const TOTP_CONFIG = {
  issuer: 'IDEA on Action',
  algorithm: 'SHA1',
  digits: 6,
  period: 30, // 30초마다 갱신
  window: 1, // ±1 시간 윈도우 (총 3개 토큰 허용: 이전, 현재, 다음)
}

// ===================================================================
// TOTP Secret Generation
// ===================================================================

/**
 * TOTP 비밀키 생성 및 QR 코드 생성
 *
 * @param userEmail - 사용자 이메일 (QR 코드에 표시)
 * @returns TOTP 비밀키 및 QR 코드
 *
 * @example
 * const { secret, uri, qrCode } = await generateTOTPSecret('user@example.com')
 * // secret: 'JBSWY3DPEHPK3PXP'
 * // uri: 'otpauth://totp/IDEA%20on%20Action:user@example.com?secret=...'
 * // qrCode: 'data:image/png;base64,...'
 */
export async function generateTOTPSecret(userEmail: string): Promise<TOTPSecret> {
  // TOTP 객체 생성
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    label: userEmail,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(OTPAuth.Secret.fromRandom(20).base32), // 20바이트 랜덤 시크릿
  })

  // otpauth:// URI 생성
  const uri = totp.toString()

  // QR 코드 생성 (Data URL)
  const qrCode = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1,
  })

  return {
    secret: totp.secret.base32,
    uri,
    qrCode,
  }
}

// ===================================================================
// TOTP Verification
// ===================================================================

/**
 * TOTP 토큰 검증
 *
 * @param secret - Base32 인코딩된 TOTP 비밀키
 * @param token - 사용자가 입력한 6자리 토큰
 * @returns 검증 결과 (유효 여부 및 시간 차이)
 *
 * @example
 * const result = verifyTOTPToken('JBSWY3DPEHPK3PXP', '123456')
 * if (result.valid) {
 *   console.log('TOTP 인증 성공!')
 * }
 */
export function verifyTOTPToken(secret: string, token: string): TOTPVerifyResult {
  try {
    // TOTP 객체 생성
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_CONFIG.issuer,
      algorithm: TOTP_CONFIG.algorithm,
      digits: TOTP_CONFIG.digits,
      period: TOTP_CONFIG.period,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    // 토큰 검증 (±1 윈도우)
    const delta = totp.validate({
      token,
      window: TOTP_CONFIG.window,
    })

    if (delta === null) {
      return { valid: false }
    }

    return {
      valid: true,
      delta,
    }
  } catch (error) {
    console.error('TOTP verification error:', error)
    return { valid: false }
  }
}

/**
 * 현재 시점의 TOTP 토큰 생성 (테스트/검증용)
 *
 * @param secret - Base32 인코딩된 TOTP 비밀키
 * @returns 6자리 TOTP 토큰
 */
export function generateTOTPToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  return totp.generate()
}

// ===================================================================
// Backup Codes
// ===================================================================

/**
 * 백업 코드 생성 (10개)
 *
 * 백업 코드는 TOTP를 사용할 수 없을 때 (기기 분실 등) 사용
 * - 8자리 숫자
 * - 일회용 (사용 후 무효화)
 * - bcrypt 해시하여 데이터베이스에 저장
 *
 * @returns 백업 코드 배열 (10개)
 *
 * @example
 * const codes = generateBackupCodes()
 * // ['12345678', '87654321', ...]
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []

  for (let i = 0; i < 10; i++) {
    // 8자리 랜덤 숫자 생성
    const code = Math.floor(10000000 + Math.random() * 90000000).toString()
    codes.push(code)
  }

  return codes
}

/**
 * 백업 코드 해시 (bcrypt 사용)
 *
 * 주의: 이 함수는 클라이언트에서 사용할 수 없음 (bcrypt는 Node.js 환경에서만 동작)
 * 실제로는 서버 사이드 (Supabase Edge Function 또는 백엔드)에서 처리해야 함
 *
 * @param code - 백업 코드
 * @returns bcrypt 해시
 */
export async function hashBackupCode(code: string): Promise<string> {
  // 브라우저 환경에서는 bcrypt를 사용할 수 없으므로,
  // 이 함수는 Supabase Edge Function에서 호출되어야 함
  throw new Error('hashBackupCode must be called from server-side (Supabase Edge Function)')
}

/**
 * 백업 코드 검증
 *
 * 주의: 이 함수는 클라이언트에서 사용할 수 없음
 * 실제로는 서버 사이드에서 처리해야 함
 *
 * @param code - 사용자가 입력한 백업 코드
 * @param hashedCode - 데이터베이스에 저장된 해시
 * @returns 검증 결과
 */
export async function verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
  // 브라우저 환경에서는 bcrypt를 사용할 수 없으므로,
  // 이 함수는 Supabase Edge Function에서 호출되어야 함
  throw new Error('verifyBackupCode must be called from server-side (Supabase Edge Function)')
}

// ===================================================================
// Helper Functions
// ===================================================================

/**
 * TOTP 남은 시간 계산 (초)
 *
 * 현재 토큰이 만료될 때까지 남은 시간
 *
 * @returns 남은 시간 (초)
 *
 * @example
 * const remaining = getTOTPRemainingTime()
 * // 25 (25초 남음)
 */
export function getTOTPRemainingTime(): number {
  const now = Math.floor(Date.now() / 1000)
  const period = TOTP_CONFIG.period
  return period - (now % period)
}
