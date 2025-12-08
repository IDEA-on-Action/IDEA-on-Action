/**
 * Team Types
 *
 * 팀 및 조직 관리 관련 타입 정의
 *
 * @module types/team
 */

// ============================================================================
// User Role Types
// ============================================================================

/**
 * 사용자 역할
 *
 * 팀 및 조직 내에서의 사용자 권한 수준
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * 역할 권한 매핑
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'], // 모든 권한
  admin: ['create', 'read', 'update', 'delete', 'invite', 'remove'],
  member: ['read', 'invite'],
  viewer: ['read'],
}

/**
 * 역할 우선순위 (높을수록 강력한 권한)
 */
export const ROLE_PRIORITY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

// ============================================================================
// Organization Types
// ============================================================================

/**
 * 조직 (Organization)
 *
 * 최상위 컨테이너
 */
export interface Organization {
  /** 조직 ID */
  id: string
  /** 조직 이름 */
  name: string
  /** URL 슬러그 (고유 식별자) */
  slug: string
  /** 설명 */
  description: string | null
  /** 아바타 URL */
  avatar_url: string | null
  /** 조직 설정 JSON */
  settings: OrganizationSettings
  /** 생성자 ID */
  created_by: string
  /** 생성 일시 */
  created_at: string
  /** 수정 일시 */
  updated_at: string
}

/**
 * 조직 설정
 */
export interface OrganizationSettings {
  /** 기본 언어 */
  default_language?: 'ko' | 'en'
  /** 기본 시간대 */
  default_timezone?: string
  /** 공개 여부 */
  is_public?: boolean
  /** 이메일 도메인 화이트리스트 */
  allowed_email_domains?: string[]
  /** 멤버 초대 권한 (admin 이상 or 모든 멤버) */
  member_can_invite?: boolean
}

/**
 * 조직 생성 입력
 */
export interface CreateOrganizationInput {
  /** 조직 이름 */
  name: string
  /** URL 슬러그 */
  slug: string
  /** 설명 (선택) */
  description?: string
  /** 아바타 URL (선택) */
  avatar_url?: string
  /** 설정 (선택) */
  settings?: Partial<OrganizationSettings>
}

/**
 * 조직 수정 입력
 */
export interface UpdateOrganizationInput {
  /** 조직 이름 */
  name?: string
  /** URL 슬러그 */
  slug?: string
  /** 설명 */
  description?: string
  /** 아바타 URL */
  avatar_url?: string
  /** 설정 */
  settings?: Partial<OrganizationSettings>
}

// ============================================================================
// Team Types
// ============================================================================

/**
 * 팀 (Team)
 *
 * 조직 내 하위 그룹
 */
export interface Team {
  /** 팀 ID */
  id: string
  /** 소속 조직 ID */
  organization_id: string
  /** 팀 이름 */
  name: string
  /** 설명 */
  description: string | null
  /** 아바타 URL */
  avatar_url: string | null
  /** 팀 설정 JSON */
  settings: TeamSettings
  /** 생성자 ID */
  created_by: string
  /** 생성 일시 */
  created_at: string
  /** 수정 일시 */
  updated_at: string
}

/**
 * 팀 설정
 */
export interface TeamSettings {
  /** 공개 여부 */
  is_public?: boolean
  /** 자동 수락 (초대 없이 가입 가능) */
  auto_accept?: boolean
  /** 기본 멤버 역할 */
  default_member_role?: UserRole
  /** 알림 설정 */
  notifications?: {
    new_member?: boolean
    member_left?: boolean
  }
}

/**
 * 팀 생성 입력
 */
export interface CreateTeamInput {
  /** 소속 조직 ID */
  organization_id: string
  /** 팀 이름 */
  name: string
  /** 설명 (선택) */
  description?: string
  /** 아바타 URL (선택) */
  avatar_url?: string
  /** 설정 (선택) */
  settings?: Partial<TeamSettings>
}

/**
 * 팀 수정 입력
 */
export interface UpdateTeamInput {
  /** 팀 이름 */
  name?: string
  /** 설명 */
  description?: string
  /** 아바타 URL */
  avatar_url?: string
  /** 설정 */
  settings?: Partial<TeamSettings>
}

/**
 * 팀 (멤버 수 포함)
 *
 * teams_with_member_count 뷰
 */
export interface TeamWithMemberCount extends Team {
  /** 활성 멤버 수 */
  member_count: number
}

// ============================================================================
// Team Member Types
// ============================================================================

/**
 * 팀 멤버
 */
export interface TeamMember {
  /** 멤버 ID */
  id: string
  /** 팀 ID */
  team_id: string
  /** 사용자 ID */
  user_id: string
  /** 역할 */
  role: UserRole
  /** 초대자 ID */
  invited_by: string | null
  /** 초대 일시 */
  invited_at: string
  /** 가입 일시 (NULL = 초대 대기 중) */
  joined_at: string | null
  /** 생성 일시 */
  created_at: string
}

