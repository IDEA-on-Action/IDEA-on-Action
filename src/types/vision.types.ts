/**
 * Vision API 타입 정의
 *
 * Claude Vision API 연동을 위한 TypeScript 타입 정의
 * - 이미지 분석 요청/응답 타입
 * - 분석 유형별 설정
 * - 에러 타입
 *
 * @module types/vision
 * @see https://docs.anthropic.com/claude/reference/messages
 */

import type { ClaudeModel, ClaudeUsage } from './claude.types';

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * 이미지 분석 유형
 *
 * 각 유형에 맞는 시스템 프롬프트가 적용됩니다.
 */
export type AnalysisType =
  | 'general'     // 일반적인 이미지 분석
  | 'ui-design'   // UI/UX 디자인 분석
  | 'diagram'     // 다이어그램, 플로우차트 분석
  | 'screenshot'  // 스크린샷 분석
  | 'wireframe';  // 와이어프레임 분석

/**
 * 분석 유형별 정보
 */
export interface AnalysisTypeInfo {
  id: AnalysisType;
  name: string;
  description: string;
  systemPrompt: string;
}

/**
 * 분석 유형별 시스템 프롬프트 매핑
 */
export const ANALYSIS_TYPE_INFO: Record<AnalysisType, AnalysisTypeInfo> = {
  general: {
    id: 'general',
    name: '일반 분석',
    description: '이미지의 내용을 전반적으로 분석합니다.',
    systemPrompt: `당신은 이미지 분석 전문가입니다.
주어진 이미지를 상세하게 분석하고 설명해주세요.

분석 항목:
1. 이미지의 주요 내용과 구성 요소
2. 색상, 레이아웃, 시각적 특징
3. 텍스트가 있다면 해당 내용
4. 이미지의 목적이나 맥락 추론

응답은 한국어로 작성하고, 구조화된 형식으로 정리해주세요.`,
  },
  'ui-design': {
    id: 'ui-design',
    name: 'UI/UX 디자인 분석',
    description: 'UI/UX 디자인 관점에서 이미지를 분석합니다.',
    systemPrompt: `당신은 UI/UX 디자인 전문가입니다.
주어진 이미지의 UI/UX 디자인을 전문적으로 분석해주세요.

분석 항목:
1. **레이아웃 구조**: 그리드 시스템, 정렬, 공간 활용
2. **시각적 계층**: 타이포그래피, 색상 대비, 강조 요소
3. **UI 컴포넌트**: 버튼, 입력 필드, 카드 등의 디자인 패턴
4. **사용성**: 네비게이션, 접근성, 인터랙션 힌트
5. **브랜딩**: 색상 팔레트, 아이콘 스타일, 전체적인 톤앤매너
6. **개선 제안**: 더 나은 사용자 경험을 위한 구체적인 제안

응답은 한국어로 작성하고, 각 항목별로 구조화하여 정리해주세요.`,
  },
  diagram: {
    id: 'diagram',
    name: '다이어그램 분석',
    description: '다이어그램, 플로우차트, 아키텍처 도를 분석합니다.',
    systemPrompt: `당신은 시스템 아키텍처와 프로세스 분석 전문가입니다.
주어진 다이어그램/플로우차트를 분석해주세요.

분석 항목:
1. **다이어그램 유형**: 플로우차트, 시퀀스 다이어그램, ER 다이어그램, 아키텍처 도 등
2. **구성 요소**: 노드, 연결선, 레이블 등 각 요소의 의미
3. **흐름 분석**: 데이터 흐름, 프로세스 순서, 의사결정 포인트
4. **관계 파악**: 컴포넌트 간 연결, 의존성, 통신 방식
5. **전체 목적**: 다이어그램이 설명하려는 시스템이나 프로세스
6. **개선점**: 누락된 부분, 불명확한 연결, 최적화 제안

응답은 한국어로 작성하고, 기술적 용어는 정확하게 사용해주세요.
가능하다면 텍스트 기반 다이어그램(ASCII art 또는 Mermaid)으로 재현해주세요.`,
  },
  screenshot: {
    id: 'screenshot',
    name: '스크린샷 분석',
    description: '애플리케이션 스크린샷을 분석합니다.',
    systemPrompt: `당신은 소프트웨어 및 웹 애플리케이션 분석 전문가입니다.
주어진 스크린샷을 분석해주세요.

분석 항목:
1. **애플리케이션 식별**: 어떤 종류의 앱/웹사이트인지, 플랫폼 추정
2. **화면 구성**: 헤더, 사이드바, 메인 콘텐츠, 푸터 등
3. **UI 요소**: 버튼, 메뉴, 폼, 테이블, 그래프 등
4. **텍스트 내용**: 보이는 텍스트의 주요 내용 추출
5. **현재 상태**: 어떤 작업이나 화면을 보여주는지
6. **기능 추정**: 이 화면에서 가능한 사용자 액션

응답은 한국어로 작성하고, 실용적인 관점에서 분석해주세요.`,
  },
  wireframe: {
    id: 'wireframe',
    name: '와이어프레임 분석',
    description: '와이어프레임과 목업을 분석합니다.',
    systemPrompt: `당신은 제품 디자인 및 프로토타이핑 전문가입니다.
주어진 와이어프레임/목업을 분석해주세요.

분석 항목:
1. **화면 목적**: 이 와이어프레임이 표현하려는 기능/페이지
2. **정보 구조**: 콘텐츠의 우선순위와 배치
3. **사용자 흐름**: 예상되는 사용자 인터랙션 순서
4. **핵심 기능**: 와이어프레임에 표현된 주요 기능들
5. **컴포넌트 명세**: 각 UI 요소의 상세 설명
6. **구현 고려사항**: 개발 시 고려해야 할 기술적 포인트
7. **개선 제안**: UX 관점에서의 개선 아이디어

응답은 한국어로 작성하고, 개발자와 디자이너 모두 이해할 수 있도록 설명해주세요.`,
  },
};

