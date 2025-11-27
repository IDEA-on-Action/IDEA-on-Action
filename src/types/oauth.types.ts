/**
 * OAuth 2.0 Types
 *
 * OAuth 2.0 인증 관련 타입 정의
 * RFC 6749, RFC 7636 (PKCE) 준수
 *
 * @module types/oauth
 */

import type { SubscriptionStatus } from './subscription.types'

// ============================================================================
// Database Types
// ============================================================================

/**
 * OAuth 클라이언트 정보
 *
 * Minu 서비스별 OAuth 앱 등록 정보
 */
export interface OAuthClient {
  /** 클라이언트 고유 ID (UUID) */
  id: string
  /** OAuth 클라이언트 ID (공개) */
  client_id: string
  /** OAuth 클라이언트 시크릿 (비공개) */
  client_secret: string
  /** 클라이언트 이름 (예: "Minu Find") */
  name: string
  /** 허용된 리디렉션 URI 목록 */
  redirect_uris: string[]
  /** 요청 가능한 스코프 목록 */
  scopes: string[]
  /** 클라이언트 활성화 여부 */
  is_active: boolean
  /** 생성 일시 (ISO 8601) */
  created_at: string
  /** 수정 일시 (ISO 8601) */
  updated_at: string
}

/**
 * 인가 코드 (Authorization Code)
 *
 * OAuth 2.0 Authorization Code Flow에서 사용
 * 수명: 10분 (1회 사용 후 삭제)
 */
export interface AuthorizationCode {
  /** 코드 고유 ID (UUID) */
  id: string
  /** 인가 코드 (랜덤 문자열) */
  code: string
  /** OAuth 클라이언트 ID */
  client_id: string
  /** 사용자 ID (Supabase Auth) */
  user_id: string
  /** 부여된 스코프 목록 */
  scopes: string[]
  /** PKCE Code Challenge (SHA-256 해시) */
  code_challenge: string
  /** PKCE 알고리즘 (S256 고정) */
  code_challenge_method: 'S256'
  /** 만료 일시 (ISO 8601) */
  expires_at: string
  /** 사용 일시 (null = 미사용) */
  used_at: string | null
  /** 생성 일시 (ISO 8601) */
  created_at: string
}

/**
 * OAuth 액세스 토큰
 *
 * 저장소: service_tokens 테이블 (mcp-auth 스키마)
 */
export interface OAuthAccessToken {
  /** 토큰 고유 ID */
  id: string
  /** OAuth 클라이언트 ID */
  client_id: string
  /** 사용자 ID */
  user_id: string
  /** 액세스 토큰 (JWT) */
  access_token: string
  /** 토큰 유형 (Bearer 고정) */
  token_type: 'Bearer'
  /** 만료 시간 (초) */
  expires_in: number
  /** 만료 일시 (ISO 8601) */
  expires_at: string
  /** 부여된 스코프 */
  scopes: string[]
  /** 생성 일시 */
  created_at: string
}

/**
 * OAuth 리프레시 토큰
 *
 * 저장소: refresh_tokens 테이블 (mcp-auth 스키마)
 */
