/**
 * RAG 검색 결과 랭킹 시스템
 *
 * TF-IDF, BM25, 시맨틱 유사도 등을 활용한 고급 랭킹 알고리즘
 *
 * @module lib/rag/ranking
 */

import type { RAGSearchResult } from '@/types/ai/rag.types';

// ============================================================================
// 상수
// ============================================================================

/**
 * BM25 파라미터: k1 (용어 빈도 포화)
 */
const BM25_K1 = 1.5;

/**
 * BM25 파라미터: b (문서 길이 정규화)
 */
const BM25_B = 0.75;

/**
 * 기본 평균 문서 길이
 */
const DEFAULT_AVG_DOC_LENGTH = 500;

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 랭킹 점수
 */
export interface RankingScore {
  /** TF-IDF 점수 */
  tfidf: number;
  /** BM25 점수 */
  bm25: number;
  /** 시맨틱 유사도 점수 */
  semantic: number;
  /** 통합 점수 */
  combined: number;
}

/**
 * 랭킹 옵션
 */
export interface RankingOptions {
  /** TF-IDF 가중치 (0-1) */
  tfidfWeight?: number;
  /** BM25 가중치 (0-1) */
  bm25Weight?: number;
  /** 시맨틱 가중치 (0-1) */
  semanticWeight?: number;
  /** 평균 문서 길이 */
  avgDocLength?: number;
}

/**
 * 점수가 포함된 검색 결과
 */
export interface RankedSearchResult extends RAGSearchResult {
  /** 랭킹 점수 */
  ranking: RankingScore;
}

// ============================================================================
// TF-IDF 계산
// ============================================================================

/**
 * 용어 빈도 (Term Frequency) 계산
 *
 * @param term 검색 용어
 * @param document 문서 텍스트
 * @returns TF 값
 */
export function calculateTF(term: string, document: string): number {
  const tokens = tokenize(document);
  const termCount = tokens.filter((t) => t === term.toLowerCase()).length;

  if (tokens.length === 0) return 0;

  return termCount / tokens.length;
}

/**
 * 역문서 빈도 (Inverse Document Frequency) 계산
 *
 * @param term 검색 용어
 * @param documents 문서 목록
 * @returns IDF 값
 */
export function calculateIDF(term: string, documents: string[]): number {
  const totalDocs = documents.length;
  const docsWithTerm = documents.filter((doc) =>
    tokenize(doc).includes(term.toLowerCase())
  ).length;

  if (docsWithTerm === 0) return 0;

  return Math.log((totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
}

/**
 * TF-IDF 점수 계산
 *
 * @param query 검색 쿼리
 * @param document 문서 텍스트
 * @param allDocuments 전체 문서 목록 (IDF 계산용)
 * @returns TF-IDF 점수
 *
 * @example
 * ```ts
 * const score = calculateTFIDF("React hooks", document, allDocuments);
 * ```
 */
export function calculateTFIDF(
  query: string,
  document: string,
  allDocuments: string[]
): number {
  const queryTerms = tokenize(query);
  let totalScore = 0;

  for (const term of queryTerms) {
    const tf = calculateTF(term, document);
    const idf = calculateIDF(term, allDocuments);
    totalScore += tf * idf;
  }

  // 쿼리 용어 수로 정규화
  return queryTerms.length > 0 ? totalScore / queryTerms.length : 0;
}

// ============================================================================
// BM25 계산
// ============================================================================

/**
 * BM25 점수 계산
 *
 * Okapi BM25 알고리즘을 사용한 키워드 검색 점수
 *
 * @param query 검색 쿼리
 * @param document 문서 텍스트
 * @param allDocuments 전체 문서 목록
 * @param avgDocLength 평균 문서 길이
 * @returns BM25 점수
 *
 * @example
 * ```ts
 * const score = calculateBM25("React hooks", document, allDocuments, 500);
 * ```
 */
export function calculateBM25(
  query: string,
  document: string,
  allDocuments: string[],
  avgDocLength: number = DEFAULT_AVG_DOC_LENGTH
): number {
  const queryTerms = tokenize(query);
  const docTokens = tokenize(document);
  const docLength = docTokens.length;

  let totalScore = 0;

  for (const term of queryTerms) {
    const termFreq = docTokens.filter((t) => t === term).length;
    const idf = calculateIDF(term, allDocuments);

    // BM25 공식
    const numerator = termFreq * (BM25_K1 + 1);
    const denominator =
      termFreq + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength));

    totalScore += idf * (numerator / denominator);
  }

  return totalScore;
}

// ============================================================================
// 시맨틱 유사도
// ============================================================================

