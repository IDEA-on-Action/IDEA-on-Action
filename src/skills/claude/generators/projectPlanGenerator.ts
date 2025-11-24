/**
 * 프로젝트 계획 자동 생성기
 *
 * Minu Build 서비스를 위한 Claude AI 기반 프로젝트 계획 생성
 * - 프로젝트 요구사항 -> 스프린트 분해
 * - 마일스톤 제안
 * - 리소스 할당 추천
 *
 * @module skills/claude/generators/projectPlanGenerator
 */

import { claudeClient, ClaudeClient } from '@/lib/claude';
import type { ClaudeMessage } from '@/lib/claude';
import type {
  ProjectReportData,
  TaskData,
  BurndownData,
  ResourceData,
} from '@/skills/xlsx/generators/projectReport';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 프로젝트 계획 생성 입력
 */
export interface ProjectPlanInput {
  /** 프로젝트명 */
  projectName: string;
  /** 프로젝트 설명 */
  description: string;
  /** 주요 기능/목표 */
  features: string[];
  /** 시작일 */
  startDate: Date;
  /** 종료일 (선택) */
  endDate?: Date;
  /** 팀 규모 */
  teamSize: number;
  /** 팀 구성 (역할별) */
  teamRoles?: TeamRole[];
  /** 스프린트 기간 (일, 기본: 14) */
  sprintDuration?: number;
  /** 개발 방법론 */
  methodology?: 'agile' | 'waterfall' | 'hybrid';
  /** 기술 스택 (선택) */
  techStack?: string[];
  /** 추가 제약사항 */
  constraints?: string[];
}

/**
 * 팀 역할
 */
export interface TeamRole {
  /** 역할명 */
  role: string;
  /** 인원 수 */
  count: number;
  /** 주당 가용 시간 */
  hoursPerWeek?: number;
}

/**
 * 프로젝트 계획 생성 옵션
 */
export interface ProjectPlanOptions {
  /** 사용할 모델 */
  model?: string;
  /** 최대 토큰 수 */
  maxTokens?: number;
  /** 온도 */
  temperature?: number;
  /** 진행률 콜백 */
  onProgress?: (progress: number, stage: PlanGenerationStage) => void;
  /** 취소 시그널 */
  signal?: AbortSignal;
}

/**
 * 계획 생성 단계
 */
export type PlanGenerationStage =
  | 'analyzing'    // 요구사항 분석 중
  | 'sprints'      // 스프린트 분해 중
  | 'milestones'   // 마일스톤 생성 중
  | 'resources'    // 리소스 할당 중
  | 'complete';    // 완료

/**
 * 프로젝트 계획 생성 결과
 */
