/**
 * Claude AI API 타입 정의
 *
 * Anthropic Claude API 연동을 위한 TypeScript 타입 정의
 * - 메시지, 요청/응답, 스트리밍, 에러 타입
 * - 토큰 사용량, 모델 유형
 *
 * @module types/claude
 * @see https://docs.anthropic.com/claude/reference/messages
 */

// ============================================================================
// Model Types
// ============================================================================

/**
 * Claude 모델 ID
 *
 * 사용 가능한 Claude 모델 목록
 * @see https://docs.anthropic.com/claude/docs/models-overview
 */
export type ClaudeModel =
  | 'claude-3-5-sonnet-20241022'  // Claude 3.5 Sonnet (최신, 권장)
  | 'claude-3-5-haiku-20241022'   // Claude 3.5 Haiku (빠른 응답)
  | 'claude-3-opus-20240229'      // Claude 3 Opus (고성능)
  | 'claude-3-sonnet-20240229'    // Claude 3 Sonnet
  | 'claude-3-haiku-20240307';    // Claude 3 Haiku

/**
 * 기본 모델 설정
 */
export const DEFAULT_CLAUDE_MODEL: ClaudeModel = 'claude-3-5-sonnet-20241022';

/**
 * 모델별 정보
 */
export interface ClaudeModelInfo {
  id: ClaudeModel;
  name: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  inputPricePerMillion: number;  // USD
  outputPricePerMillion: number; // USD
}

/**
 * 모델 정보 매핑
 */
export const CLAUDE_MODEL_INFO: Record<ClaudeModel, ClaudeModelInfo> = {
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: '최신 모델, 뛰어난 성능과 속도의 균형',
    maxTokens: 8192,
    contextWindow: 200000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: '가장 빠른 응답, 간단한 작업에 적합',
    maxTokens: 8192,
    contextWindow: 200000,
    inputPricePerMillion: 1,
    outputPricePerMillion: 5,
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: '가장 강력한 모델, 복잡한 작업에 적합',
    maxTokens: 4096,
    contextWindow: 200000,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
  },
  'claude-3-sonnet-20240229': {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: '성능과 속도의 균형',
    maxTokens: 4096,
    contextWindow: 200000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: '빠른 응답, 간단한 작업에 적합',
    maxTokens: 4096,
    contextWindow: 200000,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
  },
};

// ============================================================================
// Message Types
// ============================================================================

/**
 * 메시지 역할
 */
export type ClaudeMessageRole = 'user' | 'assistant';

/**
 * 콘텐츠 블록 타입
 */
export type ClaudeContentBlockType = 'text' | 'image' | 'tool_use' | 'tool_result';

/**
 * 텍스트 콘텐츠 블록
 */
export interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

/**
 * 이미지 소스 타입
 */
export type ClaudeImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Base64 이미지 소스
 */
export interface ClaudeBase64ImageSource {
  type: 'base64';
  media_type: ClaudeImageMediaType;
  data: string;
}

/**
 * URL 이미지 소스
 */
export interface ClaudeURLImageSource {
  type: 'url';
  url: string;
}

/**
 * 이미지 소스
 */
export type ClaudeImageSource = ClaudeBase64ImageSource | ClaudeURLImageSource;

/**
 * 이미지 콘텐츠 블록
 */
export interface ClaudeImageBlock {
  type: 'image';
  source: ClaudeImageSource;
}

/**
 * 도구 사용 콘텐츠 블록
 */
export interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * 도구 결과 콘텐츠 블록
 */
export interface ClaudeToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ClaudeContentBlock[];
  is_error?: boolean;
}

/**
 * 콘텐츠 블록 유니온 타입
 */
export type ClaudeContentBlock =
  | ClaudeTextBlock
  | ClaudeImageBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock;

/**
 * Claude 메시지
 */
export interface ClaudeMessage {
  /** 메시지 역할 (user 또는 assistant) */
  role: ClaudeMessageRole;
  /** 메시지 내용 (텍스트 또는 콘텐츠 블록 배열) */
  content: string | ClaudeContentBlock[];
}

// ============================================================================
// System Prompt Types
// ============================================================================

/**
 * 시스템 프롬프트 텍스트 블록
 */
export interface ClaudeSystemTextBlock {
  type: 'text';
  text: string;
  cache_control?: {
    type: 'ephemeral';
  };
}

/**
 * 시스템 프롬프트 타입
 * - 단순 문자열 또는 텍스트 블록 배열
 */
export type ClaudeSystemPrompt = string | ClaudeSystemTextBlock[];

/**
 * 시스템 프롬프트 템플릿
 */
export interface ClaudeSystemPromptTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿 이름 */
  name: string;
  /** 템플릿 설명 */
  description: string;
  /** 시스템 프롬프트 내용 */
  content: string;
  /** 변수 목록 */
  variables?: string[];
  /** 서비스별 분류 */
  serviceId?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * 도구 정의
 */
