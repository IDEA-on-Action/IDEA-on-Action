/**
 * RAG 하이브리드 검색
 *
 * 키워드 검색(FTS)과 시맨틱 검색(벡터)을 결합하여 최적의 검색 결과 제공
 *
 * @module lib/rag/hybrid-search
 */

import type { RAGSearchResult } from '@/types/rag.types';
import { calculateScore } from './index';

// ============================================================================
// 상수
// ============================================================================

/**
 * 기본 키워드 가중치
 */
export const DEFAULT_KEYWORD_WEIGHT = 0.3;

/**
 * 기본 벡터 가중치
 */
export const DEFAULT_VECTOR_WEIGHT = 0.7;

/**
 * 기본 최소 점수 임계값
 */
export const DEFAULT_MIN_SCORE = 0.0;

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 하이브리드 검색 옵션
 */
export interface HybridSearchOptions {
  /** 키워드 검색 가중치 (0-1) */
  keywordWeight?: number;
  /** 벡터 검색 가중치 (0-1) */
  vectorWeight?: number;
  /** 최소 통합 점수 (0-1) */
  minScore?: number;
  /** 최대 결과 수 */
  limit?: number;
}

/**
 * 검색 결과 (점수 포함)
 */
export interface ScoredSearchResult extends RAGSearchResult {
  /** 키워드 검색 점수 */
  keywordScore: number;
  /** 벡터 검색 점수 */
  vectorScore: number;
  /** 통합 점수 */
  combinedScore: number;
}

// ============================================================================
// 하이브리드 검색 함수
// ============================================================================

/**
 * 하이브리드 검색 실행
 *
 * 키워드 검색 결과와 벡터 검색 결과를 결합하여 최종 검색 결과 생성
 *
 * @param query 검색 쿼리
 * @param keywordResults 키워드 검색 결과
 * @param vectorResults 벡터 검색 결과
 * @param options 검색 옵션
 * @returns 통합 검색 결과
 *
 * @example
 * ```ts
 * const results = hybridSearch(
 *   "React hooks",
 *   keywordResults,
 *   vectorResults,
 *   { keywordWeight: 0.3, vectorWeight: 0.7 }
 * );
 * ```
 */
export function hybridSearch(
  query: string,
  keywordResults: RAGSearchResult[],
  vectorResults: RAGSearchResult[],
  options?: HybridSearchOptions
): ScoredSearchResult[] {
  const {
    keywordWeight = DEFAULT_KEYWORD_WEIGHT,
    vectorWeight = DEFAULT_VECTOR_WEIGHT,
    minScore = DEFAULT_MIN_SCORE,
    limit,
  } = options || {};

  // 가중치 정규화
  const normalized = normalizeWeights(keywordWeight, vectorWeight);

  // 결과 병합 및 점수 계산
  const merged = mergeResults(
    query,
    keywordResults,
    vectorResults,
    normalized.keywordWeight,
    normalized.vectorWeight
  );

  // 최소 점수 필터링 및 정렬
  let filtered = merged.filter((result) => result.combinedScore >= minScore);
  filtered.sort((a, b) => b.combinedScore - a.combinedScore);

  // 결과 수 제한
  if (limit !== undefined && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * 가중치 정규화
 *
 * 키워드 가중치와 벡터 가중치의 합이 1.0이 되도록 정규화
 *
 * @param keywordWeight 키워드 가중치
 * @param vectorWeight 벡터 가중치
 * @returns 정규화된 가중치
 */
export function normalizeWeights(
  keywordWeight: number,
  vectorWeight: number
): { keywordWeight: number; vectorWeight: number } {
  const sum = keywordWeight + vectorWeight;

  if (sum === 0) {
    return {
      keywordWeight: DEFAULT_KEYWORD_WEIGHT,
      vectorWeight: DEFAULT_VECTOR_WEIGHT,
    };
  }

  return {
    keywordWeight: keywordWeight / sum,
    vectorWeight: vectorWeight / sum,
  };
}

/**
 * 검색 결과 병합
 *
 * 키워드 검색 결과와 벡터 검색 결과를 병합하고 통합 점수 계산
 *
 * @param query 검색 쿼리
 * @param keywordResults 키워드 검색 결과
 * @param vectorResults 벡터 검색 결과
 * @param keywordWeight 정규화된 키워드 가중치
 * @param vectorWeight 정규화된 벡터 가중치
 * @returns 병합된 검색 결과
 */
function mergeResults(
  query: string,
  keywordResults: RAGSearchResult[],
  vectorResults: RAGSearchResult[],
  keywordWeight: number,
  vectorWeight: number
): ScoredSearchResult[] {
  // 문서 ID + 청크 인덱스를 키로 사용
  const resultMap = new Map<string, ScoredSearchResult>();

  // 키워드 검색 결과 추가
  for (const result of keywordResults) {
    const key = getResultKey(result);
    const relevanceScore = calculateScore(query, result.chunkContent);

    resultMap.set(key, {
      ...result,
      keywordScore: relevanceScore,
      vectorScore: 0,
      combinedScore: relevanceScore * keywordWeight,
      similarity: relevanceScore * keywordWeight,
    });
  }

  // 벡터 검색 결과 병합
  for (const result of vectorResults) {
    const key = getResultKey(result);
    const existing = resultMap.get(key);

    if (existing) {
      // 이미 존재하면 벡터 점수 추가
      const combinedScore = existing.combinedScore + result.similarity * vectorWeight;
      resultMap.set(key, {
        ...existing,
        vectorScore: result.similarity,
        combinedScore,
        similarity: combinedScore,
      });
    } else {
      // 새로운 결과 추가
      resultMap.set(key, {
        ...result,
        keywordScore: 0,
        vectorScore: result.similarity,
        combinedScore: result.similarity * vectorWeight,
        similarity: result.similarity * vectorWeight,
      });
    }
  }

  return Array.from(resultMap.values());
}

/**
 * 검색 결과 키 생성
 *
 * @param result 검색 결과
 * @returns 고유 키
 */
function getResultKey(result: RAGSearchResult): string {
  return `${result.documentId}:${result.chunkIndex}`;
}

// ============================================================================
// 중복 제거 함수
// ============================================================================

/**
 * 중복 검색 결과 제거
 *
 * 동일한 문서의 유사한 청크를 제거
 *
 * @param results 검색 결과
 * @param similarityThreshold 유사도 임계값 (0-1)
 * @returns 중복 제거된 결과
 *
 * @example
 * ```ts
 * const unique = removeDuplicates(results, 0.9);
 * ```
 */
export function removeDuplicates(
  results: ScoredSearchResult[],
  similarityThreshold: number = 0.9
): ScoredSearchResult[] {
  const unique: ScoredSearchResult[] = [];

  for (const result of results) {
    const isDuplicate = unique.some((existing) => {
      // 같은 문서인 경우만 검사
      if (existing.documentId !== result.documentId) {
        return false;
      }

      // 청크 내용 유사도 계산
      const contentSimilarity = calculateTextSimilarity(
        existing.chunkContent,
        result.chunkContent
      );

      return contentSimilarity >= similarityThreshold;
    });

    if (!isDuplicate) {
      unique.push(result);
    }
  }

  return unique;
}

/**
 * 텍스트 유사도 계산
 *
 * Jaccard 유사도를 사용하여 두 텍스트의 유사도 계산
 *
 * @param text1 첫 번째 텍스트
 * @param text2 두 번째 텍스트
 * @returns 유사도 (0-1)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * 텍스트 토큰화
 *
 * @param text 텍스트
 * @returns 토큰 배열
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

// ============================================================================
// 결과 재랭킹 함수
// ============================================================================

/**
 * 검색 결과 재랭킹
 *
 * 쿼리와의 관련성을 기준으로 검색 결과를 재정렬
 *
 * @param query 검색 쿼리
 * @param results 검색 결과
 * @param options 재랭킹 옵션
 * @returns 재랭킹된 결과
 *
 * @example
 * ```ts
 * const reranked = rerankResults("React hooks", results, {
 *   diversityWeight: 0.2,
 *   recencyWeight: 0.1,
 * });
 * ```
 */
export function rerankResults(
  query: string,
  results: ScoredSearchResult[],
  options?: RerankOptions
): ScoredSearchResult[] {
  const {
    diversityWeight = 0.0,
    recencyWeight = 0.0,
    positionWeight = 0.0,
  } = options || {};

  // 재랭킹 점수 계산
  const reranked = results.map((result, index) => {
    let adjustedScore = result.combinedScore;

    // 다양성 점수 (같은 문서에서 여러 청크 나오면 페널티)
    if (diversityWeight > 0) {
      const diversityPenalty = calculateDiversityPenalty(result, results, index);
      adjustedScore -= diversityPenalty * diversityWeight;
    }

    // 최신성 점수 (메타데이터에 날짜가 있으면 사용)
    if (recencyWeight > 0) {
      const recencyBonus = calculateRecencyBonus(result);
      adjustedScore += recencyBonus * recencyWeight;
    }

    // 위치 점수 (원래 순위가 높으면 보너스)
    if (positionWeight > 0) {
      const positionBonus = calculatePositionBonus(index, results.length);
      adjustedScore += positionBonus * positionWeight;
    }

    return {
      ...result,
      combinedScore: Math.max(0, Math.min(1, adjustedScore)),
      similarity: Math.max(0, Math.min(1, adjustedScore)),
    };
  });

  // 재랭킹 점수로 정렬
  return reranked.sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * 재랭킹 옵션
 */
export interface RerankOptions {
  /** 다양성 가중치 (0-1) */
  diversityWeight?: number;
  /** 최신성 가중치 (0-1) */
  recencyWeight?: number;
  /** 위치 가중치 (0-1) */
  positionWeight?: number;
}

/**
 * 다양성 페널티 계산
 *
 * 같은 문서에서 여러 청크가 나오면 페널티 부여
 */
function calculateDiversityPenalty(
  result: ScoredSearchResult,
  allResults: ScoredSearchResult[],
  currentIndex: number
): number {
  let count = 0;

  for (let i = 0; i < currentIndex; i++) {
    if (allResults[i].documentId === result.documentId) {
      count++;
    }
  }

  // 같은 문서가 나올수록 페널티 증가 (최대 0.3)
  return Math.min(count * 0.1, 0.3);
}

/**
 * 최신성 보너스 계산
 *
 * 메타데이터에 날짜가 있으면 최신 문서에 보너스 부여
 */
function calculateRecencyBonus(result: ScoredSearchResult): number {
  if (!result.metadata || typeof result.metadata.date !== 'string') {
    return 0;
  }

  try {
    const date = new Date(result.metadata.date as string);
    const now = new Date();
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    // 30일 이내: 보너스 0.1
    // 90일 이내: 보너스 0.05
    // 그 이상: 보너스 0
    if (daysDiff <= 30) return 0.1;
    if (daysDiff <= 90) return 0.05;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * 위치 보너스 계산
 *
 * 원래 순위가 높으면 보너스 부여
 */
function calculatePositionBonus(index: number, total: number): number {
  // 상위 10% 결과에 보너스 부여 (최대 0.05)
  const topPercent = Math.ceil(total * 0.1);
  if (index < topPercent) {
    return 0.05 * (1 - index / topPercent);
  }
  return 0;
}

// ============================================================================
// 검색 결과 그룹화
// ============================================================================

/**
 * 문서별 검색 결과 그룹화
 *
 * @param results 검색 결과
 * @returns 문서 ID를 키로 하는 그룹
 *
 * @example
 * ```ts
 * const grouped = groupByDocument(results);
 * // { "doc-1": [result1, result2], "doc-2": [result3] }
 * ```
 */
export function groupByDocument(
  results: ScoredSearchResult[]
): Map<string, ScoredSearchResult[]> {
  const groups = new Map<string, ScoredSearchResult[]>();

  for (const result of results) {
    const existing = groups.get(result.documentId) || [];
    groups.set(result.documentId, [...existing, result]);
  }

  return groups;
}

/**
 * 문서별 최고 점수 청크 선택
 *
 * 각 문서에서 가장 점수가 높은 청크만 선택
 *
 * @param results 검색 결과
 * @returns 문서당 하나의 결과
 *
 * @example
 * ```ts
 * const topChunks = selectTopChunkPerDocument(results);
 * ```
 */
export function selectTopChunkPerDocument(
  results: ScoredSearchResult[]
): ScoredSearchResult[] {
  const groups = groupByDocument(results);
  const topChunks: ScoredSearchResult[] = [];

  for (const chunks of groups.values()) {
    // 각 그룹에서 최고 점수 청크 선택
    const topChunk = chunks.reduce((best, current) =>
      current.combinedScore > best.combinedScore ? current : best
    );
    topChunks.push(topChunk);
  }

  // 점수순 정렬
  return topChunks.sort((a, b) => b.combinedScore - a.combinedScore);
}
