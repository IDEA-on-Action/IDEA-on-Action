/**
 * Lazy Loader 테스트
 *
 * xlsx, docx, pptxgenjs 동적 로딩 기능 검증
 *
 * @module tests/unit/lib/lazy-loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadXlsx,
  loadDocx,
  loadPptx,
  getXlsxLoadingState,
  getDocxLoadingState,
  getPptxLoadingState,
  clearAllCache,
  clearCache,
  isAllLoaded,
  getLoadedCount,
  preloadModules,
} from '@/lib/skills/lazy-loader';

// ============================================================================
// 테스트 설정
// ============================================================================

describe('Lazy Loader', () => {
  beforeEach(() => {
    // 각 테스트 전에 캐시 초기화
    clearAllCache();
  });

  // ============================================================================
  // xlsx 로딩 테스트
  // ============================================================================

  describe('loadXlsx', () => {
    it('xlsx 모듈을 성공적으로 로드해야 함', async () => {
      const xlsx = await loadXlsx();

      expect(xlsx).toBeDefined();
      expect(xlsx.utils).toBeDefined();
      expect(xlsx.read).toBeDefined();
      expect(xlsx.write).toBeDefined();
    });

    it('xlsx 모듈을 한 번만 로드하고 캐시해야 함', async () => {
      const xlsx1 = await loadXlsx();
      const xlsx2 = await loadXlsx();

      // 같은 인스턴스를 반환해야 함
      expect(xlsx1).toBe(xlsx2);
    });

    it('로딩 상태를 정확히 추적해야 함', async () => {
      // 로딩 전
      const beforeState = getXlsxLoadingState();
      expect(beforeState.loading).toBe(false);
      expect(beforeState.module).toBeNull();
      expect(beforeState.error).toBeNull();

      // 로딩
      const promise = loadXlsx();

      // 로딩 후
      await promise;
      const afterState = getXlsxLoadingState();
      expect(afterState.loading).toBe(false);
      expect(afterState.module).not.toBeNull();
      expect(afterState.error).toBeNull();
    });
  });

  // ============================================================================
  // docx 로딩 테스트
  // ============================================================================

  describe('loadDocx', () => {
    it('docx 모듈을 성공적으로 로드해야 함', async () => {
      const docx = await loadDocx();

      expect(docx).toBeDefined();
      expect(docx.Document).toBeDefined();
      expect(docx.Packer).toBeDefined();
      expect(docx.Paragraph).toBeDefined();
      expect(docx.TextRun).toBeDefined();
    });

    it('docx 모듈을 한 번만 로드하고 캐시해야 함', async () => {
      const docx1 = await loadDocx();
      const docx2 = await loadDocx();

      // 같은 인스턴스를 반환해야 함
      expect(docx1).toBe(docx2);
    });

    it('로딩 상태를 정확히 추적해야 함', async () => {
      // 로딩 전
      const beforeState = getDocxLoadingState();
      expect(beforeState.loading).toBe(false);
      expect(beforeState.module).toBeNull();

      // 로딩
      await loadDocx();

      // 로딩 후
      const afterState = getDocxLoadingState();
      expect(afterState.loading).toBe(false);
      expect(afterState.module).not.toBeNull();
    });
  });

  // ============================================================================
  // pptx 로딩 테스트
  // ============================================================================

  describe('loadPptx', () => {
    it('pptxgenjs 모듈을 성공적으로 로드해야 함', async () => {
      const pptx = await loadPptx();

      expect(pptx).toBeDefined();
      expect(pptx.default).toBeDefined();
      // pptxgenjs는 default export
      expect(typeof pptx.default).toBe('function');
    });

    it('pptx 모듈을 한 번만 로드하고 캐시해야 함', async () => {
      const pptx1 = await loadPptx();
      const pptx2 = await loadPptx();

      // 같은 인스턴스를 반환해야 함
      expect(pptx1).toBe(pptx2);
    });

    it('로딩 상태를 정확히 추적해야 함', async () => {
      // 로딩 전
      const beforeState = getPptxLoadingState();
      expect(beforeState.loading).toBe(false);
      expect(beforeState.module).toBeNull();

      // 로딩
      await loadPptx();

      // 로딩 후
      const afterState = getPptxLoadingState();
      expect(afterState.loading).toBe(false);
      expect(afterState.module).not.toBeNull();
    });
  });

  // ============================================================================
  // 병렬 로딩 테스트
  // ============================================================================

  describe('병렬 로딩', () => {
    it('여러 모듈을 병렬로 로드할 수 있어야 함', async () => {
      const [xlsx, docx, pptx] = await Promise.all([
        loadXlsx(),
        loadDocx(),
        loadPptx(),
      ]);

      expect(xlsx).toBeDefined();
      expect(docx).toBeDefined();
      expect(pptx).toBeDefined();
    });

    it('같은 모듈을 병렬로 로드해도 하나의 인스턴스만 생성되어야 함', async () => {
      const [xlsx1, xlsx2, xlsx3] = await Promise.all([
        loadXlsx(),
        loadXlsx(),
        loadXlsx(),
      ]);

      // 모두 같은 인스턴스여야 함
      expect(xlsx1).toBe(xlsx2);
      expect(xlsx2).toBe(xlsx3);
    });
  });

  // ============================================================================
  // 캐시 관리 테스트
  // ============================================================================

  describe('캐시 관리', () => {
    it('clearAllCache는 모든 모듈 캐시를 초기화해야 함', async () => {
      // 모든 모듈 로드
      await loadXlsx();
      await loadDocx();
      await loadPptx();

      // 모두 로드되었는지 확인
      expect(isAllLoaded()).toBe(true);
      expect(getLoadedCount()).toBe(3);

      // 캐시 초기화
      clearAllCache();

      // 모든 캐시가 초기화되었는지 확인
      expect(getLoadedCount()).toBe(0);
      expect(isAllLoaded()).toBe(false);

      const xlsxState = getXlsxLoadingState();
      const docxState = getDocxLoadingState();
      const pptxState = getPptxLoadingState();

      expect(xlsxState.module).toBeNull();
      expect(docxState.module).toBeNull();
      expect(pptxState.module).toBeNull();
    });

    it('clearCache는 특정 모듈만 초기화해야 함', async () => {
      // 모든 모듈 로드
      await loadXlsx();
      await loadDocx();
      await loadPptx();

      // xlsx만 캐시 초기화
      clearCache('xlsx');

      // xlsx만 초기화되고 나머지는 유지되어야 함
      expect(getLoadedCount()).toBe(2);
      expect(getXlsxLoadingState().module).toBeNull();
      expect(getDocxLoadingState().module).not.toBeNull();
      expect(getPptxLoadingState().module).not.toBeNull();
    });
  });

  // ============================================================================
  // 상태 조회 테스트
  // ============================================================================

  describe('상태 조회', () => {
    it('isAllLoaded는 모든 모듈이 로드되었을 때 true를 반환해야 함', async () => {
      expect(isAllLoaded()).toBe(false);

      await loadXlsx();
      expect(isAllLoaded()).toBe(false);

      await loadDocx();
      expect(isAllLoaded()).toBe(false);

      await loadPptx();
      expect(isAllLoaded()).toBe(true);
    });

    it('getLoadedCount는 로드된 모듈 개수를 정확히 반환해야 함', async () => {
      expect(getLoadedCount()).toBe(0);

      await loadXlsx();
      expect(getLoadedCount()).toBe(1);

      await loadDocx();
      expect(getLoadedCount()).toBe(2);

      await loadPptx();
      expect(getLoadedCount()).toBe(3);
    });
  });

  // ============================================================================
  // 프리로드 테스트
  // ============================================================================

  describe('preloadModules', () => {
    it('여러 모듈을 한 번에 프리로드할 수 있어야 함', async () => {
      const loaded = await preloadModules(['xlsx', 'docx']);

      expect(loaded.xlsx).toBeDefined();
      expect(loaded.docx).toBeDefined();
      expect(loaded.pptx).toBeUndefined();
      expect(getLoadedCount()).toBe(2);
    });

    it('모든 모듈을 프리로드할 수 있어야 함', async () => {
      const loaded = await preloadModules(['xlsx', 'docx', 'pptx']);

      expect(loaded.xlsx).toBeDefined();
      expect(loaded.docx).toBeDefined();
      expect(loaded.pptx).toBeDefined();
      expect(isAllLoaded()).toBe(true);
    });

    it('빈 배열로 호출하면 아무것도 로드하지 않아야 함', async () => {
      const loaded = await preloadModules([]);

      expect(Object.keys(loaded)).toHaveLength(0);
      expect(getLoadedCount()).toBe(0);
    });
  });

  // ============================================================================
  // 에러 처리 테스트 (실패 시나리오는 mock 필요)
  // ============================================================================

  describe('에러 처리', () => {
    it('로딩 상태는 읽기 전용이어야 함 (불변성)', () => {
      const state = getXlsxLoadingState();

      // 반환된 객체를 수정해도 내부 상태에 영향이 없어야 함
      (state as any).loading = true;
      (state as any).module = {} as any;

      const newState = getXlsxLoadingState();
      expect(newState.loading).toBe(false);
      expect(newState.module).toBeNull();
    });
  });

  // ============================================================================
  // 통합 시나리오 테스트
  // ============================================================================

  describe('통합 시나리오', () => {
    it('Admin 페이지 진입 시 필요한 모듈만 프리로드', async () => {
      // Admin 페이지에서는 xlsx, docx만 주로 사용
      const loaded = await preloadModules(['xlsx', 'docx']);

      expect(loaded.xlsx).toBeDefined();
      expect(loaded.docx).toBeDefined();
      expect(getLoadedCount()).toBe(2);

      // 나중에 pptx 필요 시 추가 로드
      await loadPptx();
      expect(isAllLoaded()).toBe(true);
    });

    it('여러 번 clearCache 호출해도 안전해야 함', () => {
      clearAllCache();
      clearAllCache();
      clearCache('xlsx');
      clearCache('xlsx');

      expect(getLoadedCount()).toBe(0);
    });
  });
});
