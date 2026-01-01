/**
 * RFP 자동 생성기
 *
 * Minu Find 서비스를 위한 Claude AI 기반 RFP 자동 생성
 * - 사용자 입력 -> Claude API -> 구조화된 RFP 출력
 * - 섹션별 생성 (개요, 요구사항, 평가기준, 일정)
 * - 기존 docx 생성기와 연동 가능한 형식
 *
 * @module skills/claude/generators/rfpGenerator
 */

import { claudeClient, ClaudeClient } from '@/lib/claude';
import type { ClaudeMessage } from '@/lib/claude';
import type {
  TemplateData,
  RFPCategory,
  TimelineItem,
  Deliverable,
  BudgetItem,
  RiskItem,
  TeamMember,
} from '@/types/documents/docx.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RFP 생성 입력
 */
export interface RFPGenerateInput {
  /** 프로젝트명 */
  projectName: string;
  /** 고객/발주사명 */
  clientName: string;
  /** 프로젝트 배경/목적 */
  background: string;
  /** 주요 요구사항 (자연어) */
  requirements: string;
  /** 예상 예산 (선택) */
  budget?: number;
  /** 희망 시작일 */
  startDate?: Date;
  /** 희망 종료일 */
  endDate?: Date;
  /** RFP 카테고리 */
  category?: RFPCategory;
  /** 추가 컨텍스트 */
  additionalContext?: string;
}

/**
 * RFP 생성 옵션
 */
export interface RFPGenerateOptions {
  /** 사용할 모델 (기본: claude-sonnet-4-20250514) */
  model?: string;
  /** 최대 토큰 수 */
  maxTokens?: number;
  /** 온도 (0~1, 기본: 0.5) */
  temperature?: number;
  /** 스트리밍 콜백 */
  onChunk?: (chunk: string) => void;
  /** 진행률 콜백 */
  onProgress?: (progress: number, stage: RFPGenerationStage) => void;
  /** 취소 시그널 */
  signal?: AbortSignal;
}

/**
 * RFP 생성 단계
 */
export type RFPGenerationStage =
  | 'overview'      // 개요 생성
  | 'requirements'  // 요구사항 생성
  | 'evaluation'    // 평가기준 생성
  | 'timeline'      // 일정 생성
  | 'complete';     // 완료

/**
 * RFP 생성 결과
 */
