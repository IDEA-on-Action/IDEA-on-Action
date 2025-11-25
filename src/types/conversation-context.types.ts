/**
 * 대화 컨텍스트 관리 타입 정의
 *
 * Claude Skills의 대화 세션 저장 및 관리를 위한 타입
 *
 * @module types/conversation-context
 */

import type { ClaudeSkillType } from './claude-skills.types';

// ============================================================================
// DB 모델 타입
// ============================================================================

/**
 * 대화 세션 상태
 */
export type ConversationStatus = 'active' | 'archived';

/**
 * 메시지 역할
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 대화 세션 DB 레코드 (conversation_sessions 테이블)
 */
export interface ConversationSessionDB {
  /** UUID */
  id: string;
  /** 사용자 UUID */
  user_id: string;
  /** 세션 제목 */
  title: string;
  /** 시스템 프롬프트 */
  system_prompt: string | null;
  /** 프롬프트 템플릿 ID */
  template_id: string | null;
  /** 세션 상태 */
  status: ConversationStatus;
  /** 누적 토큰 수 */
  total_tokens: number;
  /** 부모 세션 ID (포크 시) */
  parent_session_id: string | null;
  /** 포크 순서 */
  fork_index: number | null;
  /** 컨텍스트 요약 */
  summary: string | null;
  /** 메타데이터 (Tool Use, RAG 설정 등) */
  metadata: ConversationMetadata | null;
  /** 생성 시각 */
  created_at: string;
  /** 수정 시각 */
  updated_at: string;
}

/**
 * 대화 메시지 DB 레코드 (conversation_messages 테이블)
 */
export interface ConversationMessageDB {
  /** UUID */
  id: string;
  /** 세션 UUID */
  session_id: string;
  /** 메시지 역할 */
  role: MessageRole;
  /** 메시지 내용 */
  content: string;
  /** 메시지 순서 */
  sequence: number;
  /** 토큰 수 */
  token_count: number | null;
  /** 사용한 모델 */
  model: string | null;
  /** 요약 처리 여부 */
  is_summarized: boolean;
  /** 메타데이터 (Tool Use 결과 등) */
  metadata: MessageMetadata | null;
  /** 생성 시각 */
  created_at: string;
}

/**
 * 대화 세션 메타데이터
 */
export interface ConversationMetadata {
  /** Skill 유형 */
  skillType?: ClaudeSkillType;
  /** Tool Use 설정 */
  toolUse?: {
    enabled: boolean;
    tools: string[];
  };
  /** RAG 설정 */
  rag?: {
    enabled: boolean;
    sources: string[];
  };
  /** 커스텀 데이터 */
  [key: string]: unknown;
}

/**
 * 메시지 메타데이터
 */
export interface MessageMetadata {
  /** Tool Use 결과 */
  toolUse?: {
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
  }[];
  /** 에러 정보 */
  error?: {
    code: string;
    message: string;
  };
  /** 커스텀 데이터 */
  [key: string]: unknown;
}

// ============================================================================
// 클라이언트 타입 (camelCase)
// ============================================================================

/**
 * 대화 세션 (클라이언트용)
 */
export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  systemPrompt: string | null;
  templateId: string | null;
  status: ConversationStatus;
  totalTokens: number;
  parentSessionId: string | null;
  forkIndex: number | null;
  summary: string | null;
  metadata: ConversationMetadata | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 대화 메시지 (클라이언트용)
 */
export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  sequence: number;
  tokenCount: number | null;
  model: string | null;
  isSummarized: boolean;
  metadata: MessageMetadata | null;
  createdAt: string;
}

/**
 * 토큰 사용량
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ============================================================================
// CRUD 입력 타입
// ============================================================================

/**
 * 세션 생성 입력
 */
export interface CreateConversationInput {
  /** 세션 제목 (선택, 기본값: "새 대화 {날짜}") */
  title?: string;
  /** 시스템 프롬프트 */
  systemPrompt?: string;
  /** 프롬프트 템플릿 ID */
  templateId?: string;
  /** 메타데이터 */
  metadata?: ConversationMetadata;
}

/**
 * 세션 업데이트 입력
 */
export interface UpdateConversationInput {
  id: string;
  title?: string;
  systemPrompt?: string;
  status?: ConversationStatus;
  summary?: string;
  metadata?: ConversationMetadata;
}

/**
 * 메시지 저장 입력
 */
export interface CreateMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  model?: string;
  metadata?: MessageMetadata;
}

// ============================================================================
// 필터 및 조회 타입
// ============================================================================

/**
 * 세션 필터
 */
export interface ConversationFilters {
  /** 상태 필터 */
  status?: ConversationStatus;
  /** 프롬프트 템플릿 ID */
  templateId?: string;
  /** 검색어 (제목) */
  search?: string;
  /** 정렬 기준 */
  orderBy?: 'created_at' | 'updated_at' | 'total_tokens';
  /** 정렬 방향 */
  orderDirection?: 'asc' | 'desc';
  /** 페이지네이션 제한 */
  limit?: number;
  /** 페이지네이션 오프셋 */
  offset?: number;
}

/**
 * 세션 목록 응답
 */
export interface ConversationsResponse {
  /** 세션 목록 */
  data: ConversationSessionWithStats[];
  /** 전체 개수 */
  count: number | null;
}

/**
 * 통계 포함 세션
 */
export interface ConversationSessionWithStats extends ConversationSession {
  /** 메시지 개수 */
  messageCount: number;
}

/**
 * 메시지 목록 응답
 */
export interface MessagesResponse {
  /** 메시지 목록 */
  data: ConversationMessage[];
  /** 전체 개수 */
  count: number | null;
}

// ============================================================================
// 컨텍스트 요약 타입
// ============================================================================

/**
 * 요약 입력
 */
