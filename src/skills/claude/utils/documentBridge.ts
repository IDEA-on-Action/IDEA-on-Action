/**
 * AI 생성 결과 -> 문서 변환 브릿지
 *
 * Claude 응답을 docx/xlsx 생성기에서 사용할 수 있는 형식으로 변환
 * - Claude 응답 -> docx 템플릿 변수
 * - Claude 응답 -> xlsx 시트 데이터
 * - 일관된 데이터 형식 유지
 *
 * @module skills/claude/utils/documentBridge
 */

import type {
  TemplateData,
  RFPCategory,
  TimelineItem,
  Deliverable,
  BudgetItem,
  RiskItem,
  TeamMember,
} from '@/types/docx.types';
import type { SheetConfig, ColumnConfig } from '@/types/skills.types';
import type {
  MarketAnalysisData,
  CompetitorData,
  TrendData,
  OpportunityData,
} from '@/skills/xlsx/generators/marketAnalysis';
import type {
  ProjectReportData,
  TaskData,
  BurndownData,
  ResourceData,
} from '@/skills/xlsx/generators/projectReport';
import type {
  RFPGenerateResult,
  RFPSectionResult,
  EvaluationCriterion,
} from '../generators/rfpGenerator';
import type {
  ProjectPlanResult,
  GeneratedProjectPlan,
  SprintPlan,
  Milestone,
  ProjectRisk,
} from '../generators/projectPlanGenerator';

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * 변환 결과
 */
export interface ConversionResult<T> {
  /** 성공 여부 */
  success: boolean;
  /** 변환된 데이터 */
  data?: T;
  /** 에러 메시지 */
  error?: string;
  /** 경고 메시지 */
  warnings?: string[];
}

/**
 * 문서 유형
 */
export type DocumentType = 'rfp' | 'project-plan' | 'market-analysis' | 'report';

/**
 * 출력 형식
 */
export type OutputFormat = 'docx' | 'xlsx' | 'pptx';

// ============================================================================
// RFP -> docx 변환
// ============================================================================

/**
 * RFP 생성 결과를 docx TemplateData로 변환
 *
 * @param result - RFP 생성 결과
 * @param category - RFP 카테고리 (선택)
 * @returns TemplateData 형식 데이터
 *
 * @example
 * ```typescript
 * const rfpResult = await generateRFP(input);
 * const templateData = convertRFPToDocxTemplate(rfpResult);
 *
 * if (templateData.success) {
 *   await generateDocx({
 *     template: 'rfp',
 *     category: 'enterprise',
 *     data: templateData.data,
 *   });
 * }
 * ```
 */
