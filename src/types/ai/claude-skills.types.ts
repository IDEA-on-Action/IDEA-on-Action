/**
 * Claude Skills 타입 정의
 *
 * Claude AI를 활용한 문서 생성 Skills의 입출력 타입
 * - RFP 생성기
 * - 요구사항 분석기
 * - 프로젝트 계획기
 * - 운영 보고서 작성기
 *
 * @module types/claude-skills
 */

import type { ClaudeError, ClaudeModel, ClaudeUsage } from './claude.types';
import type { TemplateData, RFPCategory, ReportCategory } from '../documents/docx.types';

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * Skill 유형
 */
export type ClaudeSkillType =
  | 'rfp-generator'
  | 'requirements-analyzer'
  | 'project-planner'
  | 'ops-report-writer';

/**
 * Skill 상태
 */
export type ClaudeSkillStatus =
  | 'idle'
  | 'generating'
  | 'analyzing'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * 진행 상태
 */
export interface ClaudeSkillProgress {
  /** 현재 단계 (0-100) */
  percent: number;
  /** 현재 단계 설명 */
  stage: string;
  /** 세부 메시지 */
  message?: string;
  /** 예상 남은 시간 (초) */
  estimatedTimeRemaining?: number;
}

/**
 * Claude Skill 에러
 */
export interface ClaudeSkillError {
  /** 에러 코드 */
  code: ClaudeSkillErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** 원본 Claude 에러 */
  cause?: ClaudeError;
  /** 타임스탬프 */
  timestamp: string;
  /** 재시도 가능 여부 */
  retryable: boolean;
}

/**
 * Claude Skill 에러 코드
 */
export type ClaudeSkillErrorCode =
  | 'SKILL_001'  // 입력 데이터 유효성 검사 실패
  | 'SKILL_002'  // Claude API 호출 실패
  | 'SKILL_003'  // 응답 파싱 실패
  | 'SKILL_004'  // 문서 생성 실패
  | 'SKILL_005'  // 타임아웃
  | 'SKILL_006'  // 취소됨
  | 'SKILL_007'  // 권한 없음
  | 'SKILL_008'  // 알 수 없는 에러
  | 'SKILL_009'  // 템플릿 없음
  | 'SKILL_010'; // 캐시 오류

/**
 * 에러 코드별 메시지 매핑
 */
export const CLAUDE_SKILL_ERROR_MESSAGES: Record<ClaudeSkillErrorCode, string> = {
  SKILL_001: '입력 데이터가 유효하지 않습니다',
  SKILL_002: 'Claude API 호출에 실패했습니다',
  SKILL_003: '응답을 파싱하는 데 실패했습니다',
  SKILL_004: '문서 생성에 실패했습니다',
  SKILL_005: '요청 시간이 초과되었습니다',
  SKILL_006: '요청이 취소되었습니다',
  SKILL_007: '이 기능을 사용할 권한이 없습니다',
  SKILL_008: '알 수 없는 에러가 발생했습니다',
  SKILL_009: '요청한 템플릿을 찾을 수 없습니다',
  SKILL_010: '캐시 처리 중 오류가 발생했습니다',
};

// ============================================================================
// Skill 옵션 및 결과 공통 타입
// ============================================================================

/**
 * Claude Skill 기본 옵션
 */
export interface ClaudeSkillOptions {
  /** 사용할 모델 */
  model?: ClaudeModel;
  /** 최대 토큰 */
  maxTokens?: number;
  /** 온도 (0.0 ~ 1.0) */
  temperature?: number;
  /** 타임아웃 (ms) */
  timeout?: number;
  /** 캐시 사용 여부 */
  useCache?: boolean;
  /** 캐시 TTL (초) */
  cacheTTL?: number;
  /** 진행 콜백 */
  onProgress?: (progress: ClaudeSkillProgress) => void;
  /** 서비스 ID (Minu 시리즈) */
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
}

/**
 * Claude Skill 기본 결과
 */
