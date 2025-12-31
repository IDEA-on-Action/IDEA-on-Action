/**
 * 프롬프트 템플릿 타입 정의
 *
 * 사용자 정의 프롬프트 템플릿 관리 시스템
 * - 시스템 기본 템플릿
 * - 사용자 커스텀 템플릿
 * - 서비스별 특화 템플릿
 * - 템플릿 버전 관리 및 포크
 *
 * @module types/prompt-template
 */

// ============================================================================
// 기본 타입
// ============================================================================

/**
 * 프롬프트 템플릿 카테고리
 */
export type PromptTemplateCategory =
  | 'rfp'           // RFP 생성
  | 'requirements'  // 요구사항 분석
  | 'plan'          // 프로젝트 계획
  | 'report'        // 보고서 작성
  | 'chat'          // 채팅/대화
  | 'custom';       // 사용자 정의

/**
 * 서비스 ID (Minu 시리즈)
 */
export type MinuServiceId =
  | 'minu-find'   // 사업기회 탐색
  | 'minu-frame'  // 문제정의 & RFP
  | 'minu-build'  // 프로젝트 진행
  | 'minu-keep';  // 운영/유지보수

/**
 * 프롬프트 변수 타입
 */
export type PromptVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object';

// ============================================================================
// 프롬프트 템플릿 엔티티
// ============================================================================

/**
 * 프롬프트 템플릿 변수 정의
 */
export interface PromptTemplateVariable {
  /** 변수명 (템플릿에서 {{name}} 형태로 사용) */
  name: string;
  /** 변수 타입 */
  type: PromptVariableType;
  /** 필수 여부 */
  required: boolean;
  /** 기본값 */
  default?: string | number | boolean | null;
  /** 설명 */
  description: string;
  /** 유효성 검사 규칙 (정규식 또는 조건) */
  validation?: string;
  /** 예시 값 */
  example?: string;
}

/**
 * 프롬프트 템플릿 (DB 엔티티)
 */
export interface PromptTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 설명 */
  description: string | null;
  /** 카테고리 */
  category: PromptTemplateCategory;

  /** 시스템 프롬프트 (역할 정의) */
  system_prompt: string | null;
  /** 사용자 프롬프트 템플릿 (변수 포함) */
  user_prompt_template: string;

  /** 변수 목록 */
  variables: PromptTemplateVariable[];
  /** 출력 스키마 (JSON Schema 형식) */
  output_schema: Record<string, unknown> | null;

  /** 공개 템플릿 여부 */
  is_public: boolean;
  /** 시스템 템플릿 여부 */
  is_system: boolean;

  /** 서비스 ID */
  service_id: MinuServiceId | null;

  /** 버전 (Semantic Versioning) */
  version: string;
  /** 부모 템플릿 ID (포크 관계) */
  parent_id: string | null;

  /** 작성자 ID */
  created_by: string;
  /** 사용 횟수 */
  usage_count: number;

  /** 생성일시 */
  created_at: Date;
  /** 수정일시 */
  updated_at: Date;
}

// ============================================================================
// 입력 타입 (생성/수정)
// ============================================================================

/**
 * 프롬프트 템플릿 생성 입력
 */
export interface CreatePromptTemplateInput {
  /** 템플릿명 */
  name: string;
  /** 설명 */
  description?: string;
  /** 카테고리 */
  category: PromptTemplateCategory;

  /** 시스템 프롬프트 */
  system_prompt?: string;
  /** 사용자 프롬프트 템플릿 */
  user_prompt_template: string;

  /** 변수 목록 */
  variables?: PromptTemplateVariable[];
  /** 출력 스키마 */
  output_schema?: Record<string, unknown>;

  /** 공개 여부 */
  is_public?: boolean;

  /** 서비스 ID */
  service_id?: MinuServiceId;

  /** 버전 */
  version?: string;
  /** 부모 템플릿 ID (포크 시) */
  parent_id?: string;
}

/**
 * 프롬프트 템플릿 수정 입력
 */
export interface UpdatePromptTemplateInput {
  /** 템플릿명 */
  name?: string;
  /** 설명 */
  description?: string;
  /** 카테고리 */
  category?: PromptTemplateCategory;

  /** 시스템 프롬프트 */
  system_prompt?: string;
  /** 사용자 프롬프트 템플릿 */
  user_prompt_template?: string;

  /** 변수 목록 */
  variables?: PromptTemplateVariable[];
  /** 출력 스키마 */
  output_schema?: Record<string, unknown>;

  /** 공개 여부 */
  is_public?: boolean;

  /** 서비스 ID */
  service_id?: MinuServiceId | null;

  /** 버전 */
  version?: string;
}

// ============================================================================
// 필터 및 검색
// ============================================================================

/**
 * 프롬프트 템플릿 필터
 */
