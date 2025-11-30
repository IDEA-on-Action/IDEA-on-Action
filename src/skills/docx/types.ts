/**
 * docx 템플릿 시스템 타입 정의
 *
 * 템플릿 기반 Word 문서 생성을 위한 타입
 *
 * @module skills/docx/types
 */

// ============================================================================
// 템플릿 타입
// ============================================================================

/**
 * 문서 템플릿 인터페이스
 */
export interface DocumentTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 템플릿 유형 */
  type: 'rfp' | 'report' | 'manual';
  /** 템플릿 변수 */
  variables: TemplateVariable[];
  /** 템플릿 섹션 */
  sections: TemplateSection[];
  /** 설명 */
  description?: string;
  /** 버전 */
  version?: string;
}

/**
 * 템플릿 변수
 */
export interface TemplateVariable {
  /** 변수 키 */
  key: string;
  /** 변수 라벨 */
  label: string;
  /** 변수 타입 */
  type: 'text' | 'date' | 'number' | 'table' | 'list';
  /** 필수 여부 */
  required: boolean;
  /** 기본값 */
  defaultValue?: unknown;
  /** 설명 */
  description?: string;
  /** 검증 규칙 */
  validation?: VariableValidation;
}

/**
 * 변수 검증 규칙
 */
export interface VariableValidation {
  /** 최소 길이 */
  minLength?: number;
  /** 최대 길이 */
  maxLength?: number;
  /** 최소값 */
  min?: number;
  /** 최대값 */
  max?: number;
  /** 정규식 패턴 */
  pattern?: string;
  /** 커스텀 검증 함수 */
  custom?: (value: unknown) => boolean;
}

/**
 * 템플릿 섹션
 */
export interface TemplateSection {
  /** 섹션 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 순서 */
  order: number;
  /** 섹션 콘텐츠 템플릿 */
  content: string;
  /** 필수 여부 */
  required?: boolean;
  /** 조건부 표시 */
  condition?: string;
  /** 변수 바인딩 */
  variables?: string[];
}

// ============================================================================
// 템플릿 데이터 타입
// ============================================================================

/**
 * RFP 템플릿 데이터
 */
export interface RFPTemplateData {
  /** 프로젝트명 */
  projectName: string;
  /** 고객명 */
  clientName: string;
  /** 배경 및 목적 */
  background: string;
  /** 주요 목표 */
  objectives: string[];
  /** 예산 */
  budget?: number;
  /** 기간 */
  duration?: {
    startDate: Date;
    endDate?: Date;
  };
  /** 추가 요구사항 */
  additionalRequirements?: string;
  /** 산업 분야 */
  industry?: string;
  /** 기술 스택 */
  techStack?: string[];
}

/**
 * 보고서 템플릿 데이터
 */
export interface ReportTemplateData {
  /** 보고서 제목 */
  title: string;
  /** 보고 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 작성자 */
  author: string;
  /** 요약 */
  summary: string;
  /** 주요 활동 */
  activities?: string[];
  /** 성과 */
  achievements?: string[];
  /** 이슈 */
  issues?: string[];
  /** 다음 계획 */
  nextSteps?: string[];
}

/**
 * 매뉴얼 템플릿 데이터
 */
export interface ManualTemplateData {
  /** 매뉴얼 제목 */
  title: string;
  /** 버전 */
  version: string;
  /** 작성일 */
  date: Date;
  /** 작성자 */
  author: string;
  /** 대상 독자 */
  audience: string;
  /** 개요 */
  overview: string;
  /** 섹션 목록 */
  sections: ManualSection[];
}

/**
 * 매뉴얼 섹션
 */
export interface ManualSection {
  /** 섹션 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 내용 */
  content: string;
  /** 하위 섹션 */
  subsections?: ManualSection[];
  /** 이미지 */
  images?: string[];
}

// ============================================================================
// 렌더링 타입
// ============================================================================

/**
 * 템플릿 렌더링 옵션
 */
export interface RenderOptions {
  /** 템플릿 ID */
  templateId: string;
  /** 템플릿 변수 값 */
  variables: Record<string, unknown>;
  /** 출력 파일명 */
  fileName?: string;
  /** 스타일 옵션 */
  styles?: {
    fontFamily?: string;
    fontSize?: number;
    lineSpacing?: number;
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
}

/**
 * 렌더링 결과
 */
export interface RenderResult {
  /** 성공 여부 */
  success: boolean;
  /** 생성된 Blob */
  blob?: Blob;
  /** 파일명 */
  fileName: string;
  /** 에러 메시지 */
  error?: string;
  /** 검증 에러 */
  validationErrors?: ValidationError[];
}

/**
 * 검증 에러
 */
export interface ValidationError {
  /** 변수 키 */
  key: string;
  /** 에러 메시지 */
  message: string;
  /** 에러 타입 */
  type: 'required' | 'invalid' | 'type';
}

// ============================================================================
// 템플릿 레지스트리
// ============================================================================

/**
 * 템플릿 레지스트리 (싱글톤)
 */
export interface TemplateRegistry {
  /** 템플릿 등록 */
  register(template: DocumentTemplate): void;
  /** 템플릿 조회 */
  get(id: string): DocumentTemplate | undefined;
  /** 모든 템플릿 조회 */
  getAll(): DocumentTemplate[];
  /** 유형별 템플릿 조회 */
  getByType(type: DocumentTemplate['type']): DocumentTemplate[];
  /** 템플릿 삭제 */
  unregister(id: string): void;
}