export interface RFPGenerateResult {
  /** 성공 여부 */
  success: boolean;
  /** 생성된 RFP 데이터 (TemplateData 형식) */
  data?: TemplateData;
  /** 원본 Claude 응답 */
  rawResponse?: string;
  /** 에러 메시지 */
  error?: string;
  /** 토큰 사용량 */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * RFP 섹션별 생성 결과
 */
export interface RFPSectionResult {
  /** 프로젝트 개요 */
  overview: {
    projectName: string;
    clientName: string;
    background: string;
    objectives: string[];
  };
  /** 요구사항 */
  requirements: {
    scope: string[];
    functionalRequirements: string[];
    nonFunctionalRequirements: string[];
    deliverables: Deliverable[];
  };
  /** 평가기준 */
  evaluation: {
    criteria: EvaluationCriterion[];
    weightings: Record<string, number>;
  };
  /** 일정 */
  timeline: {
    phases: TimelineItem[];
    milestones: string[];
  };
  /** 예산 */
  budget?: {
    total: number;
    items: BudgetItem[];
  };
  /** 리스크 */
  risks?: RiskItem[];
  /** 팀 구성 */
  team?: TeamMember[];
}

/**
 * 평가 기준
 */
export interface EvaluationCriterion {
  /** 기준명 */
  name: string;
  /** 설명 */
  description: string;
  /** 가중치 (%) */
  weight: number;
  /** 세부 항목 */
  subCriteria?: string[];
}

// ============================================================================
// 프롬프트 템플릿
// ============================================================================

/**
 * RFP 생성 시스템 프롬프트
 */
const RFP_SYSTEM_PROMPT = `당신은 전문 RFP(제안요청서) 작성 전문가입니다.
주어진 정보를 바탕으로 체계적이고 전문적인 RFP를 작성합니다.

작성 원칙:
1. 명확하고 구체적인 요구사항 정의
2. 측정 가능한 성과 지표 포함
3. 현실적인 일정과 예산 제안
4. 리스크 요인과 대응 방안 포함
5. 업계 표준과 모범 사례 반영

출력 형식: JSON
각 섹션은 구조화된 데이터로 반환합니다.`;

/**
 * 카테고리별 프롬프트 보조 정보
 */
const CATEGORY_CONTEXT: Record<RFPCategory, string> = {
  government: `
정부/공공기관 RFP 특성:
- 조달청 표준 양식 준수
- 기술점수, 가격점수 명확히 구분
- 보안 요구사항 강조
- 유지보수 및 하자보수 조건 상세화
- 관련 법규 및 인증 요건 포함`,

  startup: `
스타트업 RFP 특성:
- 민첩한 개발 방법론 (애자일/스크럼)
- MVP 중심 단계별 접근
- 유연한 요구사항 변경 허용
- 빠른 프로토타이핑 중시
- 비용 효율성 강조`,

  enterprise: `
대기업 RFP 특성:
- 엄격한 보안 및 컴플라이언스
- 기존 시스템과의 통합 고려
- 확장성 및 성능 요구사항
- 체계적인 문서화 요구
- SLA 및 운영 지원 조건`,
};

/**
 * RFP 생성 사용자 프롬프트 템플릿
 */
function buildRFPPrompt(input: RFPGenerateInput): string {
  const categoryContext = input.category ? CATEGORY_CONTEXT[input.category] : '';

  return `다음 정보를 바탕으로 전문 RFP를 작성해주세요.

## 프로젝트 정보
- 프로젝트명: ${input.projectName}
- 발주사: ${input.clientName}
- 배경/목적: ${input.background}
- 주요 요구사항: ${input.requirements}
${input.budget ? `- 예상 예산: ${input.budget.toLocaleString()}원` : ''}
${input.startDate ? `- 희망 시작일: ${input.startDate.toISOString().split('T')[0]}` : ''}
${input.endDate ? `- 희망 종료일: ${input.endDate.toISOString().split('T')[0]}` : ''}
${input.additionalContext ? `- 추가 정보: ${input.additionalContext}` : ''}

${categoryContext}

## 요청 출력 형식

다음 JSON 형식으로 RFP를 작성해주세요:

\`\`\`json
{
  "overview": {
    "projectName": "프로젝트명",
    "clientName": "발주사명",
    "background": "프로젝트 배경 및 목적 (2-3문단)",
    "objectives": ["목표1", "목표2", "목표3"]
  },
  "requirements": {
    "scope": ["범위1", "범위2"],
    "functionalRequirements": ["기능요구사항1", "기능요구사항2"],
    "nonFunctionalRequirements": ["비기능요구사항1", "비기능요구사항2"],
    "deliverables": [
      {"id": "D001", "name": "산출물1", "description": "설명"}
    ]
  },
  "evaluation": {
    "criteria": [
      {"name": "기준명", "description": "설명", "weight": 30, "subCriteria": ["세부1", "세부2"]}
    ]
  },
  "timeline": {
    "phases": [
      {"phase": "단계명", "description": "설명", "startDate": "2025-01-01", "endDate": "2025-02-01", "milestones": ["마일스톤1"]}
    ],
    "milestones": ["주요 마일스톤1", "주요 마일스톤2"]
  },
  "budget": {
    "total": 예산금액,
    "items": [
      {"name": "항목명", "amount": 금액, "note": "비고"}
    ]
  },
  "risks": [
    {"name": "리스크명", "description": "설명", "severity": "high", "probability": "medium", "mitigation": "대응방안"}
  ]
}
\`\`\`

요구사항을 분석하여 적절한 세부 항목을 생성하고, 현실적인 일정과 예산을 제안해주세요.`;
}

// ============================================================================
// RFP 생성 함수
// ============================================================================

/**
 * Claude를 사용하여 RFP 생성
 *
 * @param input - RFP 생성 입력
 * @param options - 생성 옵션
 * @returns RFP 생성 결과
 *
 * @example
 * ```typescript
 * const result = await generateRFP({
 *   projectName: '차세대 ERP 시스템 구축',
 *   clientName: '(주)테크스타트',
 *   background: '기존 레거시 시스템의 노후화로 인해 신규 ERP 도입 필요',
 *   requirements: '재고관리, 회계, 인사관리 모듈 필요. 클라우드 기반 선호',
 *   budget: 500000000,
 *   category: 'enterprise',
 * });
 *
 * if (result.success) {
 *   // result.data를 docx 생성기에 전달
 *   const docx = await generateDocx({ template: 'rfp', data: result.data });
 * }
 * ```
 */
export async function generateRFP(
  input: RFPGenerateInput,
  options: RFPGenerateOptions = {}
): Promise<RFPGenerateResult> {
  const {
    model,
    maxTokens = 4096,
    temperature = 0.5,
    onProgress,
    signal,
  } = options;

  try {
    // 진행률 알림: 시작
    onProgress?.(10, 'overview');

    // 메시지 구성
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: buildRFPPrompt(input),
      },
    ];

    // Claude API 호출
    const response = await claudeClient.generate({
      messages,
      model,
      maxTokens,
      temperature,
      systemPrompt: RFP_SYSTEM_PROMPT,
      signal,
    });

    // 진행률 알림: 응답 수신
    onProgress?.(60, 'requirements');

    // 응답 텍스트 추출
    const rawResponse = ClaudeClient.extractText(response);

