/**
 * Phase 14: 세션 관리 유틸리티
 * 브라우저 세션 ID 생성 및 관리
 */

import { devWarn } from '@/lib/errors'

const SESSION_KEY = 'analytics_session_id'
const SESSION_DURATION = 30 * 60 * 1000 // 30분 (밀리초)

/**
 * 세션 ID 가져오기 (없으면 생성)
 * sessionStorage 사용 (탭 닫으면 세션 종료)
 */
export function getSessionId(): string {
  try {
    // 기존 세션 ID 확인
    let sessionId = sessionStorage.getItem(SESSION_KEY)

    if (!sessionId) {
      // 새 세션 ID 생성 (UUID v4 형식)
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, sessionId)

      // 세션 시작 시간 저장
      sessionStorage.setItem(`${SESSION_KEY}_start`, Date.now().toString())
    }

    // 세션 타임아웃 체크 (30분 이상 경과 시 새 세션)
    const sessionStart = sessionStorage.getItem(`${SESSION_KEY}_start`)
    if (sessionStart) {
      const elapsed = Date.now() - parseInt(sessionStart, 10)
      if (elapsed > SESSION_DURATION) {
        // 세션 만료, 새 세션 생성
        sessionId = crypto.randomUUID()
        sessionStorage.setItem(SESSION_KEY, sessionId)
        sessionStorage.setItem(`${SESSION_KEY}_start`, Date.now().toString())
      }
    }

    // 마지막 활동 시간 업데이트
    sessionStorage.setItem(`${SESSION_KEY}_last_activity`, Date.now().toString())

    return sessionId
  } catch (error) {
    // sessionStorage 접근 실패 시 임시 세션 ID 반환
    devWarn('Failed to access sessionStorage:', error)
    return `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }
}

/**
 * 세션 ID 삭제 (로그아웃, 개인정보 보호)
 */
export function clearSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(`${SESSION_KEY}_start`)
    sessionStorage.removeItem(`${SESSION_KEY}_last_activity`)
  } catch (error) {
    devWarn('Failed to clear session:', error)
  }
}

/**
 * 세션 활동 업데이트
 * 사용자 상호작용 시 호출
 */
export function updateSessionActivity(): void {
  try {
    sessionStorage.setItem(`${SESSION_KEY}_last_activity`, Date.now().toString())
  } catch (error) {
    devWarn('Failed to update session activity:', error)
  }
}

/**
 * 세션 시작 시간 가져오기
 */
export function getSessionStartTime(): Date | null {
  try {
    const sessionStart = sessionStorage.getItem(`${SESSION_KEY}_start`)
    if (sessionStart) {
      return new Date(parseInt(sessionStart, 10))
    }
    return null
  } catch (error) {
    devWarn('Failed to get session start time:', error)
    return null
  }
}

/**
 * 세션 지속 시간 (분)
 */
export function getSessionDuration(): number {
  try {
    const sessionStart = sessionStorage.getItem(`${SESSION_KEY}_start`)
    if (sessionStart) {
      const elapsed = Date.now() - parseInt(sessionStart, 10)
      return Math.floor(elapsed / 60000) // 분 단위
    }
    return 0
  } catch (error) {
    devWarn('Failed to get session duration:', error)
    return 0
  }
}