export interface ClaudeSkillResult<T = unknown> {
  /** 성공 여부 */
  success: boolean;
  /** 결과 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: ClaudeSkillError;
  /** 토큰 사용량 */
  usage?: ClaudeUsage;
  /** 생성 시간 */
  generatedAt: Date;
  /** 처리 시간 (ms) */
  processingTime: number;
  /** 캐시 히트 여부 */
  cached?: boolean;
}

// ============================================================================
// RFP Generator 타입
// ============================================================================

/**
 * RFP 생성기 입력
 */
export interface RFPGeneratorInput {
  /** 프로젝트명 */
  projectName: string;
  /** 고객/기관명 */
  clientName: string;
  /** 프로젝트 배경 및 목적 */
  background: string;
  /** 주요 목표 */
  objectives: string[];
  /** 예상 예산 */
  budget?: number;
  /** 예상 기간 */
  duration?: {
    startDate: Date;
    endDate?: Date;
  };
  /** 추가 요구사항 (자유 텍스트) */
  additionalRequirements?: string;
  /** RFP 카테고리 */
  category: RFPCategory;
  /** 산업 분야 */
  industry?: string;
  /** 기술 스택 힌트 */
  techStackHints?: string[];
}

/**
 * RFP 생성기 출력
 */
export interface RFPGeneratorOutput {
  /** 생성된 RFP 데이터 */
  rfpData: TemplateData;
  /** 요구사항 목록 */
  requirements: RFPRequirement[];
  /** 평가 기준 */
  evaluationCriteria: EvaluationCriterion[];
  /** 제안 일정 */
  proposedTimeline: ProposedTimelineItem[];
  /** 예상 산출물 */
  deliverables: string[];
  /** 리스크 목록 */
  risks: RFPRisk[];
  /** AI 생성 요약 */
  summary: string;
}

/**
 * RFP 요구사항
 */
export interface RFPRequirement {
  /** 요구사항 ID */
  id: string;
  /** 카테고리 */
  category: 'functional' | 'non-functional' | 'technical' | 'business';
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 우선순위 */
  priority: 'must' | 'should' | 'could' | 'wont';
  /** 복잡도 */
  complexity?: 'low' | 'medium' | 'high';
}

/**
 * 평가 기준
 */
export interface EvaluationCriterion {
  /** 기준 ID */
  id: string;
  /** 기준명 */
  name: string;
  /** 설명 */
  description: string;
  /** 배점 */
  weight: number;
  /** 세부 항목 */
  subCriteria?: string[];
}

/**
 * 제안 일정 항목
 */
export interface ProposedTimelineItem {
  /** 단계 ID */
  id: string;
  /** 단계명 */
  phase: string;
  /** 설명 */
  description: string;
  /** 기간 (일) */
  durationDays: number;
  /** 마일스톤 */
  milestones?: string[];
}

/**
 * RFP 리스크
 */
export interface RFPRisk {
  /** 리스크 ID */
  id: string;
  /** 리스크명 */
  name: string;
  /** 설명 */
  description: string;
  /** 영향도 */
  impact: 'low' | 'medium' | 'high';
  /** 발생 확률 */
  probability: 'low' | 'medium' | 'high';
  /** 대응 방안 */
  mitigation: string;
}

// ============================================================================
// Requirements Analyzer 타입
// ============================================================================

/**
 * 요구사항 분석기 입력
 */
export interface RequirementsAnalyzerInput {
  /** 프로젝트명 */
  projectName: string;
  /** 원시 요구사항 텍스트 */
  rawRequirements: string;
  /** 추가 컨텍스트 */
  context?: string;
  /** 분석 깊이 */
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  /** 포함할 분석 유형 */
  includeAnalysis?: ('gaps' | 'dependencies' | 'priorities' | 'risks')[];
  /** 산업 분야 */
  industry?: string;
}

/**
 * 요구사항 분석기 출력
 */
