/**
 * RAG 유틸리티 함수
 *
 * 하이브리드 검색 기반 RAG 시스템을 위한 유틸리티 함수 모음
 * - 텍스트 청킹
 * - 관련성 점수 계산
 * - 검색 결과 병합 및 재랭킹
 *
 * @module lib/rag
 */

import type { RAGSearchResult } from '@/types/ai/rag.types';

// ============================================================================
// 상수
// ============================================================================

/**
 * 기본 청크 크기
 */
export const DEFAULT_CHUNK_SIZE = 500;

/**
 * 기본 청크 오버랩
 */
export const DEFAULT_CHUNK_OVERLAP = 100;

/**
 * 기본 분리자 (우선순위순)
 */
export const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' '];

/**
 * 키워드 검색 가중치
 */
export const KEYWORD_WEIGHT = 0.3;

/**
 * 의미론적 검색 가중치
 */
export const SEMANTIC_WEIGHT = 0.7;

/**
 * 최소 점수 임계값
 */
export const MIN_SCORE_THRESHOLD = 0.7;

// ============================================================================
// 청킹 함수
// ============================================================================

/**
 * 텍스트 청킹
 *
 * 긴 텍스트를 의미 있는 단위로 분할하여 청크 생성
 *
 * @param text 분할할 텍스트
 * @param chunkSize 청크 크기 (문자 수)
 * @param chunkOverlap 청크 오버랩 (문자 수)
 * @param separators 분리자 배열 (우선순위순)
 * @returns 청크 배열
 *
 * @example
 * ```ts
 * const text = "긴 텍스트...\n\n다음 단락...";
 * const chunks = chunkText(text, 500, 100);
 * // ["긴 텍스트...", "다음 단락..."]
 * ```
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP,
  separators: string[] = DEFAULT_SEPARATORS
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 청크 크기가 텍스트보다 크면 전체 텍스트를 하나의 청크로 반환
  if (text.length <= chunkSize) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentPosition = 0;

  // 텍스트를 분리자로 분할
  const parts = splitBySeparators(text, separators);

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    // 현재 청크에 파트를 추가했을 때의 크기
    const potentialSize = currentChunk.length + trimmedPart.length + 1; // +1 for space

    if (potentialSize <= chunkSize) {
      // 청크에 추가
      currentChunk += (currentChunk ? ' ' : '') + trimmedPart;
    } else {
      // 현재 청크를 저장하고 새 청크 시작
      if (currentChunk) {
        chunks.push(currentChunk);

        // 오버랩 처리
        const overlapText = getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + (overlapText ? ' ' : '') + trimmedPart;
      } else {
        // 단일 파트가 청크 크기보다 크면 강제 분할
        const forcedChunks = forceChunkLongText(trimmedPart, chunkSize, chunkOverlap);
        chunks.push(...forcedChunks.slice(0, -1));
        currentChunk = forcedChunks[forcedChunks.length - 1];
      }
    }

    currentPosition += part.length;
  }

  // 마지막 청크 추가
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 분리자로 텍스트 분할
 *
 * 우선순위가 높은 분리자부터 사용하여 텍스트 분할
 */
function splitBySeparators(text: string, separators: string[]): string[] {
  if (separators.length === 0) {
    return [text];
  }

  const [separator, ...restSeparators] = separators;
  const parts = text.split(separator);

  if (restSeparators.length === 0) {
    return parts;
  }

  // 재귀적으로 하위 분리자 적용
  return parts.flatMap((part) => {
    // 분리자를 포함하여 반환 (문맥 유지)
    const withSeparator = part + separator;
    return splitBySeparators(withSeparator, restSeparators);
  });
}

/**
 * 오버랩 텍스트 추출
 *
 * 청크의 마지막 부분에서 오버랩할 텍스트 추출
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // 단어 경계에서 자르기
  const overlapText = text.slice(-overlapSize);
  const firstSpaceIndex = overlapText.indexOf(' ');

  if (firstSpaceIndex === -1) {
    return overlapText;
  }

  return overlapText.slice(firstSpaceIndex + 1);
}

/**
 * 긴 텍스트 강제 분할
 *
 * 청크 크기보다 긴 단일 텍스트를 강제로 분할
 */
