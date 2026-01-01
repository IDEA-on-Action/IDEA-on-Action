/**
 * docx 템플릿 렌더링 함수
 *
 * 템플릿을 기반으로 Word 문서 생성
 *
 * @module skills/docx/renderer
 */

import type {
  DocumentTemplate,
  RenderOptions,
  RenderResult,
  ValidationError,
} from './types';
import { TemplateEngine, generateFileName } from '@/lib/skills/template-engine';
import type { TemplateData, DocumentMetadata } from '@/types/documents/docx.types';

// ============================================================================
// 템플릿 레지스트리
// ============================================================================

/**
 * 템플릿 저장소 (싱글톤)
 */
class TemplateRegistry {
  private templates = new Map<string, DocumentTemplate>();

  /**
   * 템플릿 등록
   */
  register(template: DocumentTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 템플릿 조회
   */
  get(id: string): DocumentTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 모든 템플릿 조회
   */
  getAll(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 유형별 템플릿 조회
   */
  getByType(type: DocumentTemplate['type']): DocumentTemplate[] {
    return this.getAll().filter((t) => t.type === type);
  }

  /**
   * 템플릿 삭제
   */
  unregister(id: string): void {
    this.templates.delete(id);
  }
}

/**
 * 전역 템플릿 레지스트리 인스턴스
 */
export const templateRegistry = new TemplateRegistry();

// ============================================================================
// 템플릿 렌더링
// ============================================================================

/**
 * 템플릿 렌더링
 *
 * @param options - 렌더링 옵션
 * @returns 렌더링 결과
 *
 * @example
 * ```ts
 * const result = await renderTemplate({
 *   templateId: 'rfp-startup-mvp',
 *   variables: {
 *     projectName: 'AI 챗봇 서비스',
 *     startupName: '생각과행동',
 *     background: '...',
 *     // ...
 *   },
 * });
 *
 * if (result.success && result.blob) {
 *   downloadBlob(result.blob, result.fileName);
 * }
 * ```
 */
export async function renderTemplate(
  options: RenderOptions
): Promise<RenderResult> {
  try {
    // 1. 템플릿 조회
    const template = templateRegistry.get(options.templateId);
    if (!template) {
      return {
        success: false,
        fileName: '',
        error: `템플릿을 찾을 수 없습니다: ${options.templateId}`,
      };
    }

    // 2. 변수 검증
    const validationErrors = validateVariables(template, options.variables);
    if (validationErrors.length > 0) {
      return {
        success: false,
        fileName: '',
        error: '변수 검증 실패',
        validationErrors,
      };
    }

    // 3. 템플릿 데이터 변환
    const templateData = transformToTemplateData(template, options.variables);

    // 4. 문서 메타데이터 생성
    const metadata: DocumentMetadata = {
      title: String(options.variables.projectName || template.name),
      author: String(options.variables.author || '생각과행동'),
      createdAt: new Date(),
      description: template.description,
    };

    // 5. 템플릿 엔진으로 문서 생성
    const engine = new TemplateEngine(metadata, options.styles);
    const blob = await engine.generateDocument(
      getDocxTemplateType(template.type),
      'startup', // 기본 카테고리
      templateData
    );

    // 6. 파일명 생성
    const fileName =
      options.fileName ||
      generateFileName(
        getDocxTemplateType(template.type),
        String(options.variables.projectName || template.name)
      );

    return {
      success: true,
      blob,
      fileName,
    };
  } catch (err) {
    console.error('[renderTemplate] Error:', err);
    return {
      success: false,
      fileName: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 검증 함수
// ============================================================================

/**
 * 템플릿 변수 검증
 */
function validateVariables(
  template: DocumentTemplate,
  variables: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const variable of template.variables) {
    const value = variables[variable.key];

    // 필수 검증
    if (variable.required && (value === undefined || value === null)) {
      errors.push({
        key: variable.key,
        message: `${variable.label}은(는) 필수 항목입니다.`,
        type: 'required',
      });
      continue;
    }

    // 타입 검증
    if (value !== undefined && value !== null) {
      const typeValid = validateType(variable.type, value);
      if (!typeValid) {
        errors.push({
          key: variable.key,
          message: `${variable.label}의 타입이 올바르지 않습니다. (예상: ${variable.type})`,
          type: 'type',
        });
        continue;
      }

      // 검증 규칙 적용
      if (variable.validation) {
        const validationError = applyValidation(
          variable.key,
          variable.label,
          value,
          variable.validation
        );
        if (validationError) {
          errors.push(validationError);
        }
      }
    }
  }

  return errors;
}

/**
 * 타입 검증
 */
function validateType(expectedType: string, value: unknown): boolean {
  switch (expectedType) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'date':
      return value instanceof Date || typeof value === 'string';
    case 'list':
      return Array.isArray(value);
    case 'table':
      return Array.isArray(value);
    default:
      return true;
  }
}

/**
 * 검증 규칙 적용
 */
function applyValidation(
  key: string,
  label: string,
  value: unknown,
  validation: NonNullable<DocumentTemplate['variables'][0]['validation']>
): ValidationError | null {
  // 문자열 길이 검증
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return {
        key,
        message: `${label}은(는) 최소 ${validation.minLength}자 이상이어야 합니다.`,
        type: 'invalid',
      };
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return {
        key,
        message: `${label}은(는) 최대 ${validation.maxLength}자 이하여야 합니다.`,
        type: 'invalid',
      };
    }
  }

  // 숫자 범위 검증
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return {
        key,
        message: `${label}은(는) ${validation.min} 이상이어야 합니다.`,
        type: 'invalid',
      };
    }
    if (validation.max !== undefined && value > validation.max) {
      return {
        key,
        message: `${label}은(는) ${validation.max} 이하여야 합니다.`,
        type: 'invalid',
      };
    }
  }

  // 정규식 검증
  if (validation.pattern && typeof value === 'string') {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return {
        key,
        message: `${label}의 형식이 올바르지 않습니다.`,
        type: 'invalid',
      };
    }
  }

  // 커스텀 검증
  if (validation.custom && !validation.custom(value)) {
    return {
      key,
      message: `${label}이(가) 유효하지 않습니다.`,
      type: 'invalid',
    };
  }

  return null;
}

// ============================================================================
// 데이터 변환
// ============================================================================

/**
 * 템플릿 변수를 TemplateData로 변환
 */
function transformToTemplateData(
  template: DocumentTemplate,
  variables: Record<string, unknown>
): TemplateData {
  const data: Partial<TemplateData> = {
    projectName: String(variables.projectName || '프로젝트'),
    clientName: String(variables.clientName || variables.startupName || ''),
    background: String(variables.background || ''),
    objectives: Array.isArray(variables.coreFeatures)
      ? variables.coreFeatures.map(String)
      : [],
    scope: Array.isArray(variables.techStack)
      ? variables.techStack.map(String)
      : [],
  };

  // 날짜 변환
  if (variables.startDate) {
    data.startDate =
      variables.startDate instanceof Date
        ? variables.startDate
        : new Date(String(variables.startDate));
  }

  // 예산 변환
  if (typeof variables.budget === 'number') {
    data.budget = variables.budget;
  }

  return data as TemplateData;
}

/**
 * 템플릿 타입을 docx TemplateType으로 변환
 */
function getDocxTemplateType(
  type: DocumentTemplate['type']
): 'rfp' | 'report' | 'proposal' | 'contract' {
  if (type === 'manual') {
    return 'report'; // 매뉴얼은 보고서 형식으로 처리
  }
  return type;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Blob 다운로드 헬퍼
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