export interface PromptTemplateFilters {
  /** 카테고리 */
  category?: PromptTemplateCategory;
  /** 서비스 ID */
  service_id?: MinuServiceId | null;
  /** 공개 여부 */
  is_public?: boolean;
  /** 시스템 템플릿 여부 */
  is_system?: boolean;
  /** 작성자 ID */
  created_by?: string;
  /** 부모 템플릿 ID (포크 필터) */
  parent_id?: string | null;
  /** 검색 키워드 (name, description) */
  search?: string;
}

/**
 * 정렬 옵션
 */
export type PromptTemplateSortBy =
  | 'created_at'    // 최신순
  | 'updated_at'    // 최근 수정순
  | 'usage_count'   // 인기순
  | 'name';         // 이름순

/**
 * 정렬 방향
 */
export type PromptTemplateSortOrder = 'asc' | 'desc';

/**
 * 프롬프트 템플릿 쿼리 옵션
 */
export interface PromptTemplateQueryOptions {
  /** 필터 */
  filters?: PromptTemplateFilters;
  /** 정렬 기준 */
  sortBy?: PromptTemplateSortBy;
  /** 정렬 방향 */
  sortOrder?: PromptTemplateSortOrder;
  /** 페이지 번호 (1부터 시작) */
  page?: number;
  /** 페이지 크기 */
  pageSize?: number;
}

// ============================================================================
// 템플릿 렌더링
// ============================================================================

/**
 * 프롬프트 렌더링 입력
 */
export interface RenderPromptInput {
  /** 템플릿 ID */
  templateId: string;
  /** 변수 값 맵 */
  variables: Record<string, string | number | boolean | null>;
}

/**
 * 프롬프트 렌더링 결과
 */
export interface RenderPromptResult {
  /** 렌더링된 시스템 프롬프트 */
  system_prompt: string | null;
  /** 렌더링된 사용자 프롬프트 */
  user_prompt: string;
  /** 사용된 변수 목록 */
  used_variables: string[];
  /** 누락된 필수 변수 목록 */
  missing_variables: string[];
  /** 유효성 검사 에러 */
  validation_errors: PromptVariableValidationError[];
}

/**
 * 변수 유효성 검사 에러
 */
export interface PromptVariableValidationError {
  /** 변수명 */
  variable: string;
  /** 에러 메시지 */
  message: string;
  /** 제공된 값 */
  provided_value: unknown;
}

// ============================================================================
// 템플릿 포크
// ============================================================================

/**
 * 템플릿 포크 입력
 */
export interface ForkPromptTemplateInput {
  /** 부모 템플릿 ID */
  parent_id: string;
  /** 새 템플릿명 (선택사항, 기본값: "부모명 (Fork)") */
  name?: string;
  /** 새 템플릿 설명 */
  description?: string;
}

/**
 * 템플릿 포크 결과
 */
export interface ForkPromptTemplateResult {
  /** 생성된 템플릿 ID */
  id: string;
  /** 부모 템플릿 ID */
  parent_id: string;
  /** 새 템플릿 정보 */
  template: PromptTemplate;
}

// ============================================================================
// 템플릿 통계
// ============================================================================

/**
 * 템플릿 사용 통계
 */
export interface PromptTemplateStats {
  /** 템플릿 ID */
  template_id: string;
  /** 총 사용 횟수 */
  total_usage: number;
  /** 최근 7일 사용 횟수 */
  usage_last_7_days: number;
  /** 최근 30일 사용 횟수 */
  usage_last_30_days: number;
  /** 평균 실행 시간 (ms) */
  avg_execution_time: number;
  /** 성공률 (%) */
  success_rate: number;
}

/**
 * 인기 템플릿 항목
 */
export interface PopularTemplateItem {
  /** 템플릿 정보 */
  template: PromptTemplate;
  /** 사용 횟수 */
  usage_count: number;
  /** 랭킹 (1부터 시작) */
  rank: number;
}

// ============================================================================
// 훅 결과 타입
// ============================================================================

/**
 * usePromptTemplates 훅 결과
 */
export interface UsePromptTemplatesResult {
  /** 템플릿 목록 */
  templates: PromptTemplate[];
  /** 로딩 중 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 총 개수 */
  totalCount: number;
  /** 다음 페이지 로드 */
  loadMore: () => Promise<void>;
  /** 더 로드할 항목 존재 여부 */
  hasMore: boolean;
  /** 새로고침 */
  refresh: () => Promise<void>;
}

/**
 * usePromptTemplate 훅 결과
 */
export interface UsePromptTemplateResult {
  /** 템플릿 */
  template: PromptTemplate | null;
  /** 로딩 중 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 새로고침 */
  refresh: () => Promise<void>;
}

/**
 * useCreatePromptTemplate 훅 결과
 */