export interface OAuthRefreshToken {
  /** 토큰 고유 ID */
  id: string
  /** OAuth 클라이언트 ID */
  client_id: string
  /** 사용자 ID */
  user_id: string
  /** 리프레시 토큰 (랜덤 문자열) */
  refresh_token: string
  /** 만료 일시 (ISO 8601, null = 무제한) */
  expires_at: string | null
  /** 폐기 여부 */
  revoked: boolean
  /** 생성 일시 */
  created_at: string
  /** 마지막 사용 일시 */
  last_used_at: string | null
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * OAuth 2.0 인가 요청 (Authorization Request)
 *
 * GET /oauth/authorize
 */
export interface OAuthAuthorizationRequest {
  /** 응답 타입 (code 고정) */
  response_type: 'code'
  /** OAuth 클라이언트 ID */
  client_id: string
  /** 리디렉션 URI */
  redirect_uri: string
  /** 요청 스코프 (공백 구분) */
  scope: string
  /** CSRF 방지용 상태값 */
  state?: string
  /** PKCE Code Challenge */
  code_challenge: string
  /** PKCE 알고리즘 (S256 고정) */
  code_challenge_method: 'S256'
}

/**
 * OAuth 2.0 인가 응답 (Authorization Response)
 *
 * Redirect to {redirect_uri}?code={code}&state={state}
 */
export interface OAuthAuthorizationResponse {
  /** 인가 코드 */
  code: string
  /** 상태값 (요청 시 전달한 값) */
  state?: string
}

/**
 * OAuth 2.0 토큰 요청 (Token Request)
 *
 * POST /oauth/token
 */
export interface OAuthTokenRequest {
  /** 그랜트 타입 */
  grant_type: 'authorization_code' | 'refresh_token'
  /** 인가 코드 (authorization_code 사용 시) */
  code?: string
  /** 리프레시 토큰 (refresh_token 사용 시) */
  refresh_token?: string
  /** 리디렉션 URI (인가 요청 시와 동일) */
  redirect_uri?: string
  /** OAuth 클라이언트 ID */
  client_id: string
  /** OAuth 클라이언트 시크릿 */
  client_secret: string
  /** PKCE Code Verifier (원본 문자열) */
  code_verifier?: string
}

/**
 * OAuth 2.0 토큰 응답 (Token Response)
 *
 * RFC 6749 Section 5.1
 */
export interface OAuthTokenResponse {
  /** 액세스 토큰 (JWT) */
  access_token: string
  /** 토큰 유형 (Bearer 고정) */
  token_type: 'Bearer'
  /** 만료 시간 (초) */
  expires_in: number
  /** 리프레시 토큰 */
  refresh_token: string
  /** 부여된 스코프 (공백 구분) */
  scope: string
}

/**
 * OAuth 2.0 토큰 폐기 요청 (Token Revocation Request)
 *
 * POST /oauth/revoke (RFC 7009)
 */
export interface OAuthTokenRevokeRequest {
  /** 폐기할 토큰 */
  token: string
  /** 토큰 유형 힌트 */
  token_type_hint?: 'access_token' | 'refresh_token'
  /** OAuth 클라이언트 ID */
  client_id: string
  /** OAuth 클라이언트 시크릿 */
  client_secret: string
}

// ============================================================================
// JWT Payload
// ============================================================================

/**
 * OAuth JWT Payload
 *
 * 액세스 토큰 디코딩 결과
 */
export interface OAuthJWTPayload {
  /** Subject (사용자 ID) */
  sub: string
  /** Issuer (발급자) */
  iss: string
  /** Audience (수신자, 클라이언트 ID 목록) */
  aud: string[]
  /** Expiration Time (만료 타임스탬프, Unix epoch) */
  exp: number
  /** Issued At (발급 타임스탬프, Unix epoch) */
  iat: number
  /** Scope (부여된 권한) */
  scope: string
  /** 구독 정보 (커스텀 클레임) */
  subscription: {
    /** 플랜 ID */
    plan_id: string
    /** 플랜 이름 */
    plan_name: string
    /** 구독 상태 */
    status: SubscriptionStatus
  }
  /** 사용자 정보 (커스텀 클레임) */
  user: {
    /** 이메일 */
    email: string
    /** 이름 */
    full_name: string
  }
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * OAuth 2.0 에러 코드
 *
 * RFC 6749 Section 5.2
 */
export type OAuthErrorCode =
  | 'invalid_request'        // 필수 파라미터 누락
  | 'invalid_client'         // 클라이언트 인증 실패
  | 'invalid_grant'          // 인가 코드/리프레시 토큰 유효하지 않음
  | 'unauthorized_client'    // 클라이언트 권한 없음
  | 'unsupported_grant_type' // 지원하지 않는 grant_type
  | 'invalid_scope'          // 유효하지 않은 스코프

/**
 * OAuth 2.0 에러 응답
 *
 * RFC 6749 Section 5.2
 */
export interface OAuthErrorResponse {
  /** 에러 코드 */
  error: OAuthErrorCode
  /** 에러 설명 */
  error_description?: string
  /** 추가 정보 URI */
  error_uri?: string
}

// ============================================================================
// Scope Definitions
// ============================================================================

/**
 * OAuth 스코프 (권한)
 *
 * Minu 서비스별 API 접근 권한 정의
 */
export type OAuthScope =
  // Minu Find (시장 분석)
  | 'find:market:read'       // 시장 데이터 조회
  | 'find:market:write'      // 시장 데이터 생성/수정
  | 'find:competitor:read'   // 경쟁사 분석 조회
  | 'find:trend:read'        // 트렌드 보고서 조회
  // Minu Frame (문서 생성)
  | 'frame:document:read'    // 문서 조회
  | 'frame:document:write'   // 문서 생성/수정
  | 'frame:rfp:read'         // RFP 조회
  | 'frame:rfp:write'        // RFP 생성/수정
  | 'frame:template:read'    // 템플릿 조회
  // Minu Build (프로젝트 관리)
  | 'build:project:read'     // 프로젝트 조회
  | 'build:project:write'    // 프로젝트 생성/수정
  | 'build:sprint:read'      // 스프린트 조회
  | 'build:sprint:write'     // 스프린트 관리
  | 'build:team:read'        // 팀 정보 조회
  | 'build:team:write'       // 팀원 초대
  // Minu Keep (운영/모니터링)
  | 'keep:monitoring:read'   // 모니터링 데이터 조회
  | 'keep:monitoring:write'  // 모니터링 설정
  | 'keep:alert:read'        // 알림 규칙 조회
  | 'keep:alert:write'       // 알림 규칙 생성/수정
  | 'keep:report:read'       // 보고서 조회
  | 'keep:report:write'      // 보고서 생성
  // 공통
  | 'profile:read'           // 프로필 조회
  | 'profile:write'          // 프로필 수정
  | 'subscription:read'      // 구독 정보 조회

/**
 * 스코프 설명 매핑
 */
export const OAUTH_SCOPE_DESCRIPTIONS: Record<OAuthScope, string> = {
  'find:market:read': '시장 데이터 조회',
  'find:market:write': '시장 데이터 생성 및 수정',
  'find:competitor:read': '경쟁사 분석 조회',
  'find:trend:read': '트렌드 보고서 조회',
  'frame:document:read': '문서 조회',
  'frame:document:write': '문서 생성 및 수정',
  'frame:rfp:read': 'RFP 조회',
  'frame:rfp:write': 'RFP 생성 및 수정',
  'frame:template:read': '템플릿 조회',
  'build:project:read': '프로젝트 조회',
  'build:project:write': '프로젝트 생성 및 수정',
  'build:sprint:read': '스프린트 조회',
  'build:sprint:write': '스프린트 관리',
  'build:team:read': '팀 정보 조회',
  'build:team:write': '팀원 초대',
  'keep:monitoring:read': '모니터링 데이터 조회',
  'keep:monitoring:write': '모니터링 설정',
  'keep:alert:read': '알림 규칙 조회',
  'keep:alert:write': '알림 규칙 생성 및 수정',
  'keep:report:read': '보고서 조회',
  'keep:report:write': '보고서 생성',
  'profile:read': '프로필 조회',
  'profile:write': '프로필 수정',
  'subscription:read': '구독 정보 조회',
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * PKCE Code Verifier
 *
 * RFC 7636: 43~128자 랜덤 문자열
 */
export interface PKCECodeVerifier {
  /** 원본 Verifier (Base64url 인코딩) */
  verifier: string
  /** SHA-256 해시 (Base64url 인코딩) */
  challenge: string
  /** 알고리즘 (S256 고정) */
  method: 'S256'
}

/**
 * OAuth 클라이언트 생성 요청
 */
export interface CreateOAuthClientRequest {
  /** 클라이언트 이름 */
  name: string
  /** 허용된 리디렉션 URI 목록 */
  redirect_uris: string[]
  /** 요청 가능한 스코프 목록 */
  scopes: OAuthScope[]
}

/**
 * OAuth 클라이언트 생성 응답
 */
export interface CreateOAuthClientResponse {
  /** 클라이언트 ID (공개) */
  client_id: string
  /** 클라이언트 시크릿 (비공개, 1회만 표시) */
  client_secret: string
  /** 클라이언트 이름 */
  name: string
  /** 허용된 리디렉션 URI 목록 */
  redirect_uris: string[]
  /** 요청 가능한 스코프 목록 */
  scopes: OAuthScope[]
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 인가 코드 만료 시간 (초)
 */
export const AUTHORIZATION_CODE_EXPIRES_IN = 10 * 60 // 10분

/**
 * 액세스 토큰 만료 시간 (초)
 */
export const ACCESS_TOKEN_EXPIRES_IN = 60 * 60 // 1시간

/**
 * 리프레시 토큰 만료 시간 (초)
 */
export const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 // 30일

/**
 * PKCE Code Verifier 길이
 */
export const PKCE_VERIFIER_LENGTH = 128

/**
 * OAuth 엔드포인트 경로
 */
export const OAUTH_ENDPOINTS = {
  /** 인가 엔드포인트 */
  authorize: '/oauth/authorize',
  /** 토큰 엔드포인트 */
  token: '/oauth/token',
  /** 토큰 폐기 엔드포인트 */
  revoke: '/oauth/revoke',
} as const
