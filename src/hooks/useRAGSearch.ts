/**
 * RAG 벡터 검색 훅
 *
 * 임베딩 기반 의미론적 검색 기능
 *
 * @module hooks/useRAGSearch
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ragApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { hybridSearch } from '@/lib/rag/hybrid-search';
import { rankResults } from '@/lib/rag/ranking';

// ============================================================================
// 타입 정의 (임시 - rag.types.ts가 생성되면 import로 대체)
// ============================================================================

/**
 * 검색 결과 문서 청크
 */
export interface RAGSearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkContent: string;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, unknown> | null;
  serviceId: string | null;
  createdAt: Date;
}

/**
 * DB 검색 결과 타입
 */
interface RAGSearchResultDB {
  id: string;
  document_id: string;
  document_title: string;
  chunk_content: string;
  chunk_index: number;
  similarity: number;
  metadata: Record<string, unknown> | null;
  service_id: string | null;
  created_at: string;
}

/**
 * 검색 요청 타입
 */
interface SearchRequest {
  query: string;
  serviceId?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Edge Function 응답 타입
 */
interface SearchAPIResponse {
  success: boolean;
  data?: {
    results: RAGSearchResultDB[];
    query: string;
    count: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * DB 레코드를 클라이언트 객체로 변환
 */
function dbToRAGSearchResult(db: RAGSearchResultDB): RAGSearchResult {
  return {
    id: db.id,
    documentId: db.document_id,
    documentTitle: db.document_title,
    chunkContent: db.chunk_content,
    chunkIndex: db.chunk_index,
    similarity: db.similarity,
    metadata: db.metadata,
    serviceId: db.service_id,
    createdAt: new Date(db.created_at),
  };
}

/**
 * 디바운스 함수 반환 타입
 */
interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

/**
 * 디바운스 함수
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

// ============================================================================
// 훅 옵션 및 반환 타입
// ============================================================================

/**
 * 검색 훅 옵션
 */
export interface UseRAGSearchOptions {
  serviceId?: string;
  limit?: number;
  threshold?: number;
  debounceMs?: number;
  enableHistory?: boolean;
  enableAutocomplete?: boolean;
  maxHistorySize?: number;
  enableHybridSearch?: boolean;
  enableRanking?: boolean;
}

/**
 * 검색 훅 반환 타입
 */
export interface UseRAGSearchReturn {
  results: RAGSearchResult[];
  isSearching: boolean;
  error: Error | null;

  search: (query: string) => Promise<RAGSearchResult[]>;
  clearResults: () => void;

  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;

  autocomplete: string[];
  getAutocompleteSuggestions: (partial: string) => string[];
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * RAG 벡터 검색 훅
 *
 * @param options - 검색 옵션
 * @returns 검색 결과 및 검색 함수
 *
 * @example
 * ```tsx
 * const { results, isSearching, search, clearResults } = useRAGSearch({
 *   serviceId: 'minu-find',
 *   limit: 5,
 *   threshold: 0.7,
 *   debounceMs: 300,
 * });
 *
 * // 검색 실행
 * const handleSearch = async (query: string) => {
 *   const results = await search(query);
 *   console.log('Found:', results.length);
 * };
 *
 * // 검색 결과 렌더링
 * {results.map(result => (
 *   <div key={result.id}>
 *     <h3>{result.documentTitle}</h3>
 *     <p>{result.chunkContent}</p>
 *     <small>유사도: {(result.similarity * 100).toFixed(1)}%</small>
 *   </div>
 * ))}
 * ```
 */
export function useRAGSearch(options?: UseRAGSearchOptions): UseRAGSearchReturn {
  const {
    serviceId,
    limit = 5,
    threshold = 0.7,
    debounceMs = 300,
    enableHistory = true,
    enableAutocomplete = true,
    maxHistorySize = 20,
    enableHybridSearch = false,
    enableRanking = false,
  } = options || {};

  // Workers 인증 토큰
  const { workersTokens } = useAuth();
  const token = workersTokens?.accessToken;

  // ============================================================================
  // 상태
  // ============================================================================

  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // 디바운스된 검색 쿼리 저장
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  // 검색 히스토리 (localStorage)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (!enableHistory) return [];
    try {
      const stored = localStorage.getItem('rag-search-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 자동완성 제안
  const [autocomplete, setAutocomplete] = useState<string[]>([]);

  // ============================================================================
  // React Query Mutation
  // ============================================================================

  const mutation = useMutation({
    mutationFn: async (request: SearchRequest) => {
      // Workers API 호출
      const result = await ragApi.search(token || null, {
        query: request.query,
        limit: request.limit || 5,
        threshold: request.threshold || 0.7,
        filters: request.serviceId ? { service_id: request.serviceId } : undefined,
        searchType: 'vector',
      });

      if (result.error) {
        console.error('RAG search error:', result.error);
        throw new Error(`검색에 실패했습니다: ${result.error}`);
      }

      const response = result.data as SearchAPIResponse;

      if (!response?.success || !response?.data) {
        throw new Error(response?.error?.message || '검색 결과를 가져오는데 실패했습니다.');
      }

      return response.data.results.map(dbToRAGSearchResult);
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
    },
    onError: (err) => {
      const error = err instanceof Error ? err : new Error('검색 중 오류가 발생했습니다.');
      setError(error);
      setResults([]);
    },
  });

  // ============================================================================
  // 디바운스된 검색 함수
  // ============================================================================

  // debounce 함수 참조 저장 (리렌더링 시 재생성 방지)
  const debouncedSetQuery = useRef(
    debounce((query: string) => {
      setDebouncedQuery(query);
    }, debounceMs)
  ).current;

  /**
   * 검색 함수
   */
  const search = useCallback(
    async (query: string): Promise<RAGSearchResult[]> => {
      if (!query.trim()) {
        setResults([]);
        setError(null);
        return [];
      }

      // 디바운스 적용 (내부적으로 setDebouncedQuery 호출)
      debouncedSetQuery(query);

      // 즉시 검색 실행 (디바운스 없이)
      const searchResults = await mutation.mutateAsync({
        query: query.trim(),
        serviceId,
        limit,
        threshold,
      });

      return searchResults;
    },
    [mutation, serviceId, limit, threshold, debouncedSetQuery]
  );

  /**
   * 검색 결과 초기화
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setDebouncedQuery('');
  }, []);

  /**
   * 검색 히스토리에 추가
   */
  const addToHistory = useCallback((query: string) => {
    if (!enableHistory || !query.trim()) return;

    setSearchHistory((prev) => {
      const trimmed = query.trim();
      // 중복 제거
      const filtered = prev.filter((q) => q !== trimmed);
      // 최신 쿼리를 앞에 추가
      const updated = [trimmed, ...filtered];
      // 최대 크기 제한
      const limited = updated.slice(0, maxHistorySize);

      // localStorage에 저장
      try {
        localStorage.setItem('rag-search-history', JSON.stringify(limited));
      } catch (err) {
        console.error('Failed to save search history:', err);
      }

      return limited;
    });
  }, [enableHistory, maxHistorySize]);

  /**
   * 검색 히스토리 초기화
   */
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('rag-search-history');
    } catch (err) {
      console.error('Failed to clear search history:', err);
    }
  }, []);

  /**
   * 자동완성 제안 생성
   */
  const getAutocompleteSuggestions = useCallback((partial: string): string[] => {
    if (!enableAutocomplete || !partial.trim()) return [];

    const trimmed = partial.trim().toLowerCase();

    // 히스토리에서 매칭되는 쿼리 찾기
    const suggestions = searchHistory
      .filter((query) => query.toLowerCase().includes(trimmed))
      .slice(0, 5);

    return suggestions;
  }, [enableAutocomplete, searchHistory]);

  // ============================================================================
  // 디바운스된 검색 자동 실행
  // ============================================================================

  // debouncedQuery가 변경되면 검색 실행
  useEffect(() => {
    if (debouncedQuery.trim()) {
      mutation.mutate({
        query: debouncedQuery.trim(),
        serviceId,
        limit,
        threshold,
      });
    }
  }, [debouncedQuery, serviceId, limit, threshold, mutation]);

  // ============================================================================
  // Cleanup - 컴포넌트 언마운트 시 debounce 타이머 취소
  // ============================================================================

  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel();
    };
  }, [debouncedSetQuery]);