export function convertRFPToDocxTemplate(
  result: RFPGenerateResult,
  category?: RFPCategory
): ConversionResult<TemplateData> {
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'RFP 생성 결과가 없습니다.',
    };
  }

  const warnings: string[] = [];

  // 필수 필드 검증
  const data = result.data;
  if (!data.projectName) {
    warnings.push('프로젝트명이 누락되었습니다.');
  }
  if (!data.clientName) {
    warnings.push('고객명이 누락되었습니다.');
  }

  // 날짜 변환
  const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  const endDate = data.endDate
    ? data.endDate instanceof Date
      ? data.endDate
      : new Date(data.endDate)
    : undefined;

  // TemplateData 구성
  const templateData: TemplateData = {
    projectName: data.projectName || '미정',
    clientName: data.clientName || '미정',
    startDate,
    endDate,
    budget: data.budget,
    budgetItems: data.budgetItems,
    scope: data.scope,
    deliverables: data.deliverables,
    requirements: data.requirements,
    timeline: data.timeline?.map((item) => ({
      ...item,
      startDate: item.startDate instanceof Date ? item.startDate : new Date(item.startDate),
      endDate: item.endDate instanceof Date ? item.endDate : new Date(item.endDate),
    })),
    background: data.background,
    objectives: data.objectives,
    assumptions: data.assumptions,
    constraints: data.constraints,
    risks: data.risks,
    customFields: {
      ...data.customFields,
      category,
    },
  };

  return {
    success: true,
    data: templateData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * RFP 섹션 결과를 docx TemplateData로 변환
 *
 * @param sections - RFP 섹션별 결과
 * @returns TemplateData
 */
export function convertRFPSectionsToDocxTemplate(
  sections: RFPSectionResult
): ConversionResult<TemplateData> {
  try {
    const templateData: TemplateData = {
      projectName: sections.overview?.projectName || '미정',
      clientName: sections.overview?.clientName || '미정',
      startDate: new Date(),
      background: sections.overview?.background,
      objectives: sections.overview?.objectives,
      scope: sections.requirements?.scope,
      requirements: [
        ...(sections.requirements?.functionalRequirements || []),
        ...(sections.requirements?.nonFunctionalRequirements || []),
      ],
      deliverables: sections.requirements?.deliverables?.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
      })),
      timeline: sections.timeline?.phases?.map((phase) => ({
        phase: phase.phase,
        description: phase.description,
        startDate: new Date(phase.startDate),
        endDate: new Date(phase.endDate),
        milestones: phase.milestones,
      })),
      budget: sections.budget?.total,
      budgetItems: sections.budget?.items,
      risks: sections.risks,
      customFields: {
        evaluationCriteria: sections.evaluation?.criteria,
        milestones: sections.timeline?.milestones,
      },
    };

    return {
      success: true,
      data: templateData,
    };
  } catch (error) {
    return {
      success: false,
      error: `RFP 섹션 변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}

// ============================================================================
// RFP -> xlsx 변환
// ============================================================================

/**
 * RFP 평가 기준을 xlsx 시트로 변환
 *
 * @param criteria - 평가 기준 목록
 * @returns SheetConfig
 */
export function convertEvaluationCriteriaToSheet(
  criteria: EvaluationCriterion[]
): SheetConfig {
  const columns: ColumnConfig[] = [
    { key: '기준명', header: '평가 기준', width: 25 },
    { key: '설명', header: '설명', width: 50 },
    { key: '가중치', header: '가중치 (%)', width: 12, format: 'percent' },
    { key: '세부항목', header: '세부 항목', width: 40 },
  ];

  const data = criteria.map((c) => ({
    '기준명': c.name,
    '설명': c.description,
    '가중치': `${c.weight}%`,
    '세부항목': c.subCriteria?.join(', ') || '-',
  }));

  return {
    name: '평가기준',
    data,
    columns,
  };
}

/**
 * RFP 요구사항을 xlsx 시트로 변환
 *
 * @param requirements - 요구사항 목록
 * @param type - 요구사항 유형 ('functional' | 'non-functional')
 * @returns SheetConfig
 */
export function convertRequirementsToSheet(
  requirements: string[],
  type: 'functional' | 'non-functional' = 'functional'
): SheetConfig {
  const sheetName = type === 'functional' ? '기능요구사항' : '비기능요구사항';

  const columns: ColumnConfig[] = [
    { key: 'ID', header: 'ID', width: 12 },
    { key: '요구사항', header: '요구사항', width: 60 },
    { key: '우선순위', header: '우선순위', width: 12 },
  ];

  const prefix = type === 'functional' ? 'FR' : 'NFR';
  const data = requirements.map((req, index) => ({
    'ID': `${prefix}-${String(index + 1).padStart(3, '0')}`,
    '요구사항': req,
    '우선순위': '높음', // 기본값
  }));

  return {
    name: sheetName,
    data,
    columns,
  };
}

/**
 * RFP 산출물을 xlsx 시트로 변환
 *
 * @param deliverables - 산출물 목록
 * @returns SheetConfig
 */
export function convertDeliverablesSheet(
  deliverables: Deliverable[]
): SheetConfig {
  const columns: ColumnConfig[] = [
    { key: 'ID', header: 'ID', width: 12 },
    { key: '산출물명', header: '산출물명', width: 30 },
    { key: '설명', header: '설명', width: 50 },
    { key: '예정일', header: '예정일', width: 15 },
    { key: '상태', header: '상태', width: 12 },
  ];

  const data = deliverables.map((d) => ({
    'ID': d.id,
    '산출물명': d.name,
    '설명': d.description || '-',
    '예정일': d.dueDate ? new Date(d.dueDate).toLocaleDateString('ko-KR') : '-',
    '상태': d.completed ? '완료' : '미완료',
  }));

  return {
    name: '산출물',
    data,
    columns,
  };
}

// ============================================================================
// Project Plan -> xlsx 변환
// ============================================================================

/**
 * 프로젝트 계획을 xlsx 시트 배열로 변환
 *
 * @param plan - 생성된 프로젝트 계획
 * @returns SheetConfig 배열
 *
 * @example
 * ```typescript
 * const planResult = await generateProjectPlan(input);
 * if (planResult.success) {
 *   const sheets = convertProjectPlanToSheets(planResult.plan);
 *   await exportToExcel({ sheets, filename: 'project-plan.xlsx' });
 * }
 * ```
 */
export function convertProjectPlanToSheets(
  plan: GeneratedProjectPlan
): SheetConfig[] {
  const sheets: SheetConfig[] = [];

  // 1. 프로젝트 요약 시트
  sheets.push(createProjectSummarySheet(plan));

  // 2. 스프린트별 시트
  plan.sprints.forEach((sprint) => {
    sheets.push(createSprintSheet(sprint));
  });

  // 3. 마일스톤 시트
  if (plan.milestones && plan.milestones.length > 0) {
    sheets.push(createMilestoneSheet(plan.milestones));
  }

  // 4. 리소스 할당 시트
  if (plan.resources && plan.resources.length > 0) {
    sheets.push(createResourceSheet(plan.resources, plan.sprints.length));
  }

  // 5. 리스크 시트
  if (plan.risks && plan.risks.length > 0) {
    sheets.push(createRiskSheet(plan.risks));
  }

  return sheets;
}

/**
 * 프로젝트 요약 시트 생성
 */
function createProjectSummarySheet(plan: GeneratedProjectPlan): SheetConfig {
  const totalTasks = plan.sprints.reduce((sum, s) => sum + s.tasks.length, 0);
  const totalStoryPoints = plan.sprints.reduce((sum, s) => sum + s.storyPoints, 0);
  const totalHours = plan.sprints.reduce(
    (sum, s) => sum + s.tasks.reduce((taskSum, t) => taskSum + t.estimatedHours, 0),
    0
  );

  const data = [
    { '항목': '프로젝트명', '값': plan.projectName },
    { '항목': '프로젝트 개요', '값': plan.summary },
    { '항목': '총 기간 (일)', '값': plan.totalDuration },
    { '항목': '총 스프린트 수', '값': plan.sprints.length },
    { '항목': '총 작업 수', '값': totalTasks },
    { '항목': '총 스토리 포인트', '값': totalStoryPoints },
    { '항목': '총 예상 시간 (h)', '값': totalHours },
    { '항목': '마일스톤 수', '값': plan.milestones?.length || 0 },
    { '항목': '식별된 리스크 수', '값': plan.risks?.length || 0 },
    { '항목': '', '값': '' },
    { '항목': '=== 추천 사항 ===', '값': '' },
    ...(plan.recommendations || []).map((rec, i) => ({
      '항목': `${i + 1}`,
      '값': rec,
    })),
  ];

  return {
    name: '프로젝트 요약',
    data,
    columns: [
      { key: '항목', header: '항목', width: 25 },
      { key: '값', header: '값', width: 60 },
    ],
  };
}

/**
 * 스프린트 시트 생성
 */
function createSprintSheet(sprint: SprintPlan): SheetConfig {
  const columns: ColumnConfig[] = [
    { key: 'ID', header: 'ID', width: 12 },
    { key: '제목', header: '제목', width: 40 },
    { key: '설명', header: '설명', width: 50 },
    { key: 'SP', header: 'SP', width: 8, format: 'number' },
    { key: '시간', header: '시간 (h)', width: 10, format: 'number' },
    { key: '우선순위', header: '우선순위', width: 12 },
    { key: '담당', header: '담당 역할', width: 20 },
    { key: '카테고리', header: '카테고리', width: 12 },
    { key: '의존성', header: '의존성', width: 20 },
  ];

  const priorityLabels: Record<string, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

  const categoryLabels: Record<string, string> = {
    feature: '기능',
    bugfix: '버그수정',
    refactor: '리팩토링',
    docs: '문서',
    test: '테스트',
    infra: '인프라',
  };

  const data = sprint.tasks.map((task) => ({
    'ID': task.id,
    '제목': task.title,
    '설명': task.description,
    'SP': task.storyPoints,
    '시간': task.estimatedHours,
    '우선순위': priorityLabels[task.priority] || task.priority,
    '담당': task.assignedRole,
    '카테고리': categoryLabels[task.category] || task.category,
    '의존성': task.dependencies?.join(', ') || '-',
  }));

  // 스프린트 메타 정보 추가
  data.unshift({
    'ID': `Sprint ${sprint.number}`,
    '제목': sprint.goal,
    '설명': `${sprint.startDate} ~ ${sprint.endDate}`,
    'SP': sprint.storyPoints,
    '시간': 0,
    '우선순위': '',
    '담당': '',
    '카테고리': '',
    '의존성': '',
  });

  return {
    name: `Sprint ${sprint.number}`,
    data,
    columns,
  };
}

/**
 * 마일스톤 시트 생성
 */
function createMilestoneSheet(milestones: Milestone[]): SheetConfig {
  const columns: ColumnConfig[] = [
    { key: 'ID', header: 'ID', width: 10 },
    { key: '마일스톤', header: '마일스톤', width: 30 },
    { key: '설명', header: '설명', width: 50 },
    { key: '예정일', header: '예정일', width: 15 },
    { key: '관련스프린트', header: '관련 스프린트', width: 15 },
    { key: '성공기준', header: '성공 기준', width: 50 },
    { key: '상태', header: '상태', width: 10 },
  ];

  const data = milestones.map((m) => ({
    'ID': m.id,
    '마일스톤': m.name,
    '설명': m.description,
    '예정일': m.dueDate,
    '관련스프린트': m.relatedSprints.map((s) => `S${s}`).join(', '),
    '성공기준': m.successCriteria.join('; '),
    '상태': m.completed ? '완료' : '미완료',
  }));

  return {
    name: '마일스톤',
    data,
    columns,
  };
}

/**
 * 리소스 할당 시트 생성
 */
function createResourceSheet(
  resources: GeneratedProjectPlan['resources'],
  sprintCount: number
): SheetConfig {
  const baseColumns: ColumnConfig[] = [
    { key: '역할', header: '역할', width: 25 },
    { key: '인원', header: '인원', width: 10, format: 'number' },
    { key: '주요업무', header: '주요 업무', width: 30 },
    { key: '백업', header: '백업 역할', width: 20 },
  ];

  // 스프린트별 할당률 컬럼 추가
  const sprintColumns: ColumnConfig[] = [];
  for (let i = 1; i <= sprintCount; i++) {
    sprintColumns.push({
      key: `S${i}`,
      header: `S${i} (%)`,
      width: 10,
      format: 'percent',
    });
  }

  const columns = [...baseColumns, ...sprintColumns];

  const data = resources.map((r) => {
    const row: Record<string, unknown> = {
      '역할': r.role,
      '인원': r.assignedCount,
      '주요업무': r.primaryCategories.join(', '),
      '백업': r.backupRole || '-',
    };

    // 스프린트별 할당률 추가
    r.allocationBySprin.forEach((alloc, i) => {
      row[`S${i + 1}`] = `${alloc}%`;
    });

    return row;
  });

  return {
    name: '리소스 할당',
    data,
    columns,
  };
}

/**
 * 리스크 시트 생성
 */
function createRiskSheet(risks: ProjectRisk[]): SheetConfig {
  const impactLabels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
    critical: '치명적',
  };

  const probabilityLabels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };

  const columns: ColumnConfig[] = [
    { key: 'ID', header: 'ID', width: 10 },
    { key: '리스크', header: '리스크', width: 30 },
    { key: '설명', header: '설명', width: 50 },
    { key: '영향도', header: '영향도', width: 12 },
    { key: '확률', header: '발생 확률', width: 12 },
    { key: '대응방안', header: '대응 방안', width: 50 },
    { key: '담당자', header: '담당자', width: 15 },
  ];

  const data = risks.map((r) => ({
    'ID': r.id,
    '리스크': r.name,
    '설명': r.description,
    '영향도': impactLabels[r.impact] || r.impact,
    '확률': probabilityLabels[r.probability] || r.probability,
    '대응방안': r.mitigation,
    '담당자': r.owner,
  }));

  return {
    name: '리스크 관리',
    data,
    columns,
  };
}

// ============================================================================
// Market Analysis -> xlsx 변환
// ============================================================================

/**
 * Claude 시장 분석 응답을 MarketAnalysisData로 변환
 *
 * @param response - Claude 원본 응답
 * @returns MarketAnalysisData
 */
export function parseMarketAnalysisResponse(
  response: string
): ConversionResult<MarketAnalysisData> {
  try {
    // JSON 블록 추출
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonStr);

    const data: MarketAnalysisData = {
      competitors: (parsed.competitors || []).map((c: Record<string, unknown>) => ({
        name: String(c.name || ''),
        marketShare: Number(c.marketShare || 0),
        strengths: Array.isArray(c.strengths) ? c.strengths : [],
        weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
        score: Number(c.score || 0),
      })) as CompetitorData[],
      trends: (parsed.trends || []).map((t: Record<string, unknown>) => ({
        month: String(t.month || ''),
        value: Number(t.value || 0),
        growth: Number(t.growth || 0),
      })) as TrendData[],
      opportunities: (parsed.opportunities || []).map((o: Record<string, unknown>) => ({
        id: String(o.id || ''),
        title: String(o.title || ''),
        score: Number(o.score || 0),
        priority: (o.priority as 'high' | 'medium' | 'low') || 'medium',
        rationale: String(o.rationale || ''),
      })) as OpportunityData[],
      metadata: parsed.metadata,
    };

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `시장 분석 데이터 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}

// ============================================================================
// 공통 유틸리티
// ============================================================================

/**
 * Claude 응답에서 JSON 추출
 *
 * @param response - Claude 원본 응답
 * @returns 파싱된 객체 또는 null
 */
export function extractJsonFromResponse<T>(response: string): T | null {
  try {
    // JSON 블록 시도
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }

    // 전체 응답 파싱 시도
    return JSON.parse(response) as T;
  } catch {
    return null;
  }
}

