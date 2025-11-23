/**
 * 엔터프라이즈 RFP 템플릿
 *
 * 상세하고 포괄적인 대기업용 RFP 양식
 * 보안, 규정 준수, SLA 등 엔터프라이즈 요구사항 포함
 *
 * @module lib/skills/templates/rfp/enterprise-rfp
 */

import { Paragraph, Table, HeadingLevel, AlignmentType } from 'docx';
import type { TemplateData, BudgetItem, TimelineItem, RiskItem, TeamMember } from '@/types/docx.types';
import { TemplateEngine } from '../../docx/template-engine';

// ============================================================================
// 엔터프라이즈 RFP 전용 타입
// ============================================================================

/**
 * 요구사항 상세
 */
export interface EnterpriseRequirement {
  /** 요구사항 ID */
  id: string;
  /** 카테고리 */
  category: string;
  /** 요구사항명 */
  name: string;
  /** 상세 설명 */
  description: string;
  /** 우선순위 (Critical, High, Medium, Low) */
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  /** 검증 방법 */
  verificationMethod?: string;
  /** 관련 규정/표준 */
  relatedStandards?: string[];
}

/**
 * 보안 요구사항
 */
export interface SecurityRequirement {
  /** 요구사항 ID */
  id: string;
  /** 보안 영역 */
  domain: string;
  /** 요구사항 */
  requirement: string;
  /** 관련 규정/표준 */
  compliance?: string[];
  /** 필수 여부 */
  mandatory: boolean;
}

/**
 * SLA 항목
 */
export interface SLAItem {
  /** 서비스 항목 */
  service: string;
  /** 측정 지표 */
  metric: string;
  /** 목표 수준 */
  target: string;
  /** 패널티 조항 */
  penalty?: string;
}

/**
 * 평가 기준 (상세)
 */
export interface EnterpriseEvaluationCriteria {
  /** 평가 영역 */
  category: string;
  /** 평가 항목 */
  items: {
    name: string;
    weight: number;
    description: string;
  }[];
  /** 영역별 총 배점 */
  totalWeight: number;
}

/**
 * 계약 조건
 */
export interface ContractTerms {
  /** 계약 유형 */
  contractType: string;
  /** 지불 조건 */
  paymentTerms: string;
  /** 보증 기간 */
  warrantyPeriod?: string;
  /** 유지보수 조건 */
  maintenanceTerms?: string;
  /** 지적재산권 */
  ipOwnership?: string;
  /** 기밀유지 */
  confidentiality?: string;
  /** 책임 제한 */
  liabilityLimitation?: string;
}

/**
 * 엔터프라이즈 RFP 데이터
 */