export interface ProjectPlanResult {
  /** 성공 여부 */
  success: boolean;
  /** 생성된 계획 데이터 */
  plan?: GeneratedProjectPlan;
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
 * 생성된 프로젝트 계획
 */
export interface GeneratedProjectPlan {
  /** 프로젝트명 */
  projectName: string;
  /** 프로젝트 개요 */
  summary: string;
  /** 총 예상 기간 (일) */
  totalDuration: number;
  /** 스프린트 목록 */
  sprints: SprintPlan[];
  /** 마일스톤 목록 */
  milestones: Milestone[];
  /** 리소스 할당 */
  resources: ResourceAllocation[];
  /** 위험 요소 */
  risks: ProjectRisk[];
  /** 성공 지표 */
  successMetrics: SuccessMetric[];
  /** 추천 사항 */
  recommendations: string[];
}

/**
 * 스프린트 계획
 */
export interface SprintPlan {
  /** 스프린트 번호 */
  number: number;
  /** 스프린트 목표 */
  goal: string;
  /** 시작일 */
  startDate: string;
  /** 종료일 */
  endDate: string;
  /** 작업 목록 */
  tasks: PlannedTask[];
  /** 총 예상 스토리 포인트 */
  storyPoints: number;
  /** 산출물 */
  deliverables: string[];
}

/**
 * 계획된 작업
 */
export interface PlannedTask {
  /** 작업 ID */
  id: string;
  /** 작업 제목 */
  title: string;
  /** 작업 설명 */
  description: string;
  /** 스토리 포인트 */
  storyPoints: number;
  /** 예상 시간 (시간) */
  estimatedHours: number;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 담당 역할 */
  assignedRole: string;
  /** 의존성 (다른 작업 ID) */
  dependencies?: string[];
  /** 카테고리 */
  category: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test' | 'infra';
}

/**
 * 마일스톤
 */
export interface Milestone {
  /** 마일스톤 ID */
  id: string;
  /** 마일스톤명 */
  name: string;
  /** 설명 */
  description: string;
  /** 예정일 */
  dueDate: string;
  /** 관련 스프린트 */
  relatedSprints: number[];
  /** 성공 기준 */
  successCriteria: string[];
  /** 완료 여부 */
  completed: boolean;
}

/**
 * 리소스 할당
 */
export interface ResourceAllocation {
  /** 역할명 */
  role: string;
  /** 할당된 인원 */
  assignedCount: number;
  /** 스프린트별 할당률 (%) */
  allocationBySprin: number[];
  /** 주요 담당 작업 카테고리 */
  primaryCategories: string[];
  /** 백업 역할 */
  backupRole?: string;
}

/**
 * 프로젝트 위험
 */
export interface ProjectRisk {
  /** 위험 ID */
  id: string;
  /** 위험명 */
  name: string;
  /** 설명 */
  description: string;
  /** 영향도 */
  impact: 'low' | 'medium' | 'high' | 'critical';
  /** 발생 확률 */
  probability: 'low' | 'medium' | 'high';
  /** 대응 전략 */
  mitigation: string;
  /** 담당자 역할 */
  owner: string;
}

/**
 * 성공 지표
 */
export interface SuccessMetric {
  /** 지표명 */
  name: string;
  /** 설명 */
  description: string;
  /** 목표 값 */
  target: string;
  /** 측정 방법 */
  measurementMethod: string;
  /** 관련 마일스톤 */
  relatedMilestone?: string;
}

// ============================================================================
// 프롬프트 템플릿
// ============================================================================

/**
 * 프로젝트 계획 시스템 프롬프트
 */
const PROJECT_PLAN_SYSTEM_PROMPT = `당신은 전문 프로젝트 매니저이자 애자일 코치입니다.
주어진 프로젝트 요구사항을 분석하여 실현 가능한 프로젝트 계획을 수립합니다.

핵심 원칙:
1. 현실적인 일정 산정 (버퍼 포함)
2. 팀 역량과 가용성 고려
3. 의존성 관계 최소화
4. 점진적 가치 전달 (MVP 우선)
5. 리스크 조기 식별 및 대응

스프린트 계획 원칙:
- 첫 스프린트는 인프라/기반 작업 포함
- 각 스프린트는 배포 가능한 결과물 포함
- 마지막 스프린트에 안정화/테스트 버퍼 확보
- 스토리 포인트는 팀 역량 기반 산정

리소스 할당 원칙:
- 개발자당 주 32-36시간 유효 작업 시간
- 회의/리뷰/문서화 시간 20% 반영
- 크로스 펑셔널 팀 구성 권장

출력 형식: JSON`;

/**
 * 방법론별 컨텍스트
 */
const METHODOLOGY_CONTEXT: Record<'agile' | 'waterfall' | 'hybrid', string> = {
  agile: `
애자일/스크럼 방법론 적용:
- 2주 스프린트 기본
- 데일리 스탠드업, 스프린트 리뷰/회고
- 백로그 우선순위 동적 조정
- 지속적 통합/배포 (CI/CD)`,

  waterfall: `
워터폴 방법론 적용:
- 단계별 순차 진행
- 각 단계 완료 후 다음 단계 시작
- 명확한 마일스톤과 게이트 검토
- 상세 문서화 필수`,

  hybrid: `
하이브리드 방법론 적용:
- 큰 단계는 워터폴, 세부 실행은 애자일
- 핵심 마일스톤 고정, 내부 유연성 확보
- 단계별 검토와 반복 개선 병행`,
};

/**
 * 프로젝트 계획 프롬프트 생성
 */
function buildProjectPlanPrompt(input: ProjectPlanInput): string {
  const methodologyContext = METHODOLOGY_CONTEXT[input.methodology || 'agile'];
  const sprintDuration = input.sprintDuration || 14;

  const teamRolesStr = input.teamRoles
    ? input.teamRoles.map((r) => `  - ${r.role}: ${r.count}명 (주 ${r.hoursPerWeek || 40}시간)`).join('\n')
    : `  - 팀 규모: ${input.teamSize}명`;

  return `다음 프로젝트에 대한 상세 프로젝트 계획을 수립해주세요.

## 프로젝트 정보
- 프로젝트명: ${input.projectName}
- 설명: ${input.description}
- 시작일: ${input.startDate.toISOString().split('T')[0]}
${input.endDate ? `- 종료일: ${input.endDate.toISOString().split('T')[0]}` : '- 종료일: 미정 (적정 기간 산정 필요)'}
- 스프린트 기간: ${sprintDuration}일

## 주요 기능/목표
${input.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 팀 구성
${teamRolesStr}

${input.techStack ? `## 기술 스택\n${input.techStack.join(', ')}` : ''}

${input.constraints ? `## 제약사항\n${input.constraints.map((c) => `- ${c}`).join('\n')}` : ''}

${methodologyContext}

## 요청 출력 형식

다음 JSON 형식으로 프로젝트 계획을 작성해주세요:

\`\`\`json
{
  "projectName": "프로젝트명",
  "summary": "프로젝트 개요 (2-3문장)",
  "totalDuration": 총일수,
  "sprints": [
    {
      "number": 1,
      "goal": "스프린트 목표",
      "startDate": "2025-01-01",
      "endDate": "2025-01-14",
      "tasks": [
        {
          "id": "TASK-001",
          "title": "작업 제목",
          "description": "작업 설명",
          "storyPoints": 3,
          "estimatedHours": 8,
          "priority": "high",
          "assignedRole": "Frontend Developer",
          "dependencies": [],
          "category": "feature"
        }
      ],
      "storyPoints": 20,
      "deliverables": ["산출물1", "산출물2"]
    }
  ],
  "milestones": [
    {
      "id": "M1",
      "name": "마일스톤명",
      "description": "설명",
      "dueDate": "2025-01-31",
      "relatedSprints": [1, 2],
      "successCriteria": ["기준1", "기준2"],
      "completed": false
    }
  ],
  "resources": [
    {
      "role": "역할명",
      "assignedCount": 2,
      "allocationBySprin": [100, 100, 80],
      "primaryCategories": ["feature", "bugfix"],
      "backupRole": "백업역할"
    }
  ],
  "risks": [
    {
      "id": "R1",
      "name": "위험명",
      "description": "설명",
      "impact": "high",
      "probability": "medium",
      "mitigation": "대응방안",
      "owner": "PM"
    }
  ],
  "successMetrics": [
    {
      "name": "지표명",
      "description": "설명",
      "target": "목표값",
      "measurementMethod": "측정방법",
      "relatedMilestone": "M1"
    }
  ],
  "recommendations": ["추천사항1", "추천사항2"]
}
\`\`\`

주요 기능을 분석하여 적절한 스프린트로 분해하고, 현실적인 일정과 리소스 할당을 제안해주세요.`;
}

// ============================================================================
// 프로젝트 계획 생성 함수
// ============================================================================

/**
 * Claude를 사용하여 프로젝트 계획 생성
 *
 * @param input - 프로젝트 계획 입력
 * @param options - 생성 옵션
 * @returns 프로젝트 계획 결과
 *
 * @example
 * ```typescript
 * const result = await generateProjectPlan({
 *   projectName: 'Minu Build MVP',
 *   description: '프로젝트 관리 SaaS 서비스',
 *   features: [
 *     '프로젝트 생성 및 관리',
 *     '스프린트 보드',
 *     '팀 협업 기능',
 *     '리포트 대시보드',
 *   ],
 *   startDate: new Date('2025-01-01'),
 *   teamSize: 5,
 *   teamRoles: [
 *     { role: 'Frontend Developer', count: 2 },
 *     { role: 'Backend Developer', count: 2 },
 *     { role: 'PM', count: 1 },
 *   ],
 *   methodology: 'agile',
 * });
 *
 * if (result.success) {
 *   console.log(`총 ${result.plan.sprints.length}개 스프린트`);
 * }
 * ```
 */
export async function generateProjectPlan(
  input: ProjectPlanInput,
  options: ProjectPlanOptions = {}
): Promise<ProjectPlanResult> {
  const {
    model,
    maxTokens = 8192,
    temperature = 0.5,
    onProgress,
    signal,
  } = options;

  try {
    // 진행률 알림: 분석 시작
    onProgress?.(10, 'analyzing');

    // 메시지 구성
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: buildProjectPlanPrompt(input),
      },
    ];