function forceChunkLongText(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk.trim());

    if (endIndex === text.length) break;

    startIndex = endIndex - chunkOverlap;
  }

  return chunks;
}

// ============================================================================
// 점수 계산 함수
// ============================================================================

/**
 * 관련성 점수 계산
 *
 * 쿼리와 문서 간의 관련성 점수를 계산
 * - 키워드 매칭 점수
 * - TF-IDF 기반 점수
 *
 * @param query 검색 쿼리
 * @param document 문서 텍스트
 * @returns 관련성 점수 (0-1)
 *
 * @example
 * ```ts
 * const score = calculateScore("React hooks", "React hooks are...");
 * // 0.85
 * ```
 */
export function calculateScore(query: string, document: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedDocument = normalizeText(document);

  // 쿼리 토큰
  const queryTokens = tokenize(normalizedQuery);
  const documentTokens = tokenize(normalizedDocument);

  if (queryTokens.length === 0 || documentTokens.length === 0) {
    return 0;
  }

  // 1. 키워드 매칭 점수 (Jaccard 유사도)
  const keywordScore = calculateJaccardSimilarity(queryTokens, documentTokens);

  // 2. 순서 보정 점수 (쿼리 토큰이 순서대로 나타나는지)
  const orderScore = calculateOrderScore(queryTokens, documentTokens);

  // 3. 위치 보정 점수 (쿼리 토큰이 문서 앞부분에 나타나는지)
  const positionScore = calculatePositionScore(queryTokens, normalizedDocument);

  // 가중 평균
  const finalScore =
    keywordScore * 0.5 +
    orderScore * 0.3 +
    positionScore * 0.2;

  return Math.min(finalScore, 1.0);
}

/**
 * 텍스트 정규화
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 토큰화
 */
function tokenize(text: string): string[] {
  return text
    .split(' ')
    .filter((token) => token.length > 0);
}

/**
 * Jaccard 유사도 계산
 */
function calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * 순서 점수 계산
 *
 * 쿼리 토큰이 문서에서 순서대로 나타나는 정도
 */
function calculateOrderScore(queryTokens: string[], documentTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  let lastIndex = -1;
  let orderedCount = 0;

  for (const queryToken of queryTokens) {
    const index = documentTokens.indexOf(queryToken, lastIndex + 1);
    if (index !== -1) {
      orderedCount++;
      lastIndex = index;
    }
  }

  return orderedCount / queryTokens.length;
}

/**
 * 위치 점수 계산
 *
 * 쿼리 토큰이 문서 앞부분에 나타나는 정도
 */
function calculatePositionScore(queryTokens: string[], documentText: string): number {
  if (queryTokens.length === 0 || documentText.length === 0) return 0;

  let totalScore = 0;

  for (const queryToken of queryTokens) {
    const index = documentText.indexOf(queryToken);
    if (index !== -1) {
      // 앞부분에 있을수록 높은 점수 (역지수 감쇠)
      const positionScore = Math.exp(-index / documentText.length);
      totalScore += positionScore;
    }
  }

  return totalScore / queryTokens.length;
}

// ============================================================================
// 결과 병합 함수
// ============================================================================

/**
 * 검색 결과 병합
 *
 * 키워드 검색 결과와 의미론적 검색 결과를 병합하고 재랭킹
 *
 * @param keywordResults 키워드 검색 결과
 * @param semanticResults 의미론적 검색 결과
 * @param keywordWeight 키워드 가중치 (기본값: 0.3)
 * @param semanticWeight 의미론적 가중치 (기본값: 0.7)
 * @returns 병합 및 재랭킹된 결과
 *
 * @example
 * ```ts
 * const merged = mergeResults(keywordResults, semanticResults);
 * // 점수가 높은 순으로 정렬된 결과
 * ```
 */
