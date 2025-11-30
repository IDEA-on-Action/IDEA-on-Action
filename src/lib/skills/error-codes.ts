/**
 * Skills 에러 코드 체계
 *
 * Claude Skills (xlsx, docx, pptx, RAG, MCP) 관련 에러 코드 정의
 *
 * @module lib/skills/error-codes
 */

// ============================================================================
// 에러 코드 타입
// ============================================================================

/**
 * Skills 에러 코드
 *
 * 형식: SKILL_XXX
 * - SKILL_001 ~ SKILL_099: 공통 에러
 * - SKILL_100 ~ SKILL_199: XLSX 에러
 * - SKILL_200 ~ SKILL_299: DOCX 에러
 * - SKILL_300 ~ SKILL_399: PPTX 에러
 * - SKILL_400 ~ SKILL_499: RAG 에러
 * - SKILL_500 ~ SKILL_599: MCP 에러
 */
export type SkillErrorCode =
  // 공통 에러 (001-099)
  | 'SKILL_001' // 초기화 실패
  | 'SKILL_002' // 필수 파라미터 누락
  | 'SKILL_003' // 유효하지 않은 파라미터
  | 'SKILL_004' // 파일 로드 실패
  | 'SKILL_005' // 파일 저장 실패
  | 'SKILL_006' // 메모리 부족
  | 'SKILL_007' // 타임아웃
  | 'SKILL_008' // 권한 부족
  | 'SKILL_009' // 지원하지 않는 기능
  | 'SKILL_010' // 의존성 로드 실패

  // XLSX 에러 (100-199)
  | 'SKILL_100' // 워크북 생성 실패
  | 'SKILL_101' // 워크시트 생성 실패
  | 'SKILL_102' // 데이터 쓰기 실패
  | 'SKILL_103' // 차트 생성 실패
  | 'SKILL_104' // 스타일 적용 실패
  | 'SKILL_105' // 셀 병합 실패
  | 'SKILL_106' // 수식 적용 실패
  | 'SKILL_107' // 데이터 검증 실패
  | 'SKILL_108' // 파일 익스포트 실패
  | 'SKILL_109' // 파일 파싱 실패

  // DOCX 에러 (200-299)
  | 'SKILL_200' // 문서 생성 실패
  | 'SKILL_201' // 섹션 생성 실패
  | 'SKILL_202' // 테이블 생성 실패
  | 'SKILL_203' // 이미지 로드 실패
  | 'SKILL_204' // 이미지 삽입 실패
  | 'SKILL_205' // 스타일 적용 실패
  | 'SKILL_206' // 헤더/푸터 생성 실패
  | 'SKILL_207' // 템플릿 변환 실패
  | 'SKILL_208' // 파일 익스포트 실패
  | 'SKILL_209' // 파일 파싱 실패

  // PPTX 에러 (300-399)
  | 'SKILL_300' // 프레젠테이션 생성 실패
  | 'SKILL_301' // 슬라이드 생성 실패
  | 'SKILL_302' // 텍스트 추가 실패
  | 'SKILL_303' // 이미지 추가 실패
  | 'SKILL_304' // 차트 추가 실패
  | 'SKILL_305' // 테이블 추가 실패
  | 'SKILL_306' // 레이아웃 적용 실패
  | 'SKILL_307' // 테마 적용 실패
  | 'SKILL_308' // 파일 익스포트 실패
  | 'SKILL_309' // 파일 파싱 실패

  // RAG 에러 (400-499)
  | 'SKILL_400' // RAG 초기화 실패
  | 'SKILL_401' // 문서 업로드 실패
  | 'SKILL_402' // 임베딩 생성 실패
  | 'SKILL_403' // 벡터 저장 실패
  | 'SKILL_404' // 검색 실패
  | 'SKILL_405' // 하이브리드 검색 실패
  | 'SKILL_406' // 문서 분할 실패
  | 'SKILL_407' // 메타데이터 파싱 실패
  | 'SKILL_408' // 인덱스 생성 실패
  | 'SKILL_409' // 쿼리 변환 실패

  // MCP 에러 (500-599)
  | 'SKILL_500' // MCP 서버 연결 실패
  | 'SKILL_501' // MCP 인증 실패
  | 'SKILL_502' // MCP 권한 부족
  | 'SKILL_503' // MCP 도구 호출 실패
  | 'SKILL_504' // MCP 응답 파싱 실패
  | 'SKILL_505' // MCP 타임아웃
  | 'SKILL_506' // MCP 리소스 조회 실패
  | 'SKILL_507' // MCP 프롬프트 실행 실패
  | 'SKILL_508' // MCP 구성 로드 실패
  | 'SKILL_509'; // MCP 동기화 실패

