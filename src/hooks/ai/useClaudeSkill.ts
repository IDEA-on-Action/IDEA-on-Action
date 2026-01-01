/**
 * Claude Skills 통합 훅
 *
 * Claude AI를 활용한 문서 생성 Skills의 React 훅
 * - useClaudeSkill: 범용 Skill 훅
 * - useRFPGenerator: RFP 생성 훅
 * - useRequirementsAnalyzer: 요구사항 분석 훅
 * - useProjectPlanner: 프로젝트 계획 훅
 * - useOpsReportWriter: 운영 보고서 작성 훅
 *
 * @module hooks/useClaudeSkill
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useClaudeStreaming } from '@/hooks/ai/useClaudeStreaming';
import { usePromptTemplates } from '@/hooks/ai/usePromptTemplates';
import {
  createClaudeSkillError,
  isClaudeSkillError,
  calculateProgress,
} from '@/types/ai/claude-skills.types';
import type {
  ClaudeSkillType,
  ClaudeSkillStatus,
  ClaudeSkillProgress,
  ClaudeSkillError,
  ClaudeSkillOptions,
  ClaudeSkillResult,
  UseClaudeSkillResult,
  RFPGeneratorInput,
  RFPGeneratorOutput,
  RequirementsAnalyzerInput,
  RequirementsAnalyzerOutput,
  ProjectPlannerInput,
  ProjectPlannerOutput,
  OpsReportInput,
  OpsReportOutput,
  PromptTemplate,
  SkillCacheEntry,
} from '@/types/ai/claude-skills.types';
import type { ClaudeUsage } from '@/types/ai/claude.types';
import { DEFAULT_CLAUDE_MODEL, DEFAULT_MAX_TOKENS } from '@/types/ai/claude.types';

// ============================================================================
// 상수
// ============================================================================

/** 기본 캐시 TTL (초) */
const DEFAULT_CACHE_TTL = 3600; // 1시간

/** 기본 타임아웃 (ms) */
const DEFAULT_SKILL_TIMEOUT = 120000; // 2분

// ============================================================================
// 프롬프트 템플릿
// ============================================================================

/**
 * RFP 생성기 프롬프트 템플릿
 */
const RFP_GENERATOR_TEMPLATE: PromptTemplate = {
  id: 'rfp-generator-v1',
  name: 'RFP 생성기',
  description: '프로젝트 정보를 바탕으로 RFP 문서를 생성합니다',
  skillType: 'rfp-generator',
  systemPrompt: `당신은 전문 RFP(제안요청서) 작성 전문가입니다.
고객의 프로젝트 정보를 바탕으로 체계적이고 상세한 RFP를 작성합니다.

다음 원칙을 따르세요:
1. 명확하고 측정 가능한 요구사항 작성
2. 산업별 모범 사례 반영
3. 현실적인 일정과 예산 고려
4. 리스크와 제약사항 명시
5. 평가 기준의 객관성 확보

응답은 반드시 JSON 형식으로 제공하세요.`,
  userPromptTemplate: `다음 프로젝트 정보를 바탕으로 RFP를 작성해주세요:

**프로젝트명**: {{projectName}}
**고객/기관**: {{clientName}}
**카테고리**: {{category}}
**배경 및 목적**: {{background}}
**주요 목표**:
{{objectives}}
{{#if budget}}**예산**: {{budget}}원{{/if}}
{{#if duration}}**기간**: {{duration.startDate}} ~ {{duration.endDate}}{{/if}}
{{#if additionalRequirements}}**추가 요구사항**: {{additionalRequirements}}{{/if}}
{{#if industry}}**산업 분야**: {{industry}}{{/if}}

다음 JSON 형식으로 응답해주세요:
{
  "rfpData": { /* TemplateData 형식 */ },
  "requirements": [ /* RFPRequirement[] */ ],
  "evaluationCriteria": [ /* EvaluationCriterion[] */ ],
  "proposedTimeline": [ /* ProposedTimelineItem[] */ ],
  "deliverables": [ /* string[] */ ],
  "risks": [ /* RFPRisk[] */ ],
  "summary": "/* 요약 문자열 */"
}`,
  variables: ['projectName', 'clientName', 'category', 'background', 'objectives', 'budget', 'duration', 'additionalRequirements', 'industry'],
  version: '1.0.0',
  serviceId: 'minu-frame',
};

/**
 * 요구사항 분석기 프롬프트 템플릿
 */