export interface EnterpriseRFPData extends TemplateData {
  /** 발주 기업명 */
  companyName: string;
  /** 사업부/부서 */
  businessUnit?: string;
  /** 프로젝트 스폰서 */
  projectSponsor?: string;
  /** 프로젝트 매니저 */
  projectManager?: TeamMember;
  /** 이해관계자 */
  stakeholders?: TeamMember[];
  /** 비즈니스 배경 */
  businessBackground: string;
  /** 현황 분석 */
  currentStateAnalysis: string;
  /** AS-IS 문제점 */
  currentIssues: string[];
  /** TO-BE 목표 상태 */
  targetState: string;
  /** 예상 효과/ROI */
  expectedBenefits: string[];
  /** 기능 요구사항 */
  functionalRequirements: EnterpriseRequirement[];
  /** 비기능 요구사항 */
  nonFunctionalRequirements: EnterpriseRequirement[];
  /** 기술 요구사항 */
  technicalRequirements: EnterpriseRequirement[];
  /** 보안 요구사항 */
  securityRequirements: SecurityRequirement[];
  /** 규정 준수 요구사항 */
  complianceRequirements?: string[];
  /** 통합 요구사항 */
  integrationRequirements?: string[];
  /** 데이터 마이그레이션 요구사항 */
  dataMigrationRequirements?: string[];
  /** 교육/변경관리 요구사항 */
  trainingRequirements?: string[];
  /** SLA 요구사항 */
  slaRequirements: SLAItem[];
  /** 일정 계획 */
  timeline: TimelineItem[];
  /** 마일스톤 */
  milestones?: { name: string; date: Date; deliverables: string[] }[];
  /** 예산 상세 */
  budgetItems: BudgetItem[];
  /** 평가 기준 */
  evaluationCriteria: EnterpriseEvaluationCriteria[];
  /** 계약 조건 */
  contractTerms?: ContractTerms;
  /** 제안서 제출 요건 */
  proposalRequirements?: string[];
  /** 제안서 제출 기한 */
  proposalDeadline?: Date;
  /** 질의응답 기한 */
  qaDeadline?: Date;
  /** 발표 평가 일정 */
  presentationDate?: Date;
  /** 최종 선정 예정일 */
  selectionDate?: Date;
  /** 리스크 항목 */
  risks: RiskItem[];
  /** 비밀유지 요건 */
  confidentialityLevel?: 'Public' | 'Internal' | 'Confidential' | 'Strictly Confidential';
}

// ============================================================================
// 엔터프라이즈 RFP 빌더
// ============================================================================

/**
 * 엔터프라이즈 RFP 문서 생성
 *
 * @param engine - TemplateEngine 인스턴스
 * @param data - 엔터프라이즈 RFP 데이터
 * @returns docx 문서 요소 배열
 */
