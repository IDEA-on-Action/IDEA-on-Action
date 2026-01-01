/**
 * RFP 템플릿 모듈
 *
 * 정부기관, 스타트업, 엔터프라이즈용 RFP 템플릿 통합 export
 *
 * @module lib/skills/templates/rfp
 */

// ============================================================================
// 템플릿 빌더 함수 export
// ============================================================================

export {
  buildGovernmentRFP,
  type GovernmentRFPData,
  type EvaluationCriterion,
  type FunctionalRequirement,
  type PerformanceRequirement,
  governmentRFPDefaults,
} from './government-rfp';

export {
  buildStartupRFP,
  type StartupRFPData,
  type MVPFeature,
  type TechStackItem,
  type SuccessMetric,
  startupRFPDefaults,
} from './startup-rfp';

export {
  buildEnterpriseRFP,
  type EnterpriseRFPData,
  type EnterpriseRequirement,
  type SecurityRequirement,
  type SLAItem,
  type EnterpriseEvaluationCriteria,
  type ContractTerms,
  enterpriseRFPDefaults,
} from './enterprise-rfp';

// ============================================================================
// RFP 템플릿 레지스트리
// ============================================================================

import type { RFPCategory } from '@/types/documents/docx.types';
import { buildGovernmentRFP, governmentRFPDefaults, type GovernmentRFPData } from './government-rfp';
import { buildStartupRFP, startupRFPDefaults, type StartupRFPData } from './startup-rfp';
import { buildEnterpriseRFP, enterpriseRFPDefaults, type EnterpriseRFPData } from './enterprise-rfp';
import type { TemplateEngine } from '../../docx/template-engine';
import type { Paragraph, Table } from 'docx';

/**
 * RFP 템플릿 메타데이터
 */
export interface RFPTemplateInfo {
  /** 템플릿 ID */
  id: RFPCategory;
  /** 템플릿 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 적합한 사용 케이스 */
  useCases: string[];
  /** 예상 페이지 수 */
  estimatedPages: string;
}

/**
 * 사용 가능한 RFP 템플릿 목록
 */
export const RFP_TEMPLATES: RFPTemplateInfo[] = [
  {
    id: 'government',
    name: '정부기관 RFP',
    description: '행정안전부 가이드라인을 준수하는 공공기관 표준 RFP 양식',
    useCases: [
      '정부/공공기관 정보화 사업',
      '국가 SI 프로젝트',
      '조달청 나라장터 입찰',
      '지방자치단체 시스템 구축',
    ],
    estimatedPages: '15-25페이지',
  },
  {
    id: 'startup',
    name: '스타트업 RFP',
    description: 'MVP 중심의 간결하고 실용적인 RFP 양식',
    useCases: [
      'MVP 개발 외주',
      '스타트업 초기 제품 개발',
      '프로토타입 구축',
      '애자일 프로젝트',
    ],
    estimatedPages: '5-10페이지',
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈 RFP',
    description: '보안, SLA, 계약조건을 포함한 대기업용 상세 RFP 양식',
    useCases: [
      '대기업 시스템 구축',
      '금융/의료 IT 프로젝트',
      '규정 준수가 필요한 프로젝트',
      '장기 대규모 SI 사업',
    ],
    estimatedPages: '25-40페이지',
  },
];

/**
 * RFP 템플릿 빌더 타입
 */
export type RFPBuilder<T> = (engine: TemplateEngine, data: T) => (Paragraph | Table)[];

/**
 * RFP 데이터 타입 유니온
 */
export type RFPDataType = GovernmentRFPData | StartupRFPData | EnterpriseRFPData;

/**
 * 카테고리별 RFP 빌더 가져오기
 */
export function getRFPBuilder(
  category: RFPCategory
): RFPBuilder<RFPDataType> {
  switch (category) {
    case 'government':
      return buildGovernmentRFP as RFPBuilder<RFPDataType>;
    case 'startup':
      return buildStartupRFP as RFPBuilder<RFPDataType>;
    case 'enterprise':
      return buildEnterpriseRFP as RFPBuilder<RFPDataType>;
    default:
      throw new Error(`Unknown RFP category: ${category}`);
  }
}

/**
 * 카테고리별 기본 데이터 가져오기
 */
export function getRFPDefaults(
  category: RFPCategory
): Partial<RFPDataType> {
  switch (category) {
    case 'government':
      return governmentRFPDefaults;
    case 'startup':
      return startupRFPDefaults;
    case 'enterprise':
      return enterpriseRFPDefaults;
    default:
      return {};
  }
}

/**
 * 템플릿 정보 가져오기
 */
export function getRFPTemplateInfo(category: RFPCategory): RFPTemplateInfo | undefined {
  return RFP_TEMPLATES.find((t) => t.id === category);
}

/**
 * 모든 템플릿 목록 가져오기
 */
export function getAllRFPTemplates(): RFPTemplateInfo[] {
  return RFP_TEMPLATES;
}
