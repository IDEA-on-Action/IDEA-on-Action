/**
 * Lazy Loader - 대용량 라이브러리 동적 로딩
 *
 * xlsx, docx, pptxgenjs 등 대용량 라이브러리를 필요 시에만 동적으로 로드하여
 * 초기 번들 크기를 줄이고 First Load 성능을 개선합니다.
 *
 * @module lib/skills/lazy-loader
 */

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 로딩 상태
 */
type LoadingState<T> = {
  /** 로딩 여부 */
  loading: boolean;
  /** 로드된 모듈 */
  module: T | null;
  /** 에러 */
  error: Error | null;
};

/**
 * xlsx 모듈 타입
 */
export type XlsxModule = typeof import('xlsx');

/**
 * docx 모듈 타입
 */
export type DocxModule = typeof import('docx');

/**
 * pptxgenjs 모듈 타입
 */
export type PptxModule = {
  default: typeof import('pptxgenjs').default;
};

// ============================================================================
// 캐시 스토리지
// ============================================================================

/**
 * 모듈 캐시 (메모리에 한 번만 로드)
 */
const moduleCache = {
  xlsx: null as XlsxModule | null,
  docx: null as DocxModule | null,
  pptx: null as PptxModule | null,
};

/**
 * 로딩 상태 관리
 */
const loadingStates = {
  xlsx: { loading: false, module: null, error: null } as LoadingState<XlsxModule>,
  docx: { loading: false, module: null, error: null } as LoadingState<DocxModule>,
  pptx: { loading: false, module: null, error: null } as LoadingState<PptxModule>,
};

// ============================================================================
// xlsx 동적 로더
// ============================================================================

/**
 * xlsx 라이브러리 동적 로드
 *
 * Excel 파일 생성/파싱을 위한 xlsx 라이브러리를 동적으로 로드합니다.
 * 한 번 로드된 모듈은 캐시되어 재사용됩니다.
 *
 * @returns xlsx 모듈
 * @throws 로딩 실패 시 에러
 *
 * @example
 * ```ts
 * const XLSX = await loadXlsx();
 * const workbook = XLSX.utils.book_new();
 * ```
 */
export async function loadXlsx(): Promise<XlsxModule> {
  // 캐시된 모듈 반환
  if (moduleCache.xlsx) {
    return moduleCache.xlsx;
  }

  // 이미 로딩 중인 경우 대기
  if (loadingStates.xlsx.loading) {
    // 로딩이 완료될 때까지 폴링
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (loadingStates.xlsx.module) {
          clearInterval(interval);
          resolve(loadingStates.xlsx.module);
        } else if (loadingStates.xlsx.error) {
          clearInterval(interval);
          reject(loadingStates.xlsx.error);
        }
      }, 50);
    });
  }

  // 새로 로딩 시작
  loadingStates.xlsx.loading = true;
  loadingStates.xlsx.error = null;

  try {
    const module = await import('xlsx');
    moduleCache.xlsx = module;
    loadingStates.xlsx.module = module;
    loadingStates.xlsx.loading = false;
    return module;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    loadingStates.xlsx.error = err;
    loadingStates.xlsx.loading = false;
    throw new Error(`xlsx 라이브러리 로딩 실패: ${err.message}`);
  }
}

/**
 * xlsx 모듈 로딩 상태 확인
 *
 * @returns 로딩 상태
 *
 * @example
 * ```ts
 * const state = getXlsxLoadingState();
 * if (state.loading) {
 *   console.log('로딩 중...');
 * }
 * ```
 */
export function getXlsxLoadingState(): Readonly<LoadingState<XlsxModule>> {
  return { ...loadingStates.xlsx };
}

// ============================================================================
// docx 동적 로더
// ============================================================================

/**
 * docx 라이브러리 동적 로드
 *
 * Word 문서 생성을 위한 docx 라이브러리를 동적으로 로드합니다.
 * 한 번 로드된 모듈은 캐시되어 재사용됩니다.
 *
 * @returns docx 모듈
 * @throws 로딩 실패 시 에러
 *
 * @example
 * ```ts
 * const { Document, Packer, Paragraph } = await loadDocx();
 * const doc = new Document({ sections: [...] });
 * ```
 */
export async function loadDocx(): Promise<DocxModule> {
  // 캐시된 모듈 반환
  if (moduleCache.docx) {
    return moduleCache.docx;
  }

  // 이미 로딩 중인 경우 대기
  if (loadingStates.docx.loading) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (loadingStates.docx.module) {
          clearInterval(interval);
          resolve(loadingStates.docx.module);
        } else if (loadingStates.docx.error) {
          clearInterval(interval);
          reject(loadingStates.docx.error);
        }
      }, 50);
    });
  }

  // 새로 로딩 시작
  loadingStates.docx.loading = true;
  loadingStates.docx.error = null;

  try {
    const module = await import('docx');
    moduleCache.docx = module;
    loadingStates.docx.module = module;
    loadingStates.docx.loading = false;
    return module;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    loadingStates.docx.error = err;
    loadingStates.docx.loading = false;
    throw new Error(`docx 라이브러리 로딩 실패: ${err.message}`);
  }
}

/**
 * docx 모듈 로딩 상태 확인
 *
 * @returns 로딩 상태
 *
 * @example
 * ```ts
 * const state = getDocxLoadingState();
 * if (state.module) {
 *   console.log('로딩 완료');
 * }
 * ```
 */
export function getDocxLoadingState(): Readonly<LoadingState<DocxModule>> {
  return { ...loadingStates.docx };
}

