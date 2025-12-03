/**
 * RAG 유틸리티 함수 테스트
 *
 * @group unit
 * @module tests/unit/lib/rag
 */

import { describe, it, expect } from 'vitest';
import {
  chunkText,
  calculateScore,
  mergeResults,
  rerankResults,
  highlightQuery,
  estimateTokenCount,
  limitTokens,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  KEYWORD_WEIGHT,
  SEMANTIC_WEIGHT,
} from '@/lib/rag';
import type { RAGSearchResult } from '@/types/rag.types';

// ============================================================================
// 청킹 함수 테스트
// ============================================================================

describe('chunkText', () => {
  it('빈 텍스트는 빈 배열을 반환해야 함', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('청크 크기보다 작은 텍스트는 단일 청크로 반환해야 함', () => {
    const text = 'Hello World';
    const chunks = chunkText(text, 100);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('긴 텍스트를 여러 청크로 분할해야 함', () => {
    const text = '가'.repeat(1000);
    const chunks = chunkText(text, 500, 100);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
  });

  it('오버랩이 올바르게 적용되어야 함', () => {
    const text = 'A'.repeat(100) + ' ' + 'B'.repeat(100) + ' ' + 'C'.repeat(100);
    const chunks = chunkText(text, 150, 50);

    expect(chunks.length).toBeGreaterThan(1);
    // 오버랩으로 인해 일부 텍스트가 중복되어야 함
  });

  it('분리자를 사용하여 의미 있는 단위로 분할해야 함', () => {
    const text = '첫 번째 단락입니다.\n\n두 번째 단락입니다.\n\n세 번째 단락입니다.';
    const chunks = chunkText(text, 50, 10, ['\n\n', '\n', '. ', ' ']);

    expect(chunks.length).toBeGreaterThan(0);
    // 단락 경계에서 분할되어야 함
  });

  it('기본 파라미터로 동작해야 함', () => {
    const text = '가'.repeat(1000);
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 점수 계산 함수 테스트
// ============================================================================

describe('calculateScore', () => {
  it('정확히 일치하는 텍스트는 높은 점수를 받아야 함', () => {
    const query = 'React hooks';
    const document = 'React hooks are great';

    const score = calculateScore(query, document);

    expect(score).toBeGreaterThan(0.5);
  });

  it('관련 없는 텍스트는 낮은 점수를 받아야 함', () => {
    const query = 'React hooks';
    const document = 'Python Django framework';

    const score = calculateScore(query, document);

    expect(score).toBeLessThan(0.3);
  });

  it('빈 쿼리는 0점을 반환해야 함', () => {
    const score = calculateScore('', 'Some document text');

    expect(score).toBe(0);
  });

  it('빈 문서는 0점을 반환해야 함', () => {
    const score = calculateScore('query', '');

    expect(score).toBe(0);
  });

  it('대소문자를 무시하고 점수를 계산해야 함', () => {
    const score1 = calculateScore('React Hooks', 'react hooks tutorial');
    const score2 = calculateScore('react hooks', 'REACT HOOKS TUTORIAL');

    expect(Math.abs(score1 - score2)).toBeLessThan(0.01);
  });

  it('순서가 일치하면 더 높은 점수를 받아야 함', () => {
    const query = 'React hooks tutorial';
    const doc1 = 'React hooks tutorial for beginners';
    const doc2 = 'tutorial for React hooks';

    const score1 = calculateScore(query, doc1);
    const score2 = calculateScore(query, doc2);

    expect(score1).toBeGreaterThan(score2);
  });
});

// ============================================================================
// 결과 병합 함수 테스트
// ============================================================================

describe('mergeResults', () => {
  const mockKeywordResults: RAGSearchResult[] = [
    {
      documentId: 'doc1',
      documentTitle: 'Document 1',
      chunkIndex: 0,
      chunkContent: 'Content 1',
      similarity: 0.8,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
    {
      documentId: 'doc2',
      documentTitle: 'Document 2',
      chunkIndex: 0,
      chunkContent: 'Content 2',
      similarity: 0.6,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
  ];

  const mockSemanticResults: RAGSearchResult[] = [
    {
      documentId: 'doc1',
      documentTitle: 'Document 1',
      chunkIndex: 0,
      chunkContent: 'Content 1',
      similarity: 0.9,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
    {
      documentId: 'doc3',
      documentTitle: 'Document 3',
      chunkIndex: 0,
      chunkContent: 'Content 3',
      similarity: 0.85,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
  ];

  it('키워드 및 의미론적 검색 결과를 병합해야 함', () => {
    const merged = mergeResults(mockKeywordResults, mockSemanticResults);

    // doc1, doc2, doc3 모두 포함되어야 함
    expect(merged.length).toBe(3);
  });

  it('중복 문서의 점수를 합산해야 함', () => {
    const merged = mergeResults(mockKeywordResults, mockSemanticResults);

    const doc1 = merged.find((r) => r.documentId === 'doc1');
    expect(doc1).toBeDefined();

    // 키워드 점수(0.8 * 0.3) + 의미론적 점수(0.9 * 0.7) = 0.24 + 0.63 = 0.87
    expect(doc1?.similarity).toBeCloseTo(0.87, 2);
  });

  it('점수 순으로 정렬해야 함', () => {
    const merged = mergeResults(mockKeywordResults, mockSemanticResults);

    for (let i = 0; i < merged.length - 1; i++) {
      expect(merged[i].similarity).toBeGreaterThanOrEqual(merged[i + 1].similarity);
    }
  });

  it('커스텀 가중치를 적용해야 함', () => {
    const merged = mergeResults(mockKeywordResults, mockSemanticResults, 0.5, 0.5);

    const doc1 = merged.find((r) => r.documentId === 'doc1');
    expect(doc1).toBeDefined();

    // 키워드 점수(0.8 * 0.5) + 의미론적 점수(0.9 * 0.5) = 0.4 + 0.45 = 0.85
    expect(doc1?.similarity).toBeCloseTo(0.85, 2);
  });

  it('빈 배열을 처리해야 함', () => {
    const merged1 = mergeResults([], mockSemanticResults);
    expect(merged1.length).toBe(mockSemanticResults.length);

    const merged2 = mergeResults(mockKeywordResults, []);
    expect(merged2.length).toBe(mockKeywordResults.length);

    const merged3 = mergeResults([], []);
    expect(merged3).toEqual([]);
  });
});

// ============================================================================
// 재랭킹 함수 테스트
// ============================================================================

describe('rerankResults', () => {
  const mockResults: RAGSearchResult[] = [
    {
      documentId: 'doc1',
      documentTitle: 'React Hooks Guide',
      chunkIndex: 0,
      chunkContent: 'React hooks are a powerful feature for state management',
      similarity: 0.8,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
    {
      documentId: 'doc2',
      documentTitle: 'Python Tutorial',
      chunkIndex: 0,
      chunkContent: 'Python is a versatile programming language',
      similarity: 0.7,
      metadata: {},
      sourceType: 'manual',
      sourceUrl: null,
      serviceId: null,
    },
  ];

  it('쿼리와 관련성이 높은 결과가 상위에 와야 함', () => {
    const query = 'React hooks';
    const reranked = rerankResults(query, mockResults);

    expect(reranked[0].documentId).toBe('doc1');
  });

  it('임계값 이하의 결과를 필터링해야 함', () => {
    const query = 'React hooks';
    const reranked = rerankResults(query, mockResults, 0.8);

    // 임계값 0.8 이상인 결과만 포함
    expect(reranked.every((r) => r.similarity >= 0.8)).toBe(true);
  });

  it('점수 순으로 정렬해야 함', () => {
    const query = 'programming';
    const reranked = rerankResults(query, mockResults);

    for (let i = 0; i < reranked.length - 1; i++) {
      expect(reranked[i].similarity).toBeGreaterThanOrEqual(reranked[i + 1].similarity);
    }
  });

  it('빈 배열을 처리해야 함', () => {
    const reranked = rerankResults('query', []);
    expect(reranked).toEqual([]);
  });
});

// ============================================================================
// 하이라이팅 함수 테스트
// ============================================================================

describe('highlightQuery', () => {
  it('검색어를 하이라이팅해야 함', () => {
    const text = 'React hooks are great';
    const query = 'hooks';

    const highlighted = highlightQuery(text, query);

    expect(highlighted).toContain('<mark');
    expect(highlighted).toContain('hooks');
    expect(highlighted).toContain('</mark>');
  });

  it('대소문자를 무시하고 하이라이팅해야 함', () => {
    const text = 'React Hooks are great';
    const query = 'hooks';

    const highlighted = highlightQuery(text, query);

    expect(highlighted).toContain('<mark');
    expect(highlighted).toContain('Hooks');
  });

  it('여러 단어를 하이라이팅해야 함', () => {
    const text = 'React hooks and state management';
    const query = 'React hooks';

    const highlighted = highlightQuery(text, query);

    expect(highlighted).toContain('<mark');
    // React와 hooks 모두 하이라이팅되어야 함
  });

  it('빈 쿼리는 원본 텍스트를 반환해야 함', () => {
    const text = 'Some text';
    const highlighted = highlightQuery(text, '');

    expect(highlighted).toBe(text);
  });

  it('빈 텍스트는 빈 문자열을 반환해야 함', () => {
    const highlighted = highlightQuery('', 'query');

    expect(highlighted).toBe('');
  });
});

// ============================================================================
// 토큰 추정 함수 테스트
// ============================================================================

describe('estimateTokenCount', () => {
  it('텍스트의 토큰 수를 추정해야 함', () => {
    const text = 'Hello World';
    const tokens = estimateTokenCount(text);

    expect(tokens).toBeGreaterThan(0);
    // 1 토큰 ≈ 4자
    expect(tokens).toBeCloseTo(text.length / 4, 0);
  });

  it('빈 텍스트는 0 토큰을 반환해야 함', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('긴 텍스트의 토큰 수를 올바르게 추정해야 함', () => {
    const text = 'A'.repeat(1000);
    const tokens = estimateTokenCount(text);

    expect(tokens).toBeCloseTo(250, 0); // 1000 / 4 = 250
  });
});

describe('limitTokens', () => {
  it('최대 토큰 수로 텍스트를 제한해야 함', () => {
    const text = 'A'.repeat(1000);
    const limited = limitTokens(text, 100);

    expect(limited.length).toBeLessThanOrEqual(100 * 4);
  });

  it('짧은 텍스트는 그대로 반환해야 함', () => {
    const text = 'Hello World';
    const limited = limitTokens(text, 100);

    expect(limited).toBe(text);
  });

  it('단어 경계에서 잘라야 함', () => {
    const text = 'Hello World This Is A Test';
    const limited = limitTokens(text, 5); // 20자 = 5 토큰

    expect(limited).not.toContain('This');
    expect(limited.endsWith('...')).toBe(true);
  });

  it('빈 텍스트를 처리해야 함', () => {
    const limited = limitTokens('', 100);

    expect(limited).toBe('');
  });
});

// ============================================================================
// 상수 테스트
// ============================================================================

describe('RAG 상수', () => {
  it('기본 청크 크기가 정의되어 있어야 함', () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(500);
  });

  it('기본 청크 오버랩이 정의되어 있어야 함', () => {
    expect(DEFAULT_CHUNK_OVERLAP).toBe(100);
  });

  it('키워드 가중치가 정의되어 있어야 함', () => {
    expect(KEYWORD_WEIGHT).toBe(0.3);
  });

  it('의미론적 가중치가 정의되어 있어야 함', () => {
    expect(SEMANTIC_WEIGHT).toBe(0.7);
  });

  it('가중치의 합이 1이어야 함', () => {
    expect(KEYWORD_WEIGHT + SEMANTIC_WEIGHT).toBe(1.0);
  });
});
