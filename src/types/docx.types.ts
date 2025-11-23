/**
 * Word 문서 생성 타입 정의
 *
 * RFP, 보고서, 제안서, 계약서 등 Word 문서 생성을 위한 타입
 *
 * @module types/docx
 */

import type { SkillError } from './skills.types';

// ============================================================================
// 문서 메타데이터
// ============================================================================

/**
 * 문서 메타데이터
 */
export interface DocumentMetadata {
  /** 문서 제목 */
  title: string;
  /** 작성자 */
  author: string;
  /** 문서 설명 */
  description?: string;
  /** 문서 주제 */
  subject?: string;
  /** 키워드 목록 */
  keywords?: string[];
  /** 생성 일시 */
  createdAt: Date;
  /** 수정 일시 */
  modifiedAt?: Date;
  /** 회사명 */
  company?: string;
}

// ============================================================================
// 템플릿 타입
// ============================================================================

/**
 * 템플릿 유형
 */
export type TemplateType = 'rfp' | 'report' | 'proposal' | 'contract';

/**
 * RFP 템플릿 카테고리
 */
export type RFPCategory = 'government' | 'startup' | 'enterprise';

/**
 * 보고서 템플릿 카테고리
 */
export type ReportCategory = 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * 제안서 템플릿 카테고리
 */
export type ProposalCategory = 'technical' | 'business' | 'partnership';

/**
 * 계약서 템플릿 카테고리
 */
export type ContractCategory = 'service' | 'nda' | 'employment' | 'license';

/**
 * 모든 카테고리 유니온 타입
 */
export type TemplateCategory =
  | RFPCategory
  | ReportCategory
  | ProposalCategory
  | ContractCategory;

// ============================================================================
// 템플릿 데이터 인터페이스
// ============================================================================

/**
 * 타임라인 아이템
 */
export interface TimelineItem {
  /** 단계명 */
  phase: string;
  /** 설명 */
  description: string;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 마일스톤 목록 */
  milestones?: string[];
  /** 담당자 */
  owner?: string;
  /** 완료 상태 */
  completed?: boolean;
}

/**
 * 팀 멤버
 */
export interface TeamMember {
  /** 이름 */
  name: string;
  /** 역할 */
  role: string;
  /** 담당 업무 */
  responsibilities?: string[];
  /** 이메일 */
  email?: string;
  /** 연락처 */
  phone?: string;
}

/**
 * 산출물 정의
 */
export interface Deliverable {
  /** 산출물 ID */
  id: string;
  /** 산출물명 */
  name: string;
  /** 설명 */
  description?: string;
  /** 예정일 */
  dueDate?: Date;
  /** 완료 여부 */
  completed?: boolean;
}

/**
 * 예산 항목
 */
export interface BudgetItem {
  /** 항목명 */
  name: string;
  /** 금액 */
  amount: number;
  /** 통화 */
  currency?: string;
  /** 비고 */
  note?: string;
}

/**
 * 템플릿 데이터 인터페이스
 */
export interface TemplateData {
  /** 프로젝트명 */
  projectName: string;
  /** 고객명 */
  clientName: string;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate?: Date;
  /** 예산 */
  budget?: number;
  /** 예산 상세 */
  budgetItems?: BudgetItem[];
  /** 범위 */
  scope?: string[];
  /** 산출물 목록 */
  deliverables?: Deliverable[] | string[];
  /** 요구사항 */
  requirements?: string[];
  /** 일정 */
  timeline?: TimelineItem[];
  /** 팀 구성 */
  team?: TeamMember[];
  /** 목적/배경 */
  background?: string;
  /** 목표 */
  objectives?: string[];
  /** 가정사항 */
  assumptions?: string[];
  /** 제약사항 */
  constraints?: string[];
  /** 리스크 */
  risks?: RiskItem[];
  /** 커스텀 필드 */
  customFields?: Record<string, unknown>;
}

/**
 * 리스크 항목
 */
export interface RiskItem {
  /** 리스크명 */
  name: string;
  /** 설명 */
  description?: string;
  /** 심각도 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 발생 확률 */
  probability: 'low' | 'medium' | 'high';
  /** 대응 방안 */
  mitigation?: string;
}

// ============================================================================
// 문서 생성 옵션
// ============================================================================

/**
 * 문서 생성 옵션
 */
export interface DocxGenerateOptions {
  /** 템플릿 유형 */
  template: TemplateType;
  /** 카테고리 */
  category?: TemplateCategory;
  /** 템플릿 데이터 */
  data: TemplateData;
  /** 메타데이터 */
  metadata?: Partial<DocumentMetadata>;
  /** 출력 파일명 */
  outputFileName?: string;
  /** 스타일 옵션 */
  styles?: DocxStyleOptions;
  /** 헤더/푸터 옵션 */
  headerFooter?: HeaderFooterOptions;
}

/**
 * 문서 스타일 옵션
 */