export interface RequirementsAnalyzerOutput {
  /** 구조화된 요구사항 */
  structuredRequirements: AnalyzedRequirement[];
  /** 요구사항 갭 분석 */
  gapAnalysis?: GapAnalysisResult;
  /** 의존성 매트릭스 */
  dependencyMatrix?: DependencyItem[];
  /** 우선순위 추천 */
  priorityRecommendations?: PriorityRecommendation[];
  /** 리스크 분석 */
  riskAnalysis?: RequirementRisk[];
  /** 분석 요약 */
  summary: string;
  /** 권장 사항 */
  recommendations: string[];
}

/**
 * 분석된 요구사항
 */
export interface AnalyzedRequirement {
  /** 요구사항 ID */
  id: string;
  /** 원본 텍스트 */
  originalText: string;
  /** 구조화된 제목 */
  title: string;
  /** 명확화된 설명 */
  clarifiedDescription: string;
  /** 유형 */
  type: 'functional' | 'non-functional' | 'constraint' | 'assumption';
  /** 명확성 점수 (0-100) */
  clarityScore: number;
  /** 완전성 점수 (0-100) */
  completenessScore: number;
  /** 개선 제안 */
  improvementSuggestions?: string[];
}

/**
 * 갭 분석 결과
 */
export interface GapAnalysisResult {
  /** 누락된 영역 */
  missingAreas: string[];
  /** 불명확한 부분 */
  ambiguousAreas: string[];
  /** 중복 영역 */
  duplicateAreas: string[];
  /** 권장 추가 요구사항 */
  suggestedAdditions: string[];
}

/**
 * 의존성 항목
 */
export interface DependencyItem {
  /** 소스 요구사항 ID */
  sourceId: string;
  /** 대상 요구사항 ID */
  targetId: string;
  /** 의존성 유형 */
  type: 'blocks' | 'requires' | 'related';
  /** 설명 */
  description?: string;
}

/**
 * 우선순위 추천
 */
export interface PriorityRecommendation {
  /** 요구사항 ID */
  requirementId: string;
  /** 추천 우선순위 */
  recommendedPriority: 'must' | 'should' | 'could' | 'wont';
  /** 근거 */
  rationale: string;
  /** 비즈니스 가치 점수 (1-10) */
  businessValueScore: number;
  /** 구현 복잡도 점수 (1-10) */
  complexityScore: number;
}

/**
 * 요구사항 리스크
 */
export interface RequirementRisk {
  /** 요구사항 ID */
  requirementId: string;
  /** 리스크 유형 */
  riskType: 'scope-creep' | 'ambiguity' | 'dependency' | 'technical' | 'resource';
  /** 설명 */
  description: string;
  /** 심각도 */
  severity: 'low' | 'medium' | 'high';
  /** 대응 방안 */
  mitigation: string;
}

// ============================================================================
// Project Planner 타입
// ============================================================================

/**
 * 프로젝트 계획기 입력
 */
export interface ProjectPlannerInput {
  /** 프로젝트명 */
  projectName: string;
  /** 요구사항 목록 */
  requirements: string[] | RFPRequirement[];
  /** 예상 시작일 */
  startDate: Date;
  /** 목표 종료일 */
  targetEndDate?: Date;
  /** 팀 규모 */
  teamSize?: number;
  /** 팀 구성 */
  teamComposition?: {
    role: string;
    count: number;
    skills?: string[];
  }[];
  /** 예산 제약 */
  budgetConstraint?: number;
  /** 우선순위 모드 */
  priorityMode?: 'time' | 'cost' | 'quality' | 'balanced';
  /** 스프린트 길이 (일) */
  sprintLength?: number;
  /** 기술 스택 */
  techStack?: string[];
}

/**
 * 프로젝트 계획기 출력
 */
export interface ProjectPlannerOutput {
  /** 프로젝트 요약 */
  projectSummary: ProjectSummary;
  /** 스프린트 계획 */
  sprintPlan: SprintPlan[];
  /** 마일스톤 */
  milestones: PlannedMilestone[];
  /** 리소스 할당 */
  resourceAllocation: ResourceAllocation[];
  /** 리스크 목록 */
  risks: ProjectRisk[];
  /** 예상 일정 */
  estimatedSchedule: ScheduleEstimate;
  /** 권장 사항 */
  recommendations: string[];
}

