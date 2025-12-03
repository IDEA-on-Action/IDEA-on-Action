# RAG 검색 UI 컴포넌트

Sprint 1에서 구축한 RAG 시스템을 활용하는 검색 UI 컴포넌트 모음입니다.

## 컴포넌트

### 1. RAGSearchBar

검색어 입력 및 검색 모드 선택

**Props:**
- `value?: string` - 검색어 (제어 컴포넌트)
- `onChange?: (value: string) => void` - 검색어 변경 핸들러
- `onSearch: (query: string, mode: RAGSearchMode) => void` - 검색 실행 핸들러
- `defaultMode?: RAGSearchMode` - 검색 모드 (기본: 'hybrid')
- `isSearching?: boolean` - 검색 중 여부
- `placeholder?: string` - 플레이스홀더
- `debounceMs?: number` - 디바운스 시간 (기본: 300ms)
- `minLength?: number` - 최소 검색 길이 (기본: 2)
- `autoFocus?: boolean` - 자동 포커스
- `className?: string` - 추가 클래스

**검색 모드:**
- `keyword` - 키워드 전문 검색
- `hybrid` - 키워드 + 의미론적 하이브리드 (기본)
- `semantic` - 의미론적 벡터 검색

**예제:**
```tsx
import { RAGSearchBar } from '@/components/search';

function MyComponent() {
  const handleSearch = (query: string, mode: RAGSearchMode) => {
    console.log(`Searching for "${query}" with mode ${mode}`);
  };

  return (
    <RAGSearchBar
      onSearch={handleSearch}
      defaultMode="hybrid"
      placeholder="검색어를 입력하세요"
      debounceMs={300}
    />
  );
}
```

### 2. RAGSearchResult

검색 결과 카드 표시

**Props:**
- `result: RAGSearchResult` - 검색 결과 데이터
- `searchQuery: string` - 검색어 (하이라이팅용)
- `onClick?: (result: RAGSearchResult) => void` - 클릭 핸들러

**기능:**
- 문서 제목 및 청크 내용 표시
- 관련성 점수 시각화 (프로그레스 바)
- 검색어 하이라이팅
- 소스 타입 배지 (파일, URL, 수동, 서비스)
- 서비스 ID 표시
- 소스 URL 링크
- 메타데이터 표시 (접을 수 있음)

**예제:**
```tsx
import { RAGSearchResult } from '@/components/search';

function SearchResults({ results, query }) {
  return (
    <div className="space-y-4">
      {results.map((result) => (
        <RAGSearchResult
          key={result.documentId}
          result={result}
          searchQuery={query}
          onClick={(r) => console.log('Clicked:', r.documentTitle)}
        />
      ))}
    </div>
  );
}
```

### 3. RAGSearchFilters

검색 필터 (소스 타입, 서비스 ID, 최소 점수)

**Props:**
- `onChange: (filters: RAGSearchFilterOptions) => void` - 필터 변경 핸들러
- `defaultFilters?: Partial<RAGSearchFilterOptions>` - 기본 필터
- `className?: string` - 추가 클래스

**필터 옵션:**
```typescript
interface RAGSearchFilterOptions {
  sourceTypes: RAGSourceType[];      // ['file', 'url', 'manual', 'service_data']
  serviceIds: MinuServiceId[];        // ['minu-find', 'minu-frame', 'minu-build', 'minu-keep']
  minSimilarity: number;              // 0.5 ~ 1.0
}
```

**예제:**
```tsx
import { RAGSearchFilters } from '@/components/search';

function MyComponent() {
  const handleFilterChange = (filters) => {
    console.log('Filters changed:', filters);
  };

  return (
    <RAGSearchFilters
      onChange={handleFilterChange}
      defaultFilters={{
        sourceTypes: ['file'],
        minSimilarity: 0.7,
      }}
    />
  );
}
```

## 통합 예제

```tsx
import { useState } from 'react';
import { useRAGHybridSearch } from '@/hooks/useRAGHybridSearch';
import {
  RAGSearchBar,
  RAGSearchResult,
  RAGSearchFilters,
  type RAGSearchMode,
  type RAGSearchFilterOptions,
} from '@/components/search';

export function RAGSearchPage() {
  const [filters, setFilters] = useState<RAGSearchFilterOptions>({
    sourceTypes: [],
    serviceIds: [],
    minSimilarity: 0.7,
  });

  const { results, isSearching, search } = useRAGHybridSearch();

  const handleSearch = async (query: string, mode: RAGSearchMode) => {
    // 모드에 따라 가중치 조정
    const options = {
      keywordWeight: mode === 'keyword' ? 1.0 : mode === 'semantic' ? 0.0 : 0.3,
      vectorWeight: mode === 'keyword' ? 0.0 : mode === 'semantic' ? 1.0 : 0.7,
      minVectorScore: filters.minSimilarity,
    };

    await search(query, options);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 검색 바 */}
      <RAGSearchBar
        onSearch={handleSearch}
        isSearching={isSearching}
        autoFocus
      />

      {/* 필터 */}
      <div className="flex justify-end">
        <RAGSearchFilters
          onChange={setFilters}
          defaultFilters={filters}
        />
      </div>

      {/* 검색 결과 */}
      <div className="space-y-4">
        {results.map((result) => (
          <RAGSearchResult
            key={`${result.documentId}-${result.chunkIndex}`}
            result={result}
            searchQuery=""
          />
        ))}
      </div>

      {/* 결과 없음 */}
      {!isSearching && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}
```

## 테스트

```bash
npm test -- tests/unit/components/RAGSearch.test.tsx
```

**테스트 커버리지:**
- RAGSearchBar: 7개 테스트
- RAGSearchResult: 8개 테스트
- RAGSearchFilters: 5개 테스트
- **총 20개 테스트 (모두 통과)**

## 기술 스택

- React 18 + TypeScript
- shadcn/ui (Input, Button, Select, Checkbox, Slider, Card, Badge)
- Lucide Icons
- React Query (훅 내부)
- Tailwind CSS

## 관련 파일

- `src/hooks/useRAGSearch.ts` - 의미론적 검색 훅
- `src/hooks/useRAGHybridSearch.ts` - 하이브리드 검색 훅
- `src/lib/rag/index.ts` - RAG 유틸리티 (청킹, 점수 계산, 하이라이팅)
- `src/types/rag.types.ts` - RAG 타입 정의
