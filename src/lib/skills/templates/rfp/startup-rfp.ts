/**
 * 스타트업 RFP 템플릿
 *
 * 간결하고 실용적인 MVP 중심 RFP 양식
 * 빠른 의사결정과 애자일 개발을 지원
 *
 * @module lib/skills/templates/rfp/startup-rfp
 */

import { Paragraph, Table, HeadingLevel, AlignmentType } from 'docx';
import type { TemplateData, TimelineItem } from '@/types/docx.types';
import { TemplateEngine } from '../../docx/template-engine';

// ============================================================================
// 스타트업 RFP 전용 타입
// ============================================================================

/**
 * MVP 기능 정의
 */
export interface MVPFeature {
  /** 기능명 */
  name: string;
  /** 설명 */
  description: string;
  /** MVP 포함 여부 */
  inMVP: boolean;
  /** 예상 공수 (일) */
  estimatedDays?: number;
  /** 우선순위 (1-5) */
  priority: number;
}

/**
 * 기술 스택 항목
 */
export interface TechStackItem {
  /** 카테고리 (예: Frontend, Backend, Database) */
  category: string;
  /** 기술명 */
  technology: string;
  /** 선택 이유 */
  reason?: string;
  /** 필수 여부 */
  required?: boolean;
}

/**
 * 성공 지표 (KPI)
 */
export interface SuccessMetric {
  /** 지표명 */
  name: string;
  /** 현재 값 */
  currentValue?: string;
  /** 목표 값 */
  targetValue: string;
  /** 측정 방법 */
  measurementMethod?: string;
}

/**
 * 스타트업 RFP 데이터
 */
export interface StartupRFPData extends TemplateData {
  /** 회사명 */
  companyName: string;
  /** 회사 소개 (한 줄) */
  companyTagline?: string;
  /** 담당자명 */
  contactPerson: string;
  /** 이메일 */
  contactEmail: string;
  /** 전화번호 */
  contactPhone?: string;
  /** 프로젝트 개요 (한 문단) */
  projectSummary: string;
  /** 해결하고자 하는 문제 */
  problemStatement: string;
  /** 제안하는 솔루션 */
  proposedSolution: string;
  /** 타겟 사용자 */
  targetUsers?: string[];
  /** MVP 기능 목록 */
  mvpFeatures: MVPFeature[];
  /** Phase 2+ 기능 (향후 개발) */
  futureFeatures?: string[];
  /** 기술 스택 요구사항/선호 */
  techStack?: TechStackItem[];
  /** 기술적 제약사항 */
  technicalConstraints?: string[];
  /** 통합 필요 서비스 */
  integrations?: string[];
  /** 예산 범위 (최소~최대) */
  budgetRange?: {
    min: number;
    max: number;
    currency?: string;
  };
  /** 일정 계획 */
  timeline: TimelineItem[];
  /** 성공 지표 */
  successMetrics: SuccessMetric[];
  /** 선호하는 협업 방식 */
  collaborationStyle?: string;
  /** 커뮤니케이션 도구 */
  communicationTools?: string[];
  /** 미팅 빈도 */
  meetingFrequency?: string;
  /** 기타 요구사항 */
  additionalRequirements?: string[];
}

// ============================================================================
// 스타트업 RFP 빌더
// ============================================================================

/**
 * 스타트업 RFP 문서 생성
 *
 * @param engine - TemplateEngine 인스턴스
 * @param data - 스타트업 RFP 데이터
 * @returns docx 문서 요소 배열
 */
