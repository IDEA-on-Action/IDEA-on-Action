/**
 * RAG (Retrieval-Augmented Generation) 타입 정의
 *
 * Claude AI에 컨텍스트를 제공하기 위한 RAG 시스템 타입 정의
 * - 문서, 임베딩, 검색 결과 타입
 * - API 요청/응답 타입
 * - 컨텍스트 빌더, 훅 옵션
 *
 * @module types/rag
 * @see https://docs.anthropic.com/claude/docs/retrieval-augmented-generation
 */

import type { MinuServiceId } from './claude.types';

// ============================================================================
// Source Types
// ============================================================================

/**
 * RAG 소스 타입
 *
 * 문서의 출처를 나타냄
 */
export type RAGSourceType =
  | 'file'         // 업로드된 파일
  | 'url'          // 웹 URL
  | 'manual'       // 수동 입력
  | 'service_data';// 서비스 데이터 (프로젝트, 이슈 등)

/**
 * RAG 문서 상태
 */
export type RAGStatus =
  | 'active'       // 활성 (검색 가능)
  | 'archived'     // 보관됨
  | 'processing';  // 처리 중

/**
 * RAG 임베딩 상태
 */
export type RAGEmbeddingStatus =
  | 'pending'      // 대기 중
  | 'processing'   // 처리 중
  | 'completed'    // 완료
  | 'failed';      // 실패

// ============================================================================
// Document Types
// ============================================================================

/**
 * RAG 문서 (클라이언트)
 *
 * Claude에게 제공할 컨텍스트 문서
 */
export interface RAGDocument {
  /** 문서 ID */
  id: string;
  /** 문서 제목 */
  title: string;
  /** 문서 내용 */
  content: string;
  /** 메타데이터 (JSON) */
  metadata: Record<string, unknown>;
  /** 소스 타입 */
  sourceType: RAGSourceType;
  /** 소스 URL (파일/URL인 경우) */
  sourceUrl?: string | null;
  /** 파일 타입 (파일인 경우) */
  fileType?: string | null;
  /** 상태 */
  status: RAGStatus;
  /** 서비스 ID (서비스 데이터인 경우) */
  serviceId?: MinuServiceId | null;
  /** 사용자 ID */
  userId: string;
  /** 생성일 */
  createdAt: string;
  /** 수정일 */
  updatedAt: string;
}

/**
 * RAG 문서 (DB, snake_case)
 */