  // ============================================================================
  // 반환
  // ============================================================================

  // ============================================================================
  // 검색 완료 시 히스토리 업데이트
  // ============================================================================

  useEffect(() => {
    if (results.length > 0 && debouncedQuery) {
      addToHistory(debouncedQuery);
    }
  }, [results, debouncedQuery, addToHistory]);

  // ============================================================================
  // 자동완성 업데이트
  // ============================================================================

  useEffect(() => {
    if (enableAutocomplete && debouncedQuery) {
      const suggestions = getAutocompleteSuggestions(debouncedQuery);
      setAutocomplete(suggestions);
    } else {
      setAutocomplete([]);
    }
  }, [debouncedQuery, enableAutocomplete, getAutocompleteSuggestions]);

  return {
    results,
    isSearching: mutation.isPending,
    error,

    search,
    clearResults,

    searchHistory,
    addToHistory,
    clearHistory,

    autocomplete,
    getAutocompleteSuggestions,
  };
}

// ============================================================================
// 편의 훅 (서비스별)
// ============================================================================

/**
 * Minu Find RAG 검색
 */
export function useMinuFindRAGSearch(options?: Omit<UseRAGSearchOptions, 'serviceId'>) {
  return useRAGSearch({
    ...options,
    serviceId: 'minu-find',
  });
}

/**
 * Minu Frame RAG 검색
 */
export function useMinuFrameRAGSearch(options?: Omit<UseRAGSearchOptions, 'serviceId'>) {
  return useRAGSearch({
    ...options,
    serviceId: 'minu-frame',
  });
}

/**
 * Minu Build RAG 검색
 */
export function useMinuBuildRAGSearch(options?: Omit<UseRAGSearchOptions, 'serviceId'>) {
  return useRAGSearch({
    ...options,
    serviceId: 'minu-build',
  });
}

/**
 * Minu Keep RAG 검색
 */
export function useMinuKeepRAGSearch(options?: Omit<UseRAGSearchOptions, 'serviceId'>) {
  return useRAGSearch({
    ...options,
    serviceId: 'minu-keep',
  });
}

// ============================================================================
// 내보내기
// ============================================================================

export default useRAGSearch;
