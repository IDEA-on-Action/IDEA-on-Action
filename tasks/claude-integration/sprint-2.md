# Sprint 2: Minu Skills 통합

> Claude AI를 활용한 Minu 서비스별 AI 보조 기능 구현

**시작일**: 2025-11-24
**예상 소요**: 10시간 (1.5일)
**관련 명세**: [spec/claude-integration/requirements.md](../../spec/claude-integration/requirements.md)
**관련 설계**: [plan/claude-integration/architecture.md](../../plan/claude-integration/architecture.md)
**선행 조건**: Sprint 1 완료

---

## 목표

1. Minu Find - RFP 자동 생성 기능
2. Minu Frame - 요구사항 작성 보조 기능
3. Minu Build - 프로젝트 계획 생성 기능
4. Minu Keep - 운영 보고서 초안 작성 기능
5. AI 생성 결과 → docx/xlsx 연동
6. AIAssistButton UI 컴포넌트
7. 토큰 사용량 추적 대시보드
8. E2E 테스트 12개

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-AI-009  │  │ TASK-AI-010  │  │ TASK-AI-014  │       │
│  │ Minu Find    │  │ Minu Frame   │  │ UI Component │       │
│  │ RFP 생성     │  │ 요구사항     │  │ AIAssistBtn  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-AI-011  │  │ TASK-AI-012  │  │ TASK-AI-015  │       │
│  │ Minu Build   │  │ Minu Keep    │  │ 토큰 추적    │       │
│  │ 계획 생성    │  │ 운영 보고서  │  │ 대시보드     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (4h)                            │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Agent 1      │  │ Agent 2      │                         │
│  │ TASK-AI-013  │  │ TASK-AI-016  │                         │
│  │ docx/xlsx    │  │ E2E 테스트   │                         │
│  │ 연동         │  │ 12개         │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 작업 목록

### TASK-AI-009: Minu Find - RFP 자동 생성

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: Sprint 1 완료
**담당**: Agent 1 (Phase 1)

**작업 내용**:

```typescript
// src/skills/minu-find/useRFPGenerator.ts

import { useCallback, useState } from 'react';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import type {
  RFPGenerationRequest,
  ClaudeError,
} from '@/types/claude.types';

interface RFPSection {
  title: string;
  content: string;
}

interface GeneratedRFP {
  projectOverview: string;
  objectives: string[];
  scope: string;
  requirements: RFPSection[];
  timeline: string;
  budget: string;
  evaluationCriteria: RFPSection[];
  submissionGuidelines: string;
}

interface UseRFPGeneratorResult {
  generateRFP: (request: RFPGenerationRequest) => Promise<GeneratedRFP | null>;
  isGenerating: boolean;
  progress: number;
  error: ClaudeError | null;
  generatedRFP: GeneratedRFP | null;
}

const RFP_SYSTEM_PROMPT = `당신은 전문 RFP(제안요청서) 작성 전문가입니다.
주어진 프로젝트 정보를 바탕으로 체계적이고 전문적인 RFP 문서를 생성합니다.

RFP 작성 원칙:
1. 명확하고 구체적인 요구사항 정의
2. 측정 가능한 목표와 성과 지표 포함
3. 현실적인 일정과 예산 반영
4. 공정한 평가 기준 제시
5. 법적/규제적 요구사항 고려

출력 형식: JSON 구조로 반환
{
  "projectOverview": "프로젝트 개요",
  "objectives": ["목표1", "목표2"],
  "scope": "프로젝트 범위",
  "requirements": [
    {"title": "요구사항 제목", "content": "상세 내용"}
  ],
  "timeline": "일정",
  "budget": "예산",
  "evaluationCriteria": [
    {"title": "평가 항목", "content": "평가 기준"}
  ],
  "submissionGuidelines": "제출 안내"
}`;

export function useRFPGenerator(): UseRFPGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ClaudeError | null>(null);
  const [generatedRFP, setGeneratedRFP] = useState<GeneratedRFP | null>(null);

  const { sendMessage, messages } = useClaudeChat({
    systemPrompt: RFP_SYSTEM_PROMPT,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
  });

  const generateRFP = useCallback(async (
    request: RFPGenerationRequest
  ): Promise<GeneratedRFP | null> => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 프롬프트 구성 (10%)
      setProgress(10);
      const prompt = buildRFPPrompt(request);

      // 2. Claude API 호출 (50%)
      setProgress(30);
      await sendMessage(prompt);
      setProgress(50);

      // 3. 응답 파싱 (70%)
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      setProgress(70);
      const parsedRFP = parseRFPResponse(lastMessage.content);

      // 4. 검증 (90%)
      setProgress(90);
      validateRFP(parsedRFP);

      // 5. 완료 (100%)
      setProgress(100);
      setGeneratedRFP(parsedRFP);

      return parsedRFP;

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : 'RFP 생성 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sendMessage, messages]);

  return {
    generateRFP,
    isGenerating,
    progress,
    error,
    generatedRFP,
  };
}

function buildRFPPrompt(request: RFPGenerationRequest): string {
  const parts = [
    `# RFP 생성 요청`,
    ``,
    `## 프로젝트 정보`,
    `- **프로젝트명**: ${request.projectName}`,
    `- **설명**: ${request.projectDescription}`,
  ];

  if (request.targetIndustry) {
    parts.push(`- **대상 산업**: ${request.targetIndustry}`);
  }
  if (request.budget) {
    parts.push(`- **예산**: ${request.budget}`);
  }
  if (request.timeline) {
    parts.push(`- **일정**: ${request.timeline}`);
  }
  if (request.requirements?.length) {
    parts.push(``, `## 주요 요구사항`);
    request.requirements.forEach((req, i) => {
      parts.push(`${i + 1}. ${req}`);
    });
  }

  parts.push(
    ``,
    `위 정보를 바탕으로 전문적인 RFP 문서를 JSON 형식으로 생성해주세요.`
  );

  return parts.join('\n');
}

