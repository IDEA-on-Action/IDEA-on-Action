/**
 * 정부기관 RFP 템플릿
 *
 * 행정안전부 가이드라인을 준수하는 표준화된 공공기관 RFP 양식
 *
 * @module lib/skills/templates/rfp/government-rfp
 */

import { Paragraph, Table, HeadingLevel, AlignmentType } from 'docx';
import type { TemplateData, BudgetItem, TimelineItem, RiskItem } from '@/types/docx.types';
import { TemplateEngine } from '../../docx/template-engine';

// ============================================================================
// 정부기관 RFP 전용 타입
// ============================================================================

/**
 * 평가 기준 항목
 */
export interface EvaluationCriterion {
  /** 평가 항목명 */
  item: string;
  /** 배점 (가중치) */
  weight: number;
  /** 평가 기준 상세 설명 */
  description?: string;
}

/**
 * 기능 요구사항
 */
export interface FunctionalRequirement {
  /** 요구사항 ID */
  id: string;
  /** 요구사항명 */
  name: string;
  /** 상세 설명 */
  description: string;
  /** 우선순위 */
  priority: 'M' | 'S' | 'C' | 'W'; // MoSCoW
  /** 분류 */
  category?: string;
}

/**
 * 성능 요구사항
 */
export interface PerformanceRequirement {
  /** 요구사항 ID */
  id: string;
  /** 항목명 */
  name: string;
  /** 기준값 */
  threshold: string;
  /** 측정 방법 */
  measurementMethod?: string;
}

/**
 * 정부기관 RFP 데이터
 */
export interface GovernmentRFPData extends TemplateData {
  /** 사업 코드 (예: 조달청 나라장터 코드) */
  projectCode?: string;
  /** 발주 기관 (정식 명칭) */
  agency: string;
  /** 담당 부서 */
  department?: string;
  /** 담당자 */
  contactPerson?: string;
  /** 연락처 */
  contactPhone?: string;
  /** 이메일 */
  contactEmail?: string;
  /** 사업 유형 (예: 정보화사업, 용역, 물품구매) */
  projectType?: string;
  /** 입찰 방식 (예: 제한경쟁입찰, 일반경쟁입찰) */
  biddingMethod?: string;
  /** 낙찰자 결정 방식 (예: 협상에 의한 계약, 적격심사) */
  awardMethod?: string;
  /** 예정가격 산정 방식 */
  pricingMethod?: string;
  /** 기술평가 배점 */
  technicalScore?: number;
  /** 가격평가 배점 */
  priceScore?: number;
  /** 추진 배경 */
  background: string;
  /** 추진 목적 */
  purpose: string;
  /** 사업 범위 */
  scope: string[];
  /** 기능 요구사항 */
  functionalRequirements: FunctionalRequirement[];
  /** 성능 요구사항 */
  performanceRequirements?: PerformanceRequirement[];
  /** 보안 요구사항 */
  securityRequirements?: string[];
  /** 데이터 요구사항 */
  dataRequirements?: string[];
  /** 테스트 요구사항 */
  testRequirements?: string[];
  /** 교육 요구사항 */
  trainingRequirements?: string[];
  /** 유지보수 요구사항 */
  maintenanceRequirements?: string[];
  /** 예산 항목 */
  budgetItems: BudgetItem[];
  /** 일정 계획 */
  timeline: TimelineItem[];
  /** 평가 기준 */
  evaluationCriteria: EvaluationCriterion[];
  /** 제안서 제출 서류 */
  submissionDocuments?: string[];
  /** 제안서 제출 기한 */
  submissionDeadline?: Date;
  /** 발표 평가 여부 */
  hasPresentationEvaluation?: boolean;
  /** 리스크 항목 */
  risks?: RiskItem[];
}

// ============================================================================
// 정부기관 RFP 빌더
// ============================================================================

/**
 * 정부기관 RFP 문서 생성
 *
 * @param engine - TemplateEngine 인스턴스
 * @param data - 정부기관 RFP 데이터
 * @returns docx 문서 요소 배열
 */