/**
 * 시맨틱 유사도 점수 계산
 *
 * 검색 결과의 similarity 필드를 정규화
 *
 * @param result 검색 결과
 * @returns 정규화된 시맨틱 점수 (0-1)
 */
export function calculateSemanticScore(result: RAGSearchResult): number {
  // similarity는 이미 0-1 범위
  return Math.max(0, Math.min(1, result.similarity));
}

// ============================================================================
// 통합 랭킹
// ============================================================================

/**
 * 검색 결과 랭킹
 *
 * TF-IDF, BM25, 시맨틱 유사도를 결합하여 최종 랭킹 점수 계산
 *
 * @param query 검색 쿼리
 * @param results 검색 결과
 * @param options 랭킹 옵션
 * @returns 랭킹이 적용된 검색 결과
 *
 * @example
 * ```ts
 * const ranked = rankResults("React hooks", results, {
 *   tfidfWeight: 0.2,
 *   bm25Weight: 0.3,
 *   semanticWeight: 0.5,
 * });
 * ```
 */
export function rankResults(
  query: string,
  results: RAGSearchResult[],
  options?: RankingOptions
): RankedSearchResult[] {
  const {
    tfidfWeight = 0.2,
    bm25Weight = 0.3,
    semanticWeight = 0.5,
    avgDocLength = DEFAULT_AVG_DOC_LENGTH,
  } = options || {};

  // 가중치 정규화
  const normalized = normalizeWeights(tfidfWeight, bm25Weight, semanticWeight);

  // 전체 문서 내용 (IDF 계산용)
  const allDocuments = results.map((r) => r.chunkContent);

  // 각 결과에 랭킹 점수 계산
  const ranked = results.map((result) => {
    const tfidf = calculateTFIDF(query, result.chunkContent, allDocuments);
    const bm25 = calculateBM25(query, result.chunkContent, allDocuments, avgDocLength);
    const semantic = calculateSemanticScore(result);

    // 통합 점수 계산
    const combined =
      tfidf * normalized.tfidf +
      bm25 * normalized.bm25 +
      semantic * normalized.semantic;

    return {
      ...result,
      ranking: {
        tfidf,
        bm25,
        semantic,
        combined: Math.max(0, Math.min(1, combined)),
      },
      similarity: Math.max(0, Math.min(1, combined)),
    };
  });

  // 통합 점수로 정렬
  return ranked.sort((a, b) => b.ranking.combined - a.ranking.combined);
}

/**
 * 가중치 정규화
 *
 * 세 가중치의 합이 1.0이 되도록 정규화
 */
function normalizeWeights(
  tfidfWeight: number,
  bm25Weight: number,
  semanticWeight: number
): { tfidf: number; bm25: number; semantic: number } {
  const sum = tfidfWeight + bm25Weight + semanticWeight;

  if (sum === 0) {
    return { tfidf: 0.2, bm25: 0.3, semantic: 0.5 };
  }

  return {
    tfidf: tfidfWeight / sum,
    bm25: bm25Weight / sum,
    semantic: semanticWeight / sum,
  };
}

// ============================================================================
// 쿼리 확장
// ============================================================================

/**
 * 쿼리 확장
 *
 * 검색 쿼리에 동의어, 관련 용어를 추가하여 검색 정확도 향상
 *
 * @param query 원본 쿼리
 * @param synonymMap 동의어 맵
 * @returns 확장된 쿼리
 *
 * @example
 * ```ts
 * const expanded = expandQuery("React", {
 *   "React": ["React.js", "ReactJS"],
 * });
 * // "React React.js ReactJS"
 * ```
 */
export function expandQuery(
  query: string,
  synonymMap: Record<string, string[]>
): string {
  const terms = tokenize(query);
  const expanded = new Set(terms);

  for (const term of terms) {
    const synonyms = synonymMap[term] || synonymMap[term.toLowerCase()];
    if (synonyms) {
      synonyms.forEach((syn) => expanded.add(syn.toLowerCase()));
    }
  }

  return Array.from(expanded).join(' ');
}

// ============================================================================
// 다양성 최적화
// ============================================================================

/**
 * 최대 한계 관련성 (Maximal Marginal Relevance) 적용
 *
 * 검색 결과의 관련성과 다양성을 동시에 최적화
 *
 * @param results 검색 결과
 * @param lambda 관련성 vs 다양성 균형 (0-1, 1=관련성 우선)
 * @param maxResults 최대 결과 수
 * @returns MMR이 적용된 결과
 *
 * @example
 * ```ts
 * const diverse = applyMMR(results, 0.7, 10);
 * ```
 */
