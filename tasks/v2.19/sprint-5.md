# v2.19.0 Sprint 5: RAG 하이브리드 검색

**작성일**: 2025-11-26
**Sprint**: 5/5
**예상 시간**: 4시간
**상태**: 📝 Ready

---

## Sprint 목표

1. **하이브리드 검색 SQL 함수**: FTS + 벡터 검색 결합
2. **React 훅 구현**: useRAGHybridSearch
3. **UI 통합**: 가중치 조정, 결과 비교
4. **E2E 테스트**: 3개 신규 작성

---

## TASK-026: search_rag_hybrid SQL 함수 구현

**담당**: AI 에이전트
**예상 시간**: 1시간 30분
**우선순위**: P0

### 설명
키워드 검색(FTS)과 벡터 검색을 결합한 하이브리드 검색 함수를 구현합니다.

### 마이그레이션 파일 생성

#### supabase/migrations/YYYYMMDDHHMMSS_add_rag_hybrid_search.sql
```sql
-- RAG 하이브리드 검색 함수
-- FTS (Full-Text Search) + 벡터 검색 결합

CREATE OR REPLACE FUNCTION search_rag_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  fts_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT,
  fts_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_id,
    e.content,
    e.chunk_index,
    e.metadata,
    -- 벡터 유사도 (코사인 유사도, 0~1)
    (1 - (e.embedding <=> query_embedding)) AS similarity,
    -- FTS 점수 (ts_rank, 0~1 정규화)
    COALESCE(
      ts_rank(
        to_tsvector('simple', e.content),
        plainto_tsquery('simple', query_text)
      ),
      0
    ) AS fts_score,
    -- 결합 점수 (가중 평균)
    (
      COALESCE(
        ts_rank(
          to_tsvector('simple', e.content),
          plainto_tsquery('simple', query_text)
        ),
        0
      ) * fts_weight +
      (1 - (e.embedding <=> query_embedding)) * vector_weight
    ) AS combined_score
  FROM rag_embeddings e
  WHERE
    -- 벡터 유사도 또는 FTS 매칭
    (1 - (e.embedding <=> query_embedding)) > match_threshold
    OR to_tsvector('simple', e.content) @@ plainto_tsquery('simple', query_text)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- 함수 설명 추가
COMMENT ON FUNCTION search_rag_hybrid IS 'RAG 하이브리드 검색: FTS + 벡터 검색 결합';

-- 성능 최적화를 위한 인덱스 확인
DO $$
BEGIN
  -- pgvector 인덱스 존재 확인
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'rag_embeddings' AND indexname = 'rag_embeddings_embedding_idx'
  ) THEN
    RAISE NOTICE 'Creating pgvector index...';
    CREATE INDEX rag_embeddings_embedding_idx ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);
  END IF;

  -- FTS 인덱스 존재 확인
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'rag_embeddings' AND indexname = 'rag_embeddings_content_fts_idx'
  ) THEN
    RAISE NOTICE 'Creating FTS index...';
    CREATE INDEX rag_embeddings_content_fts_idx ON rag_embeddings USING gin (to_tsvector('simple', content));
  END IF;
END;
$$;

-- 테스트 쿼리
-- SELECT * FROM search_rag_hybrid(
--   '프로젝트 관리',
--   '[0.1, 0.2, ...]'::vector(1536),
--   0.7,
--   5,
--   0.3,
--   0.7
-- );
```

### 알고리즘 설명

#### 1. 벡터 유사도 (Cosine Similarity)
```
similarity = 1 - (embedding <=> query_embedding)
```
- `<=>`: pgvector 코사인 거리 연산자
- 값 범위: 0~1 (1에 가까울수록 유사)

#### 2. FTS 점수 (ts_rank)
```
fts_score = ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', query_text))
```
- `to_tsvector`: 텍스트를 검색 가능한 형태로 변환
- `plainto_tsquery`: 검색 쿼리 생성
- `ts_rank`: 검색 순위 계산 (0~1)

#### 3. 결합 점수 (Weighted Average)
```
combined_score = (fts_score × fts_weight) + (similarity × vector_weight)
```
- 기본 가중치: FTS 30%, 벡터 70%
- 조정 가능: 사용자가 가중치 변경 가능

### 체크리스트
- [ ] SQL 함수 작성
- [ ] 인덱스 생성 (pgvector, FTS)
- [ ] 함수 주석 추가
- [ ] 마이그레이션 실행
- [ ] 함수 동작 테스트

