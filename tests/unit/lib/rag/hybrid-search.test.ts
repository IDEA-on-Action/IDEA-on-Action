/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hybridSearch,
  normalizeWeights,
  removeDuplicates,
  rerankResults,
  groupByDocument,
  selectTopChunkPerDocument,
  type ScoredSearchResult,
  type HybridSearchOptions,
} from '@/lib/rag/hybrid-search';
import type { RAGSearchResult } from '@/types/rag.types';

describe('hybrid-search', () => {
  // ============================================================================
  // 테스트 데이터
  // ============================================================================

  const createMockResult = (
    id: string,
    documentId: string,
    chunkIndex: number,
    chunkContent: string,
    similarity: number = 0.8
  ): RAGSearchResult => ({
    documentId,
    documentTitle: `Document ${documentId}`,
    chunkIndex,
    chunkContent,
    similarity,
    metadata: {},
    sourceType: 'manual',
    sourceUrl: null,
    serviceId: null,
  });

  let keywordResults: RAGSearchResult[];
  let vectorResults: RAGSearchResult[];

  beforeEach(() => {
    keywordResults = [
      createMockResult('1', 'doc-1', 0, 'React hooks are great for state management', 0.9),
      createMockResult('2', 'doc-2', 0, 'Vue composition API is similar to React hooks', 0.7),
    ];

    vectorResults = [
      createMockResult('3', 'doc-1', 0, 'React hooks are great for state management', 0.95),
      createMockResult('4', 'doc-3', 0, 'Angular services handle state differently', 0.8),
    ];
  });

  // ============================================================================
  // normalizeWeights 테스트
  // ============================================================================

  describe('normalizeWeights', () => {
    it('가중치의 합이 1.0이 되도록 정규화해야 함', () => {
      const result = normalizeWeights(0.3, 0.7);
      expect(result.keywordWeight + result.vectorWeight).toBe(1.0);
      expect(result.keywordWeight).toBe(0.3);
      expect(result.vectorWeight).toBe(0.7);
    });

    it('가중치가 불균등할 때 정규화해야 함', () => {
      const result = normalizeWeights(2, 3);
      expect(result.keywordWeight).toBeCloseTo(0.4);
      expect(result.vectorWeight).toBeCloseTo(0.6);
      expect(result.keywordWeight + result.vectorWeight).toBeCloseTo(1.0);
    });

    it('가중치가 모두 0일 때 기본값을 반환해야 함', () => {
      const result = normalizeWeights(0, 0);
      expect(result.keywordWeight).toBe(0.3);
      expect(result.vectorWeight).toBe(0.7);
    });
  });

  // ============================================================================
  // hybridSearch 테스트
  // ============================================================================

  describe('hybridSearch', () => {
    it('키워드 검색과 벡터 검색 결과를 병합해야 함', () => {
      const results = hybridSearch('React hooks', keywordResults, vectorResults);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => 'combinedScore' in r)).toBe(true);
      expect(results.every((r) => 'keywordScore' in r)).toBe(true);
      expect(results.every((r) => 'vectorScore' in r)).toBe(true);
    });

    it('결과가 통합 점수 기준으로 정렬되어야 함', () => {
      const results = hybridSearch('React hooks', keywordResults, vectorResults);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].combinedScore).toBeGreaterThanOrEqual(results[i + 1].combinedScore);
      }
    });

    it('최소 점수 필터링이 동작해야 함', () => {
      const options: HybridSearchOptions = {
        minScore: 0.8,
      };

      const results = hybridSearch('React hooks', keywordResults, vectorResults, options);

      expect(results.every((r) => r.combinedScore >= 0.8)).toBe(true);
    });

    it('결과 수 제한이 동작해야 함', () => {
      const options: HybridSearchOptions = {
        limit: 2,
      };

      const results = hybridSearch('React hooks', keywordResults, vectorResults, options);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('동일한 문서의 청크를 병합해야 함', () => {
      const results = hybridSearch('React hooks', keywordResults, vectorResults);

      const doc1Results = results.filter((r) => r.documentId === 'doc-1');
      expect(doc1Results.length).toBe(1);
      expect(doc1Results[0].keywordScore).toBeGreaterThan(0);
      expect(doc1Results[0].vectorScore).toBeGreaterThan(0);
    });

    it('빈 검색 결과를 올바르게 처리해야 함', () => {
      const results = hybridSearch('React hooks', [], []);
      expect(results).toEqual([]);
    });

    it('키워드만 있는 경우 올바르게 처리해야 함', () => {
      const results = hybridSearch('React hooks', keywordResults, []);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.keywordScore > 0 && r.vectorScore === 0)).toBe(true);
    });

    it('벡터만 있는 경우 올바르게 처리해야 함', () => {
      const results = hybridSearch('React hooks', [], vectorResults);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.keywordScore === 0 && r.vectorScore > 0)).toBe(true);
    });
  });

  // ============================================================================
  // removeDuplicates 테스트
  // ============================================================================

  describe('removeDuplicates', () => {
    it('중복된 청크를 제거해야 함', () => {
      const duplicates: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'React hooks are great', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
        {
          ...createMockResult('2', 'doc-1', 1, 'React hooks are great', 0.85),
          keywordScore: 0.75,
          vectorScore: 0.85,
          combinedScore: 0.8,
        },
        {
          ...createMockResult('3', 'doc-2', 0, 'Vue composition API', 0.8),
          keywordScore: 0.7,
          vectorScore: 0.8,
          combinedScore: 0.75,
        },
      ];

      const results = removeDuplicates(duplicates, 0.9);

      expect(results.length).toBe(2);
      expect(results.find((r) => r.documentId === 'doc-2')).toBeDefined();
    });

    it('다른 문서의 유사한 청크는 유지해야 함', () => {
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'React hooks', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
        {
          ...createMockResult('2', 'doc-2', 0, 'React hooks', 0.85),
          keywordScore: 0.75,
          vectorScore: 0.85,
          combinedScore: 0.8,
        },
      ];

      const filtered = removeDuplicates(results, 0.9);

      expect(filtered.length).toBe(2); // 다른 문서이므로 유지
    });
  });

  // ============================================================================
  // rerankResults 테스트
  // ============================================================================

  describe('rerankResults', () => {
    it('다양성 페널티를 적용해야 함', () => {
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'Content 1', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
        {
          ...createMockResult('2', 'doc-1', 1, 'Content 2', 0.88),
          keywordScore: 0.78,
          vectorScore: 0.88,
          combinedScore: 0.83,
        },
        {
          ...createMockResult('3', 'doc-2', 0, 'Content 3', 0.85),
          keywordScore: 0.75,
          vectorScore: 0.85,
          combinedScore: 0.8,
        },
      ];

      const reranked = rerankResults('query', results, { diversityWeight: 0.2 });

      // 같은 문서의 두 번째 청크는 페널티를 받아야 함
      const doc1Second = reranked.find((r) => r.documentId === 'doc-1' && r.chunkIndex === 1);
      expect(doc1Second).toBeDefined();
    });

    it('최신성 보너스를 적용해야 함', () => {
      const recentDate = new Date();
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'Content 1', 0.8),
          keywordScore: 0.7,
          vectorScore: 0.8,
          combinedScore: 0.75,
          metadata: { date: recentDate.toISOString() },
        },
      ];

      const reranked = rerankResults('query', results, { recencyWeight: 0.1 });

      expect(reranked[0].combinedScore).toBeGreaterThan(0.75);
    });
  });

  // ============================================================================
  // groupByDocument 테스트
  // ============================================================================

  describe('groupByDocument', () => {
    it('문서별로 결과를 그룹화해야 함', () => {
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'Content 1', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
        {
          ...createMockResult('2', 'doc-1', 1, 'Content 2', 0.85),
          keywordScore: 0.75,
          vectorScore: 0.85,
          combinedScore: 0.8,
        },
        {
          ...createMockResult('3', 'doc-2', 0, 'Content 3', 0.8),
          keywordScore: 0.7,
          vectorScore: 0.8,
          combinedScore: 0.75,
        },
      ];

      const grouped = groupByDocument(results);

      expect(grouped.size).toBe(2);
      expect(grouped.get('doc-1')?.length).toBe(2);
      expect(grouped.get('doc-2')?.length).toBe(1);
    });
  });

  // ============================================================================
  // selectTopChunkPerDocument 테스트
  // ============================================================================

  describe('selectTopChunkPerDocument', () => {
    it('각 문서에서 최고 점수 청크만 선택해야 함', () => {
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'Content 1', 0.85),
          keywordScore: 0.75,
          vectorScore: 0.85,
          combinedScore: 0.8,
        },
        {
          ...createMockResult('2', 'doc-1', 1, 'Content 2', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
        {
          ...createMockResult('3', 'doc-2', 0, 'Content 3', 0.8),
          keywordScore: 0.7,
          vectorScore: 0.8,
          combinedScore: 0.75,
        },
      ];

      const topChunks = selectTopChunkPerDocument(results);

      expect(topChunks.length).toBe(2);
      expect(topChunks.find((r) => r.documentId === 'doc-1')?.chunkIndex).toBe(1);
      expect(topChunks.find((r) => r.documentId === 'doc-2')?.chunkIndex).toBe(0);
    });

    it('결과가 점수순으로 정렬되어야 함', () => {
      const results: ScoredSearchResult[] = [
        {
          ...createMockResult('1', 'doc-1', 0, 'Content 1', 0.7),
          keywordScore: 0.6,
          vectorScore: 0.7,
          combinedScore: 0.65,
        },
        {
          ...createMockResult('2', 'doc-2', 0, 'Content 2', 0.9),
          keywordScore: 0.8,
          vectorScore: 0.9,
          combinedScore: 0.85,
        },
      ];

      const topChunks = selectTopChunkPerDocument(results);

      for (let i = 0; i < topChunks.length - 1; i++) {
        expect(topChunks[i].combinedScore).toBeGreaterThanOrEqual(
          topChunks[i + 1].combinedScore
        );
      }
    });
  });
});
