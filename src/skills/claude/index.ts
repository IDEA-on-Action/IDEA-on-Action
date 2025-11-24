/**
 * Claude AI Skills 모듈
 *
 * Claude AI를 활용한 문서 생성 및 분석 기능
 * - 통합 Skill 훅 (useClaudeSkill, useRFPGenerator 등)
 * - 개별 생성기 (RFP, 요구사항, 프로젝트 계획, 운영 보고서)
 * - 문서 변환 유틸리티 (documentBridge)
 *
 * @module skills/claude
 */

// ============================================================================
// Claude Skills 타입 (claude-skills.types)
// ============================================================================

export type {
  // 공통 타입
  ClaudeSkillType,
  ClaudeSkillStatus,
  ClaudeSkillProgress,
  ClaudeSkillError,
  ClaudeSkillErrorCode,
  ClaudeSkillOptions,
  ClaudeSkillResult,
  UseClaudeSkillResult,
  // RFP Generator 타입
  RFPGeneratorInput,
  RFPGeneratorOutput,
  RFPRequirement,
  ProposedTimelineItem,
  RFPRisk,
  // Requirements Analyzer 타입
  RequirementsAnalyzerInput,
  RequirementsAnalyzerOutput,
  AnalyzedRequirement,
  GapAnalysisResult,
  DependencyItem,
  PriorityRecommendation,
  RequirementRisk,
  // Project Planner 타입
  ProjectPlannerInput,
  ProjectPlannerOutput,
  ProjectSummary,
  PlannedTask,
  PlannedMilestone,
  ScheduleEstimate,
  // Ops Report Writer 타입
  OpsReportInput,
  OpsReportOutput,
  OpsMetrics,
  OpsIncident,
  OpsChange,
  OpsReportData,
  MetricsSummary,
  IncidentsSummary,
  ChangesSummary,
  OpsRecommendation,
  NextPeriodPlan,
  // 프롬프트 템플릿 타입
  PromptTemplate,
  PromptRenderResult,
  // 캐시 타입
  SkillCacheEntry,
  SkillCacheStats,
} from '@/types/claude-skills.types';

export {
  CLAUDE_SKILL_ERROR_MESSAGES,
  createClaudeSkillError,
  isClaudeSkillError,
  calculateProgress,
} from '@/types/claude-skills.types';

// ============================================================================
// 통합 훅 (useClaudeSkill)
// ============================================================================

export {
  useClaudeSkill,
  useRFPGenerator,
  useRequirementsAnalyzer,
  useProjectPlanner,
  useOpsReportWriter,
  clearSkillCache,
  PROMPT_TEMPLATES,
} from '@/hooks/useClaudeSkill';

// ============================================================================
// Minu Frame - 요구사항 작성 보조
// ============================================================================

export {
  // 프롬프트 생성
  createRequirementsAnalysisPrompt,
  createPriorityClassificationPrompt,
  createNFRSuggestionPrompt,
  // 변환 함수
  formatUserStory,
  generateAnalysisSummary,
  parseRequirementsAnalysisResponse,
  generateDefaultNFRs,
  generateRequirementId,
  estimateComplexity,
  // 상수
  REQUIREMENTS_ANALYSIS_SYSTEM_PROMPT,
  MOSCOW_LABELS,
  NFR_TYPE_LABELS,
  DEFAULT_NFR_TEMPLATES,
  // 타입
  type MoSCoWPriority,
  type RequirementCategory,
  type NonFunctionalType,
  type UserStoryInput,
  type FunctionalRequirement,
  type NonFunctionalRequirement,
  type RequirementsAnalysisResult,
  type AnalysisSummary,
  type RiskItem as RequirementsRiskItem,
  type RequirementsAnalysisOptions,
} from './generators/requirementsGenerator';

// ============================================================================
// Minu Keep - 운영 보고서 초안
// ============================================================================

export {
  // 프롬프트 생성
  createOperationsReportPrompt,
  createSLAAnalysisPrompt,
  createIncidentAnalysisPrompt,
  createNextMonthPlanPrompt,
  // 헬퍼 함수
  calculateSLAAchievementRate,
  calculateMTTR,
  calculateSeverityDistribution,
  calculateTotalDowntime,
  calculateAvailability,
  parseOperationsReportResponse,
  createDefaultMonthlyReportData,
  // 상수
  OPS_REPORT_SYSTEM_PROMPT,
  REPORT_TYPE_LABELS,
  SEVERITY_LABELS,
  IMPROVEMENT_CATEGORY_LABELS,
  STATUS_LABELS,
  // 타입
  type SLAMetric,
  type IncidentRecord,
  type ServiceStatusSummary,
  type ImprovementItem,
  type OperationsDataInput,
  type OperationsReportResult,
  type SLAAnalysisSection,
  type IncidentAnalysisSection,
  type ImprovementSuggestion,
  type NextMonthPlan,
  type RiskItem as OperationsRiskItem,
  type KeyMetric,
  type OperationsReportOptions,
} from './generators/opsReportGenerator';

// ============================================================================
// Minu Find - RFP 자동 생성
// ============================================================================

export {
  generateRFP,
  generateRFPStream,
  validateRFPInput,
  type RFPGenerateInput,
  type RFPGenerateOptions,
  type RFPGenerateResult,
  type RFPGenerationStage,
  type RFPSectionResult,
  type EvaluationCriterion,
} from './generators/rfpGenerator';

// ============================================================================
// Minu Build - 프로젝트 계획 생성
// ============================================================================

export {
  generateProjectPlan,
  convertToProjectReportData,
  validateProjectPlanInput,
  calculateTotalEstimatedHours,
  calculateTotalStoryPoints,
  type ProjectPlanInput,
  type ProjectPlanOptions,
  type ProjectPlanResult,
  type PlanGenerationStage,
  type GeneratedProjectPlan,
  type SprintPlan,
  type PlannedTask,
  type Milestone,
  type ResourceAllocation,
  type ProjectRisk,
  type SuccessMetric,
  type TeamRole,
} from './generators/projectPlanGenerator';

// ============================================================================
// Utils - 문서 변환 브릿지
// ============================================================================

export {
  convertRFPToDocxTemplate,
  convertRFPSectionsToDocxTemplate,
  convertProjectPlanToSheets,
  convertAIResult,
  extractJsonFromResponse,
  parseDate,
  parseMarketAnalysisResponse,
  convertEvaluationCriteriaToSheet,
  convertRequirementsToSheet,
  convertDeliverablesSheet,
  convertToDocxRisk,
  convertSprintToTimeline,
  convertSprintsToTimeline,
  convertResourcesToTeam,
  type ConversionResult,
  type DocumentType,
  type OutputFormat,
} from './utils/documentBridge';