export interface RAGDocumentRow {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  source_type: RAGSourceType;
  source_url?: string | null;
  file_type?: string | null;
  status: RAGStatus;
  service_id?: MinuServiceId | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * DB Row → Client 변환
 */
export function toRAGDocument(row: RAGDocumentRow): RAGDocument {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    metadata: row.metadata,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    fileType: row.file_type,
    status: row.status,
    serviceId: row.service_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * RAG 임베딩 (클라이언트)
 *
 * 문서의 벡터 임베딩
 */
export interface RAGEmbedding {
  /** 임베딩 ID */
  id: string;
  /** 문서 ID */
  documentId: string;
  /** 청크 인덱스 */
  chunkIndex: number;
  /** 청크 내용 */
  chunkContent: string;
  /** 임베딩 벡터 (1536 차원) */
  embedding: number[];
  /** 임베딩 상태 */
  status: RAGEmbeddingStatus;
  /** 에러 메시지 (실패 시) */
  errorMessage?: string | null;
  /** 생성일 */
  createdAt: string;
}

/**
 * RAG 임베딩 (DB, snake_case)
 */
export interface RAGEmbeddingRow {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_content: string;
  embedding: number[];
  status: RAGEmbeddingStatus;
  error_message?: string | null;
  created_at: string;
}

/**
 * DB Row → Client 변환
 */
export function toRAGEmbedding(row: RAGEmbeddingRow): RAGEmbedding {
  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    chunkContent: row.chunk_content,
    embedding: row.embedding,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

// ============================================================================
// Search Result Types
// ============================================================================

/**
 * RAG 검색 결과 (클라이언트)
 *
 * 유사도 검색 결과
 */
export interface RAGSearchResult {
  /** 문서 ID */
  documentId: string;
  /** 문서 제목 */
  documentTitle: string;
  /** 청크 인덱스 */
  chunkIndex: number;
  /** 청크 내용 */
  chunkContent: string;
  /** 유사도 점수 (0~1) */
  similarity: number;
  /** 메타데이터 */
  metadata: Record<string, unknown>;
  /** 소스 타입 */
  sourceType: RAGSourceType;
  /** 소스 URL */
  sourceUrl?: string | null;
  /** 서비스 ID */
  serviceId?: MinuServiceId | null;
}

/**
 * RAG 검색 결과 (DB, snake_case)
 */
export interface RAGSearchResultRow {
  document_id: string;
  document_title: string;
  chunk_index: number;
  chunk_content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  source_type: RAGSourceType;
  source_url?: string | null;
  service_id?: MinuServiceId | null;
}

/**
 * DB Row → Client 변환
 */
export function toRAGSearchResult(row: RAGSearchResultRow): RAGSearchResult {
  return {
    documentId: row.document_id,
    documentTitle: row.document_title,
    chunkIndex: row.chunk_index,
    chunkContent: row.chunk_content,
    similarity: row.similarity,
    metadata: row.metadata,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    serviceId: row.service_id,
  };
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * RAG 문서 생성 입력
 */
export interface CreateRAGDocumentInput {
  /** 문서 제목 */
  title: string;
  /** 문서 내용 */
  content: string;
  /** 메타데이터 (선택) */
  metadata?: Record<string, unknown>;
  /** 소스 타입 */
  sourceType: RAGSourceType;
  /** 소스 URL (선택) */
  sourceUrl?: string;
  /** 파일 타입 (선택) */
  fileType?: string;
  /** 서비스 ID (선택) */
  serviceId?: MinuServiceId;
}

/**
 * RAG 문서 업데이트 입력
 */
export interface UpdateRAGDocumentInput {
  /** 문서 제목 (선택) */
  title?: string;
  /** 문서 내용 (선택) */
  content?: string;
  /** 메타데이터 (선택) */
  metadata?: Record<string, unknown>;
  /** 상태 (선택) */
  status?: RAGStatus;
}

// ============================================================================
// Search Options
// ============================================================================

/**
 * RAG 검색 옵션
 */
export interface RAGSearchOptions {
  /** 최대 결과 수 (기본: 5) */
  limit?: number;
  /** 최소 유사도 (0~1, 기본: 0.7) */
  minSimilarity?: number;
  /** 필터: 서비스 ID */
  serviceId?: MinuServiceId;
  /** 필터: 소스 타입 */
  sourceType?: RAGSourceType;
  /** 필터: 문서 ID 목록 */
  documentIds?: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * 임베딩 생성 요청
 */
export interface RAGEmbedRequest {
  /** 문서 ID */
  documentId: string;
  /** 문서 내용 */
  content: string;
  /** 청크 크기 (기본: 500) */
  chunkSize?: number;
  /** 청크 오버랩 (기본: 50) */
  chunkOverlap?: number;
}

/**
 * 임베딩 생성 응답
 */
export interface RAGEmbedResponse {
  /** 문서 ID */
  documentId: string;
  /** 생성된 임베딩 수 */
  embeddingCount: number;
  /** 성공 여부 */
  success: boolean;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * RAG 검색 요청
 */
export interface RAGSearchRequest {
  /** 검색 쿼리 */
  query: string;
  /** 검색 옵션 */
  options?: RAGSearchOptions;
}

/**
 * RAG 검색 응답
 */
export interface RAGSearchResponse {
  /** 검색 결과 목록 */
  results: RAGSearchResult[];
  /** 총 결과 수 */
  total: number;
  /** 검색 시간 (ms) */
  searchTime: number;
}

// ============================================================================
// Context Builder Types
// ============================================================================

/**
 * RAG 컨텍스트
 *
 * Claude에게 제공할 컨텍스트 정보
 */
export interface RAGContext {
  /** 컨텍스트 텍스트 */
  context: string;
  /** 사용된 문서 목록 */
  sources: RAGSearchResult[];
  /** 총 토큰 수 (추정) */
  estimatedTokens: number;
}

/**
 * RAG 컨텍스트 빌더 옵션
 */
export interface RAGContextBuilderOptions {
  /** 최대 컨텍스트 길이 (토큰) */
  maxTokens?: number;
  /** 섹션 구분자 (기본: "\n\n---\n\n") */
  separator?: string;
  /** 소스 표시 여부 (기본: true) */
  includeSources?: boolean;
  /** 소스 표시 포맷 */
  sourceFormat?: (result: RAGSearchResult, index: number) => string;
}

// ============================================================================
// Hook Options Types
// ============================================================================

/**
 * useRAGDocuments 훅 옵션
 */
export interface UseRAGDocumentsOptions {
  /** 서비스 ID 필터 */
  serviceId?: MinuServiceId;
  /** 소스 타입 필터 */
  sourceType?: RAGSourceType;
  /** 상태 필터 */
  status?: RAGStatus;
  /** 자동 새로고침 여부 (기본: true) */
  autoRefresh?: boolean;
  /** 새로고침 간격 (ms, 기본: 30000) */
  refreshInterval?: number;
}

/**
 * useRAGSearch 훅 옵션
 */
export interface UseRAGSearchOptions {
  /** 검색 옵션 */
  searchOptions?: RAGSearchOptions;
  /** 자동 검색 여부 (기본: false) */
  autoSearch?: boolean;
  /** 디바운스 시간 (ms, 기본: 300) */
  debounce?: number;
  /** 검색 결과 캐싱 여부 (기본: true) */
  enableCache?: boolean;
}

/**
 * useClaudeChatWithRAG 훅 옵션
 */
export interface UseClaudeChatWithRAGOptions {
  /** 서비스 ID */
  serviceId?: MinuServiceId;
  /** 컨텍스트 자동 추가 여부 (기본: true) */
  autoAddContext?: boolean;
  /** 컨텍스트 최대 토큰 (기본: 4000) */
  maxContextTokens?: number;
  /** 검색 옵션 */
  searchOptions?: RAGSearchOptions;
  /** 컨텍스트 빌더 옵션 */
  contextBuilderOptions?: RAGContextBuilderOptions;
}

// ============================================================================
// Hook Result Types
// ============================================================================

/**
 * useRAGDocuments 훅 결과
 */
export interface UseRAGDocumentsResult {
  /** 문서 목록 */
  documents: RAGDocument[];
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 문서 생성 */
  createDocument: (input: CreateRAGDocumentInput) => Promise<RAGDocument>;
  /** 문서 업데이트 */
  updateDocument: (id: string, input: UpdateRAGDocumentInput) => Promise<RAGDocument>;
  /** 문서 삭제 */
  deleteDocument: (id: string) => Promise<void>;
  /** 새로고침 */
  refetch: () => Promise<void>;
}

/**
 * useRAGSearch 훅 결과
 */
export interface UseRAGSearchResult {
  /** 검색 결과 */
  results: RAGSearchResult[];
  /** 검색 중 여부 */
  isSearching: boolean;
  /** 에러 */
  error: Error | null;
  /** 검색 실행 */
  search: (query: string, options?: RAGSearchOptions) => Promise<RAGSearchResult[]>;
  /** 검색 결과 초기화 */
  clearResults: () => void;
}

/**
 * useRAGContext 훅 결과
 */
export interface UseRAGContextResult {
  /** 컨텍스트 */
  context: RAGContext | null;
  /** 컨텍스트 생성 중 여부 */
  isBuilding: boolean;
  /** 에러 */
  error: Error | null;
  /** 컨텍스트 생성 */
  buildContext: (query: string, options?: RAGSearchOptions) => Promise<RAGContext>;
  /** 컨텍스트 초기화 */
  clearContext: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 청크 크기 (문자 수)
 */
export const DEFAULT_CHUNK_SIZE = 500;

/**
 * 기본 청크 오버랩 (문자 수)
 */
export const DEFAULT_CHUNK_OVERLAP = 50;

/**
 * 기본 검색 결과 수
 */
export const DEFAULT_SEARCH_LIMIT = 5;

/**
 * 기본 최소 유사도 (0~1)
 */
export const DEFAULT_MIN_SIMILARITY = 0.7;

/**
 * 기본 컨텍스트 최대 토큰
 */
export const DEFAULT_MAX_CONTEXT_TOKENS = 4000;

/**
 * 기본 섹션 구분자
 */
export const DEFAULT_CONTEXT_SEPARATOR = '\n\n---\n\n';

/**
 * 토큰 추정 비율 (1 토큰 ≈ 4자)
 */
export const TOKEN_ESTIMATION_RATIO = 4;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 텍스트를 청크로 분할
 *
 * @param text 분할할 텍스트
 * @param chunkSize 청크 크기
 * @param overlap 오버랩 크기
 * @returns 청크 배열
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk);

    // 마지막 청크면 종료
    if (endIndex === text.length) break;

    // 다음 시작 위치 (오버랩 적용)
    startIndex = endIndex - overlap;
  }

  return chunks;
}

/**
 * 토큰 수 추정
 *
 * @param text 텍스트
 * @returns 추정 토큰 수
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / TOKEN_ESTIMATION_RATIO);
}

/**
 * RAG 컨텍스트 빌드
 *
 * @param results 검색 결과
 * @param options 빌더 옵션
 * @returns RAG 컨텍스트
 */
export function buildRAGContext(
  results: RAGSearchResult[],
  options?: RAGContextBuilderOptions
): RAGContext {
  const {
    maxTokens = DEFAULT_MAX_CONTEXT_TOKENS,
    separator = DEFAULT_CONTEXT_SEPARATOR,
    includeSources = true,
    sourceFormat = defaultSourceFormat,
  } = options ?? {};

  let context = '';
  const sources: RAGSearchResult[] = [];
  let currentTokens = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const chunkText = result.chunkContent;
    const sourceText = includeSources ? sourceFormat(result, i + 1) : '';
    const sectionText = `${sourceText}${chunkText}${separator}`;
    const sectionTokens = estimateTokenCount(sectionText);

    // 토큰 한도 초과 시 중단
    if (currentTokens + sectionTokens > maxTokens) {
      break;
    }

    context += sectionText;
    sources.push(result);
    currentTokens += sectionTokens;
  }

  return {
    context: context.trim(),
    sources,
    estimatedTokens: currentTokens,
  };
}

/**
 * 기본 소스 포맷
 */
function defaultSourceFormat(result: RAGSearchResult, index: number): string {
  return `[출처 ${index}: ${result.documentTitle}]\n`;
}

/**
 * RAG 에러 생성 헬퍼
 */
export function createRAGError(message: string, cause?: Error): Error {
  const error = new Error(message);
  if (cause) {
    error.cause = cause;
  }
  return error;
}

/**
 * RAG 검색 결과 정렬 (유사도 기준)
 */
export function sortByRelevance(results: RAGSearchResult[]): RAGSearchResult[] {
  return [...results].sort((a, b) => b.similarity - a.similarity);
}

/**
 * RAG 검색 결과 필터링 (최소 유사도)
 */
export function filterByMinSimilarity(
  results: RAGSearchResult[],
  minSimilarity: number = DEFAULT_MIN_SIMILARITY
): RAGSearchResult[] {
  return results.filter((result) => result.similarity >= minSimilarity);
}