// ============================================================================
// pptx 동적 로더
// ============================================================================

/**
 * pptxgenjs 라이브러리 동적 로드
 *
 * PowerPoint 프레젠테이션 생성을 위한 pptxgenjs 라이브러리를 동적으로 로드합니다.
 * 한 번 로드된 모듈은 캐시되어 재사용됩니다.
 *
 * @returns pptxgenjs 모듈
 * @throws 로딩 실패 시 에러
 *
 * @example
 * ```ts
 * const { default: PptxGenJs } = await loadPptx();
 * const pptx = new PptxGenJs();
 * ```
 */
export async function loadPptx(): Promise<PptxModule> {
  // 캐시된 모듈 반환
  if (moduleCache.pptx) {
    return moduleCache.pptx;
  }

  // 이미 로딩 중인 경우 대기
  if (loadingStates.pptx.loading) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (loadingStates.pptx.module) {
          clearInterval(interval);
          resolve(loadingStates.pptx.module);
        } else if (loadingStates.pptx.error) {
          clearInterval(interval);
          reject(loadingStates.pptx.error);
        }
      }, 50);
    });
  }

  // 새로 로딩 시작
  loadingStates.pptx.loading = true;
  loadingStates.pptx.error = null;

  try {
    const module = await import('pptxgenjs');
    const wrappedModule: PptxModule = { default: module.default };
    moduleCache.pptx = wrappedModule;
    loadingStates.pptx.module = wrappedModule;
    loadingStates.pptx.loading = false;
    return wrappedModule;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    loadingStates.pptx.error = err;
    loadingStates.pptx.loading = false;
    throw new Error(`pptxgenjs 라이브러리 로딩 실패: ${err.message}`);
  }
}

/**
 * pptx 모듈 로딩 상태 확인
 *
 * @returns 로딩 상태
 *
 * @example
 * ```ts
 * const state = getPptxLoadingState();
 * if (state.error) {
 *   console.error('로딩 실패:', state.error);
 * }
 * ```
 */
export function getPptxLoadingState(): Readonly<LoadingState<PptxModule>> {
  return { ...loadingStates.pptx };
}

// ============================================================================
// 캐시 관리
// ============================================================================

/**
 * 모든 모듈 캐시 초기화
 *
 * 테스트나 메모리 관리를 위해 캐시를 초기화합니다.
 *
 * @example
 * ```ts
 * clearAllCache();
 * // 다음 로드 시 새로 다운로드됨
 * ```
 */
export function clearAllCache(): void {
  moduleCache.xlsx = null;
  moduleCache.docx = null;
  moduleCache.pptx = null;

  loadingStates.xlsx = { loading: false, module: null, error: null };
  loadingStates.docx = { loading: false, module: null, error: null };
  loadingStates.pptx = { loading: false, module: null, error: null };
}

/**
 * 특정 모듈 캐시 초기화
 *
 * @param module - 초기화할 모듈명
 *
 * @example
 * ```ts
 * clearCache('xlsx');
 * ```
 */
export function clearCache(module: 'xlsx' | 'docx' | 'pptx'): void {
  moduleCache[module] = null;
  loadingStates[module] = { loading: false, module: null, error: null };
}

/**
 * 모든 모듈이 로드되었는지 확인
 *
 * @returns 모든 모듈 로드 여부
 *
 * @example
 * ```ts
 * if (isAllLoaded()) {
 *   console.log('모든 Skill 라이브러리 로드 완료');
 * }
 * ```
 */
export function isAllLoaded(): boolean {
  return !!(moduleCache.xlsx && moduleCache.docx && moduleCache.pptx);
}

/**
 * 로드된 모듈 개수 확인
 *
 * @returns 로드된 모듈 개수 (0-3)
 *
 * @example
 * ```ts
 * const count = getLoadedCount();
 * console.log(`${count}개 모듈 로드됨`);
 * ```
 */
export function getLoadedCount(): number {
  let count = 0;
  if (moduleCache.xlsx) count++;
  if (moduleCache.docx) count++;
  if (moduleCache.pptx) count++;
  return count;
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 여러 모듈을 병렬로 프리로드
 *
 * 필요한 모듈들을 미리 로드하여 나중에 빠르게 사용할 수 있습니다.
 *
 * @param modules - 프리로드할 모듈 목록
 * @returns 로드된 모듈들
 *
 * @example
 * ```ts
 * // Admin 페이지 진입 시 미리 로드
 * await preloadModules(['xlsx', 'docx']);
 * ```
 */
export async function preloadModules(
  modules: Array<'xlsx' | 'docx' | 'pptx'>
): Promise<{
  xlsx?: XlsxModule;
  docx?: DocxModule;
  pptx?: PptxModule;
}> {
  const promises = modules.map(async (module) => {
    switch (module) {
      case 'xlsx':
        return { name: 'xlsx' as const, module: await loadXlsx() };
      case 'docx':
        return { name: 'docx' as const, module: await loadDocx() };
      case 'pptx':
        return { name: 'pptx' as const, module: await loadPptx() };
    }
  });

  const results = await Promise.all(promises);

  const loaded: {
    xlsx?: XlsxModule;
    docx?: DocxModule;
    pptx?: PptxModule;
  } = {};

  for (const result of results) {
    if (result.name === 'xlsx') {
      loaded.xlsx = result.module;
    } else if (result.name === 'docx') {
      loaded.docx = result.module;
    } else if (result.name === 'pptx') {
      loaded.pptx = result.module as PptxModule;
    }
  }

  return loaded;
}