/**
 * 프로젝트 요약
 */
export interface ProjectSummary {
  /** 프로젝트명 */
  name: string;
  /** 목표 */
  objective: string;
  /** 범위 요약 */
  scopeSummary: string;
  /** 예상 기간 (일) */
  estimatedDurationDays: number;
  /** 예상 인력 (MM) */
  estimatedEffort: number;
  /** 예상 비용 */
  estimatedCost?: number;
  /** 핵심 성공 요인 */
  criticalSuccessFactors: string[];
}

/**
 * 스프린트 계획
 */
export interface SprintPlan {
  /** 스프린트 번호 */
  number: number;
  /** 스프린트명 */
  name: string;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 목표 */
  goal: string;
  /** 작업 항목 */
  tasks: PlannedTask[];
  /** 스토리 포인트 */
  storyPoints: number;
  /** 위험도 */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 계획된 작업
 */
export interface PlannedTask {
  /** 작업 ID */
  id: string;
  /** 작업명 */
  title: string;
  /** 설명 */
  description: string;
  /** 예상 시간 (시간) */
  estimatedHours: number;
  /** 담당 역할 */
  assignedRole: string;
  /** 의존성 */
  dependencies?: string[];
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 관련 요구사항 ID */
  relatedRequirementIds?: string[];
}

/**
 * 계획된 마일스톤
 */
export interface PlannedMilestone {
  /** 마일스톤 ID */
  id: string;
  /** 마일스톤명 */
  name: string;
  /** 설명 */
  description: string;
  /** 목표일 */
  targetDate: Date;
  /** 산출물 */
  deliverables: string[];
  /** 검증 기준 */
  acceptanceCriteria: string[];
}

/**
 * 리소스 할당
 */
export interface ResourceAllocation {
  /** 역할 */
  role: string;
  /** 인원 수 */
  headcount: number;
  /** 할당률 (%) */
  allocationPercent: number;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 주요 책임 */
  responsibilities: string[];
}

/**
 * 프로젝트 리스크
 */
export interface ProjectRisk {
  /** 리스크 ID */
  id: string;
  /** 리스크명 */
  name: string;
  /** 설명 */
  description: string;
  /** 영향도 */
  impact: 'low' | 'medium' | 'high' | 'critical';
  /** 발생 확률 */
  probability: 'low' | 'medium' | 'high';
  /** 대응 전략 */
  strategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  /** 대응 계획 */
  mitigationPlan: string;
  /** 담당자 역할 */
  owner: string;
}

/**
 * 일정 추정
 */
export interface ScheduleEstimate {
  /** 최적 일정 (일) */
  optimistic: number;
  /** 예상 일정 (일) */
  mostLikely: number;
  /** 비관적 일정 (일) */
  pessimistic: number;
  /** 신뢰도 (%) */
  confidence: number;
  /** 크리티컬 패스 */
  criticalPath: string[];
}

// ============================================================================
// Ops Report Writer 타입
// ============================================================================

/**
 * 운영 보고서 작성기 입력
 */
export interface OpsReportInput {
  /** 서비스/프로젝트명 */
  serviceName: string;
  /** 보고 기간 */
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  /** 보고서 유형 */
  reportType: ReportCategory;
  /** 운영 지표 데이터 */
  metrics?: OpsMetrics;
  /** 장애/이슈 목록 */
  incidents?: OpsIncident[];
  /** 변경 사항 */
  changes?: OpsChange[];
  /** 추가 노트 */
  additionalNotes?: string;
  /** 수신자 */
  audience?: 'executive' | 'technical' | 'stakeholder';
}

/**
 * 운영 지표
 */
export interface OpsMetrics {
  /** 가용률 (%) */
  availability?: number;
  /** 평균 응답 시간 (ms) */
  avgResponseTime?: number;
  /** 에러율 (%) */
  errorRate?: number;
  /** 트래픽 (요청 수) */
  totalRequests?: number;
  /** 사용자 수 */
  activeUsers?: number;
  /** SLA 준수율 (%) */
  slaCompliance?: number;
  /** 커스텀 지표 */
  customMetrics?: Record<string, number>;
}

/**
 * 운영 장애
 */
export interface OpsIncident {
  /** 장애 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 심각도 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 발생 시각 */
  occurredAt: Date;
  /** 해결 시각 */
  resolvedAt?: Date;
  /** 영향 범위 */
  impactScope: string;
  /** 근본 원인 */
  rootCause?: string;
  /** 해결 방법 */
  resolution?: string;
  /** 재발 방지 조치 */
  preventiveMeasures?: string[];
}

/**
 * 운영 변경 사항
 */
export interface OpsChange {
  /** 변경 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 유형 */
  type: 'deployment' | 'config' | 'infrastructure' | 'security' | 'other';
  /** 적용 일시 */
  appliedAt: Date;
  /** 영향 범위 */
  impact: string;
  /** 상태 */
  status: 'success' | 'partial' | 'rollback';
}

/**
 * 운영 보고서 작성기 출력
 */
export interface OpsReportOutput {
  /** 보고서 데이터 */
  reportData: OpsReportData;
  /** 요약 */
  executiveSummary: string;
  /** 주요 하이라이트 */
  highlights: string[];
  /** 개선 권고사항 */
  recommendations: OpsRecommendation[];
  /** 다음 기간 계획 */
  nextPeriodPlan: NextPeriodPlan;
}

/**
 * 운영 보고서 데이터
 */
export interface OpsReportData {
  /** 서비스명 */
  serviceName: string;
  /** 보고 기간 */
  period: string;
  /** 전체 상태 */
  overallStatus: 'healthy' | 'degraded' | 'critical';
  /** 지표 요약 */
  metricsSummary: MetricsSummary;
  /** 장애 요약 */
  incidentsSummary: IncidentsSummary;
  /** 변경 요약 */
  changesSummary: ChangesSummary;
}

/**
 * 지표 요약
 */
export interface MetricsSummary {
  /** 가용률 */
  availability: string;
  /** 응답 시간 */
  responseTime: string;
  /** 에러율 */
  errorRate: string;
  /** 전 기간 대비 변화 */
  comparison: {
    metric: string;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

/**
 * 장애 요약
 */
export interface IncidentsSummary {
  /** 총 장애 수 */
  total: number;
  /** 심각도별 분포 */
  bySeverity: Record<string, number>;
  /** 평균 해결 시간 (분) */
  avgResolutionTime: number;
  /** 가장 영향력 있던 장애 */
  topIncident?: string;
}

/**
 * 변경 요약
 */
export interface ChangesSummary {
  /** 총 변경 수 */
  total: number;
  /** 유형별 분포 */
  byType: Record<string, number>;
  /** 성공률 */
  successRate: number;
}

/**
 * 운영 권고사항
 */
export interface OpsRecommendation {
  /** 권고 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
  /** 예상 효과 */
  expectedImpact: string;
  /** 예상 노력 */
  estimatedEffort: 'low' | 'medium' | 'high';
  /** 담당 영역 */
  area: 'performance' | 'reliability' | 'security' | 'cost' | 'process';
}

/**
 * 다음 기간 계획
 */
export interface NextPeriodPlan {
  /** 주요 목표 */
  goals: string[];
  /** 계획된 작업 */
  plannedTasks: string[];
  /** 예상 리스크 */
  anticipatedRisks: string[];
  /** 필요 리소스 */
  resourceNeeds: string[];
}

// ============================================================================
// 훅 결과 타입
// ============================================================================

/**
 * useClaudeSkill 훅 결과
 */
export interface UseClaudeSkillResult<TInput, TOutput> {
  /** 실행 함수 */
  execute: (input: TInput, options?: ClaudeSkillOptions) => Promise<ClaudeSkillResult<TOutput>>;
  /** 취소 함수 */
  cancel: () => void;
  /** 리셋 함수 */
  reset: () => void;
  /** 현재 상태 */
  status: ClaudeSkillStatus;
  /** 진행 상태 */
  progress: ClaudeSkillProgress | null;
  /** 에러 */
  error: ClaudeSkillError | null;
  /** 마지막 결과 */
  lastResult: ClaudeSkillResult<TOutput> | null;
  /** 실행 중 여부 */
  isExecuting: boolean;
  /** 캐시된 결과 */
  cachedResult: ClaudeSkillResult<TOutput> | null;
}

/**
 * RFP 생성기 훅 결과
 */
export type UseRFPGeneratorResult = UseClaudeSkillResult<RFPGeneratorInput, RFPGeneratorOutput>;

/**
 * 요구사항 분석기 훅 결과
 */
export type UseRequirementsAnalyzerResult = UseClaudeSkillResult<RequirementsAnalyzerInput, RequirementsAnalyzerOutput>;

/**
 * 프로젝트 계획기 훅 결과
 */
export type UseProjectPlannerResult = UseClaudeSkillResult<ProjectPlannerInput, ProjectPlannerOutput>;

/**
 * 운영 보고서 작성기 훅 결과
 */
export type UseOpsReportWriterResult = UseClaudeSkillResult<OpsReportInput, OpsReportOutput>;

// ============================================================================
// 프롬프트 템플릿 타입
// ============================================================================

/**
 * 프롬프트 템플릿
 */
export interface PromptTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 설명 */
  description: string;
  /** Skill 유형 */
  skillType: ClaudeSkillType;
  /** 시스템 프롬프트 */
  systemPrompt: string;
  /** 사용자 프롬프트 템플릿 */
  userPromptTemplate: string;
  /** 변수 목록 */
  variables: string[];
  /** 버전 */
  version: string;
  /** 서비스 ID */
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
}

/**
 * 프롬프트 변수 치환 결과
 */
export interface PromptRenderResult {
  /** 렌더링된 시스템 프롬프트 */
  systemPrompt: string;
  /** 렌더링된 사용자 프롬프트 */
  userPrompt: string;
  /** 사용된 변수 */
  usedVariables: string[];
  /** 누락된 변수 */
  missingVariables: string[];
}

// ============================================================================
// 캐시 타입
// ============================================================================

/**
 * 캐시 엔트리
 */
export interface SkillCacheEntry<T> {
  /** 캐시 키 */
  key: string;
  /** 캐시된 데이터 */
  data: T;
  /** 생성 시간 */
  createdAt: Date;
  /** 만료 시간 */
  expiresAt: Date;
  /** 히트 횟수 */
  hitCount: number;
}

/**
 * 캐시 통계
 */
export interface SkillCacheStats {
  /** 총 엔트리 수 */
  totalEntries: number;
  /** 히트 수 */
  hits: number;
  /** 미스 수 */
  misses: number;
  /** 히트율 (%) */
  hitRate: number;
  /** 총 크기 (bytes) */
  totalSize: number;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Claude Skill 에러 생성 헬퍼
 */
export function createClaudeSkillError(
  code: ClaudeSkillErrorCode,
  details?: string,
  cause?: ClaudeError
): ClaudeSkillError {
  const retryableCodes: ClaudeSkillErrorCode[] = ['SKILL_002', 'SKILL_005', 'SKILL_010'];

  return {
    code,
    message: CLAUDE_SKILL_ERROR_MESSAGES[code],
    details,
    cause,
    timestamp: new Date().toISOString(),
    retryable: retryableCodes.includes(code),
  };
}

/**
 * Claude Skill 에러 타입 가드
 */
export function isClaudeSkillError(error: unknown): error is ClaudeSkillError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ClaudeSkillError).code === 'string' &&
    (error as ClaudeSkillError).code.startsWith('SKILL_')
  );
}

/**
 * 진행률 계산
 */
export function calculateProgress(
  stage: string,
  currentStep: number,
  totalSteps: number
): ClaudeSkillProgress {
  return {
    percent: Math.round((currentStep / totalSteps) * 100),
    stage,
    message: `${currentStep}/${totalSteps} 단계 완료`,
  };
}