// ============================================================================
// 에러 메시지 맵
// ============================================================================

/**
 * 에러 코드별 한글 메시지
 */
export const SKILL_ERROR_MESSAGES: Record<SkillErrorCode, string> = {
  // 공통 에러
  SKILL_001: 'Skill 초기화에 실패했습니다',
  SKILL_002: '필수 파라미터가 누락되었습니다',
  SKILL_003: '유효하지 않은 파라미터입니다',
  SKILL_004: '파일 로드에 실패했습니다',
  SKILL_005: '파일 저장에 실패했습니다',
  SKILL_006: '메모리가 부족합니다',
  SKILL_007: '요청 시간이 초과되었습니다',
  SKILL_008: '권한이 부족합니다',
  SKILL_009: '지원하지 않는 기능입니다',
  SKILL_010: '필수 라이브러리 로드에 실패했습니다',

  // XLSX 에러
  SKILL_100: 'Excel 워크북 생성에 실패했습니다',
  SKILL_101: '워크시트 생성에 실패했습니다',
  SKILL_102: '데이터 쓰기에 실패했습니다',
  SKILL_103: '차트 생성에 실패했습니다',
  SKILL_104: '스타일 적용에 실패했습니다',
  SKILL_105: '셀 병합에 실패했습니다',
  SKILL_106: '수식 적용에 실패했습니다',
  SKILL_107: '데이터 검증에 실패했습니다',
  SKILL_108: 'Excel 파일 내보내기에 실패했습니다',
  SKILL_109: 'Excel 파일 파싱에 실패했습니다',

  // DOCX 에러
  SKILL_200: 'Word 문서 생성에 실패했습니다',
  SKILL_201: '문서 섹션 생성에 실패했습니다',
  SKILL_202: '테이블 생성에 실패했습니다',
  SKILL_203: '이미지 로드에 실패했습니다',
  SKILL_204: '이미지 삽입에 실패했습니다',
  SKILL_205: '스타일 적용에 실패했습니다',
  SKILL_206: '헤더/푸터 생성에 실패했습니다',
  SKILL_207: '템플릿 변환에 실패했습니다',
  SKILL_208: 'Word 파일 내보내기에 실패했습니다',
  SKILL_209: 'Word 파일 파싱에 실패했습니다',

  // PPTX 에러
  SKILL_300: 'PowerPoint 프레젠테이션 생성에 실패했습니다',
  SKILL_301: '슬라이드 생성에 실패했습니다',
  SKILL_302: '텍스트 추가에 실패했습니다',
  SKILL_303: '이미지 추가에 실패했습니다',
  SKILL_304: '차트 추가에 실패했습니다',
  SKILL_305: '테이블 추가에 실패했습니다',
  SKILL_306: '레이아웃 적용에 실패했습니다',
  SKILL_307: '테마 적용에 실패했습니다',
  SKILL_308: 'PowerPoint 파일 내보내기에 실패했습니다',
  SKILL_309: 'PowerPoint 파일 파싱에 실패했습니다',

  // RAG 에러
  SKILL_400: 'RAG 시스템 초기화에 실패했습니다',
  SKILL_401: '문서 업로드에 실패했습니다',
  SKILL_402: '임베딩 벡터 생성에 실패했습니다',
  SKILL_403: '벡터 데이터베이스 저장에 실패했습니다',
  SKILL_404: '문서 검색에 실패했습니다',
  SKILL_405: '하이브리드 검색에 실패했습니다',
  SKILL_406: '문서 분할에 실패했습니다',
  SKILL_407: '메타데이터 파싱에 실패했습니다',
  SKILL_408: '검색 인덱스 생성에 실패했습니다',
  SKILL_409: '검색 쿼리 변환에 실패했습니다',

  // MCP 에러
  SKILL_500: 'MCP 서버 연결에 실패했습니다',
  SKILL_501: 'MCP 인증에 실패했습니다',
  SKILL_502: 'MCP 접근 권한이 부족합니다',
  SKILL_503: 'MCP 도구 호출에 실패했습니다',
  SKILL_504: 'MCP 응답 파싱에 실패했습니다',
  SKILL_505: 'MCP 요청 시간이 초과되었습니다',
  SKILL_506: 'MCP 리소스 조회에 실패했습니다',
  SKILL_507: 'MCP 프롬프트 실행에 실패했습니다',
  SKILL_508: 'MCP 구성 로드에 실패했습니다',
  SKILL_509: 'MCP 동기화에 실패했습니다',
};