function parseRFPResponse(content: string): GeneratedRFP {
  // JSON 블록 추출
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('RFP 응답을 파싱할 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as GeneratedRFP;
}

function validateRFP(rfp: GeneratedRFP): void {
  if (!rfp.projectOverview) {
    throw new Error('프로젝트 개요가 누락되었습니다.');
  }
  if (!rfp.objectives?.length) {
    throw new Error('목표가 누락되었습니다.');
  }
  if (!rfp.requirements?.length) {
    throw new Error('요구사항이 누락되었습니다.');
  }
}
```

**완료 조건**:
- [ ] useRFPGenerator 훅 구현 완료
- [ ] RFP 시스템 프롬프트 최적화
- [ ] JSON 응답 파싱 정상 작동
- [ ] 입력 검증 로직 구현
- [ ] 진행률 표시 정상 작동
- [ ] 에러 핸들링 정상 작동

---

### TASK-AI-010: Minu Frame - 요구사항 작성 보조

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: Sprint 1 완료
**담당**: Agent 2 (Phase 1)

**작업 내용**:

```typescript
// src/skills/minu-frame/useRequirementsAssist.ts

import { useCallback, useState } from 'react';
import { useClaudeStreaming } from '@/hooks/useClaudeStreaming';
import type {
  RequirementsAssistRequest,
  ClaudeError,
  StreamingChunk,
} from '@/types/claude.types';

interface Requirement {
  id: string;
  category: 'functional' | 'non-functional' | 'constraint' | 'assumption';
  priority: 'must' | 'should' | 'could' | 'wont';
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

interface RequirementsSuggestion {
  requirements: Requirement[];
  gaps: string[];
  recommendations: string[];
}

interface UseRequirementsAssistResult {
  suggestRequirements: (request: RequirementsAssistRequest) => Promise<RequirementsSuggestion | null>;
  refineRequirement: (requirement: Requirement, feedback: string) => Promise<Requirement | null>;
  isProcessing: boolean;
  streamingText: string;
  error: ClaudeError | null;
}

const REQUIREMENTS_SYSTEM_PROMPT = `당신은 소프트웨어 요구사항 분석 전문가입니다.
MoSCoW 우선순위 체계와 SMART 기준을 적용하여 요구사항을 분석하고 개선합니다.

요구사항 작성 원칙:
1. 구체적(Specific): 모호함 없이 명확하게
2. 측정 가능(Measurable): 검증 가능한 기준 포함
3. 달성 가능(Achievable): 현실적인 범위
4. 관련성(Relevant): 비즈니스 목표와 연결
5. 시간 제한(Time-bound): 명확한 기한

카테고리:
- functional: 시스템이 수행해야 하는 기능
- non-functional: 성능, 보안, 확장성 등
- constraint: 기술적/비즈니스적 제약
- assumption: 전제 조건

우선순위 (MoSCoW):
- must: 필수 (없으면 프로젝트 실패)
- should: 중요 (있어야 하지만 대안 가능)
- could: 있으면 좋음
- wont: 이번에는 제외

출력 형식: JSON 구조로 반환`;

export function useRequirementsAssist(): UseRequirementsAssistResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ClaudeError | null>(null);

  const {
    sendMessage,
    currentStreamText,
    messages,
    isStreaming,
  } = useClaudeStreaming({
    systemPrompt: REQUIREMENTS_SYSTEM_PROMPT,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
  });

  const suggestRequirements = useCallback(async (
    request: RequirementsAssistRequest
  ): Promise<RequirementsSuggestion | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const prompt = buildSuggestionPrompt(request);
      await sendMessage(prompt);

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      return parseRequirementsSuggestion(lastMessage.content);

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : '요구사항 분석 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, messages]);

  const refineRequirement = useCallback(async (
    requirement: Requirement,
    feedback: string
  ): Promise<Requirement | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const prompt = `
다음 요구사항을 피드백을 반영하여 개선해주세요.

## 현재 요구사항
${JSON.stringify(requirement, null, 2)}

## 피드백
${feedback}

개선된 요구사항을 JSON 형식으로 반환해주세요.
      `.trim();

      await sendMessage(prompt);

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      return parseRefinedRequirement(lastMessage.content);

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : '요구사항 개선 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, messages]);

  return {
    suggestRequirements,
    refineRequirement,
    isProcessing: isProcessing || isStreaming,
    streamingText: currentStreamText,
    error,
  };
}

function buildSuggestionPrompt(request: RequirementsAssistRequest): string {
  const parts = [
    `# 요구사항 분석 및 제안 요청`,
    ``,
    `## 프로젝트 컨텍스트`,
    request.projectContext,
  ];

  if (request.currentRequirements?.length) {
    parts.push(``, `## 현재 정의된 요구사항`);
    request.currentRequirements.forEach((req, i) => {
      parts.push(`${i + 1}. ${req}`);
    });
  }

  if (request.targetAudience) {
    parts.push(``, `## 대상 사용자`, request.targetAudience);
  }

  parts.push(
    ``,
    `위 정보를 분석하여:`,
    `1. 누락된 요구사항 제안`,
    `2. 기존 요구사항의 개선점 제시`,
    `3. 우선순위 추천`,
    ``,
    `JSON 형식으로 응답해주세요:`,
    `{`,
    `  "requirements": [...],`,
    `  "gaps": ["누락된 부분"],`,
    `  "recommendations": ["개선 제안"]`,
    `}`
  );

  return parts.join('\n');
}

function parseRequirementsSuggestion(content: string): RequirementsSuggestion {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('요구사항 응답을 파싱할 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const parsed = JSON.parse(jsonStr);

  // ID가 없으면 생성
  parsed.requirements = parsed.requirements.map((req: Requirement, i: number) => ({
    ...req,
    id: req.id || `REQ-${Date.now()}-${i}`,
  }));

  return parsed as RequirementsSuggestion;
}

function parseRefinedRequirement(content: string): Requirement {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('개선된 요구사항을 파싱할 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as Requirement;
}
```

**완료 조건**:
- [ ] useRequirementsAssist 훅 구현 완료
- [ ] 요구사항 제안 기능 구현
- [ ] 요구사항 개선 기능 구현
- [ ] MoSCoW 우선순위 지원
- [ ] 스트리밍 응답 지원
- [ ] JSON 응답 파싱 정상 작동

---

### TASK-AI-011: Minu Build - 프로젝트 계획 생성

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: Sprint 1 완료
**담당**: Agent 1 (Phase 2)

**작업 내용**:

```typescript
// src/skills/minu-build/useProjectPlanGenerator.ts

import { useCallback, useState } from 'react';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import type {
  ProjectPlanRequest,
  ClaudeError,
} from '@/types/claude.types';

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goals: string[];
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  assignee?: string;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
}

interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  deliverables: string[];
  criteria: string[];
}

interface Risk {
  id: string;
  description: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

interface GeneratedProjectPlan {
  projectName: string;
  summary: string;
  sprints: Sprint[];
  milestones: Milestone[];
  risks: Risk[];
  resourceAllocation: Record<string, string[]>;
  totalEstimatedHours: number;
}

interface UseProjectPlanGeneratorResult {
  generatePlan: (request: ProjectPlanRequest) => Promise<GeneratedProjectPlan | null>;
  isGenerating: boolean;
  progress: number;
  error: ClaudeError | null;
  generatedPlan: GeneratedProjectPlan | null;
}

const PROJECT_PLAN_SYSTEM_PROMPT = `당신은 애자일 프로젝트 관리 전문가입니다.
스크럼 방법론과 베스트 프랙티스를 적용하여 실행 가능한 프로젝트 계획을 수립합니다.

계획 수립 원칙:
1. 2주 스프린트 단위로 작업 분해
2. 각 스프린트에 명확한 목표 설정
3. 작업 간 의존성 명시
4. 리스크 사전 식별 및 대응 계획
5. 마일스톤과 산출물 정의
6. 팀 규모에 맞는 현실적인 일정

작업 추정:
- 개발: 기능 복잡도 기준 (4~40시간)
- 테스트: 개발 시간의 30%
- 코드 리뷰: 개발 시간의 15%
- 문서화: 개발 시간의 20%

출력 형식: JSON 구조로 반환`;

export function useProjectPlanGenerator(): UseProjectPlanGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ClaudeError | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedProjectPlan | null>(null);

  const { sendMessage, messages } = useClaudeChat({
    systemPrompt: PROJECT_PLAN_SYSTEM_PROMPT,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
  });

  const generatePlan = useCallback(async (
    request: ProjectPlanRequest
  ): Promise<GeneratedProjectPlan | null> => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 프롬프트 구성 (10%)
      setProgress(10);
      const prompt = buildProjectPlanPrompt(request);

      // 2. Claude API 호출 (50%)
      setProgress(30);
      await sendMessage(prompt);
      setProgress(50);

      // 3. 응답 파싱 (70%)
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      setProgress(70);
      const parsedPlan = parseProjectPlanResponse(lastMessage.content);

      // 4. 후처리 (일정 계산 등) (90%)
      setProgress(90);
      const processedPlan = postProcessPlan(parsedPlan, request);

      // 5. 완료 (100%)
      setProgress(100);
      setGeneratedPlan(processedPlan);

      return processedPlan;

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : '프로젝트 계획 생성 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sendMessage, messages]);

  return {
    generatePlan,
    isGenerating,
    progress,
    error,
    generatedPlan,
  };
}

function buildProjectPlanPrompt(request: ProjectPlanRequest): string {
  const parts = [
    `# 프로젝트 계획 생성 요청`,
    ``,
    `## 프로젝트 정보`,
    `- **프로젝트명**: ${request.projectName}`,
    ``,
    `## 목표`,
  ];

  request.objectives.forEach((obj, i) => {
    parts.push(`${i + 1}. ${obj}`);
  });

  if (request.constraints?.length) {
    parts.push(``, `## 제약사항`);
    request.constraints.forEach((con, i) => {
      parts.push(`${i + 1}. ${con}`);
    });
  }

  if (request.teamSize) {
    parts.push(``, `## 팀 규모`, `${request.teamSize}명`);
  }

  if (request.duration) {
    parts.push(``, `## 기간`, request.duration);
  }

  parts.push(
    ``,
    `위 정보를 바탕으로 상세한 프로젝트 계획을 JSON 형식으로 생성해주세요.`,
    `스프린트, 마일스톤, 리스크, 리소스 할당을 포함해주세요.`
  );

  return parts.join('\n');
}

function parseProjectPlanResponse(content: string): GeneratedProjectPlan {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('프로젝트 계획 응답을 파싱할 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as GeneratedProjectPlan;
}

function postProcessPlan(
  plan: GeneratedProjectPlan,
  request: ProjectPlanRequest
): GeneratedProjectPlan {
  // 총 예상 시간 계산
  let totalHours = 0;
  plan.sprints.forEach(sprint => {
    sprint.tasks.forEach(task => {
      totalHours += task.estimatedHours;
    });
  });

  // ID 생성
  plan.sprints = plan.sprints.map((sprint, i) => ({
    ...sprint,
    id: sprint.id || `SPRINT-${i + 1}`,
    tasks: sprint.tasks.map((task, j) => ({
      ...task,
      id: task.id || `TASK-${i + 1}-${j + 1}`,
    })),
  }));

  plan.milestones = plan.milestones.map((milestone, i) => ({
    ...milestone,
    id: milestone.id || `MS-${i + 1}`,
  }));

  plan.risks = plan.risks.map((risk, i) => ({
    ...risk,
    id: risk.id || `RISK-${i + 1}`,
  }));

  return {
    ...plan,
    projectName: request.projectName,
    totalEstimatedHours: totalHours,
  };
}
```

**완료 조건**:
- [ ] useProjectPlanGenerator 훅 구현 완료
- [ ] 스프린트 분해 기능 구현
- [ ] 마일스톤 정의 기능 구현
- [ ] 리스크 식별 기능 구현
- [ ] 시간 추정 로직 구현
- [ ] JSON 응답 파싱 정상 작동

---

### TASK-AI-012: Minu Keep - 운영 보고서 초안

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: Sprint 1 완료
**담당**: Agent 2 (Phase 2)

**작업 내용**:

```typescript
// src/skills/minu-keep/useOperationsReportGenerator.ts

import { useCallback, useState } from 'react';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { useServiceEvents } from '@/hooks/useServiceEvents';
import { useServiceIssues } from '@/hooks/useServiceIssues';
import type {
  OperationsReportRequest,
  ClaudeError,
  MinuService,
} from '@/types/claude.types';

interface SLAMetrics {
  availability: number;
  responseTime: number;
  errorRate: number;
  incidentCount: number;
}

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  occurredAt: string;
  resolvedAt: string | null;
  resolution: string;
  rootCause: string;
  preventiveMeasures: string[];
}

interface Improvement {
  category: 'performance' | 'reliability' | 'security' | 'process';
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  expectedImpact: string;
}

interface GeneratedOperationsReport {
  period: string;
  service: MinuService;
  executiveSummary: string;
  slaMetrics: SLAMetrics;
  incidents: Incident[];
  improvements: Improvement[];
  upcomingPlans: string[];
  recommendations: string[];
}

interface UseOperationsReportGeneratorResult {
  generateReport: (request: OperationsReportRequest) => Promise<GeneratedOperationsReport | null>;
  isGenerating: boolean;
  progress: number;
  error: ClaudeError | null;
  generatedReport: GeneratedOperationsReport | null;
}

const OPERATIONS_REPORT_SYSTEM_PROMPT = `당신은 IT 운영 관리 전문가입니다.
서비스 운영 데이터를 분석하여 경영진과 기술팀 모두에게 유용한 보고서를 작성합니다.

보고서 작성 원칙:
1. 핵심 지표(KPI) 중심의 요약
2. SLA 달성률 및 트렌드 분석
3. 장애 및 인시던트 원인 분석
4. 개선 활동 및 성과
5. 향후 계획 및 권고사항

SLA 지표:
- 가용성: 99.9% 목표
- 응답 시간: P95 500ms 이하
- 에러율: 0.1% 이하

출력 형식: JSON 구조로 반환`;

export function useOperationsReportGenerator(): UseOperationsReportGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ClaudeError | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedOperationsReport | null>(null);

  const { events } = useServiceEvents();
  const { issues } = useServiceIssues();

  const { sendMessage, messages } = useClaudeChat({
    systemPrompt: OPERATIONS_REPORT_SYSTEM_PROMPT,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
  });

  const generateReport = useCallback(async (
    request: OperationsReportRequest
  ): Promise<GeneratedOperationsReport | null> => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 데이터 수집 (20%)
      setProgress(10);
      const periodEvents = filterEventsByPeriod(events, request.reportPeriod);
      const periodIssues = filterIssuesByPeriod(issues, request.reportPeriod);
      setProgress(20);

      // 2. 프롬프트 구성 (30%)
      const prompt = buildOperationsReportPrompt(
        request,
        periodEvents,
        periodIssues
      );
      setProgress(30);

      // 3. Claude API 호출 (60%)
      await sendMessage(prompt);
      setProgress(60);

      // 4. 응답 파싱 (80%)
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      setProgress(80);
      const parsedReport = parseOperationsReportResponse(lastMessage.content);

      // 5. 완료 (100%)
      setProgress(100);
      setGeneratedReport(parsedReport);

      return parsedReport;

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : '운영 보고서 생성 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sendMessage, messages, events, issues]);

  return {
    generateReport,
    isGenerating,
    progress,
    error,
    generatedReport,
  };
}

function filterEventsByPeriod(events: any[], period: 'weekly' | 'monthly'): any[] {
  const now = new Date();
  const startDate = new Date();

  if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setMonth(now.getMonth() - 1);
  }

  return events.filter(event =>
    new Date(event.created_at) >= startDate
  );
}

function filterIssuesByPeriod(issues: any[], period: 'weekly' | 'monthly'): any[] {
  const now = new Date();
  const startDate = new Date();

  if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setMonth(now.getMonth() - 1);
  }

  return issues.filter(issue =>
    new Date(issue.created_at) >= startDate
  );
}

function buildOperationsReportPrompt(
  request: OperationsReportRequest,
  events: any[],
  issues: any[]
): string {
  const periodLabel = request.reportPeriod === 'weekly' ? '주간' : '월간';

  const parts = [
    `# ${periodLabel} 운영 보고서 생성 요청`,
    ``,
    `## 서비스`,
    request.serviceId,
    ``,
    `## 기간 내 이벤트 요약`,
    `- 총 이벤트: ${events.length}건`,
    `- 이벤트 유형별:`,
    ...Object.entries(
      events.reduce((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => `  - ${type}: ${count}건`),
    ``,
    `## 기간 내 이슈 요약`,
    `- 총 이슈: ${issues.length}건`,
    `- 해결됨: ${issues.filter(i => i.status === 'resolved').length}건`,
    `- 미해결: ${issues.filter(i => i.status !== 'resolved').length}건`,
  ];

  if (request.metrics) {
    parts.push(``, `## 추가 지표`);
    Object.entries(request.metrics).forEach(([key, value]) => {
      parts.push(`- ${key}: ${value}`);
    });
  }

  if (request.incidents?.length) {
    parts.push(``, `## 주요 인시던트`);
    request.incidents.forEach((incident, i) => {
      parts.push(`${i + 1}. ${incident}`);
    });
  }

  parts.push(
    ``,
    `위 데이터를 분석하여 ${periodLabel} 운영 보고서를 JSON 형식으로 생성해주세요.`,
    `경영진 요약, SLA 지표, 인시던트 분석, 개선 활동, 향후 계획을 포함해주세요.`
  );

  return parts.join('\n');
}

function parseOperationsReportResponse(content: string): GeneratedOperationsReport {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('운영 보고서 응답을 파싱할 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as GeneratedOperationsReport;
}
```

**완료 조건**:
- [ ] useOperationsReportGenerator 훅 구현 완료
- [ ] 서비스 이벤트/이슈 데이터 연동
- [ ] 기간별 필터링 (주간/월간) 구현
- [ ] SLA 지표 분석 기능 구현
- [ ] 인시던트 분석 기능 구현
- [ ] JSON 응답 파싱 정상 작동

---

### TASK-AI-013: AI 생성 결과 → docx/xlsx 연동

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-009 ~ TASK-AI-012, Claude Skills Sprint 3/5
**담당**: Agent 1 (Phase 3)

**작업 내용**:

```typescript
// src/skills/export/useAIExport.ts

import { useCallback } from 'react';
import { useDocxGenerate } from '@/skills/docx/useDocxGenerate';
import { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
import type {
  GeneratedRFP,
  GeneratedProjectPlan,
  GeneratedOperationsReport,
} from '@/types/claude.types';

interface UseAIExportResult {
  exportRFPToDocx: (rfp: GeneratedRFP) => Promise<void>;
  exportProjectPlanToXlsx: (plan: GeneratedProjectPlan) => Promise<void>;
  exportOperationsReportToDocx: (report: GeneratedOperationsReport) => Promise<void>;
  isExporting: boolean;
  error: Error | null;
}

export function useAIExport(): UseAIExportResult {
  const { generateDocument, isGenerating: isDocxGenerating, error: docxError } = useDocxGenerate();
  const { exportToExcel, isExporting: isXlsxExporting, error: xlsxError } = useXlsxExport();

  // RFP → docx
  const exportRFPToDocx = useCallback(async (rfp: GeneratedRFP) => {
    const sections = [
      {
        type: 'heading' as const,
        level: 1,
        text: 'RFP (제안요청서)',
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '1. 프로젝트 개요',
      },
      {
        type: 'paragraph' as const,
        text: rfp.projectOverview,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '2. 프로젝트 목표',
      },
      {
        type: 'list' as const,
        items: rfp.objectives,
        ordered: true,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '3. 프로젝트 범위',
      },
      {
        type: 'paragraph' as const,
        text: rfp.scope,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '4. 요구사항',
      },
      ...rfp.requirements.flatMap(req => [
        {
          type: 'heading' as const,
          level: 3,
          text: req.title,
        },
        {
          type: 'paragraph' as const,
          text: req.content,
        },
      ]),
      {
        type: 'heading' as const,
        level: 2,
        text: '5. 일정',
      },
      {
        type: 'paragraph' as const,
        text: rfp.timeline,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '6. 예산',
      },
      {
        type: 'paragraph' as const,
        text: rfp.budget,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '7. 평가 기준',
      },
      {
        type: 'table' as const,
        headers: ['평가 항목', '평가 기준'],
        rows: rfp.evaluationCriteria.map(ec => [ec.title, ec.content]),
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '8. 제출 안내',
      },
      {
        type: 'paragraph' as const,
        text: rfp.submissionGuidelines,
      },
    ];

    await generateDocument({
      filename: `RFP-${Date.now()}.docx`,
      sections,
      template: 'government-si',
    });
  }, [generateDocument]);

  // 프로젝트 계획 → xlsx
  const exportProjectPlanToXlsx = useCallback(async (plan: GeneratedProjectPlan) => {
    // 스프린트 시트
    const sprintSheet = {
      name: '스프린트 계획',
      data: plan.sprints.flatMap(sprint =>
        sprint.tasks.map(task => ({
          '스프린트': sprint.name,
          '시작일': sprint.startDate,
          '종료일': sprint.endDate,
          '작업 ID': task.id,
          '작업명': task.title,
          '설명': task.description,
          '예상 시간': task.estimatedHours,
          '담당자': task.assignee || '',
          '우선순위': task.priority,
          '의존성': task.dependencies.join(', '),
        }))
      ),
    };

    // 마일스톤 시트
    const milestoneSheet = {
      name: '마일스톤',
      data: plan.milestones.map(ms => ({
        'ID': ms.id,
        '마일스톤명': ms.name,
        '목표일': ms.targetDate,
        '산출물': ms.deliverables.join(', '),
        '완료 기준': ms.criteria.join(', '),
      })),
    };

    // 리스크 시트
    const riskSheet = {
      name: '리스크 관리',
      data: plan.risks.map(risk => ({
        'ID': risk.id,
        '리스크': risk.description,
        '발생 확률': risk.probability,
        '영향도': risk.impact,
        '대응 방안': risk.mitigation,
      })),
    };

    // 요약 시트
    const summarySheet = {
      name: '요약',
      data: [
        { '항목': '프로젝트명', '값': plan.projectName },
        { '항목': '총 스프린트', '값': plan.sprints.length },
        { '항목': '총 작업 수', '값': plan.sprints.reduce((acc, s) => acc + s.tasks.length, 0) },
        { '항목': '총 예상 시간', '값': `${plan.totalEstimatedHours}시간` },
        { '항목': '마일스톤 수', '값': plan.milestones.length },
        { '항목': '식별된 리스크', '값': plan.risks.length },
      ],
    };

    await exportToExcel({
      filename: `project-plan-${plan.projectName}-${Date.now()}.xlsx`,
      sheets: [summarySheet, sprintSheet, milestoneSheet, riskSheet],
    });
  }, [exportToExcel]);

  // 운영 보고서 → docx
  const exportOperationsReportToDocx = useCallback(async (report: GeneratedOperationsReport) => {
    const sections = [
      {
        type: 'heading' as const,
        level: 1,
        text: `${report.period} 운영 보고서`,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '경영진 요약',
      },
      {
        type: 'paragraph' as const,
        text: report.executiveSummary,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: 'SLA 지표',
      },
      {
        type: 'table' as const,
        headers: ['지표', '값', '목표', '달성'],
        rows: [
          ['가용성', `${report.slaMetrics.availability}%`, '99.9%',
            report.slaMetrics.availability >= 99.9 ? 'O' : 'X'],
          ['응답 시간 (P95)', `${report.slaMetrics.responseTime}ms`, '500ms',
            report.slaMetrics.responseTime <= 500 ? 'O' : 'X'],
          ['에러율', `${report.slaMetrics.errorRate}%`, '0.1%',
            report.slaMetrics.errorRate <= 0.1 ? 'O' : 'X'],
          ['인시던트 수', `${report.slaMetrics.incidentCount}건`, '-', '-'],
        ],
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '주요 인시던트',
      },
      ...report.incidents.flatMap(incident => [
        {
          type: 'heading' as const,
          level: 3,
          text: `[${incident.severity.toUpperCase()}] ${incident.title}`,
        },
        {
          type: 'paragraph' as const,
          text: `- 발생: ${incident.occurredAt}\n- 해결: ${incident.resolvedAt || '미해결'}\n- 원인: ${incident.rootCause}`,
        },
        {
          type: 'paragraph' as const,
          text: `**해결 방법**: ${incident.resolution}`,
        },
        {
          type: 'list' as const,
          items: incident.preventiveMeasures,
          ordered: false,
        },
      ]),
      {
        type: 'heading' as const,
        level: 2,
        text: '개선 활동',
      },
      {
        type: 'table' as const,
        headers: ['카테고리', '개선 항목', '상태', '기대 효과'],
        rows: report.improvements.map(imp => [
          imp.category,
          imp.title,
          imp.status,
          imp.expectedImpact,
        ]),
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '향후 계획',
      },
      {
        type: 'list' as const,
        items: report.upcomingPlans,
        ordered: true,
      },
      {
        type: 'heading' as const,
        level: 2,
        text: '권고사항',
      },
      {
        type: 'list' as const,
        items: report.recommendations,
        ordered: false,
      },
    ];

    await generateDocument({
      filename: `operations-report-${report.service}-${Date.now()}.docx`,
      sections,
      template: 'monthly-report',
    });
  }, [generateDocument]);

  return {
    exportRFPToDocx,
    exportProjectPlanToXlsx,
    exportOperationsReportToDocx,
    isExporting: isDocxGenerating || isXlsxExporting,
    error: docxError || xlsxError,
  };
}
```

**완료 조건**:
- [ ] useAIExport 훅 구현 완료
- [ ] RFP → docx 변환 정상 작동
- [ ] 프로젝트 계획 → xlsx 변환 정상 작동
- [ ] 운영 보고서 → docx 변환 정상 작동
- [ ] 기존 docx/xlsx 스킬과 통합
- [ ] 에러 핸들링 정상 작동

---

### TASK-AI-014: AIAssistButton UI 컴포넌트

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: Sprint 1 완료
**담당**: Agent 3 (Phase 1)

**작업 내용**:

```typescript
// src/components/ai/AIAssistButton.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ClaudeError } from '@/types/claude.types';

type AIAssistType = 'rfp' | 'requirements' | 'project-plan' | 'operations-report';

interface AIAssistButtonProps {
  type: AIAssistType;
  onGenerate: () => Promise<void>;
  isGenerating?: boolean;
  progress?: number;
  error?: ClaudeError | null;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showProgress?: boolean;
  confirmBeforeGenerate?: boolean;
  children?: React.ReactNode;
}

const TYPE_LABELS: Record<AIAssistType, { label: string; description: string }> = {
  'rfp': {
    label: 'AI RFP 생성',
    description: 'AI가 입력된 정보를 바탕으로 RFP 초안을 생성합니다.',
  },
  'requirements': {
    label: 'AI 요구사항 분석',
    description: 'AI가 프로젝트 컨텍스트를 분석하여 요구사항을 제안합니다.',
  },
  'project-plan': {
    label: 'AI 계획 생성',
    description: 'AI가 프로젝트 목표를 바탕으로 스프린트 계획을 수립합니다.',
  },
  'operations-report': {
    label: 'AI 보고서 초안',
    description: 'AI가 운영 데이터를 분석하여 보고서 초안을 작성합니다.',
  },
};

export function AIAssistButton({
  type,
  onGenerate,
  isGenerating = false,
  progress = 0,
  error = null,
  disabled = false,
  variant = 'outline',
  size = 'default',
  showProgress = true,
  confirmBeforeGenerate = true,
  children,
}: AIAssistButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const typeConfig = TYPE_LABELS[type];

  const handleClick = async () => {
    if (confirmBeforeGenerate) {
      setShowConfirmDialog(true);
    } else {
      await executeGeneration();
    }
  };

  const executeGeneration = async () => {
    setShowConfirmDialog(false);
    setGenerationSuccess(false);

    try {
      await onGenerate();
      setGenerationSuccess(true);
      setShowResultDialog(true);
    } catch {
      setShowResultDialog(true);
    }
  };

  const renderButtonContent = () => {
    if (isGenerating) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {showProgress ? `${progress}% 생성 중...` : '생성 중...'}
        </>
      );
    }

    return (
      <>
        <Sparkles className="mr-2 h-4 w-4" />
        {children || typeConfig.label}
      </>
    );
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={disabled || isGenerating}
            className="relative"
          >
            {renderButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{typeConfig.description}</p>
          {error && (
            <p className="text-destructive text-sm mt-1">
              오류: {error.message}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* 진행률 바 (버튼 하단) */}
      {isGenerating && showProgress && (
        <Progress
          value={progress}
          className="mt-2 h-1"
        />
      )}

      {/* 확인 다이얼로그 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {typeConfig.label}
            </DialogTitle>
            <DialogDescription>
              {typeConfig.description}
              <br /><br />
              AI가 생성한 결과는 초안이며, 검토 후 수정이 필요할 수 있습니다.
              계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              취소
            </Button>
            <Button onClick={executeGeneration}>
              <Sparkles className="mr-2 h-4 w-4" />
              생성 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결과 다이얼로그 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {generationSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  생성 완료
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  생성 실패
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {generationSuccess ? (
                '생성이 완료되었습니다. 결과를 검토해주세요.'
              ) : (
                error?.message || '알 수 없는 오류가 발생했습니다.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              확인
            </Button>
            {!generationSuccess && (
              <Button variant="outline" onClick={executeGeneration}>
                다시 시도
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

```typescript
// src/components/ai/AIAssistPanel.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIAssistButton } from './AIAssistButton';
import { Sparkles, FileText, ListChecks, Calendar, FileBarChart } from 'lucide-react';

interface AIAssistPanelProps {
  serviceType: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
  onRFPGenerate?: () => Promise<void>;
  onRequirementsGenerate?: () => Promise<void>;
  onProjectPlanGenerate?: () => Promise<void>;
  onOperationsReportGenerate?: () => Promise<void>;
}

export function AIAssistPanel({
  serviceType,
  onRFPGenerate,
  onRequirementsGenerate,
  onProjectPlanGenerate,
  onOperationsReportGenerate,
}: AIAssistPanelProps) {
  const renderServiceActions = () => {
    switch (serviceType) {
      case 'minu-find':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              사업기회를 분석하고 RFP 초안을 생성합니다.
            </p>
            {onRFPGenerate && (
              <AIAssistButton
                type="rfp"
                onGenerate={onRFPGenerate}
                variant="default"
                size="lg"
              >
                <FileText className="mr-2 h-4 w-4" />
                RFP 초안 생성
              </AIAssistButton>
            )}
          </div>
        );

      case 'minu-frame':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              프로젝트 요구사항을 분석하고 개선점을 제안합니다.
            </p>
            {onRequirementsGenerate && (
              <AIAssistButton
                type="requirements"
                onGenerate={onRequirementsGenerate}
                variant="default"
                size="lg"
              >
                <ListChecks className="mr-2 h-4 w-4" />
                요구사항 분석
              </AIAssistButton>
            )}
          </div>
        );

      case 'minu-build':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              프로젝트 목표를 바탕으로 스프린트 계획을 수립합니다.
            </p>
            {onProjectPlanGenerate && (
              <AIAssistButton
                type="project-plan"
                onGenerate={onProjectPlanGenerate}
                variant="default"
                size="lg"
              >
                <Calendar className="mr-2 h-4 w-4" />
                계획 생성
              </AIAssistButton>
            )}
          </div>
        );

      case 'minu-keep':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              운영 데이터를 분석하여 보고서 초안을 작성합니다.
            </p>
            {onOperationsReportGenerate && (
              <AIAssistButton
                type="operations-report"
                onGenerate={onOperationsReportGenerate}
                variant="default"
                size="lg"
              >
                <FileBarChart className="mr-2 h-4 w-4" />
                보고서 초안 생성
              </AIAssistButton>
            )}
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI 어시스턴트
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderServiceActions()}
      </CardContent>
    </Card>
  );
}
```

**완료 조건**:
- [ ] AIAssistButton 컴포넌트 구현 완료
- [ ] AIAssistPanel 컴포넌트 구현 완료
- [ ] 진행률 표시 기능 구현
- [ ] 확인 다이얼로그 구현
- [ ] 결과 다이얼로그 구현
- [ ] 에러 표시 기능 구현
- [ ] 서비스별 UI 분기 구현

---

### TASK-AI-015: 토큰 사용량 추적 대시보드

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-005
**담당**: Agent 3 (Phase 2)

**작업 내용**:

```typescript
// src/hooks/useAIUsage.ts

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import type { UsageLog, UsageSummary, ClaudeModel } from '@/types/claude.types';

interface UseAIUsageResult {
  dailyUsage: UsageSummary | null;
  weeklyUsage: UsageSummary | null;
  monthlyUsage: UsageSummary | null;
  recentLogs: UsageLog[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// 모델별 비용 (USD per 1M tokens)
const MODEL_PRICING: Record<ClaudeModel, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

export function useAIUsage(): UseAIUsageResult {
  const { supabase, user } = useSupabase();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 최근 100개 로그
      const { data: logs, error: logsError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // 기간별 집계
      const dailyLogs = logs?.filter(l =>
        new Date(l.created_at) >= startOfDay
      ) || [];
      const weeklyLogs = logs?.filter(l =>
        new Date(l.created_at) >= startOfWeek
      ) || [];
      const monthlyLogs = logs?.filter(l =>
        new Date(l.created_at) >= startOfMonth
      ) || [];

      return {
        recentLogs: logs || [],
        dailyUsage: calculateSummary(dailyLogs, 'day'),
        weeklyUsage: calculateSummary(weeklyLogs, 'week'),
        monthlyUsage: calculateSummary(monthlyLogs, 'month'),
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1분
  });

  return {
    dailyUsage: data?.dailyUsage || null,
    weeklyUsage: data?.weeklyUsage || null,
    monthlyUsage: data?.monthlyUsage || null,
    recentLogs: data?.recentLogs || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

function calculateSummary(
  logs: UsageLog[],
  period: 'day' | 'week' | 'month'
): UsageSummary {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  logs.forEach(log => {
    totalInputTokens += log.input_tokens;
    totalOutputTokens += log.output_tokens;

    const pricing = MODEL_PRICING[log.model as ClaudeModel] ||
      MODEL_PRICING['claude-sonnet-4-20250514'];

    totalCost +=
      (log.input_tokens / 1_000_000) * pricing.input +
      (log.output_tokens / 1_000_000) * pricing.output;
  });

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    period,
  };
}
```

```typescript
// src/components/ai/AIUsageDashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAIUsage } from '@/hooks/useAIUsage';
import { Loader2, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function AIUsageDashboard() {
  const {
    dailyUsage,
    weeklyUsage,
    monthlyUsage,
    recentLogs,
    isLoading,
    error,
  } = useAIUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4">
        사용량 데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageCard
          title="오늘"
          usage={dailyUsage}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <UsageCard
          title="이번 주"
          usage={weeklyUsage}
          icon={<Coins className="h-4 w-4" />}
        />
        <UsageCard
          title="이번 달"
          usage={monthlyUsage}
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
      </div>

      {/* 최근 사용 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 사용 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>모델</TableHead>
                <TableHead className="text-right">입력 토큰</TableHead>
                <TableHead className="text-right">출력 토큰</TableHead>
                <TableHead className="text-right">비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.slice(0, 10).map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </TableCell>
                  <TableCell>{getModelLabel(log.model)}</TableCell>
                  <TableCell className="text-right">
                    {log.input_tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.output_tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${calculateCost(log).toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}

              {recentLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    사용 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface UsageCardProps {
  title: string;
  usage: UsageSummary | null;
  icon: React.ReactNode;
}

function UsageCard({ title, usage, icon }: UsageCardProps) {
  if (!usage) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">-</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">${usage.totalCost.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {(usage.totalInputTokens + usage.totalOutputTokens).toLocaleString()} 토큰
        </p>
      </CardContent>
    </Card>
  );
}

function getModelLabel(model: string): string {
  const labels: Record<string, string> = {
    'claude-sonnet-4-20250514': 'Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Sonnet 3.5',
    'claude-3-haiku-20240307': 'Haiku',
  };
  return labels[model] || model;
}

function calculateCost(log: { model: string; input_tokens: number; output_tokens: number }): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  };

  const p = pricing[log.model] || pricing['claude-sonnet-4-20250514'];
  return (log.input_tokens / 1_000_000) * p.input +
         (log.output_tokens / 1_000_000) * p.output;
}
```

**완료 조건**:
- [ ] useAIUsage 훅 구현 완료
- [ ] AIUsageDashboard 컴포넌트 구현 완료
- [ ] 일/주/월 사용량 집계 정상 작동
- [ ] 비용 계산 로직 정상 작동
- [ ] 최근 사용 내역 표시 정상 작동
- [ ] 로딩/에러 상태 처리

---

### TASK-AI-016: E2E 테스트 12개

**예상 시간**: 2.5시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-009 ~ TASK-AI-015
**담당**: Agent 2 (Phase 3)

**작업 내용**:

```typescript
// tests/e2e/claude-ai/minu-skills.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Minu Skills - AI 통합', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  // Minu Find
  test.describe('Minu Find - RFP 생성', () => {
    test('RFP 생성 버튼이 표시됨', async ({ page }) => {
      await page.goto('/services/minu-find');
      await expect(page.getByRole('button', { name: /RFP.*생성/i })).toBeVisible();
    });

    test('RFP 생성 다이얼로그 열림', async ({ page }) => {
      await page.goto('/services/minu-find');
      await page.click('button:has-text("RFP")');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/프로젝트명/i)).toBeVisible();
    });

    test('RFP 생성 및 결과 표시', async ({ page }) => {
      await page.goto('/services/minu-find');
      await page.click('button:has-text("RFP")');

      await page.fill('[name="projectName"]', '테스트 프로젝트');
      await page.fill('[name="projectDescription"]', '테스트 설명입니다.');
      await page.click('button:has-text("생성 시작")');

      // 진행률 표시 확인
      await expect(page.getByText(/%/)).toBeVisible();

      // 결과 확인 (최대 60초 대기)
      await expect(page.getByText(/생성 완료/i)).toBeVisible({ timeout: 60000 });
    });
  });

  // Minu Frame
  test.describe('Minu Frame - 요구사항 분석', () => {
    test('요구사항 분석 버튼이 표시됨', async ({ page }) => {
      await page.goto('/services/minu-frame');
      await expect(page.getByRole('button', { name: /요구사항.*분석/i })).toBeVisible();
    });

    test('요구사항 제안 결과 표시', async ({ page }) => {
      await page.goto('/services/minu-frame');
      await page.click('button:has-text("요구사항")');

      await page.fill('[name="projectContext"]', '웹 애플리케이션 개발 프로젝트');
      await page.click('button:has-text("분석")');

      await expect(page.getByText(/제안된 요구사항/i)).toBeVisible({ timeout: 60000 });
    });

    test('요구사항 개선 기능 작동', async ({ page }) => {
      await page.goto('/services/minu-frame');
      // 기존 요구사항에서 개선 버튼 클릭
      await page.click('[data-testid="requirement-item"] button:has-text("개선")');

      await page.fill('[name="feedback"]', '더 구체적으로 작성해주세요.');
      await page.click('button:has-text("개선 요청")');

      await expect(page.getByText(/개선됨/i)).toBeVisible({ timeout: 30000 });
    });
  });

  // Minu Build
  test.describe('Minu Build - 프로젝트 계획', () => {
    test('계획 생성 버튼이 표시됨', async ({ page }) => {
      await page.goto('/services/minu-build');
      await expect(page.getByRole('button', { name: /계획.*생성/i })).toBeVisible();
    });

    test('프로젝트 계획 생성 및 스프린트 표시', async ({ page }) => {
      await page.goto('/services/minu-build');
      await page.click('button:has-text("계획 생성")');

      await page.fill('[name="projectName"]', '테스트 프로젝트');
      await page.fill('[name="objectives"]', '기능 구현\n테스트 작성');
      await page.click('button:has-text("생성")');

      // 스프린트 목록 표시 확인
      await expect(page.getByText(/Sprint 1/i)).toBeVisible({ timeout: 60000 });
    });

    test('계획 Excel 내보내기', async ({ page }) => {
      await page.goto('/services/minu-build');
      // 계획 생성 후
      await page.click('button:has-text("Excel 내보내기")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("다운로드")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/project-plan.*\.xlsx$/);
    });
  });

  // Minu Keep
  test.describe('Minu Keep - 운영 보고서', () => {
    test('보고서 생성 버튼이 표시됨', async ({ page }) => {
      await page.goto('/services/minu-keep');
      await expect(page.getByRole('button', { name: /보고서.*생성/i })).toBeVisible();
    });

    test('주간 보고서 생성', async ({ page }) => {
      await page.goto('/services/minu-keep');
      await page.click('button:has-text("보고서")');

      await page.click('[data-testid="period-weekly"]');
      await page.click('button:has-text("생성")');

      await expect(page.getByText(/주간 운영 보고서/i)).toBeVisible({ timeout: 60000 });
    });

    test('보고서 Word 내보내기', async ({ page }) => {
      await page.goto('/services/minu-keep');
      // 보고서 생성 후
      await page.click('button:has-text("Word 내보내기")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("다운로드")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/operations-report.*\.docx$/);
    });
  });

  // 토큰 사용량
  test.describe('토큰 사용량 대시보드', () => {
    test('사용량 대시보드 접근 가능', async ({ page }) => {
      await page.goto('/admin/ai-usage');
      await expect(page.getByText(/오늘/i)).toBeVisible();
      await expect(page.getByText(/이번 주/i)).toBeVisible();
      await expect(page.getByText(/이번 달/i)).toBeVisible();
    });

    test('최근 사용 내역 표시', async ({ page }) => {
      await page.goto('/admin/ai-usage');
      await expect(page.getByText(/최근 사용 내역/i)).toBeVisible();
    });
  });
});
```

**완료 조건**:
- [ ] E2E 테스트 12개 작성
- [ ] 모든 테스트 통과
- [ ] Minu Find 테스트 3개
- [ ] Minu Frame 테스트 3개
- [ ] Minu Build 테스트 3개
- [ ] Minu Keep 테스트 2개
- [ ] 토큰 사용량 테스트 2개
- [ ] CI/CD 파이프라인에 테스트 추가

---

## 검증 계획

### 단위 테스트
- [ ] RFP 생성 로직 테스트
- [ ] 요구사항 분석 로직 테스트
- [ ] 프로젝트 계획 생성 로직 테스트
- [ ] 운영 보고서 생성 로직 테스트
- [ ] docx/xlsx 변환 로직 테스트
- [ ] 토큰 사용량 집계 테스트

### 통합 테스트
- [ ] Claude API 연동 테스트
- [ ] docx/xlsx 스킬 연동 테스트
- [ ] 서비스 데이터 연동 테스트

### 사용성 테스트
- [ ] 생성 결과 품질 검토
- [ ] 진행률 표시 정확성
- [ ] 에러 메시지 명확성

---

## 완료 조건

- [ ] Minu Find RFP 생성 기능 완료
- [ ] Minu Frame 요구사항 분석 기능 완료
- [ ] Minu Build 프로젝트 계획 생성 기능 완료
- [ ] Minu Keep 운영 보고서 생성 기능 완료
- [ ] AI 생성 결과 → docx/xlsx 연동 완료
- [ ] AIAssistButton UI 컴포넌트 완료
- [ ] 토큰 사용량 추적 대시보드 완료
- [ ] E2E 테스트 12개 통과
- [ ] 빌드 성공

---

## 다음 Sprint

[Backlog: 향후 AI 기능](backlog.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |
