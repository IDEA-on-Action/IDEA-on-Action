/**
 * RAG 하이브리드 검색 훅
 *
 * 키워드 검색(FTS) + 벡터 검색(Semantic) 결합
 *
 * @module hooks/useRAGHybridSearch
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ragApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 하이브리드 검색 옵션
 */
export interface HybridSearchOptions {
  /** 키워드 검색 가중치 (0.0 ~ 1.0, 기본: 0.3) */
  keywordWeight?: number;
  /** 벡터 검색 가중치 (0.0 ~ 1.0, 기본: 0.7) */
  vectorWeight?: number;
  /** 최대 결과 수 (기본: 10) */
  limit?: number;
  /** 프로젝트 ID 필터 (선택) */
  projectId?: string;
  /** 서비스 ID 필터 (선택) */
  serviceId?: string;
  /** 최소 키워드 점수 (기본: 0.0) */
  minKeywordScore?: number;
  /** 최소 벡터 점수 (기본: 0.7) */
  minVectorScore?: number;
  /** 디바운스 시간 (ms, 기본: 300) */
  debounceMs?: number;
}

/**
 * 하이브리드 검색 결과
 */
export interface HybridSearchResult {
  /** 임베딩 ID */
  id: string;
  /** 문서 ID */
  documentId: string;
  /** 문서 제목 */
  title: string;
  /** 문서 전체 내용 */
  content: string;
  /** 청크 인덱스 */
  chunkIndex: number;
  /** 청크 내용 */
  chunkContent: string;
  /** 메타데이터 */
  metadata: Record<string, unknown>;
  /** 키워드 검색 점수 (0~1) */
  keywordScore: number;
  /** 벡터 검색 점수 (0~1) */
  vectorScore: number;
  /** 통합 점수 (0~1) */
  combinedScore: number;
  /** 서비스 ID */
  serviceId: string | null;
  /** 프로젝트 ID */
  projectId: string | null;
  /** 소스 타입 */
  sourceType: string;
  /** 생성일 */
  createdAt: Date;
}

/**
 * DB 검색 결과 타입
 */
interface HybridSearchResultDB {
  id: string;
  document_id: string;
  title: string;
  content: string;
  chunk_index: number;
  chunk_content: string;
  metadata: Record<string, unknown>;
  keyword_score: number;
  vector_score: number;
  combined_score: number;
  service_id: string | null;
  project_id: string | null;
  source_type: string;
  created_at: string;
}

/**
 * 검색 요청 타입
 */
interface SearchRequest {
  query: string;
  options: HybridSearchOptions;
}

/**
 * Edge Function 응답 타입
 */