export interface DocxStyleOptions {
  /** 제목 폰트 */
  titleFont?: string;
  /** 본문 폰트 */
  bodyFont?: string;
  /** 기본 폰트 크기 (pt) */
  fontSize?: number;
  /** 줄간격 */
  lineSpacing?: number;
  /** 주요 색상 (hex) */
  primaryColor?: string;
  /** 보조 색상 (hex) */
  secondaryColor?: string;
  /** 페이지 여백 (mm) */
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * 헤더/푸터 옵션
 */
export interface HeaderFooterOptions {
  /** 헤더 텍스트 */
  headerText?: string;
  /** 푸터 텍스트 */
  footerText?: string;
  /** 로고 이미지 URL */
  logoUrl?: string;
  /** 페이지 번호 표시 */
  showPageNumbers?: boolean;
  /** 날짜 표시 */
  showDate?: boolean;
}

// ============================================================================
// 문서 생성 결과
// ============================================================================

/**
 * 문서 생성 결과
 */
export interface DocxGenerateResult {
  /** 성공 여부 */
  success: boolean;
  /** 파일명 */
  fileName: string;
  /** Blob 객체 */
  blob?: Blob;
  /** 에러 메시지 */
  error?: string;
  /** 생성 일시 */
  generatedAt: Date;
  /** 파일 크기 (bytes) */
  fileSize?: number;
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * useDocxGenerate 훅 반환 타입
 */
export interface UseDocxGenerateReturn {
  /** 문서 생성 함수 */
  generate: (options: DocxGenerateOptions) => Promise<DocxGenerateResult>;
  /** 생성 중 여부 */
  isGenerating: boolean;
  /** 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: SkillError | null;
  /** 상태 초기화 */
  reset: () => void;
}

// ============================================================================
// DB 테이블 타입
// ============================================================================

/**
 * 문서 템플릿 테이블 타입
 */
export interface DocumentTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 템플릿 유형 */
  type: TemplateType;
  /** 카테고리 */
  category: string;
  /** 템플릿 내용 (JSON) */
  content: DocumentTemplateContent;
  /** 변수 목록 */
  variables: string[];
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 생성자 ID */
  created_by: string;
  /** 활성화 여부 */
  is_active: boolean;
  /** 버전 */
  version?: number;
  /** 설명 */
  description?: string;
}

/**
 * 템플릿 내용 구조
 */
export interface DocumentTemplateContent {
  /** 섹션 목록 */
  sections: TemplateSectionConfig[];
  /** 기본 스타일 */
  defaultStyles?: DocxStyleOptions;
  /** 헤더/푸터 설정 */
  headerFooter?: HeaderFooterOptions;
}

/**
 * 템플릿 섹션 설정
 */
export interface TemplateSectionConfig {
  /** 섹션 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 순서 */
  order: number;
  /** 필수 여부 */
  required?: boolean;
  /** 기본 내용 */
  defaultContent?: string;
  /** 변수 바인딩 */
  variableBindings?: string[];
}

// ============================================================================
// 문서 히스토리 타입
// ============================================================================

/**
 * 생성된 문서 기록
 */
export interface GeneratedDocument {
  /** 문서 ID */
  id: string;
  /** 사용된 템플릿 ID */
  template_id: string;
  /** 파일명 */
  file_name: string;
  /** 파일 크기 (bytes) */
  file_size: number;
  /** 스토리지 경로 */
  storage_path?: string;
  /** 생성자 ID */
  generated_by: string;
  /** 생성 일시 */
  generated_at: string;
  /** 메타데이터 */
  metadata: Partial<DocumentMetadata>;
  /** 입력 데이터 (JSON) */
  input_data: Partial<TemplateData>;
}

// ============================================================================
// 라벨 상수
// ============================================================================

/**
 * 템플릿 유형 라벨
 */
export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  rfp: '제안요청서',
  report: '보고서',
  proposal: '제안서',
  contract: '계약서',
};

/**
 * RFP 카테고리 라벨
 */
export const RFP_CATEGORY_LABELS: Record<RFPCategory, string> = {
  government: '공공기관',
  startup: '스타트업',
  enterprise: '대기업',
};

/**
 * 보고서 카테고리 라벨
 */
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  weekly: '주간',
  monthly: '월간',
  quarterly: '분기',
  annual: '연간',
};

/**
 * 제안서 카테고리 라벨
 */
export const PROPOSAL_CATEGORY_LABELS: Record<ProposalCategory, string> = {
  technical: '기술',
  business: '사업',
  partnership: '파트너십',
};

/**
 * 계약서 카테고리 라벨
 */
export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  service: '서비스',
  nda: '비밀유지',
  employment: '고용',
  license: '라이선스',
};

/**
 * 리스크 심각도 라벨
 */
export const RISK_SEVERITY_LABELS: Record<RiskItem['severity'], string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '치명적',
};

/**
 * 리스크 발생 확률 라벨
 */
export const RISK_PROBABILITY_LABELS: Record<RiskItem['probability'], string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};