export interface ClaudeTool {
  /** 도구 이름 */
  name: string;
  /** 도구 설명 */
  description: string;
  /** 입력 스키마 (JSON Schema) */
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * 도구 선택 옵션
 */
export interface ClaudeToolChoice {
  /** 선택 유형 */
  type: 'auto' | 'any' | 'tool';
  /** 특정 도구 지정 (type이 'tool'일 때) */
  name?: string;
}

/**
 * 메타데이터
 */
export interface ClaudeMetadata {
  /** 사용자 ID (추적용) */
  user_id?: string;
}

/**
 * Claude API 요청 파라미터
 */
export interface ClaudeRequest {
  /** 사용할 모델 ID */
  model: ClaudeModel;
  /** 대화 메시지 목록 */
  messages: ClaudeMessage[];
  /** 최대 출력 토큰 수 */
  max_tokens: number;
  /** 시스템 프롬프트 (선택) */
  system?: ClaudeSystemPrompt;
  /** 응답 중지 시퀀스 (선택) */
  stop_sequences?: string[];
  /** 스트리밍 응답 여부 */
  stream?: boolean;
  /** 온도 (0.0 ~ 1.0, 창의성 조절) */
  temperature?: number;
  /** Top-P 샘플링 */
  top_p?: number;
  /** Top-K 샘플링 */
  top_k?: number;
  /** 도구 목록 */
  tools?: ClaudeTool[];
  /** 도구 선택 방식 */
  tool_choice?: ClaudeToolChoice;
  /** 메타데이터 */
  metadata?: ClaudeMetadata;
}

/**
 * Claude API 요청 옵션 (훅에서 사용)
 */
export interface ClaudeRequestOptions {
  /** 사용할 모델 (기본: claude-3-5-sonnet-20241022) */
  model?: ClaudeModel;
  /** 최대 출력 토큰 수 (기본: 4096) */
  maxTokens?: number;
  /** 시스템 프롬프트 */
  systemPrompt?: string;
  /** 온도 (0.0 ~ 1.0) */
  temperature?: number;
  /** 스트리밍 사용 여부 */
  streaming?: boolean;
  /** 중지 시퀀스 */
  stopSequences?: string[];
  /** 도구 목록 */
  tools?: ClaudeTool[];
  /** 도구 선택 방식 */
  toolChoice?: ClaudeToolChoice;
  /** 요청 타임아웃 (ms) */
  timeout?: number;
  /** 재시도 횟수 */
  retryCount?: number;
  /** 사용자 ID (추적용) */
  userId?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * 응답 중지 이유
 */
export type ClaudeStopReason =
  | 'end_turn'      // 정상 종료
  | 'max_tokens'    // 최대 토큰 도달
  | 'stop_sequence' // 중지 시퀀스 감지
  | 'tool_use';     // 도구 사용

/**
 * 토큰 사용량
 */
export interface ClaudeUsage {
  /** 입력 토큰 수 */
  input_tokens: number;
  /** 출력 토큰 수 */
  output_tokens: number;
  /** 캐시 생성 입력 토큰 (선택) */
  cache_creation_input_tokens?: number;
  /** 캐시 읽기 입력 토큰 (선택) */
  cache_read_input_tokens?: number;
}

/**
 * Claude API 응답
 */
export interface ClaudeResponse {
  /** 응답 ID */
  id: string;
  /** 응답 타입 */
  type: 'message';
  /** 메시지 역할 */
  role: 'assistant';
  /** 콘텐츠 블록 목록 */
  content: ClaudeContentBlock[];
  /** 사용된 모델 */
  model: ClaudeModel;
  /** 중지 이유 */
  stop_reason: ClaudeStopReason | null;
  /** 중지 시퀀스 (해당되는 경우) */
  stop_sequence: string | null;
  /** 토큰 사용량 */
  usage: ClaudeUsage;
}

// ============================================================================
// Streaming Types (SSE)
// ============================================================================

/**
 * 스트림 이벤트 타입
 */
export type ClaudeStreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'ping'
  | 'error';

/**
 * 메시지 시작 이벤트
 */
export interface ClaudeMessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: ClaudeContentBlock[];
    model: ClaudeModel;
    stop_reason: null;
    stop_sequence: null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

/**
 * 콘텐츠 블록 시작 이벤트
 */
export interface ClaudeContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: ClaudeTextBlock | ClaudeToolUseBlock;
}

/**
 * 텍스트 델타
 */
export interface ClaudeTextDelta {
  type: 'text_delta';
  text: string;
}

/**
 * 도구 입력 델타
 */
export interface ClaudeInputJsonDelta {
  type: 'input_json_delta';
  partial_json: string;
}

/**
 * 콘텐츠 블록 델타 이벤트
 */
export interface ClaudeContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: ClaudeTextDelta | ClaudeInputJsonDelta;
}