export function mergeResults(
  keywordResults: RAGSearchResult[],
  semanticResults: RAGSearchResult[],
  keywordWeight: number = KEYWORD_WEIGHT,
  semanticWeight: number = SEMANTIC_WEIGHT
): RAGSearchResult[] {
  // 문서 ID + 청크 인덱스를 키로 사용
  const resultMap = new Map<string, RAGSearchResult>();

  // 키워드 검색 결과 추가
  for (const result of keywordResults) {
    const key = `${result.documentId}:${result.chunkIndex}`;
    resultMap.set(key, {
      ...result,
      similarity: result.similarity * keywordWeight,
    });
  }

  // 의미론적 검색 결과 병합
  for (const result of semanticResults) {
    const key = `${result.documentId}:${result.chunkIndex}`;
    const existing = resultMap.get(key);

    if (existing) {
      // 이미 존재하면 점수 합산
      resultMap.set(key, {
        ...existing,
        similarity: existing.similarity + result.similarity * semanticWeight,
      });
    } else {
      // 새로운 결과 추가
      resultMap.set(key, {
        ...result,
        similarity: result.similarity * semanticWeight,
      });
    }
  }

  // Map을 배열로 변환하고 점수순 정렬
  return Array.from(resultMap.values()).sort((a, b) => b.similarity - a.similarity);
}

/**
 * 결과 재랭킹
 *
 * 검색 결과를 쿼리와의 관련성을 기준으로 재랭킹
 *
 * @param query 검색 쿼리
 * @param results 검색 결과
 * @param threshold 최소 점수 임계값 (기본값: 0.7)
 * @returns 재랭킹된 결과
 */
export function rerankResults(
  query: string,
  results: RAGSearchResult[],
  threshold: number = MIN_SCORE_THRESHOLD
): RAGSearchResult[] {
  // 각 결과에 대해 관련성 점수 재계산
  const reranked = results.map((result) => {
    const relevanceScore = calculateScore(query, result.chunkContent);

    // 기존 유사도와 관련성 점수를 결합
    const finalScore = result.similarity * 0.6 + relevanceScore * 0.4;

    return {
      ...result,
      similarity: finalScore,
    };
  });

  // 임계값 이상인 결과만 필터링하고 점수순 정렬
  return reranked
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// 하이라이팅 함수
// ============================================================================

/**
 * 검색어 하이라이팅
 *
 * 텍스트에서 검색어를 하이라이팅
 *
 * @param text 원본 텍스트
 * @param query 검색 쿼리
 * @returns 하이라이팅된 HTML
 *
 * @example
 * ```ts
 * const highlighted = highlightQuery("React hooks are...", "hooks");
 * // "React <mark>hooks</mark> are..."
 * ```
 */
export function highlightQuery(text: string, query: string): string {
  if (!query || !text) return text;

  const queryTokens = tokenize(normalizeText(query));
  let highlightedText = text;

  for (const token of queryTokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
    );
  }

  return highlightedText;
}

/**
 * 정규표현식 이스케이프
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// 토큰 추정 함수
// ============================================================================

/**
 * 토큰 수 추정
 *
 * 텍스트의 토큰 수를 추정 (1 토큰 ≈ 4자)
 *
 * @param text 텍스트
 * @returns 추정 토큰 수
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * 최대 토큰 제한
 *
 * 텍스트를 최대 토큰 수로 제한
 *
 * @param text 텍스트
 * @param maxTokens 최대 토큰 수
 * @returns 제한된 텍스트
 */
export function limitTokens(text: string, maxTokens: number): string {
  const maxLength = maxTokens * 4;

  if (text.length <= maxLength) {
    return text;
  }

  // 단어 경계에서 자르기
  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex === -1) {
    return truncated;
  }

  return truncated.slice(0, lastSpaceIndex) + '...';
}