interface SearchAPIResponse {
  success: boolean;
  data?: {
    results: HybridSearchResultDB[];
    query: string;
    count: number;
    searchTime?: number;
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
function dbToHybridSearchResult(db: HybridSearchResultDB): HybridSearchResult {
  return {
    id: db.id,
    documentId: db.document_id,
    title: db.title,
    content: db.content,
    chunkIndex: db.chunk_index,
    chunkContent: db.chunk_content,
    metadata: db.metadata,
    keywordScore: db.keyword_score,
    vectorScore: db.vector_score,
    combinedScore: db.combined_score,
    serviceId: db.service_id,
    projectId: db.project_id,
    sourceType: db.source_type,
    createdAt: new Date(db.created_at),
  };
}

/**
 * 디바운스 함수
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 가중치 정규화 (합계 1.0 유지)
 */
function normalizeWeights(keywordWeight: number, vectorWeight: number): {
  keywordWeight: number;
  vectorWeight: number;
} {
  const sum = keywordWeight + vectorWeight;
  if (sum === 0) {
    return { keywordWeight: 0.3, vectorWeight: 0.7 };
  }
  return {
    keywordWeight: keywordWeight / sum,
    vectorWeight: vectorWeight / sum,
  };
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

/**
 * 하이브리드 검색 훅 반환 타입
 */
export interface UseRAGHybridSearchReturn {
  /** 검색 결과 */
  results: HybridSearchResult[];
  /** 검색 중 여부 */
  isSearching: boolean;
  /** 에러 */
  error: Error | null;
  /** 검색 실행 */
  search: (query: string, options?: HybridSearchOptions) => Promise<HybridSearchResult[]>;
  /** 검색 결과 초기화 */
  clearResults: () => void;
  /** 현재 가중치 */
  currentWeights: {
    keyword: number;
    vector: number;
  };
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * RAG 하이브리드 검색 훅
 *
 * 키워드 검색과 벡터 검색을 결합하여 더 정확한 검색 결과 제공
 *
 * @param defaultOptions - 기본 검색 옵션
 * @returns 검색 결과 및 검색 함수
 *
 * @example
 * ```tsx
 * const { results, isSearching, search, currentWeights } = useRAGHybridSearch({
 *   keywordWeight: 0.3,
 *   vectorWeight: 0.7,
 *   projectId: 'my-project',
 *   limit: 10,
 * });
 *
 * // 검색 실행
 * const handleSearch = async (query: string) => {
 *   const results = await search(query, {
 *     keywordWeight: 0.5,  // 키워드 비중 높임
 *     vectorWeight: 0.5,   // 벡터 비중 낮춤
 *   });
 *   console.log('Found:', results.length);
 * };
 *
 * // 검색 결과 렌더링
 * {results.map(result => (
 *   <div key={result.id}>
 *     <h3>{result.title}</h3>
 *     <p>{result.chunkContent}</p>
 *     <div>
 *       <span>키워드: {(result.keywordScore * 100).toFixed(1)}%</span>
 *       <span>벡터: {(result.vectorScore * 100).toFixed(1)}%</span>
 *       <span>통합: {(result.combinedScore * 100).toFixed(1)}%</span>
 *     </div>
 *   </div>
 * ))}
 * ```
 */
export function useRAGHybridSearch(
  defaultOptions?: HybridSearchOptions
): UseRAGHybridSearchReturn {
  const {
    keywordWeight = 0.3,
    vectorWeight = 0.7,
    limit = 10,
    projectId,
    serviceId,
    minKeywordScore = 0.0,
    minVectorScore = 0.7,
    debounceMs = 300,
  } = defaultOptions || {};

  // Workers 인증 토큰
  const { workersTokens } = useAuth();
  const token = workersTokens?.accessToken;

  // ============================================================================
  // 상태
  // ============================================================================

  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [currentWeights, setCurrentWeights] = useState({
    keyword: keywordWeight,
    vector: vectorWeight,
  });

  // ============================================================================
  // React Query Mutation
  // ============================================================================

  const mutation = useMutation({
    mutationFn: async (request: SearchRequest) => {
      const { query, options } = request;

      // 가중치 정규화
      const normalized = normalizeWeights(
        options.keywordWeight ?? keywordWeight,
        options.vectorWeight ?? vectorWeight
      );

      setCurrentWeights({
        keyword: normalized.keywordWeight,
        vector: normalized.vectorWeight,
      });

      // Workers API로 하이브리드 검색 호출
      const result = await ragApi.search(token || null, {
        query,
        limit: options.limit ?? limit,
        threshold: options.minVectorScore ?? minVectorScore,
        filters: {
          ...(options.projectId ?? projectId ? { project_id: options.projectId ?? projectId } : {}),
          ...(options.serviceId ?? serviceId ? { service_id: options.serviceId ?? serviceId } : {}),
        },
        searchType: 'hybrid',
        hybridWeight: normalized.vectorWeight,
      });

      if (result.error) {
        console.error('RAG hybrid search error:', result.error);
        throw new Error(`검색에 실패했습니다: ${result.error}`);
      }

      interface HybridSearchAPIResponse {
        success: boolean;
        data?: {
          results: HybridSearchResultDB[];
        };
        error?: {
          message: string;
        };
      }

      const response = result.data as HybridSearchAPIResponse;

      if (!response?.success || !response?.data) {
        throw new Error(response?.error?.message || '검색 결과를 가져오는데 실패했습니다.');
      }

      return response.data.results.map((r: HybridSearchResultDB) => dbToHybridSearchResult(r));
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

  const debouncedSearch = useRef(
    debounce((query: string, options?: HybridSearchOptions) => {
      mutation.mutate({ query, options: options || {} });
    }, debounceMs)
  ).current;

  /**
   * 검색 함수
   */
  const search = useCallback(
    async (query: string, options?: HybridSearchOptions): Promise<HybridSearchResult[]> => {
      if (!query.trim()) {
        setResults([]);
        setError(null);
        return [];
      }

      // 디바운스 적용
      debouncedSearch(query, options);

      // 즉시 검색 실행 (디바운스 없이)
      const searchResults = await mutation.mutateAsync({
        query: query.trim(),
        options: options || {},
      });

      return searchResults;
    },
    [mutation, debouncedSearch]
  );

  /**
   * 검색 결과 초기화
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // ============================================================================
  // 반환
  // ============================================================================

  return {
    results,
    isSearching: mutation.isPending,
    error,
    search,
    clearResults,
    currentWeights,
  };
}

// ============================================================================
// 편의 훅 (서비스별)
// ============================================================================

/**
 * Minu Find 하이브리드 검색
 */
export function useMinuFindHybridSearch(options?: Omit<HybridSearchOptions, 'serviceId'>) {
  return useRAGHybridSearch({
    ...options,
    serviceId: 'minu-find',
  });
}

/**
 * Minu Frame 하이브리드 검색
 */
export function useMinuFrameHybridSearch(options?: Omit<HybridSearchOptions, 'serviceId'>) {
  return useRAGHybridSearch({
    ...options,
    serviceId: 'minu-frame',
  });
}

/**
 * Minu Build 하이브리드 검색
 */
export function useMinuBuildHybridSearch(options?: Omit<HybridSearchOptions, 'serviceId'>) {
  return useRAGHybridSearch({
    ...options,
    serviceId: 'minu-build',
  });
}

/**
 * Minu Keep 하이브리드 검색
 */
export function useMinuKeepHybridSearch(options?: Omit<HybridSearchOptions, 'serviceId'>) {
  return useRAGHybridSearch({
    ...options,
    serviceId: 'minu-keep',
  });
}

// ============================================================================
// 내보내기
// ============================================================================

export default useRAGHybridSearch;
