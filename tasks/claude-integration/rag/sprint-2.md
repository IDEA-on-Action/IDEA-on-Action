# Sprint 2: RAG 검색 및 Claude 통합

> 벡터 검색 및 Claude 프롬프트 통합

**시작일**: 2025-11-28 (예정)
**예상 소요**: 10시간 (1.5일)
**관련 명세**: [spec/claude-integration/rag/requirements.md](../../../spec/claude-integration/rag/requirements.md)
**선행 조건**: RAG Sprint 1 완료

---

## 목표

1. 벡터 검색 Edge Function 구현
2. 하이브리드 검색 (벡터 + 키워드)
3. 검색 결과 재순위화
4. Claude 프롬프트 컨텍스트 주입
5. 문서 관리 UI
6. RAG 채팅 UI
7. E2E 테스트

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-RAG-009 │  │ TASK-RAG-010 │  │ TASK-RAG-011 │       │
│  │ Vector Search│  │ Hybrid Search│  │ Re-ranking   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (4h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-RAG-012 │  │ TASK-RAG-013 │  │ TASK-RAG-014 │       │
│  │ Claude 통합   │  │ Document UI  │  │ RAG Chat UI  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Agent 1      │  │ Agent 2      │                         │
│  │ TASK-RAG-015 │  │ TASK-RAG-016 │                         │
│  │ E2E Tests    │  │ 성능 최적화   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 작업 목록

### TASK-RAG-009: 벡터 검색 Edge Function

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-RAG-006
**담당**: Agent 1 (Phase 1)

**작업 내용**: (요약)

```typescript
// supabase/functions/rag-search/index.ts

async function vectorSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  // 1. 쿼리 임베딩 생성
  const queryEmbedding = await generateEmbedding(query);

  // 2. 벡터 검색
  const { data, error } = await supabase.rpc('vector_search', {
    query_embedding: queryEmbedding,
    match_count: options.top_k || 5,
    similarity_threshold: options.threshold || 0.7,
    user_id: userId
  });

  return data;
}
```

**완료 조건**:
- [ ] rag-search Edge Function 구현
- [ ] 벡터 검색 SQL 함수
- [ ] 유사도 임계값 필터링
- [ ] 통합 테스트 5개

---

### TASK-RAG-010: 하이브리드 검색

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: TASK-RAG-009
**담당**: Agent 2 (Phase 1)

**작업 내용**: (요약)

```sql
-- 하이브리드 검색 함수
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  alpha FLOAT DEFAULT 0.7,
  top_k INT DEFAULT 5,
  user_id_param UUID
)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    -- 벡터 검색
    ...
  ),
  keyword_results AS (
    -- 키워드 검색 (Full-Text Search)
    ...
  )
  SELECT
    ...,
    (alpha * v.vector_score + (1 - alpha) * k.keyword_score) AS hybrid_score
  FROM vector_results v
  FULL OUTER JOIN keyword_results k ON v.chunk_id = k.chunk_id
  ORDER BY hybrid_score DESC
  LIMIT top_k;
END;
$$ LANGUAGE plpgsql;
```

**완료 조건**:
- [ ] 하이브리드 검색 SQL 함수
- [ ] 가중치 조정 가능
- [ ] 성능 테스트

---

### TASK-RAG-012: Claude 컨텍스트 주입

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-RAG-009
**담당**: Agent 1 (Phase 2)

**작업 내용**: (요약)

```typescript
// src/hooks/useRAGChat.ts

export function useRAGChat() {
  const { search } = useRAGSearch();
  const { sendMessage, messages } = useClaudeChat();

  const sendRAGMessage = async (userMessage: string) => {
    // 1. RAG 검색
    const searchResults = await search(userMessage, { top_k: 5 });

    // 2. 컨텍스트 주입
    const context = searchResults
      .map((r, i) => `
## 참고 문서 ${i + 1}
출처: ${r.document_title}${r.page_number ? ` (페이지 ${r.page_number})` : ''}
내용: ${r.content}
      `.trim())
      .join('\n\n');

    const prompt = `
아래 참고 문서를 기반으로 답변하세요.

${context}

사용자 질문: ${userMessage}

답변 시 출처를 명시하세요.
    `.trim();

    // 3. Claude에게 전송
    await sendMessage(prompt);
  };

  return { messages, sendRAGMessage };
}
```

**완료 조건**:
- [ ] useRAGChat 훅 구현
- [ ] 컨텍스트 주입 로직
- [ ] 출처 표시
- [ ] 통합 테스트

---

### TASK-RAG-013 ~ TASK-RAG-016

(나머지 작업들은 동일한 패턴)

- **TASK-RAG-013**: 문서 관리 UI (업로드/목록/삭제)
- **TASK-RAG-014**: RAG 채팅 UI
- **TASK-RAG-015**: E2E 테스트 15개
- **TASK-RAG-016**: 성능 최적화 (인덱스 튜닝)

---

## 완료 조건

- [ ] 벡터 검색 구현
- [ ] 하이브리드 검색 구현
- [ ] Claude 통합 완료
- [ ] 문서 관리 UI 완성
- [ ] RAG 채팅 UI 완성
- [ ] E2E 테스트 통과
- [ ] 성능 목표 달성 (검색 < 500ms)
- [ ] 빌드 성공

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