/**
 * 콘텐츠 블록 종료 이벤트
 */
export interface ClaudeContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

/**
 * 메시지 델타 이벤트
 */
export interface ClaudeMessageDeltaEvent {
  type: 'message_delta';
  delta: {
    stop_reason: ClaudeStopReason;
    stop_sequence: string | null;
  };
  usage: {
    output_tokens: number;
  };
}

/**
 * 메시지 종료 이벤트
 */
export interface ClaudeMessageStopEvent {
  type: 'message_stop';
}

/**
 * 핑 이벤트
 */
export interface ClaudePingEvent {
  type: 'ping';
}

/**
 * 에러 이벤트
 */
export interface ClaudeStreamErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * 스트림 이벤트 유니온 타입
 */
export type ClaudeStreamEvent =
  | ClaudeMessageStartEvent
  | ClaudeContentBlockStartEvent
  | ClaudeContentBlockDeltaEvent
  | ClaudeContentBlockStopEvent
  | ClaudeMessageDeltaEvent
  | ClaudeMessageStopEvent
  | ClaudePingEvent
  | ClaudeStreamErrorEvent;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Claude 에러 코드
 */
export type ClaudeErrorCode =
  | 'CLAUDE_001'  // API 키 없음
  | 'CLAUDE_002'  // 인증 실패
  | 'CLAUDE_003'  // 요청 제한 초과 (Rate Limit)
  | 'CLAUDE_004'  // 유효하지 않은 요청
  | 'CLAUDE_005'  // 모델 오류
  | 'CLAUDE_006'  // 서버 오류
  | 'CLAUDE_007'  // 네트워크 오류
  | 'CLAUDE_008'  // 타임아웃
  | 'CLAUDE_009'  // 스트리밍 오류
  | 'CLAUDE_010'  // 토큰 한도 초과
  | 'CLAUDE_011'  // 콘텐츠 정책 위반
  | 'CLAUDE_012'  // 알 수 없는 오류
  | 'CLAUDE_013'; // 취소됨

/**
 * 에러 코드별 메시지 매핑
 */
export const CLAUDE_ERROR_MESSAGES: Record<ClaudeErrorCode, string> = {
  CLAUDE_001: 'API 키가 설정되지 않았습니다',
  CLAUDE_002: 'API 인증에 실패했습니다',
  CLAUDE_003: '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요',
  CLAUDE_004: '유효하지 않은 요청입니다',
  CLAUDE_005: '모델 처리 중 오류가 발생했습니다',
  CLAUDE_006: '서버 오류가 발생했습니다',
  CLAUDE_007: '네트워크 연결에 실패했습니다',
  CLAUDE_008: '요청 시간이 초과되었습니다',
  CLAUDE_009: '스트리밍 처리 중 오류가 발생했습니다',
  CLAUDE_010: '토큰 한도를 초과했습니다',
  CLAUDE_011: '콘텐츠 정책을 위반했습니다',
  CLAUDE_012: '알 수 없는 오류가 발생했습니다',
  CLAUDE_013: '요청이 취소되었습니다',
};

/**
 * Claude API 에러
 */
export interface ClaudeError {
  /** 에러 코드 */
  code: ClaudeErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** HTTP 상태 코드 */
  httpStatus?: number;
  /** 원본 에러 타입 (Anthropic API) */
  type?: string;
  /** 원본 에러 */
  cause?: Error;
  /** 타임스탬프 */
  timestamp: string;
  /** 재시도 가능 여부 */
  retryable: boolean;
  /** 재시도 대기 시간 (ms) */
  retryAfter?: number;
}

/**
 * Claude 에러 생성 헬퍼
 */
export function createClaudeError(
  code: ClaudeErrorCode,
  details?: string,
  cause?: Error,
  httpStatus?: number
): ClaudeError {
  const retryableCodes: ClaudeErrorCode[] = ['CLAUDE_003', 'CLAUDE_006', 'CLAUDE_007', 'CLAUDE_008'];

  return {
    code,
    message: CLAUDE_ERROR_MESSAGES[code],
    details,
    httpStatus,
    cause,
    timestamp: new Date().toISOString(),
    retryable: retryableCodes.includes(code),
    retryAfter: code === 'CLAUDE_003' ? 60000 : undefined, // Rate limit: 1분 대기
  };
}

/**
 * Claude 에러 타입 가드
 */
export function isClaudeError(error: unknown): error is ClaudeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ClaudeError).code === 'string' &&
    (error as ClaudeError).code.startsWith('CLAUDE_')
  );
}

/**
 * HTTP 상태 코드를 Claude 에러 코드로 변환
 */
