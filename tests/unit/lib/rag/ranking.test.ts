/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTF,
  calculateIDF,
  calculateTFIDF,
  calculateBM25,
  calculateSemanticScore,
  rankResults,
  expandQuery,
  applyMMR,
  calculatePositionScore,
  calculateProximityScore,
  normalizeScore,
  calculateScoreStats,
  type RankedSearchResult,
  type RankingOptions,
} from '@/lib/rag/ranking';
import type { RAGSearchResult } from '@/types/rag.types';

describe('ranking', () => {
  // ============================================================================
  // 테스트 데이터
  // ============================================================================

  const createMockResult = (
    documentId: string,
    chunkContent: string,
    similarity: number = 0.8
  ): RAGSearchResult => ({
    documentId,
    documentTitle: `Document ${documentId}`,
    chunkIndex: 0,
    chunkContent,
    similarity,
    metadata: {},
    sourceType: 'manual',
    sourceUrl: null,
    serviceId: null,
  });

  let documents: string[];

  beforeEach(() => {
    documents = [
      'React hooks are great for state management',
      'Vue composition API is similar to hooks',
      'Angular services handle state differently',
    ];
  });

  // ============================================================================
  // TF (Term Frequency) 테스트
  // ============================================================================

  describe('calculateTF', () => {
    it('용어 빈도를 올바르게 계산해야 함', () => {
      const tf = calculateTF('hooks', 'React hooks are great hooks');
      expect(tf).toBeCloseTo(0.4); // 2 / 5
    });

    it('대소문자를 구분하지 않아야 함', () => {
      const tf = calculateTF('Hooks', 'React hooks are great');
      expect(tf).toBeGreaterThan(0);
    });

    it('용어가 없으면 0을 반환해야 함', () => {
      const tf = calculateTF('angular', 'React hooks are great');
      expect(tf).toBe(0);
    });

    it('빈 문서에서 0을 반환해야 함', () => {
      const tf = calculateTF('hooks', '');
      expect(tf).toBe(0);
    });
  });

  // ============================================================================
  // IDF (Inverse Document Frequency) 테스트
  // ============================================================================

  describe('calculateIDF', () => {
    it('역문서 빈도를 올바르게 계산해야 함', () => {
      const idf = calculateIDF('hooks', documents);
      expect(idf).toBeGreaterThan(0);
    });

    it('모든 문서에 나타나는 용어는 낮은 IDF를 가져야 함', () => {
      const commonIDF = calculateIDF('state', documents);
      expect(commonIDF).toBeGreaterThan(0);
    });

    it('용어가 없으면 0을 반환해야 함', () => {
      const idf = calculateIDF('nonexistent', documents);
      expect(idf).toBe(0);
    });
  });

  // ============================================================================
  // TF-IDF 테스트
  // ============================================================================

  describe('calculateTFIDF', () => {
    it('TF-IDF 점수를 올바르게 계산해야 함', () => {
      const score = calculateTFIDF('React hooks', documents[0], documents);
      expect(score).toBeGreaterThan(0);
    });

    it('관련성이 높은 문서는 높은 점수를 받아야 함', () => {
      const score1 = calculateTFIDF('React hooks', documents[0], documents);
      const score2 = calculateTFIDF('React hooks', documents[2], documents);
      expect(score1).toBeGreaterThan(score2);
    });

    it('빈 쿼리는 0을 반환해야 함', () => {
      const score = calculateTFIDF('', documents[0], documents);
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // BM25 테스트
  // ============================================================================

  describe('calculateBM25', () => {
    it('BM25 점수를 올바르게 계산해야 함', () => {
      const score = calculateBM25('React hooks', documents[0], documents, 500);
      expect(score).toBeGreaterThan(0);
    });

    it('관련성이 높은 문서는 높은 점수를 받아야 함', () => {
      const score1 = calculateBM25('React hooks', documents[0], documents, 500);
      const score2 = calculateBM25('React hooks', documents[2], documents, 500);
      expect(score1).toBeGreaterThan(score2);
    });

    it('문서 길이 정규화가 동작해야 함', () => {
      const longDoc = documents[0] + ' ' + documents[0]; // 2배 길이
      const score1 = calculateBM25('React', documents[0], documents, 500);
      const score2 = calculateBM25('React', longDoc, documents, 500);

      // 긴 문서는 페널티를 받아야 함
      expect(score2).toBeLessThan(score1 * 2);
    });
  });

  // ============================================================================
  // Semantic Score 테스트
  // ============================================================================

  describe('calculateSemanticScore', () => {
    it('시맨틱 점수를 정규화해야 함', () => {
      const result = createMockResult('doc-1', 'Content', 0.85);
      const score = calculateSemanticScore(result);
      expect(score).toBe(0.85);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('1보다 큰 값을 1로 제한해야 함', () => {
      const result = createMockResult('doc-1', 'Content', 1.5);
      const score = calculateSemanticScore(result);
      expect(score).toBe(1);
    });

    it('0보다 작은 값을 0으로 제한해야 함', () => {
      const result = createMockResult('doc-1', 'Content', -0.5);
      const score = calculateSemanticScore(result);
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // rankResults 테스트
  // ============================================================================

  describe('rankResults', () => {
    let results: RAGSearchResult[];

    beforeEach(() => {
      results = [
        createMockResult('doc-1', documents[0], 0.9),
        createMockResult('doc-2', documents[1], 0.85),
        createMockResult('doc-3', documents[2], 0.8),
      ];
    });

    it('검색 결과를 랭킹해야 함', () => {
      const ranked = rankResults('React hooks', results);

      expect(ranked.length).toBe(results.length);
      expect(ranked.every((r) => 'ranking' in r)).toBe(true);
      expect(ranked.every((r) => r.ranking.combined >= 0 && r.ranking.combined <= 1)).toBe(true);
    });

    it('결과가 통합 점수 기준으로 정렬되어야 함', () => {
      const ranked = rankResults('React hooks', results);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].ranking.combined).toBeGreaterThanOrEqual(
          ranked[i + 1].ranking.combined
        );
      }
    });

    it('TF-IDF 가중치를 적용해야 함', () => {
      const options: RankingOptions = {
        tfidfWeight: 1.0,
        bm25Weight: 0.0,
        semanticWeight: 0.0,
      };

      const ranked = rankResults('React hooks', results, options);
      expect(ranked[0].ranking.tfidf).toBeGreaterThan(0);
    });

    it('BM25 가중치를 적용해야 함', () => {
      const options: RankingOptions = {
        tfidfWeight: 0.0,
        bm25Weight: 1.0,
        semanticWeight: 0.0,
      };

      const ranked = rankResults('React hooks', results, options);
      expect(ranked[0].ranking.bm25).toBeGreaterThan(0);
    });

    it('시맨틱 가중치를 적용해야 함', () => {
      const options: RankingOptions = {
        tfidfWeight: 0.0,
        bm25Weight: 0.0,
        semanticWeight: 1.0,
      };

      const ranked = rankResults('React hooks', results, options);
      expect(ranked[0].ranking.semantic).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // expandQuery 테스트
  // ============================================================================

  describe('expandQuery', () => {
    it('쿼리를 동의어로 확장해야 함', () => {
      const synonymMap = {
        react: ['react.js', 'reactjs'],
        hooks: ['hook'],
      };

      const expanded = expandQuery('React hooks', synonymMap);

      expect(expanded).toContain('react');
      expect(expanded).toContain('hooks');
      expect(expanded).toContain('react.js');
      expect(expanded).toContain('hook');
    });

    it('동의어가 없으면 원본 쿼리를 반환해야 함', () => {
      const expanded = expandQuery('query', {});
      expect(expanded).toBe('query');
    });

    it('중복을 제거해야 함', () => {
      const synonymMap = {
        test: ['test'],
      };

      const expanded = expandQuery('test', synonymMap);
      const words = expanded.split(' ');
      const uniqueWords = new Set(words);
      expect(words.length).toBe(uniqueWords.size);
    });
  });

  // ============================================================================
  // applyMMR 테스트
  // ============================================================================

  describe('applyMMR', () => {
    let rankedResults: RankedSearchResult[];

    beforeEach(() => {
      rankedResults = [
        {
          ...createMockResult('doc-1', 'React hooks are great', 0.9),
          ranking: {
            tfidf: 0.8,
            bm25: 0.85,
            semantic: 0.9,
            combined: 0.85,
          },
        },
        {
          ...createMockResult('doc-2', 'React hooks are good', 0.88),
          ranking: {
            tfidf: 0.78,
            bm25: 0.83,
            semantic: 0.88,
            combined: 0.83,
          },
        },
        {
          ...createMockResult('doc-3', 'Angular services', 0.7),
          ranking: {
            tfidf: 0.6,
            bm25: 0.65,
            semantic: 0.7,
            combined: 0.65,
          },
        },
      ];
    });

    it('다양성을 고려하여 결과를 선택해야 함', () => {
      const diverse = applyMMR(rankedResults, 0.7, 3);

      expect(diverse.length).toBe(3);
      expect(diverse[0].documentId).toBe('doc-1'); // 최고 점수는 항상 선택
    });

    it('최대 결과 수를 제한해야 함', () => {
      const diverse = applyMMR(rankedResults, 0.7, 2);
      expect(diverse.length).toBe(2);
    });

    it('lambda=1일 때 관련성만 고려해야 함', () => {
      const diverse = applyMMR(rankedResults, 1.0, 3);

      // 순수 관련성 순서
      for (let i = 0; i < diverse.length - 1; i++) {
        expect(diverse[i].ranking.combined).toBeGreaterThanOrEqual(
          diverse[i + 1].ranking.combined
        );
      }
    });

    it('빈 결과를 처리해야 함', () => {
      const diverse = applyMMR([], 0.7, 10);
      expect(diverse).toEqual([]);
    });
  });

  // ============================================================================
  // calculatePositionScore 테스트
  // ============================================================================

  describe('calculatePositionScore', () => {
    it('앞부분에 나타나는 용어에 높은 점수를 부여해야 함', () => {
      const doc1 = 'React hooks are great';
      const doc2 = 'This is a long text about React hooks';

      const score1 = calculatePositionScore('React', doc1);
      const score2 = calculatePositionScore('React', doc2);

      expect(score1).toBeGreaterThan(score2);
    });

    it('용어가 없으면 0을 반환해야 함', () => {
      const score = calculatePositionScore('nonexistent', 'React hooks are great');
      expect(score).toBe(0);
    });

    it('여러 용어의 평균 위치 점수를 계산해야 함', () => {
      const score = calculatePositionScore('React hooks', 'React hooks are great');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // calculateProximityScore 테스트
  // ============================================================================

  describe('calculateProximityScore', () => {
    it('가까이 있는 용어에 높은 점수를 부여해야 함', () => {
      const doc1 = 'React hooks are great';
      const doc2 = 'React is a library and hooks are features';

      const score1 = calculateProximityScore('React hooks', doc1);
      const score2 = calculateProximityScore('React hooks', doc2);

      expect(score1).toBeGreaterThan(score2);
    });

    it('단일 용어 쿼리는 1을 반환해야 함', () => {
      const score = calculateProximityScore('React', 'React hooks are great');
      expect(score).toBe(1);
    });

    it('용어가 없으면 0을 반환해야 함', () => {
      const score = calculateProximityScore('React Angular', 'Vue composition API');
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // normalizeScore 테스트
  // ============================================================================

  describe('normalizeScore', () => {
    it('점수를 0-1 범위로 정규화해야 함', () => {
      const normalized = normalizeScore(5, 0, 10);
      expect(normalized).toBe(0.5);
    });

    it('최소값은 0으로 정규화되어야 함', () => {
      const normalized = normalizeScore(0, 0, 10);
      expect(normalized).toBe(0);
    });

    it('최대값은 1로 정규화되어야 함', () => {
      const normalized = normalizeScore(10, 0, 10);
      expect(normalized).toBe(1);
    });

    it('범위를 벗어난 값을 제한해야 함', () => {
      const normalized1 = normalizeScore(-5, 0, 10);
      const normalized2 = normalizeScore(15, 0, 10);

      expect(normalized1).toBe(0);
      expect(normalized2).toBe(1);
    });

    it('min과 max가 같으면 0을 반환해야 함', () => {
      const normalized = normalizeScore(5, 5, 5);
      expect(normalized).toBe(0);
    });
  });

  // ============================================================================
  // calculateScoreStats 테스트
  // ============================================================================

  describe('calculateScoreStats', () => {
    it('점수 통계를 계산해야 함', () => {
      const results: RankedSearchResult[] = [
        {
          ...createMockResult('doc-1', 'Content 1', 0.9),
          ranking: { tfidf: 0.8, bm25: 0.85, semantic: 0.9, combined: 0.9 },
        },
        {
          ...createMockResult('doc-2', 'Content 2', 0.8),
          ranking: { tfidf: 0.7, bm25: 0.75, semantic: 0.8, combined: 0.8 },
        },
        {
          ...createMockResult('doc-3', 'Content 3', 0.7),
          ranking: { tfidf: 0.6, bm25: 0.65, semantic: 0.7, combined: 0.7 },
        },
      ];

      const stats = calculateScoreStats(results);

      expect(stats.min).toBe(0.7);
      expect(stats.max).toBe(0.9);
      expect(stats.mean).toBeCloseTo(0.8);
      expect(stats.median).toBe(0.8);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    it('빈 결과에서 0 통계를 반환해야 함', () => {
      const stats = calculateScoreStats([]);

      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.stdDev).toBe(0);
    });

    it('단일 결과의 통계를 올바르게 계산해야 함', () => {
      const results: RankedSearchResult[] = [
        {
          ...createMockResult('doc-1', 'Content', 0.8),
          ranking: { tfidf: 0.7, bm25: 0.75, semantic: 0.8, combined: 0.8 },
        },
      ];

      const stats = calculateScoreStats(results);

      expect(stats.min).toBe(0.8);
      expect(stats.max).toBe(0.8);
      expect(stats.mean).toBe(0.8);
      expect(stats.median).toBe(0.8);
      expect(stats.stdDev).toBe(0);
    });
  });
});
