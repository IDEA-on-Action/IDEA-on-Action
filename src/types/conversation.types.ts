/**
 * AI 대화 컨텍스트 관리 타입 정의
 *
 * Claude AI 통합을 위한 대화 세션 및 메시지 타입 정의
 * - 대화 세션 관리
 * - 메시지 이력 저장
 * - 컨텍스트 요약 및 포크
 * - 검색 및 필터링
 *
 * @module types/conversation
 * @see https://docs.anthropic.com/claude/reference/messages
 */

import type { ClaudeMessage, ClaudeContentBlock, ClaudeStopReason } from './claude.types';

// ============================================================================
// Enum Types
// ============================================================================

/**
 * 대화 상태
 */
export type ConversationStatus = 'active' | 'archived' | 'deleted';

/**
 * 메시지 역할
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool_result';

/**
 * 메시지 평가
 */
export type MessageRating = 'positive' | 'negative' | 'neutral';

/**
 * 대화 정렬 기준
 */
export type ConversationSortBy = 'created_at' | 'updated_at' | 'last_activity_at' | 'message_count' | 'total_tokens';

/**
 * 정렬 순서
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 대화 내보내기 형식
 */
export type ExportFormat = 'markdown' | 'json' | 'text';

// ============================================================================
// Database Entity Types
// ============================================================================

/**
 * AI 대화 세션 (DB 모델)
 */
export interface AIConversation {
  /** 대화 고유 ID */
  id: string;

  /** 대화 제목 */
  title: string;

  /** 대화 설명 */
  description?: string | null;

  /** 사용된 프롬프트 템플릿 ID */
  template_id?: string | null;

  /** 대화별 시스템 프롬프트 */
  system_prompt?: string | null;

  /** 메타데이터 (프로젝트 ID, 서비스 ID, 태그 등) */
  metadata: {
    service_id?: string;
    project_id?: string;
    tags?: string[];
    summary?: string;
    forked_from_message_id?: string;
    [key: string]: unknown;
  };

  /** 도구 설정 (Claude Tools API) */
  tool_config: {
    enabled?: boolean;
    available_tools?: string[];
    [key: string]: unknown;
  };

  /** RAG 설정 (검색 증강 생성) */
  rag_config: {
    enabled?: boolean;
    knowledge_base_id?: string;
    [key: string]: unknown;
  };

  /** 부모 대화 ID (포크 관계) */
  parent_id?: string | null;

  /** 포크 순서 (0부터 시작) */
  fork_index: number;

  /** 대화 상태 */
  status: ConversationStatus;

  /** 메시지 수 (자동 계산) */
  message_count: number;

  /** 총 토큰 수 (자동 계산) */
  total_tokens: number;

  /** 마지막 활동 시간 (자동 업데이트) */
  last_activity_at: string;

  /** 소유자 사용자 ID */
  user_id: string;

  /** 생성 시간 */
  created_at: string;

  /** 수정 시간 (자동 업데이트) */
  updated_at: string;
}

/**
 * AI 메시지 (DB 모델)
 */
export interface AIMessage {
  /** 메시지 고유 ID */
  id: string;

  /** 대화 ID (외래키) */
  conversation_id: string;

  /** 메시지 역할 */
  role: MessageRole;

  /** 텍스트 메시지 내용 */
  content?: string | null;

  /** Claude Content Blocks (멀티모달 콘텐츠) */
  content_blocks?: ClaudeContentBlock[] | null;

  /** Claude Tool Use 정보 */
  tool_use?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null;

  /** Claude Tool Result 정보 */
  tool_result?: {
    tool_use_id: string;
    content: string | ClaudeContentBlock[];
    is_error?: boolean;
  } | null;

  /** 토큰 수 (assistant 메시지만) */
  token_count?: number | null;

  /** 사용된 Claude 모델 ID */
  model?: string | null;

  /** 응답 종료 이유 */
  stop_reason?: ClaudeStopReason | null;

  /** 사용자 평가 */
  rating?: MessageRating | null;

  /** 피드백 텍스트 */
  feedback_text?: string | null;

  /** 생성 시간 */
  created_at: string;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * 대화 생성 요청
 */
export interface CreateConversationInput {
  /** 대화 제목 */
  title: string;

  /** 대화 설명 */
  description?: string;

  /** 프롬프트 템플릿 ID */
  template_id?: string;

  /** 시스템 프롬프트 */
  system_prompt?: string;

  /** 메타데이터 */
  metadata?: AIConversation['metadata'];

  /** 도구 설정 */
  tool_config?: AIConversation['tool_config'];

  /** RAG 설정 */
  rag_config?: AIConversation['rag_config'];

  /** 초기 메시지 (선택) */
  initial_message?: string;
}

/**
 * 대화 업데이트 요청
 */
export interface UpdateConversationInput {
  /** 대화 제목 */
  title?: string;

