/**
 * 프롬프트 템플릿 타입 정의
 *
 * Claude Skills에서 사용하는 프롬프트 템플릿의 DB 모델 및 훅 타입
 *
 * @module types/prompt-templates
 */

import type { ClaudeSkillType } from './claude-skills.types';

// ============================================================================
// DB 모델 타입 (Supabase prompt_templates 테이블)
// ============================================================================

/**
 * 프롬프트 템플릿 DB 레코드
 */
export interface PromptTemplateDB {
  /** UUID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 설명 */
  description: string;
  /** Skill 유형 */
  skill_type: ClaudeSkillType;
  /** 시스템 프롬프트 */
  system_prompt: string;
  /** 사용자 프롬프트 템플릿 (Handlebars 문법) */
  user_prompt_template: string;
  /** 변수 목록 (JSON 배열) */
  variables: string[];
  /** 버전 (Semantic Versioning) */
  version: string;
  /** 서비스 ID */
  service_id: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | null;
  /** 시스템 템플릿 여부 */
  is_system: boolean;
  /** 공개 여부 (팀 내 공유) */
  is_public: boolean;
  /** 활성 여부 */
  is_active: boolean;
  /** 생성자 UUID */
  created_by: string;
  /** 생성 시각 */
  created_at: string;
  /** 수정 시각 */
  updated_at: string;
  /** 사용 횟수 */
  usage_count: number;
  /** 메타데이터 (JSON) */
  metadata: PromptTemplateMetadata | null;
}

/**
 * 프롬프트 템플릿 메타데이터
 */
export interface PromptTemplateMetadata {
  /** 태그 목록 */
  tags?: string[];
  /** 카테고리 */
  category?: string;
  /** 예상 토큰 수 */
  estimatedTokens?: number;
  /** 평균 응답 시간 (초) */
  avgResponseTime?: number;
  /** 성공률 (0-100) */
  successRate?: number;
  /** 사용자 피드백 평점 (1-5) */
  userRating?: number;
  /** 최근 사용 시각 */
  lastUsedAt?: string;
  /** 커스텀 데이터 */
  [key: string]: unknown;
}

/**
 * 프롬프트 템플릿 (클라이언트용)
 *
 * camelCase 변환된 형태
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  skillType: ClaudeSkillType;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  version: string;
  serviceId: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | null;
  isSystem: boolean;
  isPublic: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  metadata: PromptTemplateMetadata | null;
}

// ============================================================================
// CRUD 타입
// ============================================================================

/**
 * 템플릿 생성 입력
 */
export interface CreatePromptTemplateInput {
  name: string;
  description: string;
  skillType: ClaudeSkillType;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  version?: string; // default: '1.0.0'
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | null;
  isPublic?: boolean; // default: false
  metadata?: PromptTemplateMetadata;
}

/**
 * 템플릿 업데이트 입력
 */
export interface UpdatePromptTemplateInput {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  variables?: string[];
  version?: string;
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | null;
  isPublic?: boolean;
  isActive?: boolean;
  metadata?: PromptTemplateMetadata;
}

/**
 * 템플릿 삭제 입력
 */
export interface DeletePromptTemplateInput {
  id: string;
}

// ============================================================================
// 필터 및 조회 타입
// ============================================================================

/**
 * 템플릿 필터
 */
export interface PromptTemplateFilters {
  /** Skill 유형 */
  skillType?: ClaudeSkillType;
  /** 서비스 ID */
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
  /** 시스템 템플릿 여부 */
  isSystem?: boolean;
  /** 공개 여부 */
  isPublic?: boolean;
  /** 활성 여부 */
  isActive?: boolean;
  /** 생성자 UUID (내 템플릿 필터) */
  createdBy?: string;
  /** 검색어 (name, description 검색) */
  search?: string;
  /** 정렬 기준 */
  orderBy?: 'created_at' | 'updated_at' | 'usage_count' | 'name';
  /** 정렬 방향 */
  orderDirection?: 'asc' | 'desc';
  /** 페이지네이션 제한 */
  limit?: number;
  /** 페이지네이션 오프셋 */
  offset?: number;
}

/**
 * 템플릿 목록 응답
 */
export interface PromptTemplatesResponse {
  /** 템플릿 목록 */
  data: PromptTemplate[];
  /** 전체 개수 */
  count: number | null;
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * usePromptTemplates 훅 결과
 */
export interface UsePromptTemplatesResult {
  /** 템플릿 목록 */
  templates: PromptTemplate[];
  /** 전체 개수 */
  totalCount: number;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 재조회 */
  refetch: () => void;
}

/**
 * useCreatePromptTemplate 훅 결과
 */
export interface UseCreatePromptTemplateResult {
  /** 생성 함수 */
  createTemplate: (input: CreatePromptTemplateInput) => Promise<PromptTemplate>;
  /** 로딩 상태 */
  isCreating: boolean;
  /** 에러 */
  error: Error | null;
}

/**
 * useUpdatePromptTemplate 훅 결과
 */
export interface UseUpdatePromptTemplateResult {
  /** 업데이트 함수 */
  updateTemplate: (input: UpdatePromptTemplateInput) => Promise<PromptTemplate>;
  /** 로딩 상태 */
  isUpdating: boolean;
  /** 에러 */
  error: Error | null;
}

/**
 * useDeletePromptTemplate 훅 결과
 */
export interface UseDeletePromptTemplateResult {
  /** 삭제 함수 */
  deleteTemplate: (id: string) => Promise<void>;
  /** 로딩 상태 */
  isDeleting: boolean;
  /** 에러 */
  error: Error | null;
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

/**
 * 프롬프트 렌더링 결과
 */
export interface RenderedPrompt {
  /** 렌더링된 시스템 프롬프트 */
  systemPrompt: string;
  /** 렌더링된 사용자 프롬프트 */
  userPrompt: string;
  /** 사용된 변수 */
  variables: Record<string, unknown>;
}

/**
 * DB 레코드를 클라이언트 객체로 변환
 */
export function dbToPromptTemplate(db: PromptTemplateDB): PromptTemplate {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    skillType: db.skill_type,
    systemPrompt: db.system_prompt,
    userPromptTemplate: db.user_prompt_template,
    variables: db.variables,
    version: db.version,
    serviceId: db.service_id,
    isSystem: db.is_system,
    isPublic: db.is_public,
    isActive: db.is_active,
    createdBy: db.created_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    usageCount: db.usage_count,
    metadata: db.metadata,
  };
}

/**
 * 클라이언트 객체를 DB 레코드로 변환
 */
export function promptTemplateToDb(template: Partial<PromptTemplate>): Partial<PromptTemplateDB> {
  const db: Partial<PromptTemplateDB> = {};

  if (template.name !== undefined) db.name = template.name;
  if (template.description !== undefined) db.description = template.description;
  if (template.skillType !== undefined) db.skill_type = template.skillType;
  if (template.systemPrompt !== undefined) db.system_prompt = template.systemPrompt;
  if (template.userPromptTemplate !== undefined) db.user_prompt_template = template.userPromptTemplate;
  if (template.variables !== undefined) db.variables = template.variables;
  if (template.version !== undefined) db.version = template.version;
  if (template.serviceId !== undefined) db.service_id = template.serviceId;
  if (template.isPublic !== undefined) db.is_public = template.isPublic;
  if (template.isActive !== undefined) db.is_active = template.isActive;
  if (template.metadata !== undefined) db.metadata = template.metadata;

  return db;
}
