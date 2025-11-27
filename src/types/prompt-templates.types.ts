/**
 * 프롬프트 템플릿 타입 정의
 *
 * @deprecated 이 파일은 더 이상 사용되지 않습니다.
 * @see prompt-template.types.ts - 대신 이 파일을 사용하세요.
 *
 * 이 파일은 이전 버전과의 호환성을 위해 유지되며,
 * 모든 타입은 prompt-template.types.ts에서 re-export됩니다.
 *
 * @module types/prompt-templates
 */

// 새로운 타입 파일에서 re-export
export type {
  PromptTemplate,
  PromptTemplateVariable,
  PromptTemplateCategory,
  MinuServiceId,
  PromptVariableType,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplateFilters,
  PromptTemplateSortBy,
  PromptTemplateSortOrder,
  PromptTemplateQueryOptions,
  RenderPromptInput,
  RenderPromptResult,
  ForkPromptTemplateInput,
  ForkPromptTemplateResult,
  UsePromptTemplatesResult,
  UsePromptTemplateResult,
  UseCreatePromptTemplateResult,
  UseUpdatePromptTemplateResult,
  UseDeletePromptTemplateResult,
  UseRenderPromptResult,
  UseForkPromptTemplateResult,
  UsePopularTemplatesResult,
} from './prompt-template.types';

export {
  validateTemplateVariables,
  interpolateTemplate,
  extractVariables,
  PROMPT_TEMPLATE_CATEGORY_LABELS,
  MINU_SERVICE_LABELS,
  PROMPT_VARIABLE_TYPE_LABELS,
} from './prompt-template.types';

// 구 타입 별칭 (deprecated) - 하위 호환성을 위해 유지
/** @deprecated Use PromptTemplateCategory instead */
export type SkillType = PromptTemplateCategory;