    // Claude API 호출
    const response = await claudeClient.generate({
      messages,
      model,
      maxTokens,
      temperature,
      systemPrompt: PROJECT_PLAN_SYSTEM_PROMPT,
      signal,
    });

    // 진행률 알림: 스프린트 분해
    onProgress?.(50, 'sprints');

    // 응답 텍스트 추출
    const rawResponse = ClaudeClient.extractText(response);

    // JSON 파싱
    const jsonMatch = rawResponse.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      try {
        const parsed = JSON.parse(rawResponse);
        onProgress?.(100, 'complete');
        return {
          success: true,
          plan: parsed as GeneratedProjectPlan,
          rawResponse,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      } catch {
        return {
          success: false,
          error: 'Claude 응답에서 유효한 JSON을 찾을 수 없습니다.',
          rawResponse,
        };
      }
    }

    // 진행률 알림: 마일스톤/리소스
    onProgress?.(80, 'resources');

    const parsed = JSON.parse(jsonMatch[1]) as GeneratedProjectPlan;

    // 진행률 알림: 완료
    onProgress?.(100, 'complete');

    return {
      success: true,
      plan: parsed,
      rawResponse,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 프로젝트 계획을 ProjectReportData 형식으로 변환
 *
 * xlsx 생성기와 연동하기 위한 변환 함수
 *
 * @param plan - 생성된 프로젝트 계획
 * @param sprintNumber - 변환할 스프린트 번호 (기본: 1)
 * @returns ProjectReportData 형식 데이터
 */
export function convertToProjectReportData(
  plan: GeneratedProjectPlan,
  sprintNumber: number = 1
): ProjectReportData {
  const sprint = plan.sprints.find((s) => s.number === sprintNumber) || plan.sprints[0];

  if (!sprint) {
    throw new Error(`스프린트 ${sprintNumber}를 찾을 수 없습니다.`);
  }

  // 작업 데이터 변환
  const tasks: TaskData[] = sprint.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: 'pending' as const,
    assignee: task.assignedRole,
    estimatedHours: task.estimatedHours,
    actualHours: 0,
  }));

  // 번다운 데이터 생성 (이상적 진행)
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalPoints = sprint.storyPoints;

  const burndown: BurndownData[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const ideal = Math.round(totalPoints * (1 - i / totalDays));
    burndown.push({
      date: date.toISOString().split('T')[0],
      remaining: ideal, // 초기에는 이상적 값과 동일
      ideal,
    });
  }

  // 리소스 데이터 변환
  const resources: ResourceData[] = plan.resources.map((r) => ({
    name: r.role,
    taskCount: tasks.filter((t) => t.assignee === r.role).length,
    completedCount: 0,
    productivity: 0,
  }));

  return {
    projectName: plan.projectName,
    sprintNumber: sprint.number,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    tasks,
    burndown,
    resources,
  };
}