/**
 * 날짜 문자열을 Date 객체로 변환
 *
 * @param dateStr - 날짜 문자열 (YYYY-MM-DD 등)
 * @returns Date 객체
 */
export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  return new Date(dateStr);
}

/**
 * 리스크 항목을 docx RiskItem 형식으로 변환
 *
 * @param risk - 프로젝트 리스크
 * @returns RiskItem
 */
export function convertToDocxRisk(risk: ProjectRisk): RiskItem {
  return {
    name: risk.name,
    description: risk.description,
    severity: risk.impact === 'critical' ? 'critical' : risk.impact,
    probability: risk.probability,
    mitigation: risk.mitigation,
  };
}

/**
 * 타임라인을 docx TimelineItem 형식으로 변환
 *
 * @param sprint - 스프린트 계획
 * @returns TimelineItem
 */
export function convertSprintToTimeline(sprint: SprintPlan): TimelineItem {
  return {
    phase: `Sprint ${sprint.number}`,
    description: sprint.goal,
    startDate: parseDate(sprint.startDate),
    endDate: parseDate(sprint.endDate),
    milestones: sprint.deliverables,
    completed: false,
  };
}

/**
 * 복수의 스프린트를 타임라인으로 변환
 *
 * @param sprints - 스프린트 배열
 * @returns TimelineItem 배열
 */