export function applyMMR(
  results: RankedSearchResult[],
  lambda: number = 0.7,
  maxResults: number = 10
): RankedSearchResult[] {
  if (results.length === 0) return [];

  const selected: RankedSearchResult[] = [];
  const remaining = [...results];

  // 첫 번째 결과는 최고 점수 문서
  selected.push(remaining.shift()!);

  while (selected.length < maxResults && remaining.length > 0) {
    let maxScore = -Infinity;
    let maxIndex = 0;

    // 각 후보에 대해 MMR 점수 계산
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // 관련성 점수
      const relevance = candidate.ranking.combined;

      // 다양성 점수 (이미 선택된 문서와의 최대 유사도)
      let maxSimilarity = 0;
      for (const selectedResult of selected) {
        const similarity = calculateContentSimilarity(
          candidate.chunkContent,
          selectedResult.chunkContent
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // MMR 점수
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > maxScore) {
        maxScore = mmrScore;
        maxIndex = i;
      }
    }

    // 최고 MMR 점수 문서 선택
    selected.push(remaining.splice(maxIndex, 1)[0]);
  }

  return selected;
}

/**
 * 콘텐츠 유사도 계산
 *
 * Jaccard 유사도 사용
 */
function calculateContentSimilarity(content1: string, content2: string): number {
  const tokens1 = new Set(tokenize(content1));
  const tokens2 = new Set(tokenize(content2));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

// ============================================================================
// 위치 기반 점수
// ============================================================================

/**
 * 위치 기반 점수 계산
 *
 * 쿼리 용어가 문서 앞부분에 나타날수록 높은 점수
 *
 * @param query 검색 쿼리
 * @param document 문서 텍스트
 * @returns 위치 점수 (0-1)
 *
 * @example
 * ```ts
 * const score = calculatePositionScore("React", document);
 * ```
 */
export function calculatePositionScore(query: string, document: string): number {
  const queryTerms = tokenize(query);
  const docText = document.toLowerCase();
  let totalScore = 0;

  for (const term of queryTerms) {
    const index = docText.indexOf(term);
    if (index !== -1) {
      // 앞부분에 있을수록 높은 점수 (지수 감쇠)
      const positionScore = Math.exp(-index / docText.length);
      totalScore += positionScore;
    }
  }

  return queryTerms.length > 0 ? totalScore / queryTerms.length : 0;
}

/**
 * 근접도 점수 계산
 *
 * 쿼리 용어들이 문서에서 얼마나 가까이 나타나는지 평가
 *
 * @param query 검색 쿼리
 * @param document 문서 텍스트
 * @returns 근접도 점수 (0-1)
 *
 * @example
 * ```ts
 * const score = calculateProximityScore("React hooks", document);
 * ```
 */
export function calculateProximityScore(query: string, document: string): number {
  const queryTerms = tokenize(query);
  if (queryTerms.length < 2) return 1;

  const docTokens = tokenize(document);
  const positions: number[][] = [];

  // 각 쿼리 용어의 위치 찾기
  for (const term of queryTerms) {
    const termPositions: number[] = [];
    for (let i = 0; i < docTokens.length; i++) {
      if (docTokens[i] === term) {
        termPositions.push(i);
      }
    }
    positions.push(termPositions);
  }

  // 최소 거리 찾기
  let minDistance = Infinity;
  for (let i = 0; i < positions.length - 1; i++) {
    for (const pos1 of positions[i]) {
      for (const pos2 of positions[i + 1]) {
        const distance = Math.abs(pos2 - pos1);
        minDistance = Math.min(minDistance, distance);
      }
    }
  }

  if (minDistance === Infinity) return 0;

  // 거리가 가까울수록 높은 점수
  return 1 / (1 + minDistance);
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

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

/**
 * 점수 정규화
 *
 * 점수를 0-1 범위로 정규화
 *
 * @param score 원본 점수
 * @param min 최소값
 * @param max 최대값
 * @returns 정규화된 점수
 */
export function normalizeScore(score: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

/**
 * 점수 분포 통계
 *
 * @param results 랭킹된 결과
 * @returns 점수 통계
 */
export interface ScoreStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

/**
 * 점수 통계 계산
 *
 * @param results 랭킹된 결과
 * @returns 점수 통계
 */
export function calculateScoreStats(results: RankedSearchResult[]): ScoreStats {
  if (results.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
  }

  const scores = results.map((r) => r.ranking.combined);
  const sorted = [...scores].sort((a, b) => a - b);

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  // 표준편차
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, stdDev };
}