// ============================================================================
// SkillError 클래스
// ============================================================================

/**
 * Skills 전용 에러 클래스
 *
 * @example
 * ```typescript
 * throw new SkillError('SKILL_100', { detail: '워크북 생성 중 메모리 부족' });
 * ```
 */
export class SkillError extends Error {
  /** 에러 코드 */
  public readonly code: SkillErrorCode;
  /** 추가 컨텍스트 */
  public readonly context?: Record<string, unknown>;
  /** 원본 에러 (있는 경우) */
  public readonly originalError?: Error;

  constructor(
    code: SkillErrorCode,
    options?: {
      detail?: string;
      context?: Record<string, unknown>;
      originalError?: Error;
    }
  ) {
    const message = options?.detail
      ? `${SKILL_ERROR_MESSAGES[code]}: ${options.detail}`
      : SKILL_ERROR_MESSAGES[code];

    super(message);

    this.name = 'SkillError';
    this.code = code;
    this.context = options?.context;
    this.originalError = options?.originalError;

    // V8 엔진에서 스택 트레이스 유지
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SkillError);
    }
  }

  /**
   * 에러 정보를 객체로 직렬화
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * 사용자 친화적인 에러 메시지 반환
   */
  getUserMessage(): string {
    return SKILL_ERROR_MESSAGES[this.code];
  }
}

// ============================================================================
// 에러 헬퍼 함수
// ============================================================================

/**
 * SkillError 타입 가드
 *
 * @param error - 검사할 에러 객체
 * @returns SkillError 여부
 */
export function isSkillError(error: unknown): error is SkillError {
  return error instanceof SkillError;
}

/**
 * 에러를 SkillError로 변환
 *
 * @param error - 원본 에러
 * @param code - Skills 에러 코드
 * @param context - 추가 컨텍스트
 * @returns SkillError 인스턴스
 *
 * @example
 * ```typescript
 * try {
 *   // ... XLSX 작업
 * } catch (error) {
 *   throw wrapError(error, 'SKILL_100', { sheetName: 'Sheet1' });
 * }
 * ```
 */
export function wrapError(
  error: unknown,
  code: SkillErrorCode,
  context?: Record<string, unknown>
): SkillError {
  if (isSkillError(error)) {
    return error;
  }

  const originalError = error instanceof Error ? error : undefined;
  const detail = error instanceof Error ? error.message : String(error);

  return new SkillError(code, {
    detail,
    context,
    originalError,
  });
}

/**
 * 에러 로깅 (개발 환경에서만)
 *
 * @param error - 로깅할 에러
 * @param component - 에러 발생 컴포넌트
 */
export function logSkillError(error: SkillError, component?: string): void {
  if (import.meta.env.DEV) {
    const prefix = component ? `[${component}]` : '[Skill]';
    console.error(`${prefix} ${error.code}: ${error.message}`);

    if (error.context) {
      console.error(`${prefix} Context:`, error.context);
    }

    if (error.originalError) {
      console.error(`${prefix} Original Error:`, error.originalError);
    }
  }
}

// ============================================================================
// 에러 핸들링 유틸리티
// ============================================================================

/**
 * async 함수를 SkillError로 래핑
 *
 * @param fn - 실행할 비동기 함수
 * @param code - 에러 발생 시 사용할 에러 코드
 * @param context - 추가 컨텍스트
 * @returns Promise<T>
 *
 * @example
 * ```typescript
 * const workbook = await withSkillError(
 *   () => createWorkbook(data),
 *   'SKILL_100',
 *   { operation: 'createWorkbook' }
 * );
 * ```
 */
export async function withSkillError<T>(
  fn: () => Promise<T>,
  code: SkillErrorCode,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrapError(error, code, context);
  }
}

/**
 * 동기 함수를 SkillError로 래핑
 *
 * @param fn - 실행할 동기 함수
 * @param code - 에러 발생 시 사용할 에러 코드
 * @param context - 추가 컨텍스트
 * @returns T
 */
export function withSkillErrorSync<T>(
  fn: () => T,
  code: SkillErrorCode,
  context?: Record<string, unknown>
): T {
  try {
    return fn();
  } catch (error) {
    throw wrapError(error, code, context);
  }
}