export function buildEnterpriseRFP(
  engine: TemplateEngine,
  data: EnterpriseRFPData
): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];

  // =========================================================================
  // 1. 표지
  // =========================================================================
  sections.push(
    engine.createHeading('제안요청서 (RFP)', HeadingLevel.TITLE)
  );
  sections.push(engine.createEmptyLine());
  sections.push(
    engine.createParagraph(data.projectName, {
      bold: true,
      alignment: AlignmentType.CENTER,
    })
  );
  sections.push(engine.createEmptyLine());

  // 문서 정보
  sections.push(
    engine.createTable({
      headers: ['항목', '내용'],
      rows: [
        ['발주사', data.companyName],
        ['문서버전', '1.0'],
        ['작성일', engine.formatDate(data.startDate, 'YYYY-MM-DD')],
        ['기밀등급', data.confidentialityLevel ?? 'Confidential'],
      ],
      widths: [30, 70],
    })
  );
  sections.push(engine.createEmptyLine());
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 2. 목차
  // =========================================================================
  sections.push(engine.createHeading('목 차', HeadingLevel.HEADING_1));
  const tocItems = [
    '1. 사업 개요',
    '2. 현황 분석',
    '3. 목표 및 범위',
    '4. 상세 요구사항',
    '5. 기술 요구사항',
    '6. 보안 요구사항',
    '7. SLA 및 품질 요구사항',
    '8. 일정 및 마일스톤',
    '9. 예산',
    '10. 평가 기준',
    '11. 계약 조건',
    '12. 제안서 제출 안내',
    '13. 리스크 관리',
    '부록. 연락처',
  ];
  sections.push(...engine.createList(tocItems, { ordered: false }));
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 3. 사업 개요
  // =========================================================================
  sections.push(
    engine.createHeading('1. 사업 개요', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('1.1 발주 기관 정보', HeadingLevel.HEADING_2)
  );
  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: [
        ['기업명', data.companyName],
        ['사업부/부서', data.businessUnit ?? '-'],
        ['프로젝트 스폰서', data.projectSponsor ?? '-'],
        [
          '프로젝트 매니저',
          data.projectManager?.name ?? '-',
        ],
      ],
      widths: [30, 70],
    })
  );
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createHeading('1.2 사업 개요', HeadingLevel.HEADING_2)
  );
  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: [
        ['사업명', data.projectName],
        ['사업기간', data.endDate
          ? `${engine.formatDate(data.startDate)} ~ ${engine.formatDate(data.endDate)}`
          : engine.formatDate(data.startDate)],
        ['총 예산', data.budget ? engine.formatCurrency(data.budget) : '별도 협의'],
      ],
      widths: [30, 70],
    })
  );
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createHeading('1.3 비즈니스 배경', HeadingLevel.HEADING_2)
  );
  sections.push(engine.createParagraph(data.businessBackground));
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 4. 현황 분석
  // =========================================================================
  sections.push(
    engine.createHeading('2. 현황 분석', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('2.1 AS-IS 현황', HeadingLevel.HEADING_2)
  );
  sections.push(engine.createParagraph(data.currentStateAnalysis));
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createHeading('2.2 현행 시스템 문제점', HeadingLevel.HEADING_2)
  );
  sections.push(
    ...engine.createList(data.currentIssues, { ordered: true })
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 5. 목표 및 범위
  // =========================================================================
  sections.push(
    engine.createHeading('3. 목표 및 범위', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('3.1 TO-BE 목표 상태', HeadingLevel.HEADING_2)
  );
  sections.push(engine.createParagraph(data.targetState));
  sections.push(engine.createEmptyLine());

  if (data.objectives && data.objectives.length > 0) {
    sections.push(
      engine.createHeading('3.2 세부 목표', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.objectives, { ordered: true })
    );
    sections.push(engine.createEmptyLine());
  }

  sections.push(
    engine.createHeading('3.3 예상 효과 및 ROI', HeadingLevel.HEADING_2)
  );
  sections.push(
    ...engine.createList(data.expectedBenefits, { ordered: false })
  );
  sections.push(engine.createEmptyLine());

  if (data.scope && data.scope.length > 0) {
    sections.push(
      engine.createHeading('3.4 사업 범위', HeadingLevel.HEADING_2)
    );
    sections.push(...engine.createList(data.scope, { ordered: true }));
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 6. 상세 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('4. 상세 요구사항', HeadingLevel.HEADING_1)
  );

  // 기능 요구사항
  sections.push(
    engine.createHeading('4.1 기능 요구사항', HeadingLevel.HEADING_2)
  );

  if (data.functionalRequirements.length > 0) {
    // 카테고리별로 그룹화
    const categories = groupByCategory(data.functionalRequirements);

    for (const [category, reqs] of Object.entries(categories)) {
      sections.push(
        engine.createParagraph(`[${category}]`, { bold: true })
      );
      sections.push(
        engine.createTable({
          headers: ['ID', '요구사항', '설명', '우선순위'],
          rows: reqs.map((req) => [
            req.id,
            req.name,
            req.description,
            getPriorityLabel(req.priority),
          ]),
          widths: [10, 20, 50, 20],
        })
      );
      sections.push(engine.createEmptyLine());
    }
  }

  // 비기능 요구사항
  sections.push(
    engine.createHeading('4.2 비기능 요구사항', HeadingLevel.HEADING_2)
  );

  if (data.nonFunctionalRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['ID', '카테고리', '요구사항', '설명', '우선순위'],
        rows: data.nonFunctionalRequirements.map((req) => [
          req.id,
          req.category,
          req.name,
          req.description,
          getPriorityLabel(req.priority),
        ]),
        widths: [10, 15, 20, 40, 15],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 7. 기술 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('5. 기술 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.technicalRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['ID', '카테고리', '요구사항', '설명', '검증 방법'],
        rows: data.technicalRequirements.map((req) => [
          req.id,
          req.category,
          req.name,
          req.description,
          req.verificationMethod ?? '-',
        ]),
        widths: [10, 15, 20, 35, 20],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // 통합 요구사항
  if (data.integrationRequirements && data.integrationRequirements.length > 0) {
    sections.push(
      engine.createHeading('5.1 통합 요구사항', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.integrationRequirements, { ordered: true })
    );
    sections.push(engine.createEmptyLine());
  }

  // 데이터 마이그레이션
  if (data.dataMigrationRequirements && data.dataMigrationRequirements.length > 0) {
    sections.push(
      engine.createHeading('5.2 데이터 마이그레이션', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.dataMigrationRequirements, { ordered: true })
    );
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 8. 보안 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('6. 보안 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.securityRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['ID', '보안 영역', '요구사항', '관련 규정', '필수'],
        rows: data.securityRequirements.map((req) => [
          req.id,
          req.domain,
          req.requirement,
          req.compliance?.join(', ') ?? '-',
          req.mandatory ? '필수' : '권장',
        ]),
        widths: [10, 15, 40, 25, 10],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // 규정 준수
  if (data.complianceRequirements && data.complianceRequirements.length > 0) {
    sections.push(
      engine.createHeading('6.1 규정 준수 요구사항', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.complianceRequirements, { ordered: true })
    );
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 9. SLA 및 품질 요구사항
  // =========================================================================
  sections.push(
    engine.createHeading('7. SLA 및 품질 요구사항', HeadingLevel.HEADING_1)
  );

  if (data.slaRequirements.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['서비스 항목', '측정 지표', '목표 수준', '패널티'],
        rows: data.slaRequirements.map((sla) => [
          sla.service,
          sla.metric,
          sla.target,
          sla.penalty ?? '-',
        ]),
        widths: [25, 25, 25, 25],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 10. 일정 및 마일스톤
  // =========================================================================
  sections.push(
    engine.createHeading('8. 일정 및 마일스톤', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('8.1 전체 일정', HeadingLevel.HEADING_2)
  );

  if (data.timeline.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['단계', '기간', '주요 활동', '담당자'],
        rows: data.timeline.map((item) => [
          item.phase,
          `${engine.formatDate(item.startDate)} ~ ${engine.formatDate(item.endDate)}`,
          item.description,
          item.owner ?? '-',
        ]),
        widths: [15, 25, 45, 15],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // 마일스톤
  if (data.milestones && data.milestones.length > 0) {
    sections.push(
      engine.createHeading('8.2 주요 마일스톤', HeadingLevel.HEADING_2)
    );
    sections.push(
      engine.createTable({
        headers: ['마일스톤', '예정일', '산출물'],
        rows: data.milestones.map((ms) => [
          ms.name,
          engine.formatDate(ms.date),
          ms.deliverables.join(', '),
        ]),
        widths: [30, 20, 50],
      })
    );
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 11. 예산
  // =========================================================================
  sections.push(engine.createHeading('9. 예산', HeadingLevel.HEADING_1));

  if (data.budget) {
    sections.push(
      engine.createParagraph(
        `총 사업 예산: ${engine.formatCurrency(data.budget)}`,
        { bold: true }
      )
    );
    sections.push(engine.createEmptyLine());
  }

  if (data.budgetItems.length > 0) {
    const totalBudget = data.budgetItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    sections.push(
      engine.createTable({
        headers: ['비용 항목', '금액', '비고'],
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
  // 12. 평가 기준
  // =========================================================================
  sections.push(
    engine.createHeading('10. 평가 기준', HeadingLevel.HEADING_1)
  );

  let grandTotal = 0;
  for (const criteria of data.evaluationCriteria) {
    sections.push(
      engine.createHeading(
        `10.${data.evaluationCriteria.indexOf(criteria) + 1} ${criteria.category} (${criteria.totalWeight}점)`,
        HeadingLevel.HEADING_2
      )
    );
    sections.push(
      engine.createTable({
        headers: ['평가 항목', '배점', '평가 내용'],
        rows: criteria.items.map((item) => [
          item.name,
          `${item.weight}점`,
          item.description,
        ]),
        widths: [30, 15, 55],
      })
    );
    sections.push(engine.createEmptyLine());
    grandTotal += criteria.totalWeight;
  }

  sections.push(
    engine.createParagraph(`총점: ${grandTotal}점`, { bold: true })
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 13. 계약 조건
  // =========================================================================
  sections.push(
    engine.createHeading('11. 계약 조건', HeadingLevel.HEADING_1)
  );

  if (data.contractTerms) {
    const ct = data.contractTerms;
    sections.push(
      engine.createTable({
        headers: ['조건', '내용'],
        rows: [
          ['계약 유형', ct.contractType],
          ['지불 조건', ct.paymentTerms],
          ['보증 기간', ct.warrantyPeriod ?? '-'],
          ['유지보수 조건', ct.maintenanceTerms ?? '-'],
          ['지적재산권', ct.ipOwnership ?? '발주사 귀속'],
          ['기밀유지', ct.confidentiality ?? '계약 종료 후 3년'],
          ['책임 제한', ct.liabilityLimitation ?? '계약 금액 범위 내'],
        ],
        widths: [25, 75],
      })
    );
  } else {
    sections.push(
      engine.createParagraph('계약 조건은 협상 시 상세 협의합니다.')
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 14. 제안서 제출 안내
  // =========================================================================
  sections.push(
    engine.createHeading('12. 제안서 제출 안내', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createHeading('12.1 제출 일정', HeadingLevel.HEADING_2)
  );

  const scheduleRows: string[][] = [];
  if (data.qaDeadline) {
    scheduleRows.push([
      '질의응답 마감',
      engine.formatDate(data.qaDeadline, 'YYYY년 MM월 DD일'),
    ]);
  }
  if (data.proposalDeadline) {
    scheduleRows.push([
      '제안서 제출 마감',
      engine.formatDate(data.proposalDeadline, 'YYYY년 MM월 DD일'),
    ]);
  }
  if (data.presentationDate) {
    scheduleRows.push([
      '발표 평가',
      engine.formatDate(data.presentationDate, 'YYYY년 MM월 DD일'),
    ]);
  }
  if (data.selectionDate) {
    scheduleRows.push([
      '최종 선정',
      engine.formatDate(data.selectionDate, 'YYYY년 MM월 DD일'),
    ]);
  }

  if (scheduleRows.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['일정', '날짜'],
        rows: scheduleRows,
        widths: [40, 60],
      })
    );
    sections.push(engine.createEmptyLine());
  }

  sections.push(
    engine.createHeading('12.2 제출 서류', HeadingLevel.HEADING_2)
  );
  const proposalReqs = data.proposalRequirements ?? [
    '회사 소개서',
    '기술 제안서',
    '가격 제안서',
    '사업 수행 계획서',
    '투입 인력 현황',
    '유사 사업 수행 실적',
    '재무제표 (최근 3개년)',
    '신용평가 등급 확인서',
  ];
  sections.push(...engine.createList(proposalReqs, { ordered: true }));
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 15. 리스크 관리
  // =========================================================================
  sections.push(
    engine.createHeading('13. 리스크 관리', HeadingLevel.HEADING_1)
  );

  if (data.risks.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['리스크', '설명', '심각도', '확률', '대응 방안'],
        rows: data.risks.map((risk) => [
          risk.name,
          risk.description ?? '-',
          getSeverityLabel(risk.severity),
          getProbabilityLabel(risk.probability),
          risk.mitigation ?? '-',
        ]),
        widths: [15, 30, 12, 12, 31],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 부록: 연락처
  // =========================================================================
  sections.push(
    engine.createHeading('부록. 연락처', HeadingLevel.HEADING_1)
  );

  const contactRows: string[][] = [['기업명', data.companyName]];

  if (data.businessUnit) {
    contactRows.push(['사업부/부서', data.businessUnit]);
  }
  if (data.projectManager) {
    contactRows.push(['프로젝트 매니저', data.projectManager.name]);
    if (data.projectManager.email) {
      contactRows.push(['이메일', data.projectManager.email]);
    }
    if (data.projectManager.phone) {
      contactRows.push(['전화', data.projectManager.phone]);
    }
  }

  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: contactRows,
      widths: [30, 70],
    })
  );

  return sections;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 요구사항을 카테고리별로 그룹화
 */
function groupByCategory(
  requirements: EnterpriseRequirement[]
): Record<string, EnterpriseRequirement[]> {
  return requirements.reduce(
    (acc, req) => {
      const category = req.category || '기타';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(req);
      return acc;
    },
    {} as Record<string, EnterpriseRequirement[]>
  );
}

/**
 * 우선순위 라벨
 */
function getPriorityLabel(
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
): string {
  const labels: Record<string, string> = {
    Critical: '필수(Critical)',
    High: '높음(High)',
    Medium: '보통(Medium)',
    Low: '낮음(Low)',
  };
  return labels[priority] ?? priority;
}

/**
 * 심각도 라벨
 */
function getSeverityLabel(
  severity: 'low' | 'medium' | 'high' | 'critical'
): string {
  const labels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
    critical: '치명적',
  };
  return labels[severity] ?? severity;
}

/**
 * 확률 라벨
 */
function getProbabilityLabel(probability: 'low' | 'medium' | 'high'): string {
  const labels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };
  return labels[probability] ?? probability;
}

// ============================================================================
// 기본 템플릿 데이터
// ============================================================================

/**
 * 엔터프라이즈 RFP 기본 템플릿 데이터
 */
export const enterpriseRFPDefaults: Partial<EnterpriseRFPData> = {
  confidentialityLevel: 'Confidential',
  evaluationCriteria: [
    {
      category: '기술 평가',
      totalWeight: 60,
      items: [
        { name: '기술 이해도', weight: 15, description: '요구사항 분석 및 해결 방안의 적합성' },
        { name: '아키텍처 설계', weight: 15, description: '시스템 아키텍처의 확장성, 안정성' },
        { name: '보안 대책', weight: 10, description: '보안 요구사항 충족 방안' },
        { name: '품질 관리', weight: 10, description: '테스트 및 품질 보증 계획' },
        { name: '수행 역량', weight: 10, description: '유사 사업 경험 및 투입 인력 역량' },
      ],
    },
    {
      category: '사업 관리',
      totalWeight: 20,
      items: [
        { name: '프로젝트 관리', weight: 10, description: '일정, 위험, 변경 관리 방안' },
        { name: '의사소통', weight: 5, description: '커뮤니케이션 및 보고 체계' },
        { name: '유지보수', weight: 5, description: '운영 및 유지보수 지원 방안' },
      ],
    },
    {
      category: '가격 평가',
      totalWeight: 20,
      items: [
        { name: '가격 적정성', weight: 20, description: '제안 가격의 적정성 및 상세 내역' },
      ],
    },
  ],
  slaRequirements: [
    { service: '시스템 가용성', metric: 'Uptime', target: '99.9%', penalty: '미달 시간당 0.1% 공제' },
    { service: '장애 대응', metric: '초기 응답시간', target: '30분 이내', penalty: '지연 시간당 0.05% 공제' },
    { service: '장애 복구', metric: '복구 시간', target: '4시간 이내', penalty: '지연 시간당 0.1% 공제' },
  ],
  contractTerms: {
    contractType: '도급계약',
    paymentTerms: '착수금 30%, 중간금 30%, 잔금 40%',
    warrantyPeriod: '납품 후 1년',
    maintenanceTerms: '별도 유지보수 계약 체결',
    ipOwnership: '발주사 귀속',
    confidentiality: '계약 종료 후 3년간 유지',
    liabilityLimitation: '계약 금액 한도 내',
  },
};