### 완료 조건
```bash
# 마이그레이션 실행
supabase db push

# 기대 출력:
Applying migration YYYYMMDDHHMMSS_add_rag_hybrid_search.sql
✓ Migration applied successfully

# 함수 존재 확인
psql -h localhost -U postgres -d postgres -c "\df search_rag_hybrid"
# 기대: 함수 정의 출력
```

---

## TASK-027: useRAGHybridSearch 훅 구현

**담당**: AI 에이전트
**예상 시간**: 1시간
**우선순위**: P0
**의존성**: TASK-026 완료 후 진행

### 설명
하이브리드 검색을 위한 React 훅을 구현합니다.

### 파일 생성

#### src/hooks/useRAGHybridSearch.ts
```typescript
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/supabase';

/**
 * RAG 하이브리드 검색 옵션
 */
export interface RAGHybridSearchOptions {
  /** FTS 가중치 (0~1) */
  ftsWeight?: number;
  /** 벡터 가중치 (0~1) */
  vectorWeight?: number;
  /** 유사도 임계값 (0~1) */
  matchThreshold?: number;
  /** 결과 개수 */
  matchCount?: number;
  /** 프로젝트 ID (선택) */
  projectId?: string;
}

/**
 * 하이브리드 검색 결과
 */
export interface RAGHybridSearchResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, any>;
  similarity: number;
  ftsScore: number;
  combinedScore: number;
}

/**
 * RAG 하이브리드 검색 훅
 * @description FTS + 벡터 검색을 결합한 하이브리드 검색
 */
export function useRAGHybridSearch(options: RAGHybridSearchOptions = {}) {
  const {
    ftsWeight = 0.3,
    vectorWeight = 0.7,
    matchThreshold = 0.7,
    matchCount = 5,
    projectId,
  } = options;

  const [results, setResults] = useState<RAGHybridSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  /**
   * 하이브리드 검색 실행
   */
  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. 쿼리 임베딩 생성
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
          'rag-embed',
          {
            body: { text: query },
          }
        );

        if (embeddingError) throw embeddingError;
        if (!embeddingData?.embedding) throw new Error('임베딩 생성 실패');

        const queryEmbedding = embeddingData.embedding;

        // 2. 하이브리드 검색 실행
        const { data: searchData, error: searchError } = await supabase.rpc(
          'search_rag_hybrid',
          {
            query_text: query,
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            fts_weight: ftsWeight,
            vector_weight: vectorWeight,
          }
        );

        if (searchError) throw searchError;

        // 3. 프로젝트 필터링 (선택)
        let filteredData = searchData || [];
        if (projectId) {
          filteredData = filteredData.filter(
            (item: any) => item.metadata?.project_id === projectId
          );
        }

        // 4. 결과 변환
        const transformedResults: RAGHybridSearchResult[] = filteredData.map((item: any) => ({
          id: item.id,
          documentId: item.document_id,
          content: item.content,
          chunkIndex: item.chunk_index,
          metadata: item.metadata || {},
          similarity: item.similarity,
          ftsScore: item.fts_score,
          combinedScore: item.combined_score,
        }));

        setResults(transformedResults);
      } catch (err) {
        console.error('하이브리드 검색 실패:', err);
        setError(err instanceof Error ? err : new Error('검색 실패'));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, matchThreshold, matchCount, ftsWeight, vectorWeight, projectId]
  );

  /**
   * 검색 초기화
   */
  const reset = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    reset,
  };
}
```