const REQUIREMENTS_ANALYZER_TEMPLATE: PromptTemplate = {
  id: 'requirements-analyzer-v1',
  name: '요구사항 분석기',
  description: '원시 요구사항을 분석하고 구조화합니다',
  skillType: 'requirements-analyzer',
  systemPrompt: `당신은 전문 요구사항 분석가입니다.
원시 텍스트로 작성된 요구사항을 분석하여 체계적으로 구조화합니다.

분석 시 다음을 수행합니다:
1. 요구사항을 기능/비기능/제약/가정으로 분류
2. 명확성과 완전성 점수 부여
3. 갭 분석 수행
4. 의존성 파악
5. 우선순위 추천
6. 리스크 식별

응답은 반드시 JSON 형식으로 제공하세요.`,
  userPromptTemplate: `다음 요구사항을 분석해주세요:

**프로젝트명**: {{projectName}}
**원시 요구사항**:
{{rawRequirements}}
{{#if context}}**추가 컨텍스트**: {{context}}{{/if}}
**분석 깊이**: {{analysisDepth}}
**포함할 분석**: {{includeAnalysis}}
{{#if industry}}**산업 분야**: {{industry}}{{/if}}

다음 JSON 형식으로 응답해주세요:
{
  "structuredRequirements": [ /* AnalyzedRequirement[] */ ],
  "gapAnalysis": { /* GapAnalysisResult */ },
  "dependencyMatrix": [ /* DependencyItem[] */ ],
  "priorityRecommendations": [ /* PriorityRecommendation[] */ ],
  "riskAnalysis": [ /* RequirementRisk[] */ ],
  "summary": "/* 분석 요약 */",
  "recommendations": [ /* 권장 사항 목록 */ ]
}`,
  variables: ['projectName', 'rawRequirements', 'context', 'analysisDepth', 'includeAnalysis', 'industry'],
  version: '1.0.0',
  serviceId: 'minu-frame',
};

/**
 * 프로젝트 계획기 프롬프트 템플릿
 */
const PROJECT_PLANNER_TEMPLATE: PromptTemplate = {
  id: 'project-planner-v1',
  name: '프로젝트 계획기',
  description: '요구사항을 바탕으로 상세 프로젝트 계획을 수립합니다',
  skillType: 'project-planner',
  systemPrompt: `당신은 경험 많은 프로젝트 매니저입니다.
요구사항과 제약 조건을 바탕으로 실행 가능한 프로젝트 계획을 수립합니다.

계획 수립 시 다음을 고려합니다:
1. 애자일/스크럼 방법론 적용
2. 리소스 제약과 역량 고려
3. 위험 기반 일정 산정 (PERT)
4. 마일스톤과 산출물 정의
5. 리스크 관리 계획

응답은 반드시 JSON 형식으로 제공하세요.`,
  userPromptTemplate: `다음 정보를 바탕으로 프로젝트 계획을 수립해주세요:

**프로젝트명**: {{projectName}}
**시작일**: {{startDate}}
{{#if targetEndDate}}**목표 종료일**: {{targetEndDate}}{{/if}}
**요구사항**:
{{requirements}}
{{#if teamSize}}**팀 규모**: {{teamSize}}명{{/if}}
{{#if teamComposition}}**팀 구성**: {{teamComposition}}{{/if}}
{{#if budgetConstraint}}**예산 제약**: {{budgetConstraint}}원{{/if}}
**우선순위 모드**: {{priorityMode}}
{{#if sprintLength}}**스프린트 길이**: {{sprintLength}}일{{/if}}
{{#if techStack}}**기술 스택**: {{techStack}}{{/if}}

다음 JSON 형식으로 응답해주세요:
{
  "projectSummary": { /* ProjectSummary */ },
  "sprintPlan": [ /* SprintPlan[] */ ],
  "milestones": [ /* PlannedMilestone[] */ ],
  "resourceAllocation": [ /* ResourceAllocation[] */ ],
  "risks": [ /* ProjectRisk[] */ ],
  "estimatedSchedule": { /* ScheduleEstimate */ },
  "recommendations": [ /* 권장 사항 목록 */ ]
}`,
  variables: ['projectName', 'startDate', 'targetEndDate', 'requirements', 'teamSize', 'teamComposition', 'budgetConstraint', 'priorityMode', 'sprintLength', 'techStack'],
  version: '1.0.0',
  serviceId: 'minu-build',
};