    // JSON 파싱
    const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      // JSON 블록이 없으면 전체 응답을 파싱 시도
      try {
        const parsed = JSON.parse(rawResponse);
        return processRFPResponse(parsed, input, rawResponse, response.usage);
      } catch {
        return {
          success: false,
          error: 'Claude 응답에서 유효한 JSON을 찾을 수 없습니다.',
          rawResponse,
        };
      }
    }

    // 진행률 알림: 파싱 중
    onProgress?.(80, 'timeline');

    const parsed = JSON.parse(jsonMatch[1]) as RFPSectionResult;

    // 진행률 알림: 완료
    onProgress?.(100, 'complete');

    return processRFPResponse(parsed, input, rawResponse, response.usage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Claude 응답을 TemplateData 형식으로 변환
 */
function processRFPResponse(
  parsed: RFPSectionResult,
  input: RFPGenerateInput,
  rawResponse: string,
  usage?: { input_tokens: number; output_tokens: number }
): RFPGenerateResult {
  try {
    // TemplateData 형식으로 변환
    const templateData: TemplateData = {
      projectName: parsed.overview?.projectName || input.projectName,
      clientName: parsed.overview?.clientName || input.clientName,
      startDate: input.startDate || new Date(),
      endDate: input.endDate,
      budget: parsed.budget?.total || input.budget,
      budgetItems: parsed.budget?.items,
      scope: parsed.requirements?.scope,
      deliverables: parsed.requirements?.deliverables?.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
      })),
      requirements: [
        ...(parsed.requirements?.functionalRequirements || []),
        ...(parsed.requirements?.nonFunctionalRequirements || []),
      ],
      timeline: parsed.timeline?.phases?.map((phase) => ({
        phase: phase.phase,
        description: phase.description,
        startDate: new Date(phase.startDate),
        endDate: new Date(phase.endDate),
        milestones: phase.milestones,
      })),
      background: parsed.overview?.background,
      objectives: parsed.overview?.objectives,
      risks: parsed.risks?.map((risk) => ({
        name: risk.name,
        description: risk.description,
        severity: risk.severity as 'low' | 'medium' | 'high' | 'critical',
        probability: risk.probability as 'low' | 'medium' | 'high',
        mitigation: risk.mitigation,
      })),
      customFields: {
        evaluationCriteria: parsed.evaluation?.criteria,
        milestones: parsed.timeline?.milestones,
      },
    };

    return {
      success: true,
      data: templateData,
      rawResponse,
      usage: usage
        ? {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `RFP 데이터 변환 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      rawResponse,
    };
  }
}

/**
 * RFP 섹션별 스트리밍 생성
 *
 * 대용량 RFP를 섹션별로 나누어 스트리밍 생성합니다.
 *
 * @param input - RFP 생성 입력
 * @param options - 생성 옵션
 * @returns AsyncGenerator로 섹션별 결과 반환
 *
 * @example
 * ```typescript
 * for await (const section of generateRFPStream(input)) {
 *   console.log(`${section.stage} 완료:`, section.data);
 * }
 * ```
 */
export async function* generateRFPStream(
  input: RFPGenerateInput,
  options: RFPGenerateOptions = {}
): AsyncGenerator<{
  stage: RFPGenerationStage;
  data: Partial<RFPSectionResult>;
  progress: number;
}> {
  // 이 함수는 향후 섹션별 스트리밍 생성을 위한 확장 포인트입니다.
  // 현재는 전체 생성 후 단계별로 yield합니다.

  const result = await generateRFP(input, options);

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || 'RFP 생성 실패');
  }

  // JSON 파싱
  const jsonMatch = result.rawResponse.match(/```json\n?([\s\S]*?)\n?```/);
  if (!jsonMatch) {
    throw new Error('유효한 JSON을 찾을 수 없습니다.');
  }

  const parsed = JSON.parse(jsonMatch[1]) as RFPSectionResult;

  // 단계별 yield
  yield {
    stage: 'overview',
    data: { overview: parsed.overview },
    progress: 25,
  };

  yield {
    stage: 'requirements',
    data: { requirements: parsed.requirements },
    progress: 50,
  };

  yield {
    stage: 'evaluation',
    data: { evaluation: parsed.evaluation },
    progress: 75,
  };

  yield {
    stage: 'timeline',
    data: { timeline: parsed.timeline, budget: parsed.budget, risks: parsed.risks },
    progress: 100,
  };

  yield {
    stage: 'complete',
    data: parsed,
    progress: 100,
  };
}

/**
 * RFP 입력 유효성 검사
 *
 * @param input - RFP 생성 입력
 * @returns 유효성 검사 결과
 */
export function validateRFPInput(
  input: Partial<RFPGenerateInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.projectName?.trim()) {
    errors.push('프로젝트명은 필수입니다.');
  }

  if (!input.clientName?.trim()) {
    errors.push('고객/발주사명은 필수입니다.');
  }

  if (!input.background?.trim()) {
    errors.push('프로젝트 배경/목적은 필수입니다.');
  }

  if (!input.requirements?.trim()) {
    errors.push('주요 요구사항은 필수입니다.');
  }

  if (input.budget !== undefined && input.budget < 0) {
    errors.push('예산은 0 이상이어야 합니다.');
  }

  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    errors.push('종료일은 시작일 이후여야 합니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export
// ============================================================================

export default generateRFP;