export interface SummarizeContextInput {
  /** 세션 ID */
  sessionId: string;
  /** 요약할 메시지 개수 (최근 N개는 제외) */
  summarizeBeforeSequence?: number;
}

/**
 * 요약 결과
 */
export interface SummarizeContextResult {
  /** 생성된 요약 */
  summary: string;
  /** 요약된 메시지 개수 */
  summarizedCount: number;
  /** 절약된 토큰 수 (추정) */
  tokensSaved: number;
}

// ============================================================================
// 포크 타입
// ============================================================================

/**
 * 포크 입력
 */
export interface ForkConversationInput {
  /** 부모 세션 ID */
  parentSessionId: string;
  /** 분기 시작 메시지 sequence */
  forkFromSequence: number;
  /** 새 세션 제목 (선택) */
  newTitle?: string;
}

/**
 * 포크 결과
 */
export interface ForkConversationResult {
  /** 새 세션 */
  newSession: ConversationSession;
  /** 복사된 메시지 개수 */
  copiedMessageCount: number;
}

// ============================================================================
// 내보내기 타입
// ============================================================================

/**
 * Markdown 내보내기 결과
 */
export interface ExportMarkdownResult {
  /** Markdown 내용 */
  content: string;
  /** 파일명 */
  filename: string;
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * useConversations 훅 결과
 */
export interface UseConversationsResult {
  /** 세션 목록 */
  conversations: ConversationSessionWithStats[];
  /** 전체 개수 */
  totalCount: number;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 재조회 */
  refetch: () => void;
}

/**
 * useConversation 훅 결과
 */
export interface UseConversationResult {
  /** 세션 */
  conversation: ConversationSession | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 재조회 */
  refetch: () => void;
}

/**
 * useMessages 훅 결과
 */
export interface UseMessagesResult {
  /** 메시지 목록 */
  messages: ConversationMessage[];
  /** 전체 개수 */
  totalCount: number;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 재조회 */
  refetch: () => void;
}

/**
 * useConversationManager 훅 결과
 */
export interface UseConversationManagerResult {
  // 대화 세션 CRUD
  /** 세션 목록 조회 */
  conversations: ConversationSessionWithStats[];
  /** 세션 상세 조회 */
  conversation: ConversationSession | null;
  /** 세션 생성 */
  createConversation: (input: CreateConversationInput) => Promise<ConversationSession>;
  /** 세션 업데이트 */
  updateConversation: (input: UpdateConversationInput) => Promise<ConversationSession>;
  /** 세션 아카이브 */
  archiveConversation: (sessionId: string) => Promise<void>;

  // 메시지 관리
  /** 메시지 목록 조회 */
  messages: ConversationMessage[];
  /** 메시지 추가 */
  addMessage: (input: CreateMessageInput) => Promise<ConversationMessage>;

  // 컨텍스트 요약
  /** 요약 생성 */
  summarizeContext: (input: SummarizeContextInput) => Promise<SummarizeContextResult>;

  // 대화 포크/내보내기
  /** 대화 포크 */
  forkConversation: (input: ForkConversationInput) => Promise<ForkConversationResult>;
  /** Markdown 내보내기 */
  exportToMarkdown: (sessionId: string) => Promise<ExportMarkdownResult>;

  // 상태
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
}

// ============================================================================
// 유틸리티 함수 타입
// ============================================================================

/**
 * DB 레코드를 클라이언트 객체로 변환 (세션)
 */
export function dbToConversationSession(db: ConversationSessionDB): ConversationSession {
  return {
    id: db.id,
    userId: db.user_id,
    title: db.title,
    systemPrompt: db.system_prompt,
    templateId: db.template_id,
    status: db.status,
    totalTokens: db.total_tokens,
    parentSessionId: db.parent_session_id,
    forkIndex: db.fork_index,
    summary: db.summary,
    metadata: db.metadata,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * 클라이언트 객체를 DB 레코드로 변환 (세션)
 */
export function conversationSessionToDb(
  session: Partial<ConversationSession>
): Partial<ConversationSessionDB> {
  const db: Partial<ConversationSessionDB> = {};

  if (session.title !== undefined) db.title = session.title;
  if (session.systemPrompt !== undefined) db.system_prompt = session.systemPrompt;
  if (session.templateId !== undefined) db.template_id = session.templateId;
  if (session.status !== undefined) db.status = session.status;
  if (session.summary !== undefined) db.summary = session.summary;
  if (session.metadata !== undefined) db.metadata = session.metadata;

  return db;
}

/**
 * DB 레코드를 클라이언트 객체로 변환 (메시지)
 */
export function dbToConversationMessage(db: ConversationMessageDB): ConversationMessage {
  return {
    id: db.id,
    sessionId: db.session_id,
    role: db.role,
    content: db.content,
    sequence: db.sequence,
    tokenCount: db.token_count,
    model: db.model,
    isSummarized: db.is_summarized,
    metadata: db.metadata,
    createdAt: db.created_at,
  };
}

/**
 * 클라이언트 객체를 DB 레코드로 변환 (메시지)
 */
export function conversationMessageToDb(
  message: Partial<ConversationMessage>
): Partial<ConversationMessageDB> {
  const db: Partial<ConversationMessageDB> = {};

  if (message.sessionId !== undefined) db.session_id = message.sessionId;
  if (message.role !== undefined) db.role = message.role;
  if (message.content !== undefined) db.content = message.content;
  if (message.sequence !== undefined) db.sequence = message.sequence;
  if (message.tokenCount !== undefined) db.token_count = message.tokenCount;
  if (message.model !== undefined) db.model = message.model;
  if (message.isSummarized !== undefined) db.is_summarized = message.isSummarized;
  if (message.metadata !== undefined) db.metadata = message.metadata;

  return db;
}