export function buildStartupRFP(
  engine: TemplateEngine,
  data: StartupRFPData
): (Paragraph | Table)[] {
  const sections: (Paragraph | Table)[] = [];

  // =========================================================================
  // 1. 헤더
  // =========================================================================
  sections.push(
    engine.createHeading(data.projectName, HeadingLevel.TITLE)
  );
  sections.push(
    engine.createParagraph('프로젝트 제안요청서 (RFP)', {
      alignment: AlignmentType.CENTER,
      italic: true,
    })
  );
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createParagraph(`${data.companyName}`, {
      bold: true,
      alignment: AlignmentType.CENTER,
    })
  );
  if (data.companyTagline) {
    sections.push(
      engine.createParagraph(data.companyTagline, {
        italic: true,
        alignment: AlignmentType.CENTER,
      })
    );
  }
  sections.push(
    engine.createParagraph(
      `작성일: ${engine.formatDate(data.startDate, 'YYYY-MM-DD')}`,
      { alignment: AlignmentType.CENTER }
    )
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 2. 프로젝트 개요
  // =========================================================================
  sections.push(
    engine.createHeading('1. 프로젝트 개요', HeadingLevel.HEADING_1)
  );
  sections.push(engine.createParagraph(data.projectSummary));
  sections.push(engine.createEmptyLine());

  // 핵심 정보 요약 테이블
  const projectEndDate = data.endDate
    ? engine.formatDate(data.endDate)
    : '협의 필요';

  sections.push(
    engine.createTable({
      headers: ['항목', '내용'],
      rows: [
        ['프로젝트명', data.projectName],
        ['요청사', data.companyName],
        ['예상 기간', `${engine.formatDate(data.startDate)} ~ ${projectEndDate}`],
        ['예산 범위', formatBudgetRange(data.budgetRange)],
      ],
      widths: [30, 70],
    })
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 3. 문제 정의 & 솔루션
  // =========================================================================
  sections.push(
    engine.createHeading('2. 문제 정의', HeadingLevel.HEADING_1)
  );
  sections.push(engine.createParagraph(data.problemStatement));
  sections.push(engine.createEmptyLine());

  sections.push(
    engine.createHeading('3. 제안 솔루션', HeadingLevel.HEADING_1)
  );
  sections.push(engine.createParagraph(data.proposedSolution));
  sections.push(engine.createEmptyLine());

  // 타겟 사용자
  if (data.targetUsers && data.targetUsers.length > 0) {
    sections.push(
      engine.createHeading('3.1 타겟 사용자', HeadingLevel.HEADING_2)
    );
    sections.push(...engine.createList(data.targetUsers, { ordered: false }));
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 4. MVP 기능 정의
  // =========================================================================
  sections.push(
    engine.createHeading('4. MVP 범위', HeadingLevel.HEADING_1)
  );

  // MVP 포함 기능
  const mvpFeatures = data.mvpFeatures.filter((f) => f.inMVP);
  const futureFeatures = data.mvpFeatures.filter((f) => !f.inMVP);

  sections.push(
    engine.createHeading('4.1 MVP 핵심 기능', HeadingLevel.HEADING_2)
  );

  if (mvpFeatures.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['우선순위', '기능명', '설명', '예상 공수'],
        rows: mvpFeatures
          .sort((a, b) => a.priority - b.priority)
          .map((feature) => [
            `P${feature.priority}`,
            feature.name,
            feature.description,
            feature.estimatedDays ? `${feature.estimatedDays}일` : '-',
          ]),
        widths: [15, 20, 50, 15],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // Phase 2+ 기능
  sections.push(
    engine.createHeading('4.2 향후 개발 예정 (Phase 2+)', HeadingLevel.HEADING_2)
  );

  if (futureFeatures.length > 0) {
    sections.push(
      ...engine.createList(
        futureFeatures.map((f) => `${f.name}: ${f.description}`),
        { ordered: false }
      )
    );
  } else if (data.futureFeatures && data.futureFeatures.length > 0) {
    sections.push(
      ...engine.createList(data.futureFeatures, { ordered: false })
    );
  } else {
    sections.push(engine.createParagraph('(MVP 완료 후 협의 예정)'));
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 5. 기술 스택
  // =========================================================================
  sections.push(
    engine.createHeading('5. 기술 스택', HeadingLevel.HEADING_1)
  );

  if (data.techStack && data.techStack.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['영역', '기술', '필수 여부', '선택 이유'],
        rows: data.techStack.map((item) => [
          item.category,
          item.technology,
          item.required ? '필수' : '선호',
          item.reason ?? '-',
        ]),
        widths: [20, 25, 15, 40],
      })
    );
  } else {
    sections.push(
      engine.createParagraph('제안사의 권장 기술 스택을 제안해주세요.')
    );
  }
  sections.push(engine.createEmptyLine());

  // 기술적 제약사항
  if (data.technicalConstraints && data.technicalConstraints.length > 0) {
    sections.push(
      engine.createHeading('5.1 기술적 제약사항', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.technicalConstraints, { ordered: false })
    );
    sections.push(engine.createEmptyLine());
  }

  // 통합 서비스
  if (data.integrations && data.integrations.length > 0) {
    sections.push(
      engine.createHeading('5.2 통합 필요 서비스', HeadingLevel.HEADING_2)
    );
    sections.push(
      ...engine.createList(data.integrations, { ordered: false })
    );
    sections.push(engine.createEmptyLine());
  }

  // =========================================================================
  // 6. 일정 계획
  // =========================================================================
  sections.push(engine.createHeading('6. 일정', HeadingLevel.HEADING_1));

  if (data.timeline && data.timeline.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['단계', '기간', '목표', '산출물'],
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
  // 7. 예산
  // =========================================================================
  sections.push(engine.createHeading('7. 예산', HeadingLevel.HEADING_1));

  if (data.budgetRange) {
    sections.push(
      engine.createParagraph(
        `예산 범위: ${formatBudgetRange(data.budgetRange)}`,
        { bold: true }
      )
    );
    sections.push(engine.createEmptyLine());
    sections.push(
      engine.createParagraph(
        '※ 위 예산은 협의 가능하며, 제안서에 상세 견적을 포함해주세요.'
      )
    );
  } else if (data.budget) {
    sections.push(
      engine.createParagraph(
        `예산: ${engine.formatCurrency(data.budget)}`,
        { bold: true }
      )
    );
  } else {
    sections.push(
      engine.createParagraph('예산은 제안서 검토 후 협의합니다.')
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 8. 성공 지표
  // =========================================================================
  sections.push(
    engine.createHeading('8. 성공 지표 (KPI)', HeadingLevel.HEADING_1)
  );

  if (data.successMetrics.length > 0) {
    sections.push(
      engine.createTable({
        headers: ['지표', '현재', '목표', '측정 방법'],
        rows: data.successMetrics.map((metric) => [
          metric.name,
          metric.currentValue ?? '-',
          metric.targetValue,
          metric.measurementMethod ?? '-',
        ]),
        widths: [25, 20, 25, 30],
      })
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 9. 협업 방식
  // =========================================================================
  sections.push(
    engine.createHeading('9. 협업 방식', HeadingLevel.HEADING_1)
  );

  const collaborationInfo: string[] = [];
  if (data.collaborationStyle) {
    collaborationInfo.push(`협업 스타일: ${data.collaborationStyle}`);
  }
  if (data.meetingFrequency) {
    collaborationInfo.push(`미팅 빈도: ${data.meetingFrequency}`);
  }
  if (data.communicationTools && data.communicationTools.length > 0) {
    collaborationInfo.push(
      `커뮤니케이션 도구: ${data.communicationTools.join(', ')}`
    );
  }

  if (collaborationInfo.length > 0) {
    sections.push(
      ...engine.createList(collaborationInfo, { ordered: false })
    );
  } else {
    sections.push(
      engine.createParagraph('애자일 방법론 기반, 주 1회 스프린트 미팅 권장')
    );
  }
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 10. 제안 요청 사항
  // =========================================================================
  sections.push(
    engine.createHeading('10. 제안서 포함 사항', HeadingLevel.HEADING_1)
  );

  const proposalRequirements = [
    '회사 소개 및 포트폴리오',
    '참여 인력 구성 및 역할',
    '기술 접근 방식',
    '상세 일정 및 마일스톤',
    '상세 견적',
    '유사 프로젝트 경험',
  ];
  sections.push(
    ...engine.createList(proposalRequirements, { ordered: true })
  );
  sections.push(engine.createEmptyLine());

  // =========================================================================
  // 11. 연락처
  // =========================================================================
  sections.push(
    engine.createHeading('11. 연락처', HeadingLevel.HEADING_1)
  );

  sections.push(
    engine.createTable({
      headers: ['구분', '내용'],
      rows: [
        ['회사명', data.companyName],
        ['담당자', data.contactPerson],
        ['이메일', data.contactEmail],
        ['전화', data.contactPhone ?? '-'],
      ],
      widths: [30, 70],
    })
  );

  // =========================================================================
  // 12. 기타 요구사항
  // =========================================================================
  if (data.additionalRequirements && data.additionalRequirements.length > 0) {
    sections.push(engine.createEmptyLine());
    sections.push(
      engine.createHeading('12. 기타 요구사항', HeadingLevel.HEADING_1)
    );
    sections.push(
      ...engine.createList(data.additionalRequirements, { ordered: false })
    );
  }

  return sections;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 예산 범위 포맷팅
 */
function formatBudgetRange(
  range?: { min: number; max: number; currency?: string }
): string {
  if (!range) return '협의 필요';

  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: range.currency ?? 'KRW',
    maximumFractionDigits: 0,
  });

  return `${formatter.format(range.min)} ~ ${formatter.format(range.max)}`;
}

// ============================================================================
// 기본 템플릿 데이터
// ============================================================================

/**
 * 스타트업 RFP 기본 템플릿 데이터
 */
export const startupRFPDefaults: Partial<StartupRFPData> = {
  collaborationStyle: 'Agile/Scrum',
  meetingFrequency: '주 1회 스프린트 리뷰',
  communicationTools: ['Slack', 'Notion', 'Zoom'],
  successMetrics: [
    {
      name: 'MVP 출시',
      targetValue: '예정일 내 출시',
      measurementMethod: '출시일 기준',
    },
    {
      name: '초기 사용자',
      currentValue: '0명',
      targetValue: '100명',
      measurementMethod: 'Analytics 가입자 수',
    },
  ],
};
