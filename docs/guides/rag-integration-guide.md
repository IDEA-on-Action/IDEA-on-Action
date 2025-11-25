# RAG 통합 가이드

> v2.18.0 - Claude + RAG 통합 훅 및 UI 컴포넌트

## 개요

RAG (Retrieval-Augmented Generation) 시스템을 Claude AI 채팅에 통합하여, 사용자 질문에 대해 관련 문서를 자동으로 검색하고 컨텍스트로 제공합니다.

## 주요 기능

### 1. 통합 훅: `useClaudeChatWithRAG`

Claude 채팅에 RAG 검색 기능을 자동으로 통합한 훅입니다.

**기능**:
- 사용자 질문 → RAG 검색 → 컨텍스트 주입 → Claude 응답
- RAG 활성화/비활성화 토글
- 메시지별 RAG 컨텍스트 추적
- 검색 결과 실시간 표시

**사용 예시**:

```tsx
import { useClaudeChatWithRAG } from '@/hooks/useClaudeChatWithRAG'

function ChatWithRAG() {
  const {
    messages,
    sendMessageWithRAG,
    ragResults,
    ragEnabled,
    toggleRAG,
    isLoading,
  } = useClaudeChatWithRAG({
    ragEnabled: true,
    ragServiceId: 'minu-find',
    ragLimit: 5,
    ragThreshold: 0.7,
    maxContextTokens: 4000,
  })

  return (
    <div>
      {/* RAG 토글 버튼 */}
      <Button onClick={() => toggleRAG(!ragEnabled)}>
        RAG {ragEnabled ? '활성화됨' : '비활성화됨'}
      </Button>

      {/* 메시지 목록 */}
      {messages.map((msg) => (
        <div key={msg.id}>
          <p>{msg.content}</p>
          {msg.ragContext && (
            <div>
              <small>출처: {msg.ragContext.sources.length}개 문서</small>
            </div>
          )}
        </div>
      ))}

      {/* RAG 검색 결과 */}
      {ragResults.length > 0 && (
        <RAGSearchResults results={ragResults} />
      )}

      {/* 입력 */}
      <input
        onSubmit={(text) => sendMessageWithRAG(text)}
        disabled={isLoading}
      />
    </div>
  )
}
```

### 2. 문서 업로더: `DocumentUploader`

RAG 시스템에 문서를 추가하는 UI 컴포넌트입니다.

**기능**:
- 파일 드래그앤드롭 (`.txt`, `.md`, `.pdf`)
- URL 입력
- 수동 텍스트 입력
- 서비스 선택 (Minu Find/Frame/Build/Keep)
- 태그 관리
- 업로드 진행률 표시

**사용 예시**:

```tsx
import { DocumentUploader } from '@/components/ai/DocumentUploader'

function UploadPage() {
  return (
    <DocumentUploader
      defaultServiceId="minu-find"
      onUploadComplete={(docId) => {
        console.log('업로드 완료:', docId)
        toast.success('문서가 추가되었습니다!')
      }}
      onError={(err) => {
        console.error(err)
        toast.error(err.message)
      }}
    />
  )
}
```

### 3. 검색 결과 표시: `RAGSearchResults`

RAG 검색 결과를 보기 좋게 표시하는 컴포넌트입니다.

**기능**:
- 검색 결과 카드 목록
- 유사도 점수 표시 (퍼센트)
- 검색어 하이라이트
- 텍스트 복사 버튼
- 출처 링크
- 펼치기/접기

**사용 예시**:

```tsx
import { RAGSearchResults } from '@/components/ai/RAGSearchResults'
import { useRAGSearch } from '@/hooks/useRAGSearch'

function SearchPage() {
  const { results, search, isSearching } = useRAGSearch({
    serviceId: 'minu-find',
    limit: 10,
    threshold: 0.7,
  })

  return (
    <div>
      <input
        placeholder="검색어 입력..."
        onChange={(e) => search(e.target.value)}
      />

      <RAGSearchResults
        results={results}
        isLoading={isSearching}
        query={searchQuery}
        onResultClick={(result) => {
          console.log('클릭:', result.documentTitle)
        }}
      />
    </div>
  )
}
```

## 아키텍처

### 데이터 흐름

```
사용자 질문
    ↓
useClaudeChatWithRAG
    ↓
useRAGSearch (벡터 검색)
    ↓
Edge Function: rag/search
    ↓
Supabase pgvector (유사도 검색)
    ↓
검색 결과 (RAGSearchResult[])
    ↓
buildRAGContext (컨텍스트 빌드)
    ↓
Claude API (컨텍스트 포함 프롬프트)
    ↓
AI 응답
```

### 컨텍스트 주입 방식

`contextInjectionMode` 옵션으로 선택 가능:

1. **`prefix`**: 사용자 메시지 앞에 컨텍스트 추가
   ```
   [참고 문서]
   ... RAG 컨텍스트 ...
   ---
   사용자 질문: ...
   ```