/**
 * 운영 보고서 작성기 프롬프트 템플릿
 */
const OPS_REPORT_TEMPLATE: PromptTemplate = {
  id: 'ops-report-writer-v1',
  name: '운영 보고서 작성기',
  description: '운영 데이터를 바탕으로 보고서를 작성합니다',
  skillType: 'ops-report-writer',
  systemPrompt: `당신은 전문 운영 보고서 작성자입니다.
운영 지표, 장애, 변경 사항 데이터를 바탕으로 체계적인 보고서를 작성합니다.

보고서 작성 시 다음을 포함합니다:
1. 핵심 지표 요약 및 트렌드
2. 장애 분석 및 근본 원인
3. 변경 관리 결과
4. 개선 권고사항
5. 다음 기간 계획

대상 청중(executive/technical/stakeholder)에 맞게 톤과 상세도를 조절하세요.
응답은 반드시 JSON 형식으로 제공하세요.`,
  userPromptTemplate: `다음 운영 데이터를 바탕으로 {{reportType}} 보고서를 작성해주세요:

**서비스명**: {{serviceName}}
**보고 기간**: {{reportingPeriod.startDate}} ~ {{reportingPeriod.endDate}}
**대상 청중**: {{audience}}

{{#if metrics}}**운영 지표**:
{{metrics}}{{/if}}

{{#if incidents}}**장애/이슈 목록**:
{{incidents}}{{/if}}

{{#if changes}}**변경 사항**:
{{changes}}{{/if}}

{{#if additionalNotes}}**추가 노트**: {{additionalNotes}}{{/if}}

다음 JSON 형식으로 응답해주세요:
{
  "reportData": { /* OpsReportData */ },
  "executiveSummary": "/* 요약 */",
  "highlights": [ /* 주요 하이라이트 */ ],
  "recommendations": [ /* OpsRecommendation[] */ ],
  "nextPeriodPlan": { /* NextPeriodPlan */ }
}`,
  variables: ['serviceName', 'reportingPeriod', 'reportType', 'audience', 'metrics', 'incidents', 'changes', 'additionalNotes'],
  version: '1.0.0',
  serviceId: 'minu-keep',
};

/**
 * 프롬프트 템플릿 맵
 */
const PROMPT_TEMPLATES: Record<ClaudeSkillType, PromptTemplate> = {
  'rfp-generator': RFP_GENERATOR_TEMPLATE,
  'requirements-analyzer': REQUIREMENTS_ANALYZER_TEMPLATE,
  'project-planner': PROJECT_PLANNER_TEMPLATE,
  'ops-report-writer': OPS_REPORT_TEMPLATE,
};

// ============================================================================
// 캐시 관리
// ============================================================================

/** 메모리 캐시 */
const skillCache = new Map<string, SkillCacheEntry<unknown>>();

/**
 * 캐시 키 생성
 */
function generateCacheKey(skillType: ClaudeSkillType, input: unknown): string {
  const inputStr = JSON.stringify(input);
  return `${skillType}:${hashString(inputStr)}`;
}

/**
 * 간단한 문자열 해시
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 캐시에서 가져오기
 */
function getFromCache<T>(key: string): T | null {
  const entry = skillCache.get(key) as SkillCacheEntry<T> | undefined;
  if (!entry) return null;

  if (new Date() > entry.expiresAt) {
    skillCache.delete(key);
    return null;
  }

  entry.hitCount++;
  return entry.data;
}

/**
 * 캐시에 저장
 */
function setToCache<T>(key: string, data: T, ttlSeconds: number): void {
  const now = new Date();
  const entry: SkillCacheEntry<T> = {
    key,
    data,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    hitCount: 0,
  };
  skillCache.set(key, entry);
}

/**
 * 캐시 삭제
 */
function clearCache(skillType?: ClaudeSkillType): void {
  if (skillType) {
    const prefix = `${skillType}:`;
    for (const key of skillCache.keys()) {
      if (key.startsWith(prefix)) {
        skillCache.delete(key);
      }
    }
  } else {
    skillCache.clear();
  }
}

// ============================================================================
// 프롬프트 렌더링
// ============================================================================

/**
 * 프롬프트 변수 치환
 */