export interface UseCreatePromptTemplateResult {
  /** 생성 함수 */
  create: (input: CreatePromptTemplateInput) => Promise<PromptTemplate>;
  /** 생성 중 */
  isCreating: boolean;
  /** 에러 */
  error: Error | null;
  /** 생성된 템플릿 */
  createdTemplate: PromptTemplate | null;
  /** 리셋 */
  reset: () => void;
}

/**
 * useUpdatePromptTemplate 훅 결과
 */
export interface UseUpdatePromptTemplateResult {
  /** 수정 함수 */
  update: (id: string, input: UpdatePromptTemplateInput) => Promise<PromptTemplate>;
  /** 수정 중 */
  isUpdating: boolean;
  /** 에러 */
  error: Error | null;
  /** 리셋 */
  reset: () => void;
}

/**
 * useDeletePromptTemplate 훅 결과
 */
export interface UseDeletePromptTemplateResult {
  /** 삭제 함수 */
  deleteTemplate: (id: string) => Promise<void>;
  /** 삭제 중 */
  isDeleting: boolean;
  /** 에러 */
  error: Error | null;
  /** 리셋 */
  reset: () => void;
}

/**
 * useRenderPrompt 훅 결과
 */
export interface UseRenderPromptResult {
  /** 렌더링 함수 */
  render: (input: RenderPromptInput) => Promise<RenderPromptResult>;
  /** 렌더링 중 */
  isRendering: boolean;
  /** 에러 */
  error: Error | null;
  /** 렌더링 결과 */
  result: RenderPromptResult | null;
  /** 리셋 */
  reset: () => void;
}

/**
 * useForkPromptTemplate 훅 결과
 */
export interface UseForkPromptTemplateResult {
  /** 포크 함수 */
  fork: (input: ForkPromptTemplateInput) => Promise<ForkPromptTemplateResult>;
  /** 포크 중 */
  isForking: boolean;
  /** 에러 */
  error: Error | null;
  /** 포크된 템플릿 */
  forkedTemplate: PromptTemplate | null;
  /** 리셋 */
  reset: () => void;
}

/**
 * usePopularTemplates 훅 결과
 */
export interface UsePopularTemplatesResult {
  /** 인기 템플릿 목록 */
  templates: PopularTemplateItem[];
  /** 로딩 중 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 새로고침 */
  refresh: () => Promise<void>;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 템플릿 변수 유효성 검사
 */
export function validateTemplateVariables(
  template: PromptTemplate,
  variables: Record<string, unknown>
): PromptVariableValidationError[] {
  const errors: PromptVariableValidationError[] = [];

  for (const varDef of template.variables) {
    const value = variables[varDef.name];

    // 필수 변수 확인
    if (varDef.required && (value === undefined || value === null)) {
      errors.push({
        variable: varDef.name,
        message: `필수 변수입니다: ${varDef.description}`,
        provided_value: value,
      });
      continue;
    }

    // 타입 확인
    if (value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedType = varDef.type === 'date' ? 'string' : varDef.type;

      if (actualType !== expectedType) {
        errors.push({
          variable: varDef.name,
          message: `타입이 맞지 않습니다. 예상: ${varDef.type}, 실제: ${actualType}`,
          provided_value: value,
        });
      }
    }

    // 유효성 검사 규칙 (정규식)
    if (varDef.validation && value !== undefined && value !== null) {
      try {
        const regex = new RegExp(varDef.validation);
        if (!regex.test(String(value))) {
          errors.push({
            variable: varDef.name,
            message: `유효성 검사 실패: ${varDef.description}`,
            provided_value: value,
          });
        }
      } catch {
        // 정규식 파싱 실패 시 무시
      }
    }
  }

  return errors;
}

/**
 * 템플릿 변수 치환
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    if (value === undefined || value === null) {
      return match; // 변수 없으면 원본 유지
    }
    return String(value);
  });
}

/**
 * 템플릿에서 사용된 변수 추출
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * 템플릿 카테고리 레이블
 */
export const PROMPT_TEMPLATE_CATEGORY_LABELS: Record<PromptTemplateCategory, string> = {
  rfp: 'RFP 생성',
  requirements: '요구사항 분석',
  plan: '프로젝트 계획',
  report: '보고서 작성',
  chat: '채팅/대화',
  custom: '사용자 정의',
};

/**
 * 서비스 레이블
 */
export const MINU_SERVICE_LABELS: Record<MinuServiceId, string> = {
  'minu-find': 'Minu Find (사업기회 탐색)',
  'minu-frame': 'Minu Frame (문제정의 & RFP)',
  'minu-build': 'Minu Build (프로젝트 진행)',
  'minu-keep': 'Minu Keep (운영/유지보수)',
};

/**
 * 변수 타입 레이블
 */
export const PROMPT_VARIABLE_TYPE_LABELS: Record<PromptVariableType, string> = {
  string: '문자열',
  number: '숫자',
  boolean: '참/거짓',
  date: '날짜',
  array: '배열',
  object: '객체',
};