export function buildGovernmentRFP(
  engine: TemplateEngine,
  data: GovernmentRFPData
): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];

  // =========================================================================
  // 1. 표지
  // =========================================================================
  sections.push(
    engine.createHeading('제 안 요 청 서', HeadingLevel.TITLE)
  );
  sections.push(engine.createEmptyLine());
  sections.push(
    engine.createParagraph(data.projectName, {
      bold: true,
      alignment: AlignmentType.CENTER,
    })
  );
  sections.push(engine.createEmptyLine());

  if (data.projectCode) {
    sections.push(
      engine.createParagraph(`사업코드: ${data.projectCode}`, {
        alignment: AlignmentType.CENTER,
      })
    );
  }

  sections.push(engine.createEmptyLine());
  sections.push(
    engine.createParagraph(`발주기관: ${data.agency}`, {
      alignment: AlignmentType.CENTER,
    })
  );
  sections.push(
    engine.createParagraph(
      `작성일: ${engine.formatDate(data.startDate, 'YYYY년 MM월 DD일')}`,
      {
        alignment: AlignmentType.CENTER,
      }
    )
  );
  sections.push(engine.createEmptyLine());
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 2. 목차
  // =========================================================================
  sections.push(engine.createHeading('목 차', HeadingLevel.HEADING_1));
  const tocItems = [
    '1. 사업개요',
    '2. 추진배경 및 목적',
    '3. 사업범위',
    '4. 기능 요구사항',
    '5. 성능 요구사항',
    '6. 보안 요구사항',
    '7. 추진일정',
    '8. 소요예산',
    '9. 평가기준',
    '10. 제안서 작성 안내',
  ];
  sections.push(...engine.createList(tocItems, { ordered: false }));
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 3. 사업개요
  // =========================================================================
  sections.push(engine.createHeading('1. 사업개요', HeadingLevel.HEADING_1));

  sections.push(engine.createHeading('1.1 일반현황', HeadingLevel.HEADING_2));
  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: [
        ['사업명', data.projectName],
        ['발주기관', data.agency],
        ['담당부서', data.department ?? '-'],
        ['사업기간', data.endDate
          ? `${engine.formatDate(data.startDate)} ~ ${engine.formatDate(data.endDate)}`
          : engine.formatDate(data.startDate)],
        ['사업유형', data.projectType ?? '정보화사업'],
        ['입찰방식', data.biddingMethod ?? '제한경쟁입찰'],
        ['낙찰자결정방식', data.awardMethod ?? '협상에 의한 계약'],
      ],
      widths: [30, 70],
    })
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 4. 추진배경 및 목적
  // =========================================================================
  sections.push(
    engine.createHeading('2. 추진배경 및 목적', HeadingLevel.HEADING_1)
  );

  sections.push(engine.createHeading('2.1 추진배경', HeadingLevel.HEADING_2));
  sections.push(engine.createParagraph(data.background));
  sections.push(engine.createEmptyLine());

  sections.push(engine.createHeading('2.2 추진목적', HeadingLevel.HEADING_2));
  sections.push(engine.createParagraph(data.purpose));

  if (data.objectives && data.objectives.length > 0) {
    sections.push(engine.createEmptyLine());
    sections.push(
      engine.createHeading('2.3 세부목표', HeadingLevel.HEADING_2)
    );
    sections.push(...engine.createList(data.objectives, { ordered: true }));
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 5. 사업범위
  // =========================================================================
  sections.push(engine.createHeading('3. 사업범위', HeadingLevel.HEADING_1));

  if (data.scope && data.scope.length > 0) {
    sections.push(...engine.createList(data.scope, { ordered: true }));
  } else {
    sections.push(engine.createParagraph('(사업범위 미정의)'));
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 6. 기능 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('4. 기능 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.functionalRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['요구사항 ID', '요구사항명', '설명', '우선순위'],
        rows: data.functionalRequirements.map((req) => [
          req.id,
          req.name,
          req.description,
          getPriorityLabel(req.priority),
        ]),
        widths: [15, 20, 50, 15],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // 우선순위 범례
  sections.push(
    engine.createParagraph(
      '※ 우선순위: M(필수), S(권장), C(선택), W(제외)',
      { italic: true }
    )
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 7. 성능 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('5. 성능 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.performanceRequirements && data.performanceRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['요구사항 ID', '항목', '기준값', '측정방법'],
        rows: data.performanceRequirements.map((req) => [
          req.id,
          req.name,
          req.threshold,
          req.measurementMethod ?? '-',
        ]),
        widths: [15, 25, 30, 30],
      })
    );
  } else {
    sections.push(engine.createParagraph('(성능 요구사항 미정의)'));
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 8. 보안 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('6. 보안 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.securityRequirements && data.securityRequirements.length > 0) {
    sections.push(
      ...engine.createList(data.securityRequirements, { ordered: true })
    );
  } else {
    // 기본 보안 요구사항 (공공기관 표준)
    const defaultSecurityReqs = [
      '개인정보보호법 및 정보통신망법 준수',
      '국가정보보안기본지침 준수',
      'SW 개발보안 가이드 준수',
      '취약점 점검 및 조치 완료',
      '소스코드 보안 취약점 점검',
    ];
    sections.push(
      ...engine.createList(defaultSecurityReqs, { ordered: true })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 9. 추진일정
  // =========================================================================
  sections.push(engine.createHeading('7. 추진일정', HeadingLevel.HEADING_1));

  if (data.timeline && data.timeline.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['단계', '기간', '주요 내용', '마일스톤'],
        rows: data.timeline.map((item) => [
          item.phase,
          `${engine.formatDate(item.startDate)} ~ ${engine.formatDate(item.endDate)}`,
          item.description,
          item.milestones?.join(', ') ?? '-',
        ]),
        widths: [15, 25, 35, 25],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 10. 소요예산
  // =========================================================================
  sections.push(engine.createHeading('8. 소요예산', HeadingLevel.HEADING_1));

  if (data.budget) {
    sections.push(
      engine.createParagraph(
        `총 사업예산: ${engine.formatCurrency(data.budget)}`,
        { bold: true }
      )
    );
    sections.push(engine.createEmptyLine());
  }

  if (data.budgetItems && data.budgetItems.length > 0) {
    const totalBudget = data.budgetItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    sections.push(
      engine.createTable({
        headers: ['항목', '금액', '비고'],
        rows: [
          ...data.budgetItems.map((item) => [
            item.name,
            engine.formatCurrency(item.amount),
            item.note ?? '-',
          ]),
          ['합계', engine.formatCurrency(totalBudget), ''],
        ],
        widths: [40, 30, 30],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 11. 평가기준
  // =========================================================================
  sections.push(engine.createHeading('9. 평가기준', HeadingLevel.HEADING_1));

  // 배점 비율
  sections.push(engine.createHeading('9.1 평가 배점', HeadingLevel.HEADING_2));
  sections.push(
    engine.createTable({
      headers: ['구분', '배점'],
      rows: [
        ['기술평가', `${data.technicalScore ?? 80}점`],
        ['가격평가', `${data.priceScore ?? 20}점`],
        ['합계', '100점'],
      ],
      widths: [50, 50],
    })
  );
  sections.push(engine.createEmptyLine());

  // 세부 평가 기준
  sections.push(
    engine.createHeading('9.2 세부 평가항목', HeadingLevel.HEADING_2)
  );

  if (data.evaluationCriteria.length > 0) {
    const totalWeight = data.evaluationCriteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0
    );

    sections.push(
      engine.createTable({
        headers: ['평가항목', '배점', '평가기준'],
        rows: [
          ...data.evaluationCriteria.map((criterion) => [
            criterion.item,
            `${criterion.weight}점`,
            criterion.description ?? '-',
          ]),
          ['합계', `${totalWeight}점`, ''],
        ],
        widths: [30, 15, 55],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 12. 제안서 작성 안내
  // =========================================================================
  sections.push(
    engine.createHeading('10. 제안서 작성 안내', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('10.1 제출 서류', HeadingLevel.HEADING_2)
  );
  const submissionDocs = data.submissionDocuments ?? [
    '사업자등록증 사본',
    '제안서 (인쇄본 및 전자파일)',
    '가격제안서',
    '사업수행계획서',
    '참여인력 이력서',
    '유사 수행 실적 증빙',
  ];
  sections.push(...engine.createList(submissionDocs, { ordered: true }));
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createHeading('10.2 제출 기한 및 방법', HeadingLevel.HEADING_2)
  );
  if (data.submissionDeadline) {
    sections.push(
      engine.createParagraph(
        `제출기한: ${engine.formatDate(data.submissionDeadline, 'YYYY년 MM월 DD일')}까지`
      )
    );
  }
  sections.push(engine.createParagraph('제출방법: 우편 또는 직접 제출'));
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 13. 문의처
  // =========================================================================
  sections.push(engine.createHeading('11. 문의처', HeadingLevel.HEADING_1));

  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: [
        ['담당기관', data.agency],
        ['담당부서', data.department ?? '-'],
        ['담당자', data.contactPerson ?? '-'],
        ['연락처', data.contactPhone ?? '-'],
        ['이메일', data.contactEmail ?? '-'],
      ],
      widths: [30, 70],
    })
  );

  return sections;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * MoSCoW 우선순위를 한글 라벨로 변환
 */
function getPriorityLabel(priority: 'M' | 'S' | 'C' | 'W'): string {
  const labels: Record<string, string> = {
    M: '필수(M)',
    S: '권장(S)',
    C: '선택(C)',
    W: '제외(W)',
  };
  return labels[priority] ?? priority;
}

// ============================================================================
// 기본 템플릿 데이터
// ============================================================================

/**
 * 정부기관 RFP 기본 템플릿 데이터
 */
export const governmentRFPDefaults: Partial<GovernmentRFPData> = {
  projectType: '정보화사업',
  biddingMethod: '제한경쟁입찰',
  awardMethod: '협상에 의한 계약',
  technicalScore: 80,
  priceScore: 20,
  evaluationCriteria: [
    { item: '사업이해도', weight: 10, description: '사업 목적 및 범위에 대한 이해도' },
    { item: '기술적합성', weight: 20, description: '기술 아키텍처 및 솔루션 적합성' },
    { item: '수행방안', weight: 20, description: '사업 수행 방법론 및 일정 계획' },
    { item: '품질보증', weight: 15, description: '테스트 계획 및 품질 관리 방안' },
    { item: '보안대책', weight: 10, description: '보안 요구사항 충족 방안' },
    { item: '유지보수', weight: 5, description: '유지보수 및 기술지원 방안' },
  ],
};