/**
 * 팀 멤버 (사용자 정보 포함)
 */
export interface TeamMemberWithUser extends TeamMember {
  /** 사용자 정보 */
  user: {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
  }
}

/**
 * 팀 멤버 추가 입력
 */
export interface AddTeamMemberInput {
  /** 팀 ID */
  team_id: string
  /** 사용자 ID */
  user_id: string
  /** 역할 */
  role: UserRole
}

/**
 * 팀 멤버 역할 수정 입력
 */
export interface UpdateTeamMemberRoleInput {
  /** 팀 ID */
  team_id: string
  /** 사용자 ID */
  user_id: string
  /** 새 역할 */
  role: UserRole
}

/**
 * 팀 멤버 제거 입력
 */
export interface RemoveTeamMemberInput {
  /** 팀 ID */
  team_id: string
  /** 사용자 ID */
  user_id: string
}

// ============================================================================
// Team Invitation Types
// ============================================================================

/**
 * 팀 초대
 */
export interface TeamInvitation {
  /** 초대 ID */
  id: string
  /** 팀 ID */
  team_id: string
  /** 초대 대상 이메일 */
  email: string
  /** 역할 */
  role: UserRole
  /** 초대 토큰 (64자 HEX) */
  token: string
  /** 초대자 ID */
  invited_by: string
  /** 만료 일시 */
  expires_at: string
  /** 수락 일시 */
  accepted_at: string | null
  /** 생성 일시 */
  created_at: string
}

/**
 * 팀 초대 생성 입력
 */
export interface CreateTeamInvitationInput {
  /** 팀 ID */
  team_id: string
  /** 초대 대상 이메일 목록 */
  emails: string[]
  /** 역할 */
  role: UserRole
  /** 만료 시간 (시간, 기본 7일) */
  expires_in_hours?: number
}

/**
 * 팀 초대 수락 입력
 */
export interface AcceptTeamInvitationInput {
  /** 초대 토큰 */
  token: string
}

/**
 * 초대 검증 결과
 */
export interface InvitationValidationResult {
  /** 초대 ID */
  invitation_id: string | null
  /** 팀 ID */
  team_id: string | null
  /** 이메일 */
  email: string | null
  /** 역할 */
  role: UserRole | null
  /** 유효 여부 */
  is_valid: boolean
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 팀 통계
 */
export interface TeamStats {
  /** 팀 ID */
  team_id: string
  /** 총 멤버 수 */
  total_members: number
  /** 역할별 멤버 수 */
  members_by_role: Record<UserRole, number>
  /** 활성 멤버 수 (30일 내 활동) */
  active_members: number
  /** 보류 중인 초대 수 */
  pending_invitations: number
}

/**
 * 사용자 팀 목록
 */
export interface UserTeams {
  /** 사용자 ID */
  user_id: string
  /** 소속 팀 목록 */
  teams: Array<{
    team: Team
    role: UserRole
    joined_at: string
  }>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * 팀 관리 에러 코드
 */
export type TeamErrorCode =
  | 'TEAM_001' // 팀을 찾을 수 없음
  | 'TEAM_002' // 권한 없음
  | 'TEAM_003' // 이미 멤버임
  | 'TEAM_004' // 멤버가 아님
  | 'TEAM_005' // 초대 토큰 무효
  | 'TEAM_006' // 초대 만료됨
  | 'TEAM_007' // 슬러그 중복
  | 'TEAM_008' // owner 제거 불가
  | 'TEAM_009' // 조직을 찾을 수 없음
  | 'TEAM_010' // 알 수 없는 오류

/**
 * 팀 관리 에러
 */
export interface TeamError {
  /** 에러 코드 */
  code: TeamErrorCode
  /** 에러 메시지 */
  message: string
  /** 상세 정보 */
  details?: string
  /** 타임스탬프 */
  timestamp: string
}

/**
 * 에러 코드별 메시지 매핑
 */
export const TEAM_ERROR_MESSAGES: Record<TeamErrorCode, string> = {
  TEAM_001: '팀을 찾을 수 없습니다',
  TEAM_002: '권한이 없습니다',
  TEAM_003: '이미 팀 멤버입니다',
  TEAM_004: '팀 멤버가 아닙니다',
  TEAM_005: '초대 토큰이 유효하지 않습니다',
  TEAM_006: '초대가 만료되었습니다',
  TEAM_007: '슬러그가 이미 사용 중입니다',
  TEAM_008: 'Owner는 제거할 수 없습니다',
  TEAM_009: '조직을 찾을 수 없습니다',
  TEAM_010: '알 수 없는 오류가 발생했습니다',
}