function renderPrompt(template: string, variables: Record<string, unknown>): string {
  let result = template;

  // 조건부 블록 처리 {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, varName, content) => {
    const value = variables[varName];
    if (value !== undefined && value !== null && value !== '') {
      return content;
    }
    return '';
  });

  // 일반 변수 치환 {{variable}}
  const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  result = result.replace(variableRegex, (_, path) => {
    const parts = path.split('.');
    let value: unknown = variables;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return '';
      }
    }

    if (Array.isArray(value)) {
      return value.map((item, i) => `${i + 1}. ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value ?? '');
  });

  return result;
}

/**
 * 입력 데이터를 변수로 변환
 */
function inputToVariables<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Date) {
      variables[key] = value.toLocaleDateString('ko-KR');
    } else if (Array.isArray(value)) {
      variables[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      variables[key] = value;
    } else {
      variables[key] = value;
    }
  }

  return variables;
}

// ============================================================================
// JSON 파싱
// ============================================================================

/**
 * Claude 응답에서 JSON 추출 및 파싱
 */
function parseClaudeJsonResponse<T>(response: string): T {
  // JSON 블록 추출 시도
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1]) as T;
  }

  // 일반 JSON 객체 추출 시도
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as T;
  }

  throw new Error('응답에서 JSON을 찾을 수 없습니다');
}

// ============================================================================
// useClaudeSkill 훅
// ============================================================================

/**
 * Claude Skill 범용 훅
 *
 * @template TInput - 입력 타입
 * @template TOutput - 출력 타입
 * @param skillType - Skill 유형
 * @param defaultOptions - 기본 옵션
 *
 * @example
 * ```tsx
 * const { execute, status, progress, error, lastResult, isExecuting, cancel, reset } =
 *   useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>('rfp-generator');
 *
 * const handleGenerate = async () => {
 *   const result = await execute({
 *     projectName: '스마트시티 구축',
 *     clientName: '서울시',
 *     background: '...',
 *     objectives: ['목표1', '목표2'],
 *     category: 'government',
 *   });
 *
 *   if (result.success) {
 *     console.log('RFP 생성 완료:', result.data);
 *   }
 * };
 * ```
 */
export function useClaudeSkill<TInput extends Record<string, unknown>, TOutput>(
  skillType: ClaudeSkillType,
  defaultOptions?: ClaudeSkillOptions
): UseClaudeSkillResult<TInput, TOutput> {
  // 상태
  const [status, setStatus] = useState<ClaudeSkillStatus>('idle');
  const [progress, setProgress] = useState<ClaudeSkillProgress | null>(null);
  const [error, setError] = useState<ClaudeSkillError | null>(null);
  const [lastResult, setLastResult] = useState<ClaudeSkillResult<TOutput> | null>(null);
  const [cachedResult, setCachedResult] = useState<ClaudeSkillResult<TOutput> | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Claude 훅
  const claude = useClaudeStreaming({
    model: defaultOptions?.model ?? DEFAULT_CLAUDE_MODEL,
    maxTokens: defaultOptions?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: defaultOptions?.temperature ?? 0.3,
    streaming: false, // JSON 응답이므로 스트리밍 비활성화
  });

  // DB 템플릿 가져오기 (시스템 템플릿 + 활성 상태)
  const { data: dbTemplatesResponse } = usePromptTemplates({
    skillType,
    isSystem: true,
    isActive: true,
    limit: 1, // 가장 최신 템플릿 1개만
    orderBy: 'updated_at',
    orderDirection: 'desc',
  });

  // 템플릿 가져오기 (DB 템플릿 우선, 없으면 하드코딩 템플릿 사용)
  const template = useMemo(() => {
    // DB 템플릿이 있으면 사용
    if (dbTemplatesResponse?.data && dbTemplatesResponse.data.length > 0) {
      const dbTemplate = dbTemplatesResponse.data[0];
      // PromptTemplate 타입으로 변환 (claude-skills.types.ts 형식)
      return {
        id: dbTemplate.id,
        name: dbTemplate.name,
        description: dbTemplate.description,
        skillType: dbTemplate.skillType,
        systemPrompt: dbTemplate.systemPrompt,
        userPromptTemplate: dbTemplate.userPromptTemplate,
        variables: dbTemplate.variables,
        version: dbTemplate.version,
        serviceId: dbTemplate.serviceId ?? undefined,
      } as PromptTemplate;
    }

    // Fallback: 하드코딩 템플릿
    return PROMPT_TEMPLATES[skillType];
  }, [skillType, dbTemplatesResponse]);

  // 클린업
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * 취소
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    claude.stopStreaming();
    setStatus('cancelled');
    setError(createClaudeSkillError('SKILL_006'));
  }, [claude]);

  /**
   * 리셋
   */
  const reset = useCallback(() => {
    cancel();
    setStatus('idle');
    setProgress(null);
    setError(null);
    setLastResult(null);
    setCachedResult(null);
  }, [cancel]);

  /**
   * 실행
   */
  const execute = useCallback(
    async (
      input: TInput,
      options?: ClaudeSkillOptions
    ): Promise<ClaudeSkillResult<TOutput>> => {
      const mergedOptions = { ...defaultOptions, ...options };
      const useCache = mergedOptions.useCache ?? true;
      const cacheTTL = mergedOptions.cacheTTL ?? DEFAULT_CACHE_TTL;
      const timeout = mergedOptions.timeout ?? DEFAULT_SKILL_TIMEOUT;

      // 캐시 확인
      if (useCache) {
        const cacheKey = generateCacheKey(skillType, input);
        const cached = getFromCache<TOutput>(cacheKey);
        if (cached) {
          const result: ClaudeSkillResult<TOutput> = {
            success: true,
            data: cached,
            generatedAt: new Date(),
            processingTime: 0,
            cached: true,
          };
          setCachedResult(result);
          setLastResult(result);
          setStatus('completed');
          return result;
        }
      }

      // 초기화
      startTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();
      setStatus('generating');
      setProgress(calculateProgress('준비 중', 1, 5));
      setError(null);

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setError(createClaudeSkillError('SKILL_005'));
          setStatus('error');
        }
      }, timeout);

      try {
        // 프롬프트 렌더링
        setProgress(calculateProgress('프롬프트 준비', 2, 5));
        const variables = inputToVariables(input);
        const userPrompt = renderPrompt(template.userPromptTemplate, variables);

        // 진행 콜백
        if (mergedOptions.onProgress) {
          mergedOptions.onProgress(calculateProgress('AI 처리 중', 3, 5));
        }
        setProgress(calculateProgress('AI 처리 중', 3, 5));

        // Claude API 호출
        const response = await claude.sendMessage(userPrompt, {
          systemPrompt: template.systemPrompt,
          model: mergedOptions.model,
          maxTokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature,
          streaming: false,
        });

        clearTimeout(timeoutId);

        // 취소 확인
        if (abortControllerRef.current?.signal.aborted) {
          throw createClaudeSkillError('SKILL_006');
        }

        // 응답 파싱
        setProgress(calculateProgress('결과 처리', 4, 5));
        let parsedData: TOutput;
        try {
          parsedData = parseClaudeJsonResponse<TOutput>(response);
        } catch (parseError) {
          throw createClaudeSkillError(
            'SKILL_003',
            parseError instanceof Error ? parseError.message : '파싱 실패'
          );
        }

        // 캐시 저장
        if (useCache) {
          const cacheKey = generateCacheKey(skillType, input);
          setToCache(cacheKey, parsedData, cacheTTL);
        }

        // 완료
        setProgress(calculateProgress('완료', 5, 5));
        const processingTime = Date.now() - startTimeRef.current;

        const result: ClaudeSkillResult<TOutput> = {
          success: true,
          data: parsedData,
          usage: claude.state.lastUsage ?? undefined,
          generatedAt: new Date(),
          processingTime,
          cached: false,
        };

        setLastResult(result);
        setStatus('completed');
        abortControllerRef.current = null;

        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        const processingTime = Date.now() - startTimeRef.current;

        const skillError = isClaudeSkillError(err)
          ? err
          : createClaudeSkillError(
              'SKILL_008',
              err instanceof Error ? err.message : String(err)
            );

        setError(skillError);
        setStatus('error');
        abortControllerRef.current = null;

        const result: ClaudeSkillResult<TOutput> = {
          success: false,
          error: skillError,
          generatedAt: new Date(),
          processingTime,
        };

        setLastResult(result);
        return result;
      }
    },
    [skillType, template, claude, defaultOptions]
  );

  return {
    execute,
    cancel,
    reset,
    status,
    progress,
    error,
    lastResult,
    isExecuting: status === 'generating' || status === 'analyzing' || status === 'processing',
    cachedResult,
  };
}

// ============================================================================
// 특화된 Skill 훅들
// ============================================================================

/**
 * RFP 생성 훅
 *
 * @example
 * ```tsx
 * const { generateRFP, isGenerating, progress, error, result } = useRFPGenerator();
 *
 * const handleGenerate = async () => {
 *   const result = await generateRFP({
 *     projectName: '스마트시티 구축',
 *     clientName: '서울시',
 *     background: '도시 인프라 현대화...',
 *     objectives: ['교통 최적화', '에너지 효율화'],
 *     category: 'government',
 *   });
 *
 *   if (result.success) {
 *     console.log('RFP:', result.data);
 *   }
 * };
 * ```
 */
export function useRFPGenerator(defaultOptions?: ClaudeSkillOptions) {
  const skill = useClaudeSkill<RFPGeneratorInput, RFPGeneratorOutput>(
    'rfp-generator',
    defaultOptions
  );

  return {
    generateRFP: skill.execute,
    isGenerating: skill.isExecuting,
    progress: skill.progress,
    error: skill.error,
    result: skill.lastResult,
    cancel: skill.cancel,
    reset: skill.reset,
  };
}

/**
 * 요구사항 분석 훅
 *
 * @example
 * ```tsx
 * const { analyzeRequirements, isAnalyzing, progress, error, result } = useRequirementsAnalyzer();
 *
 * const handleAnalyze = async () => {
 *   const result = await analyzeRequirements({
 *     projectName: '프로젝트 A',
 *     rawRequirements: '사용자는 로그인할 수 있어야 한다...',
 *     analysisDepth: 'detailed',
 *   });
 *
 *   if (result.success) {
 *     console.log('분석 결과:', result.data.structuredRequirements);
 *   }
 * };
 * ```
 */
export function useRequirementsAnalyzer(defaultOptions?: ClaudeSkillOptions) {
  const skill = useClaudeSkill<RequirementsAnalyzerInput, RequirementsAnalyzerOutput>(
    'requirements-analyzer',
    defaultOptions
  );

  return {
    analyzeRequirements: skill.execute,
    isAnalyzing: skill.isExecuting,
    progress: skill.progress,
    error: skill.error,
    result: skill.lastResult,
    cancel: skill.cancel,
    reset: skill.reset,
  };
}

/**
 * 프로젝트 계획 훅
 *
 * @example
 * ```tsx
 * const { createPlan, isPlanning, progress, error, result } = useProjectPlanner();
 *
 * const handlePlan = async () => {
 *   const result = await createPlan({
 *     projectName: '프로젝트 A',
 *     requirements: ['요구사항1', '요구사항2'],
 *     startDate: new Date(),
 *     teamSize: 5,
 *     priorityMode: 'balanced',
 *   });
 *
 *   if (result.success) {
 *     console.log('스프린트 계획:', result.data.sprintPlan);
 *   }
 * };
 * ```
 */
export function useProjectPlanner(defaultOptions?: ClaudeSkillOptions) {
  const skill = useClaudeSkill<ProjectPlannerInput, ProjectPlannerOutput>(
    'project-planner',
    defaultOptions
  );

  return {
    createPlan: skill.execute,
    isPlanning: skill.isExecuting,
    progress: skill.progress,
    error: skill.error,
    result: skill.lastResult,
    cancel: skill.cancel,
    reset: skill.reset,
  };
}

/**
 * 운영 보고서 작성 훅
 *
 * @example
 * ```tsx
 * const { writeReport, isWriting, progress, error, result } = useOpsReportWriter();
 *
 * const handleWrite = async () => {
 *   const result = await writeReport({
 *     serviceName: '서비스 A',
 *     reportingPeriod: { startDate: new Date('2025-11-01'), endDate: new Date('2025-11-30') },
 *     reportType: 'monthly',
 *     audience: 'executive',
 *     metrics: { availability: 99.9, avgResponseTime: 200 },
 *   });
 *
 *   if (result.success) {
 *     console.log('요약:', result.data.executiveSummary);
 *   }
 * };
 * ```
 */
export function useOpsReportWriter(defaultOptions?: ClaudeSkillOptions) {
  const skill = useClaudeSkill<OpsReportInput, OpsReportOutput>(
    'ops-report-writer',
    defaultOptions
  );

  return {
    writeReport: skill.execute,
    isWriting: skill.isExecuting,
    progress: skill.progress,
    error: skill.error,
    result: skill.lastResult,
    cancel: skill.cancel,
    reset: skill.reset,
  };
}

// ============================================================================
// 유틸리티 함수 내보내기
// ============================================================================

export { clearCache as clearSkillCache };
export { PROMPT_TEMPLATES };

export default useClaudeSkill;
