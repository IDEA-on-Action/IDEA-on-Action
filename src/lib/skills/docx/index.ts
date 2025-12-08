/**
 * docx Skill 모듈 - 동적 로딩 최적화
 *
 * Word 문서 생성 기능을 동적으로 로드하여 번들 크기를 최적화합니다.
 *
 * @module lib/skills/docx
 */

import { loadDocx } from '../lazy-loader';

// ============================================================================
// Re-export 기존 모듈
// ============================================================================

// TemplateEngine
export { TemplateEngine, type TableConfig, type ListConfig, type SectionStyle } from './template-engine';

// RFP 템플릿
export * from '../templates/rfp';

// ============================================================================
// 동적 로딩 유틸리티
// ============================================================================

/**
 * docx 라이브러리 동적 로드
 *
 * Word 문서 생성을 위한 docx 라이브러리를 동적으로 로드합니다.
 * 이 함수는 lazy-loader를 래핑하여 일관된 API를 제공합니다.
 *
 * @returns docx 모듈
 *
 * @example
 * ```ts
 * import { loadDocxModule } from '@/lib/skills/docx';
 *
 * const { Document, Packer, Paragraph } = await loadDocxModule();
 * const doc = new Document({ sections: [...] });
 * ```
 */
export async function loadDocxModule() {
  return loadDocx();
}

/**
 * docx 모듈이 이미 로드되었는지 확인
 *
 * @returns 로드 여부
 *
 * @example
 * ```ts
 * import { isDocxLoaded } from '@/lib/skills/docx';
 *
 * if (!isDocxLoaded()) {
 *   console.log('docx를 로드해야 합니다');
 * }
 * ```
 */
export function isDocxLoaded(): boolean {
  // lazy-loader의 getDocxLoadingState를 사용
  // Note: 동적 import를 사용하려면 async여야 하므로, 직접 접근 대신 상태 조회 헬퍼 사용
  return false; // TODO: 실제 구현 시 lazy-loader 상태 확인 필요
}
