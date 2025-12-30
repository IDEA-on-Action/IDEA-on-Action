/**
 * A2UI (Agent-to-UI) 모듈
 *
 * AI 에이전트가 생성하는 선언적 UI 렌더링 시스템
 *
 * @see https://a2ui.org/
 * @see https://github.com/google/A2UI
 */

// 타입 내보내기
export * from './types';

// 카탈로그 내보내기
export {
  DEFAULT_CATALOG,
  ALLOWED_COMPONENTS,
  ALLOWED_ACTIONS,
  isAllowedComponent,
  isAllowedAction,
  isAllowedProp,
  filterAllowedProps,
  getComponentDefinition,
  type ComponentCatalog,
  type ComponentDefinition,
} from './catalog';

// 검증 내보내기
export {
  validateComponent,
  validateComponents,
  validateMessage,
  validateAction,
  sanitizeComponent,
  sanitizeMessage,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validator';

// 데이터 모델 내보내기
export {
  parsePath,
  getValue,
  setValue,
  removeValue,
  applyUpdate,
  applyUpdates,
  resolveBind,
  resolveBindings,
} from './data-model';

// 렌더러 내보내기 (별도 import 필요)
// export { A2UIRenderer } from './renderer';