export function convertSprintsToTimeline(sprints: SprintPlan[]): TimelineItem[] {
  return sprints.map(convertSprintToTimeline);
}

/**
 * 팀 멤버 데이터 생성
 *
 * @param resources - 리소스 할당 정보
 * @returns TeamMember 배열
 */
export function convertResourcesToTeam(
  resources: GeneratedProjectPlan['resources']
): TeamMember[] {
  return resources.map((r) => ({
    name: r.role,
    role: r.role,
    responsibilities: r.primaryCategories,
  }));
}

// ============================================================================
// 통합 변환 함수
// ============================================================================

/**
 * AI 생성 결과를 지정된 형식으로 변환
 *
 * @param type - 문서 유형
 * @param format - 출력 형식
 * @param data - AI 생성 결과
 * @returns 변환된 데이터
 *
 * @example
 * ```typescript
 * // RFP -> docx
 * const docxData = convertAIResult('rfp', 'docx', rfpResult);
 *
 * // Project Plan -> xlsx
 * const xlsxData = convertAIResult('project-plan', 'xlsx', planResult);
 * ```
 */
export function convertAIResult(
  type: DocumentType,
  format: OutputFormat,
  data: RFPGenerateResult | ProjectPlanResult
): ConversionResult<TemplateData | SheetConfig[]> {
  switch (type) {
    case 'rfp': {
      if (format === 'docx') {
        return convertRFPToDocxTemplate(data as RFPGenerateResult);
      }
      // xlsx 변환은 추가 구현 필요
      return {
        success: false,
        error: 'RFP -> xlsx 변환은 아직 지원되지 않습니다.',
      };
    }

    case 'project-plan': {
      const planResult = data as ProjectPlanResult;
      if (!planResult.success || !planResult.plan) {
        return {
          success: false,
          error: planResult.error || '프로젝트 계획 데이터가 없습니다.',
        };
      }

      if (format === 'xlsx') {
        return {
          success: true,
          data: convertProjectPlanToSheets(planResult.plan),
        };
      }

      if (format === 'docx') {
        // Project Plan -> TemplateData 변환
        const templateData: TemplateData = {
          projectName: planResult.plan.projectName,
          clientName: '자체 프로젝트',
          startDate: parseDate(planResult.plan.sprints[0]?.startDate || new Date()),
          endDate: parseDate(
            planResult.plan.sprints[planResult.plan.sprints.length - 1]?.endDate || new Date()
          ),
          background: planResult.plan.summary,
          timeline: convertSprintsToTimeline(planResult.plan.sprints),
          risks: planResult.plan.risks?.map(convertToDocxRisk),
          team: convertResourcesToTeam(planResult.plan.resources),
          objectives: planResult.plan.successMetrics?.map((m) => `${m.name}: ${m.target}`),
        };

        return {
          success: true,
          data: templateData,
        };
      }

      return {
        success: false,
        error: `${format} 형식은 지원되지 않습니다.`,
      };
    }

    default:
      return {
        success: false,
        error: `${type} 유형은 지원되지 않습니다.`,
      };
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  convertRFPToDocxTemplate,
  convertRFPSectionsToDocxTemplate,
  convertProjectPlanToSheets,
  convertAIResult,
  extractJsonFromResponse,
  parseDate,
  parseMarketAnalysisResponse,
};