2. **`system`**: 시스템 프롬프트에 컨텍스트 추가
   ```
   당신은 AI 어시스턴트입니다.

   ## 참고 문서
   ... RAG 컨텍스트 ...
   ```

3. **`both`** (기본값): 둘 다 사용

## API 레퍼런스

### useClaudeChatWithRAG

```typescript
interface UseClaudeChatWithRAGOptions {
  ragEnabled?: boolean              // RAG 활성화 (기본: true)
  ragServiceId?: string             // 서비스 ID 필터
  ragLimit?: number                 // 검색 결과 수 (기본: 5)
  ragThreshold?: number             // 유사도 임계값 (기본: 0.7)
  conversationId?: string           // 대화 ID
  contextInjectionMode?: 'prefix' | 'system' | 'both'  // 컨텍스트 주입 방식
  maxContextTokens?: number         // 최대 컨텍스트 토큰 (기본: 4000)

  // Claude 채팅 옵션
  systemPrompt?: string
  enableStreaming?: boolean
  // ...
}

interface UseClaudeChatWithRAGReturn {
  // 기존 채팅 기능
  messages: ClaudeMessageWithRAG[]
  isLoading: boolean
  error: Error | null

  // RAG 기능
  ragResults: RAGSearchResult[]
  isSearchingRAG: boolean
  ragEnabled: boolean

  // 메서드
  sendMessageWithRAG: (message: string) => Promise<void>
  toggleRAG: (enabled: boolean) => void
  clearMessages: () => void
  getMessageRAGContext: (messageId: string) => RAGContext | undefined
}
```

### DocumentUploader

```typescript
interface DocumentUploaderProps {
  defaultServiceId?: ServiceId      // 기본 서비스 ID
  onUploadComplete?: (documentId: string) => void
  onError?: (error: Error) => void
  className?: string
}
```

### RAGSearchResults

```typescript
interface RAGSearchResultsProps {
  results: RAGSearchResult[]        // 검색 결과
  isLoading?: boolean               // 로딩 상태
  query?: string                    // 검색어 (하이라이트용)
  onResultClick?: (result: RAGSearchResult) => void
  className?: string
  maxResults?: number               // 최대 표시 결과 수
  compact?: boolean                 // 컴팩트 모드
}
```

## 환경 변수

RAG 시스템은 다음 Edge Functions를 사용합니다:

- `rag/search` - 벡터 유사도 검색
- `rag/embed` - 문서 임베딩 생성
- `rag/upload` - 문서 업로드 (TODO)

Supabase 프로젝트에 배포 필요:

```bash
supabase functions deploy rag-search
supabase functions deploy rag-embed
```

## 데이터베이스 스키마

```sql
-- RAG 문서
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  source_type TEXT CHECK (source_type IN ('file', 'url', 'manual', 'service_data')),
  source_url TEXT,
  file_type TEXT,
  status TEXT CHECK (status IN ('active', 'archived', 'processing')),
  service_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG 임베딩 (pgvector)
CREATE TABLE rag_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,  -- OpenAI text-embedding-3-small
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 유사도 검색 인덱스
CREATE INDEX rag_embeddings_vector_idx ON rag_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 베스트 프랙티스

### 1. 검색 최적화

```tsx
// 서비스별로 검색 범위 제한
useClaudeChatWithRAG({
  ragServiceId: 'minu-build',  // Minu Build 문서만 검색
  ragThreshold: 0.75,          // 높은 유사도만 (false positive 감소)
})
```

### 2. 토큰 관리

```tsx
// 컨텍스트 토큰 제한으로 비용 최적화
useClaudeChatWithRAG({
  maxContextTokens: 2000,  // Claude 프롬프트에 2000 토큰까지만 추가
  ragLimit: 3,             // 상위 3개 결과만 사용
})
```

### 3. 에러 처리

```tsx
const { error, ragEnabled } = useClaudeChatWithRAG()

// RAG 실패 시 자동으로 일반 채팅으로 폴백
useEffect(() => {
  if (error && ragEnabled) {
    console.error('RAG 검색 실패, 일반 모드로 전환:', error)
    toggleRAG(false)
  }
}, [error])
```

## 향후 계획

- [ ] 문서 업로드 API 연동 (현재 시뮬레이션)
- [ ] 이미지 문서 OCR 지원
- [ ] 문서 자동 업데이트 (URL 주기적 크롤링)
- [ ] 다국어 임베딩 지원
- [ ] 벡터 DB 성능 모니터링

## 참고 문서

- [RAG 타입 정의](../../src/types/rag.types.ts)
- [useClaudeChat 훅](../../src/hooks/useClaudeChat.ts)
- [useRAGSearch 훅](../../src/hooks/useRAGSearch.ts)
- [Anthropic RAG 가이드](https://docs.anthropic.com/claude/docs/retrieval-augmented-generation)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