// ============================================================================
// Image Types
// ============================================================================

/**
 * 이미지 소스 유형
 */
export type ImageSourceType = 'base64' | 'url';

/**
 * 지원하는 이미지 미디어 타입
 */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

/**
 * 지원하는 이미지 확장자
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'] as const;

/**
 * 지원하는 미디어 타입 목록
 */
export const SUPPORTED_MEDIA_TYPES: ImageMediaType[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/**
 * 이미지 검증 상수
 */
export const IMAGE_VALIDATION = {
  /** 최대 파일 크기 (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  /** 최대 이미지 수 */
  MAX_IMAGES: 10,
  /** 최소 이미지 크기 (10x10) */
  MIN_DIMENSION: 10,
  /** 최대 이미지 크기 (8192x8192) */
  MAX_DIMENSION: 8192,
} as const;

/**
 * Vision API 이미지
 */
export interface VisionImage {
  /** 이미지 소스 유형 */
  source: ImageSourceType;
  /** 이미지 데이터 (base64 인코딩 또는 URL) */
  data: string;
  /** 미디어 타입 (base64일 때 필수) */
  mediaType: ImageMediaType;
}

/**
 * 이미지 검증 결과
 */
export interface ImageValidationResult {
  /** 유효 여부 */
  valid: boolean;
  /** 에러 메시지 (유효하지 않을 때) */
  error?: string;
  /** 에러 코드 (유효하지 않을 때) */
  errorCode?: VisionErrorCode;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Vision API 요청
 */
export interface VisionRequest {
  /** 분석할 이미지 목록 (최대 10개) */
  images: VisionImage[];
  /** 사용자 프롬프트 (추가 지시사항) */
  prompt: string;
  /** 분석 유형 (기본: general) */
  analysisType?: AnalysisType;
  /** 최대 출력 토큰 수 */
  maxTokens?: number;
  /** 스트리밍 사용 여부 */
  stream?: boolean;
  /** 사용할 모델 */
  model?: ClaudeModel;
  /** 온도 (창의성 조절, 0.0 ~ 1.0) */
  temperature?: number;
}

/**
 * Vision API 요청 옵션 (훅에서 사용)
 */
export interface VisionRequestOptions {
  /** 분석 유형 (기본: general) */
  analysisType?: AnalysisType;
  /** 최대 출력 토큰 수 (기본: 4096) */
  maxTokens?: number;
  /** 스트리밍 사용 여부 (기본: false) */
  stream?: boolean;
  /** 사용할 모델 */
  model?: ClaudeModel;
  /** 온도 (0.0 ~ 1.0) */
  temperature?: number;
  /** 요청 타임아웃 (ms) */
  timeout?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Vision API 응답
 */
export interface VisionResponse {
  /** 분석 결과 텍스트 */
  analysis: string;
  /** 토큰 사용량 */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** 사용된 모델 */
  model?: string;
  /** 응답 ID */
  id?: string;
  /** 중지 이유 */
  stopReason?: string;
}

/**
 * Vision API 스트리밍 청크
 */
export interface VisionStreamChunk {
  /** 청크 유형 */
  type: 'start' | 'text' | 'done' | 'error';
  /** 텍스트 내용 (type이 'text'일 때) */
  content?: string;
  /** 요청 ID (type이 'start'일 때) */
  requestId?: string;
  /** 에러 메시지 (type이 'error'일 때) */
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Vision 에러 코드
 */
export type VisionErrorCode =
  | 'INVALID_IMAGE'     // 이미지 형식 오류
  | 'FILE_TOO_LARGE'    // 파일 크기 초과
  | 'UNSUPPORTED_FORMAT'// 지원하지 않는 형식
  | 'TOO_MANY_IMAGES'   // 이미지 개수 초과
  | 'RATE_LIMITED'      // 요청 제한 초과
  | 'API_ERROR'         // API 오류
  | 'NETWORK_ERROR'     // 네트워크 오류
  | 'UNAUTHORIZED'      // 인증 오류
  | 'TIMEOUT'           // 타임아웃
  | 'INVALID_REQUEST'   // 잘못된 요청
  | 'UNKNOWN_ERROR';    // 알 수 없는 오류

/**
 * Vision 에러 코드별 메시지 매핑
 */
export const VISION_ERROR_MESSAGES: Record<VisionErrorCode, string> = {
  INVALID_IMAGE: '유효하지 않은 이미지입니다',
  FILE_TOO_LARGE: '이미지 파일 크기가 5MB를 초과합니다',
  UNSUPPORTED_FORMAT: '지원하지 않는 이미지 형식입니다. PNG, JPEG, GIF, WebP만 지원됩니다',
  TOO_MANY_IMAGES: '이미지는 최대 10개까지만 업로드할 수 있습니다',
  RATE_LIMITED: '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요',
  API_ERROR: 'AI 서비스에 오류가 발생했습니다',
  NETWORK_ERROR: '네트워크 연결에 실패했습니다',
  UNAUTHORIZED: '인증이 필요합니다. 로그인 후 다시 시도해주세요',
  TIMEOUT: '요청 시간이 초과되었습니다',
  INVALID_REQUEST: '잘못된 요청입니다',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다',
};

/**
 * Vision API 에러
 */
export interface VisionError {
  /** 에러 코드 */
  code: VisionErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** 재시도 가능 여부 */
  retryable: boolean;
  /** 재시도 대기 시간 (ms) */
  retryAfter?: number;
}

/**
 * Vision 에러 생성 헬퍼
 */
export function createVisionError(
  code: VisionErrorCode,
  details?: string
): VisionError {
  const retryableCodes: VisionErrorCode[] = [
    'RATE_LIMITED',
    'API_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT',
  ];

  return {
    code,
    message: VISION_ERROR_MESSAGES[code],
    details,
    retryable: retryableCodes.includes(code),
    retryAfter: code === 'RATE_LIMITED' ? 60000 : undefined,
  };
}

/**
 * Vision 에러 타입 가드
 */
export function isVisionError(error: unknown): error is VisionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as VisionError).code === 'string' &&
    Object.keys(VISION_ERROR_MESSAGES).includes((error as VisionError).code)
  );
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * useClaudeVision 훅 옵션
 */
export interface UseClaudeVisionOptions {
  /** 기본 분석 유형 */
  defaultAnalysisType?: AnalysisType;
  /** 기본 최대 토큰 수 */
  defaultMaxTokens?: number;
  /** 기본 모델 */
  defaultModel?: ClaudeModel;
  /** 기본 온도 */
  defaultTemperature?: number;
  /** 성공 콜백 */
  onSuccess?: (response: VisionResponse) => void;
  /** 에러 콜백 */
  onError?: (error: VisionError) => void;
  /** 스트리밍 청크 콜백 */
  onStreamChunk?: (text: string) => void;
}

/**
 * useClaudeVision 훅 반환 타입
 */
export interface UseClaudeVisionReturn {
  /** 이미지 분석 (비스트리밍) */
  analyzeImage: (
    request: VisionRequest
  ) => Promise<VisionResponse>;
  /** 이미지 분석 (스트리밍) */
  analyzeImageStream: (
    request: VisionRequest,
    onChunk: (text: string) => void
  ) => Promise<VisionResponse>;
  /** 분석 중 여부 */
  isAnalyzing: boolean;
  /** 스트리밍 중 여부 */
  isStreaming: boolean;
  /** 에러 */
  error: VisionError | null;
  /** 상태 리셋 */
  reset: () => void;
  /** 마지막 응답 */
  lastResponse: VisionResponse | null;
  /** 마지막 토큰 사용량 */
  lastUsage: ClaudeUsage | null;
}

// ============================================================================
// Utility Types & Functions
// ============================================================================

/**
 * File을 VisionImage로 변환하는 함수 타입
 */
export type FileToVisionImage = (file: File) => Promise<VisionImage>;

/**
 * 이미지 URL 유효성 검사 결과
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 분석 유형 목록 (UI용)
 */
export const ANALYSIS_TYPE_LIST: AnalysisTypeInfo[] = Object.values(ANALYSIS_TYPE_INFO);

/**
 * 기본 분석 유형
 */
export const DEFAULT_ANALYSIS_TYPE: AnalysisType = 'general';

/**
 * 기본 Vision 요청 옵션
 */
export const DEFAULT_VISION_OPTIONS: Required<Omit<VisionRequestOptions, 'model'>> = {
  analysisType: 'general',
  maxTokens: 4096,
  stream: false,
  temperature: 0.7,
  timeout: 60000,
};