/**
 * 프로젝트 계획 입력 유효성 검사
 */
export function validateProjectPlanInput(
  input: Partial<ProjectPlanInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.projectName?.trim()) {
    errors.push('프로젝트명은 필수입니다.');
  }

  if (!input.description?.trim()) {
    errors.push('프로젝트 설명은 필수입니다.');
  }

  if (!input.features || input.features.length === 0) {
    errors.push('최소 1개 이상의 기능/목표가 필요합니다.');
  }

  if (!input.startDate) {
    errors.push('시작일은 필수입니다.');
  }

  if (!input.teamSize || input.teamSize < 1) {
    errors.push('팀 규모는 1명 이상이어야 합니다.');
  }

  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    errors.push('종료일은 시작일 이후여야 합니다.');
  }

  if (input.sprintDuration && (input.sprintDuration < 7 || input.sprintDuration > 28)) {
    errors.push('스프린트 기간은 7~28일 사이여야 합니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 총 예상 시간 계산
 */
export function calculateTotalEstimatedHours(plan: GeneratedProjectPlan): number {
  return plan.sprints.reduce((total, sprint) => {
    return total + sprint.tasks.reduce((sprintTotal, task) => sprintTotal + task.estimatedHours, 0);
  }, 0);
}

/**
 * 총 스토리 포인트 계산
 */
export function calculateTotalStoryPoints(plan: GeneratedProjectPlan): number {
  return plan.sprints.reduce((total, sprint) => total + sprint.storyPoints, 0);
}

// ============================================================================
// Export
// ============================================================================

export default generateProjectPlan;
