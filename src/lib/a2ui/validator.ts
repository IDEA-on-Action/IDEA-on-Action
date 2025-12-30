/**
 * A2UI 메시지 검증
 */

import type { A2UIComponent, A2UIMessage, A2UIUserAction } from './types';
import { isAllowedComponent, isAllowedProp, isAllowedAction, filterAllowedProps } from './catalog';

// ============================================================================
// 검증 결과 타입
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  componentId?: string;
  path?: string;
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  componentId?: string;
  path?: string;
}

// ============================================================================
// 컴포넌트 검증
// ============================================================================

/** 단일 컴포넌트 검증 */
export function validateComponent(component: A2UIComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // id 필수
  if (!component.id || typeof component.id !== 'string') {
    errors.push({
      type: 'error',
      code: 'MISSING_ID',
      message: '컴포넌트 id가 필요합니다.',
      componentId: component.id,
    });
  }

  // component 필수
  if (!component.component || typeof component.component !== 'string') {
    errors.push({
      type: 'error',
      code: 'MISSING_COMPONENT_TYPE',
      message: '컴포넌트 타입이 필요합니다.',
      componentId: component.id,
    });
  }

  // 허용된 컴포넌트인지 확인
  if (component.component && !isAllowedComponent(component.component)) {
    errors.push({
      type: 'error',
      code: 'UNKNOWN_COMPONENT',
      message: `허용되지 않은 컴포넌트: ${component.component}`,
      componentId: component.id,
    });
  }

  // 허용되지 않은 속성 경고
  if (component.component && isAllowedComponent(component.component)) {
    for (const key of Object.keys(component)) {
      if (!isAllowedProp(component.component, key)) {
        warnings.push({
          type: 'warning',
          code: 'UNKNOWN_PROP',
          message: `허용되지 않은 속성이 무시됩니다: ${key}`,
          componentId: component.id,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** 컴포넌트 배열 검증 */
export function validateComponents(components: A2UIComponent[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const ids = new Set<string>();

  for (const component of components) {
    // 개별 컴포넌트 검증
    const result = validateComponent(component);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    // ID 중복 확인
    if (component.id) {
      if (ids.has(component.id)) {
        errors.push({
          type: 'error',
          code: 'DUPLICATE_ID',
          message: `중복된 컴포넌트 ID: ${component.id}`,
          componentId: component.id,
        });
      } else {
        ids.add(component.id);
      }
    }

    // children 참조 확인 (경고만)
    if (component.children && Array.isArray(component.children)) {
      for (const childId of component.children) {
        if (!components.some(c => c.id === childId)) {
          warnings.push({
            type: 'warning',
            code: 'MISSING_CHILD',
            message: `참조된 자식 컴포넌트가 없습니다: ${childId}`,
            componentId: component.id,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 메시지 검증
// ============================================================================

/** A2UI 메시지 검증 */
export function validateMessage(message: A2UIMessage): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // surfaceId 필수
  if (!message.surfaceId || typeof message.surfaceId !== 'string') {
    errors.push({
      type: 'error',
      code: 'MISSING_SURFACE_ID',
      message: 'surfaceId가 필요합니다.',
    });
  }

  // components 필수
  if (!message.components || !Array.isArray(message.components)) {
    errors.push({
      type: 'error',
      code: 'MISSING_COMPONENTS',
      message: 'components 배열이 필요합니다.',
    });
  } else if (message.components.length === 0) {
    warnings.push({
      type: 'warning',
      code: 'EMPTY_COMPONENTS',
      message: 'components 배열이 비어있습니다.',
    });
  } else {
    // 컴포넌트 배열 검증
    const componentsResult = validateComponents(message.components);
    errors.push(...componentsResult.errors);
    warnings.push(...componentsResult.warnings);
  }

  // data 검증 (있는 경우)
  if (message.data !== undefined && typeof message.data !== 'object') {
    errors.push({
      type: 'error',
      code: 'INVALID_DATA',
      message: 'data는 객체여야 합니다.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 액션 검증
// ============================================================================

/** 사용자 액션 검증 */
export function validateAction(action: A2UIUserAction): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // action 필수
  if (!action.action || typeof action.action !== 'string') {
    errors.push({
      type: 'error',
      code: 'MISSING_ACTION',
      message: 'action이 필요합니다.',
    });
  }

  // 허용된 액션인지 확인
  if (action.action && !isAllowedAction(action.action)) {
    errors.push({
      type: 'error',
      code: 'UNKNOWN_ACTION',
      message: `허용되지 않은 액션: ${action.action}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 정화 (Sanitize)
// ============================================================================

/** 컴포넌트 정화 (허용되지 않은 속성 제거) */
export function sanitizeComponent(component: A2UIComponent): A2UIComponent | null {
  // 허용되지 않은 컴포넌트는 null 반환
  if (!isAllowedComponent(component.component)) {
    return null;
  }

  // 허용된 속성만 필터링
  const filteredProps = filterAllowedProps(component.component, component);

  return {
    id: component.id,
    component: component.component,
    ...filteredProps,
  };
}

/** 메시지 정화 */
export function sanitizeMessage(message: A2UIMessage): A2UIMessage {
  const sanitizedComponents = message.components
    .map(sanitizeComponent)
    .filter((c): c is A2UIComponent => c !== null);

  return {
    ...message,
    components: sanitizedComponents,
  };
}