  /** 대화 설명 */
  description?: string;

  /** 시스템 프롬프트 */
  system_prompt?: string;

  /** 메타데이터 */
  metadata?: Partial<AIConversation['metadata']>;

  /** 도구 설정 */
  tool_config?: Partial<AIConversation['tool_config']>;

  /** RAG 설정 */
  rag_config?: Partial<AIConversation['rag_config']>;

  /** 대화 상태 */
  status?: ConversationStatus;
}

/**
 * 메시지 생성 요청
 */
export interface CreateMessageInput {
  /** 대화 ID */
  conversation_id: string;

  /** 메시지 역할 */
  role: MessageRole;

  /** 텍스트 내용 */
  content?: string;

  /** 콘텐츠 블록 */
  content_blocks?: ClaudeContentBlock[];

  /** 도구 사용 정보 */
  tool_use?: AIMessage['tool_use'];

  /** 도구 결과 정보 */
  tool_result?: AIMessage['tool_result'];

  /** 토큰 수 */
  token_count?: number;

  /** 모델 ID */
  model?: string;

  /** 중지 이유 */
  stop_reason?: ClaudeStopReason;
}

/**
 * 메시지 업데이트 요청 (피드백)
 */
export interface UpdateMessageInput {
  /** 사용자 평가 */
  rating?: MessageRating;

  /** 피드백 텍스트 */
  feedback_text?: string;
}

/**
 * 대화 요약 요청
 */
export interface SummarizeConversationInput {
  /** 대화 ID */
  conversation_id: string;

  /** 요약 최대 길이 (단어 수) */
  max_length?: number;
}

/**
 * 대화 포크 요청
 */
export interface ForkConversationInput {
  /** 부모 대화 ID */
  parent_conversation_id: string;

  /** 포크 시작 메시지 ID */
  from_message_id: string;

  /** 새 대화 제목 */
  new_title: string;
}

/**
 * 대화 내보내기 요청
 */
export interface ExportConversationInput {
  /** 대화 ID */
  conversation_id: string;

  /** 내보내기 형식 */
  format: ExportFormat;

  /** 메타데이터 포함 여부 */
  include_metadata?: boolean;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

/**
 * 대화 필터 옵션
 */
export interface ConversationFilters {
  /** 대화 상태 */
  status?: ConversationStatus;

  /** 서비스 ID */
  service_id?: string;

  /** 프로젝트 ID */
  project_id?: string;

  /** 검색 쿼리 (제목, 설명) */
  search?: string;

  /** 생성일 시작 */
  created_after?: string;

  /** 생성일 종료 */
  created_before?: string;

  /** 템플릿 ID */
  template_id?: string;

  /** 부모 대화 ID (포크 필터링) */
  parent_id?: string;
}

/**
 * 대화 정렬 옵션
 */
export interface ConversationSortOptions {
  /** 정렬 기준 */
  sortBy: ConversationSortBy;

  /** 정렬 순서 */
  sortOrder: SortOrder;
}

/**
 * 대화 페이지네이션 옵션
 */
export interface ConversationPaginationOptions {
  /** 페이지 번호 (0부터 시작) */
  page?: number;

  /** 페이지 크기 */
  pageSize?: number;

  /** 오프셋 (page 대신 사용 가능) */
  offset?: number;

  /** 제한 (pageSize 대신 사용 가능) */
  limit?: number;
}

// ============================================================================
// Hook Result Types
// ============================================================================

/**
 * useConversationManager 훅 결과
 */
export interface UseConversationManagerResult {
  /** 대화 목록 */
  conversations: AIConversation[];

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 */
  error: Error | null;

  /** 대화 생성 */
  createConversation: (input: CreateConversationInput) => Promise<AIConversation>;

  /** 대화 업데이트 */
  updateConversation: (id: string, input: UpdateConversationInput) => Promise<AIConversation>;

  /** 대화 삭제 */
  deleteConversation: (id: string) => Promise<void>;

  /** 대화 보관 */
  archiveConversation: (id: string) => Promise<void>;

  /** 대화 요약 */
  summarizeConversation: (input: SummarizeConversationInput) => Promise<string>;

  /** 대화 포크 */
  forkConversation: (input: ForkConversationInput) => Promise<AIConversation>;

  /** 대화 내보내기 */
  exportConversation: (input: ExportConversationInput) => Promise<string>;

  /** 대화 검색 */
  searchConversations: (query: string) => Promise<AIConversation[]>;

  /** 필터 설정 */
  setFilters: (filters: ConversationFilters) => void;

  /** 정렬 설정 */
  setSortOptions: (options: ConversationSortOptions) => void;