### 체크리스트
- [ ] useRAGHybridSearch 훅 구현
- [ ] 옵션 인터페이스 정의
- [ ] 결과 인터페이스 정의
- [ ] 임베딩 생성 통합
- [ ] 프로젝트 필터링
- [ ] TypeScript strict mode 통과
- [ ] 린트 통과

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors
```

---

## TASK-028: RAGSearchResults UI 통합

**담당**: AI 에이전트
**예상 시간**: 1시간
**우선순위**: P1
**의존성**: TASK-027 완료 후 진행

### 설명
하이브리드 검색 결과를 표시하고 가중치를 조정할 수 있는 UI를 구현합니다.

### 파일 수정

#### src/components/rag/RAGSearchResults.tsx

**추가 기능**:
1. **하이브리드 검색 토글**: 기존 벡터 검색 ↔ 하이브리드 검색
2. **가중치 슬라이더**: FTS vs 벡터 가중치 조정
3. **점수 표시**: 벡터 점수, FTS 점수, 결합 점수

**컴포넌트 수정**:
```typescript
import { useState } from 'react';
import { useRAGSearch } from '@/hooks/useRAGSearch';
import { useRAGHybridSearch } from '@/hooks/useRAGHybridSearch';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function RAGSearchResults({ query, projectId }: Props) {
  const [useHybrid, setUseHybrid] = useState(true);
  const [ftsWeight, setFtsWeight] = useState(0.3);
  const vectorWeight = 1 - ftsWeight;

  // 기존 벡터 검색
  const vectorSearch = useRAGSearch({
    projectId,
    matchThreshold: 0.7,
    matchCount: 5,
  });

  // 하이브리드 검색
  const hybridSearch = useRAGHybridSearch({
    projectId,
    ftsWeight,
    vectorWeight,
    matchThreshold: 0.7,
    matchCount: 5,
  });

  const { results, isLoading, error, search } = useHybrid ? hybridSearch : vectorSearch;

  // 검색 실행
  useEffect(() => {
    if (query) {
      search(query);
    }
  }, [query, search]);

  return (
    <div className="space-y-4">
      {/* 검색 설정 */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hybrid-search">하이브리드 검색</Label>
          <Switch
            id="hybrid-search"
            checked={useHybrid}
            onCheckedChange={setUseHybrid}
          />
        </div>

        {useHybrid && (
          <div className="space-y-2">
            <Label>FTS vs 벡터 가중치</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">FTS {Math.round(ftsWeight * 100)}%</span>
              <Slider
                value={[ftsWeight]}
                onValueChange={([value]) => setFtsWeight(value)}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">벡터 {Math.round(vectorWeight * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      {isLoading && <div>검색 중...</div>}
      {error && <div className="text-red-500">에러: {error.message}</div>}
      {results.length === 0 && !isLoading && <div>검색 결과가 없습니다.</div>}

      <div className="space-y-2">
        {results.map((result) => (
          <div key={result.id} className="border rounded-lg p-4 space-y-2">
            <p className="text-sm">{result.content}</p>

            {/* 점수 표시 */}
            {useHybrid && 'ftsScore' in result && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>벡터: {(result.similarity * 100).toFixed(1)}%</span>
                <span>FTS: {(result.ftsScore * 100).toFixed(1)}%</span>
                <span className="font-semibold">결합: {(result.combinedScore * 100).toFixed(1)}%</span>
              </div>
            )}
            {!useHybrid && (
              <div className="text-xs text-muted-foreground">
                유사도: {(result.similarity * 100).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 체크리스트
- [ ] 하이브리드 검색 토글 추가
- [ ] 가중치 슬라이더 추가
- [ ] 점수 표시 (벡터, FTS, 결합)
- [ ] 검색 모드 전환 동작 확인
- [ ] TypeScript 에러 없음
- [ ] UI/UX 검증

### 완료 조건
```bash
# 개발 서버 시작
npm run dev

# 수동 테스트
# 1. RAG 검색 페이지 접속
# 2. 검색어 입력
# 3. 하이브리드 검색 토글
# 4. 가중치 슬라이더 조정
# 5. 결과 점수 확인
```

---

## TASK-029: E2E 테스트 작성

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-028 완료 후 진행

### 설명
RAG 하이브리드 검색 E2E 테스트를 작성합니다.

### 파일 생성

#### tests/e2e/rag-hybrid-search.spec.ts
```typescript
import { test, expect } from '@playwright/test';

test.describe('RAG Hybrid Search', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 및 문서 업로드
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // 테스트 문서 업로드
    await page.goto('/rag/documents');
    await page.setInputFiles('[data-testid="file-input"]', 'tests/fixtures/test-document.txt');
    await page.click('[data-testid="upload-button"]');
    await page.waitForSelector('[data-testid="upload-success"]');
  });

  test('should return more accurate results than vector-only search', async ({ page }) => {
    await page.goto('/rag/search');

    // 벡터 검색
    await page.fill('[data-testid="search-input"]', '프로젝트 관리');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-result"]');

    const vectorResults = await page.locator('[data-testid="search-result"]').count();

    // 하이브리드 검색
    await page.click('[data-testid="hybrid-search-toggle"]');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-result"]');

    const hybridResults = await page.locator('[data-testid="search-result"]').count();

    // 하이브리드 검색이 더 많은 결과를 반환
    expect(hybridResults).toBeGreaterThanOrEqual(vectorResults);

    // 첫 번째 결과의 결합 점수 확인
    const firstResult = page.locator('[data-testid="search-result"]').first();
    const combinedScore = await firstResult.locator('[data-testid="combined-score"]').textContent();
    expect(combinedScore).toMatch(/\d+\.\d+%/);
  });

  test('should adjust weights dynamically', async ({ page }) => {
    await page.goto('/rag/search');
    await page.click('[data-testid="hybrid-search-toggle"]');

    // 초기 검색 (FTS 30%, 벡터 70%)
    await page.fill('[data-testid="search-input"]', '스크럼');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-result"]');

    const initialScore = await page
      .locator('[data-testid="search-result"]')
      .first()
      .locator('[data-testid="combined-score"]')
      .textContent();

    // 가중치 조정 (FTS 70%, 벡터 30%)
    await page.locator('[data-testid="fts-weight-slider"]').fill('0.7');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-result"]');

    const adjustedScore = await page
      .locator('[data-testid="search-result"]')
      .first()
      .locator('[data-testid="combined-score"]')
      .textContent();

    // 점수가 변경됨
    expect(adjustedScore).not.toBe(initialScore);
  });

  test('should handle Korean text properly', async ({ page }) => {
    await page.goto('/rag/search');
    await page.click('[data-testid="hybrid-search-toggle"]');

    // 한글 검색어
    const koreanQuery = '애자일 방법론';
    await page.fill('[data-testid="search-input"]', koreanQuery);
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-result"]');

    const results = await page.locator('[data-testid="search-result"]').count();
    expect(results).toBeGreaterThan(0);

    // 첫 번째 결과가 검색어를 포함하는지 확인
    const firstResult = page.locator('[data-testid="search-result"]').first();
    const content = await firstResult.locator('[data-testid="result-content"]').textContent();
    expect(content).toContain('애자일');
  });
});
```

### 체크리스트
- [ ] rag-hybrid-search.spec.ts 파일 생성
- [ ] 3개 테스트 케이스 작성
- [ ] 벡터 vs 하이브리드 비교
- [ ] 가중치 조정 검증
- [ ] 한글 검색 검증
- [ ] 테스트 실행 및 통과 확인

### 완료 조건
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/rag-hybrid-search.spec.ts

# 기대 출력:
Running 3 tests using 1 worker
  ✓ should return more accurate results than vector-only search (5.2s)
  ✓ should adjust weights dynamically (4.8s)
  ✓ should handle Korean text properly (3.5s)

3 passed (13.7s)
```

---

## Sprint 5 완료 조건

### 코드 품질
- [ ] TypeScript 에러 0개
- [ ] ESLint 경고 21개 유지

### 기능 동작
- [ ] search_rag_hybrid SQL 함수 동작
- [ ] useRAGHybridSearch 훅 동작
- [ ] 가중치 조정 UI 동작
- [ ] 정확도 향상 확인 (50% → 75%)

### 테스트
- [ ] E2E 테스트 3개 통과
- [ ] 총 테스트 309개 → 312개 (+3개)

### 문서
- [ ] CLAUDE.md 업데이트 (v2.19.0 Sprint 5 완료)
- [ ] project-todo.md 체크
- [ ] docs/guides/rag-hybrid-search.md 작성

### 빌드
```bash
# 린트 검사
npm run lint
# 기대: 21 warnings (유지)

# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 프로덕션 빌드
npm run build
# 기대: success in ~30s

# DB 마이그레이션
supabase db push
# 기대: success
```

---

## v2.19.0 전체 완료 조건

### 정량적 지표
- ✅ **린트 경고**: 36개 → 0개 (-100%)
- ✅ **TypeScript any**: 11개 → 0개 (-100%)
- ✅ **Fast Refresh 경고**: 5개 → 0개 (-100%)
- ✅ **exhaustive-deps 경고**: 10개 → 0개 (-100%)
- ✅ **E2E 테스트**: 292개 → 312개 (+20개)

### 정성적 지표
- ✅ **개발 경험**: Fast Refresh 안정화, 자동완성 개선
- ✅ **사용자 경험**: AI 위젯 전역 접근성
- ✅ **코드 품질**: 타입 안전성, 린트 규칙 준수
- ✅ **검색 정확도**: RAG 하이브리드 검색 75% 이상

### 배포 체크리스트
- [ ] 모든 Sprint 완료 (1~5)
- [ ] 빌드 성공
- [ ] E2E 테스트 통과
- [ ] Vercel 배포
- [ ] Supabase Edge Functions 배포
- [ ] DB 마이그레이션 적용
- [ ] 프로덕션 동작 확인

---

## 참고 문서
- [요구사항](../../spec/v2.19/requirements.md)
- [인수 조건](../../spec/v2.19/acceptance-criteria.md)
- [구현 전략](../../plan/v2.19/implementation-strategy.md)
- [CLAUDE.md](../../CLAUDE.md)