export function httpStatusToClaudeErrorCode(status: number): ClaudeErrorCode {
  switch (status) {
    case 400:
      return 'CLAUDE_004';
    case 401:
      return 'CLAUDE_002';
    case 403:
      return 'CLAUDE_011';
    case 429:
      return 'CLAUDE_003';
    case 500:
    case 502:
    case 503:
      return 'CLAUDE_006';
    case 504:
      return 'CLAUDE_008';
    default:
      return 'CLAUDE_012';
  }
}

// ============================================================================
// Hook State Types
// ============================================================================

/**
 * Claude 대화 상태
 */
export interface ClaudeConversationState {
  /** 대화 ID */
  conversationId: string | null;
  /** 메시지 목록 */
  messages: ClaudeMessage[];
  /** 현재 스트리밍 중인 텍스트 */
  streamingText: string;
  /** 스트리밍 진행 중 여부 */
  isStreaming: boolean;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 마지막 에러 */
  error: ClaudeError | null;
  /** 마지막 응답의 토큰 사용량 */
  lastUsage: ClaudeUsage | null;
  /** 총 토큰 사용량 (세션) */
  totalUsage: ClaudeUsage;
}

/**
 * Claude 스트리밍 훅 결과
 */
export interface UseClaudeStreamingResult {
  /** 현재 대화 상태 */
  state: ClaudeConversationState;
  /** 메시지 전송 */
  sendMessage: (content: string, options?: ClaudeRequestOptions) => Promise<string>;
  /** 스트리밍 중지 */
  stopStreaming: () => void;
  /** 대화 초기화 */
  clearConversation: () => void;
  /** 대화 기록 설정 */
  setMessages: (messages: ClaudeMessage[]) => void;
  /** 시스템 프롬프트 설정 */
  setSystemPrompt: (prompt: string) => void;
  /** 현재 시스템 프롬프트 */
  systemPrompt: string | null;
  /** 스트리밍 중 여부 */
  isStreaming: boolean;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 여부 */
  isError: boolean;
  /** 에러 객체 */
  error: ClaudeError | null;
}

/**
 * Claude 채팅 훅 옵션
 */
export interface UseClaudeChatOptions {
  /** 기본 모델 */
  model?: ClaudeModel;
  /** 기본 시스템 프롬프트 */
  systemPrompt?: string;
  /** 기본 최대 토큰 */
  maxTokens?: number;
  /** 기본 온도 */
  temperature?: number;
  /** 스트리밍 사용 여부 */
  streaming?: boolean;
  /** 자동 저장 여부 */
  autoSave?: boolean;
  /** 메시지 변경 콜백 */
  onMessageChange?: (messages: ClaudeMessage[]) => void;
  /** 스트리밍 텍스트 콜백 */
  onStreamingText?: (text: string) => void;
  /** 완료 콜백 */
  onComplete?: (response: string, usage: ClaudeUsage) => void;
  /** 에러 콜백 */
  onError?: (error: ClaudeError) => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 최대 토큰 수
 */
export const DEFAULT_MAX_TOKENS = 4096;

/**
 * 기본 온도
 */
export const DEFAULT_TEMPERATURE = 0.7;

/**
 * 기본 타임아웃 (ms)
 */
export const DEFAULT_TIMEOUT = 60000;

/**
 * 기본 재시도 횟수
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * 재시도 간격 (ms)
 */
export const RETRY_DELAY = 1000;

/**
 * 스트리밍 청크 구분자
 */
export const SSE_DELIMITER = '\n\n';

/**
 * SSE 데이터 접두사
 */
export const SSE_DATA_PREFIX = 'data: ';

/**
 * SSE 이벤트 접두사
 */
export const SSE_EVENT_PREFIX = 'event: ';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 메시지에서 텍스트 추출
 */
export function extractTextFromMessage(message: ClaudeMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content
    .filter((block): block is ClaudeTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * 응답에서 텍스트 추출
 */
export function extractTextFromResponse(response: ClaudeResponse): string {
  return response.content
    .filter((block): block is ClaudeTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * 토큰 사용량 합산
 */
export function sumUsage(a: ClaudeUsage, b: ClaudeUsage): ClaudeUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens:
      (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens:
      (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
  };
}

/**
 * 빈 토큰 사용량
 */
export const EMPTY_USAGE: ClaudeUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

/**
 * 예상 비용 계산 (USD)
 */
export function calculateCost(usage: ClaudeUsage, model: ClaudeModel): number {
  const modelInfo = CLAUDE_MODEL_INFO[model];
  const inputCost = (usage.input_tokens / 1_000_000) * modelInfo.inputPricePerMillion;
  const outputCost = (usage.output_tokens / 1_000_000) * modelInfo.outputPricePerMillion;
  return inputCost + outputCost;
}