  /** 대화 새로고침 */
  refetch: () => Promise<void>;
}

/**
 * useMessages 훅 옵션
 */
export interface UseMessagesOptions {
  /** 대화 ID */
  conversation_id: string;

  /** 훅 활성화 여부 */
  enabled?: boolean;

  /** Supabase Realtime 구독 여부 */
  realtime?: boolean;

  /** 초기 메시지 수 (페이지네이션) */
  initialLimit?: number;
}

/**
 * useMessages 훅 결과
 */
export interface UseMessagesResult {
  /** 메시지 목록 */
  messages: AIMessage[];

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 */
  error: Error | null;

  /** 메시지 추가 */
  addMessage: (input: CreateMessageInput) => Promise<AIMessage>;

  /** 메시지 업데이트 (피드백) */
  updateMessage: (id: string, input: UpdateMessageInput) => Promise<AIMessage>;

  /** 메시지 삭제 */
  deleteMessage: (id: string) => Promise<void>;

  /** 스트리밍 메시지 전송 */
  sendStreamingMessage: (
    content: string,
    onChunk: (chunk: string) => void,
    onComplete?: (message: AIMessage) => void
  ) => Promise<AIMessage>;

  /** 컨텍스트 메시지 가져오기 (토큰 제한 고려) */
  getContextMessages: (maxTokens?: number) => ClaudeMessage[];

  /** 총 토큰 수 계산 */
  getTotalTokens: () => number;

  /** Realtime 구독 */
  subscribeToMessages: () => () => void;

  /** 더 많은 메시지 로드 (무한 스크롤) */
  loadMoreMessages: () => Promise<void>;

  /** 더 로드할 메시지 존재 여부 */
  hasMore: boolean;

  /** 메시지 새로고침 */
  refetch: () => Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 대화 통계
 */
export interface ConversationStats {
  /** 총 대화 수 */
  total_conversations: number;

  /** 활성 대화 수 */
  active_conversations: number;

  /** 보관된 대화 수 */
  archived_conversations: number;

  /** 총 메시지 수 */
  total_messages: number;

  /** 총 토큰 수 */
  total_tokens: number;

  /** 평균 메시지 수/대화 */
  avg_messages_per_conversation: number;

  /** 평균 토큰 수/대화 */
  avg_tokens_per_conversation: number;
}

/**
 * 대화 검색 결과
 */
export interface ConversationSearchResult extends AIConversation {
  /** 검색 랭킹 점수 */
  rank: number;

  /** 하이라이트된 텍스트 */
  highlights?: {
    title?: string;
    description?: string;
    message_content?: string;
  };
}

/**
 * 대화 트리 노드 (포크 관계 시각화용)
 */
export interface ConversationTreeNode {
  /** 대화 정보 */
  conversation: AIConversation;

  /** 자식 노드 (포크된 대화들) */
  children: ConversationTreeNode[];

  /** 트리 깊이 */
  depth: number;
}

/**
 * 메시지 그룹 (날짜별, 역할별 등)
 */
export interface MessageGroup {
  /** 그룹 키 */
  key: string;

  /** 그룹 레이블 */
  label: string;

  /** 메시지 목록 */
  messages: AIMessage[];

  /** 그룹 토큰 수 */
  token_count: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * 대화 목록 응답
 */
export interface ConversationListResponse {
  /** 대화 목록 */
  conversations: AIConversation[];

  /** 총 개수 */
  total: number;

  /** 페이지 정보 */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * 메시지 목록 응답
 */
export interface MessageListResponse {
  /** 메시지 목록 */
  messages: AIMessage[];

  /** 총 개수 */
  total: number;

  /** 더 많은 메시지 존재 여부 */
  hasMore: boolean;
}

/**
 * 대화 내보내기 응답
 */
export interface ExportConversationResponse {
  /** 내보낸 내용 */
  content: string;

  /** 파일명 (제안) */
  filename: string;

  /** MIME 타입 */
  mimeType: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 대화 필터
 */
export const DEFAULT_CONVERSATION_FILTERS: ConversationFilters = {
  status: 'active',
};

/**
 * 기본 정렬 옵션
 */
export const DEFAULT_SORT_OPTIONS: ConversationSortOptions = {
  sortBy: 'last_activity_at',
  sortOrder: 'desc',
};

/**
 * 기본 페이지네이션 옵션
 */
export const DEFAULT_PAGINATION_OPTIONS: ConversationPaginationOptions = {
  page: 0,
  pageSize: 20,
};

/**
 * 컨텍스트 최대 토큰 수 (기본값)
 */
export const DEFAULT_CONTEXT_MAX_TOKENS = 8000;

/**
 * 요약 최대 길이 (기본값, 단어 수)
 */
export const DEFAULT_SUMMARY_MAX_LENGTH = 500;
