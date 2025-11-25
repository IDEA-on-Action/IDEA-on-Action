# RAG 아키텍처 설계

> RAG 시스템 아키텍처 및 컴포넌트 설계

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-integration/rag/requirements.md](../../../spec/claude-integration/rag/requirements.md)

---

## 1. 시스템 아키텍처 개요

```
+===========================================================================+
|                    RAG 시스템 아키텍처                                      |
+===========================================================================+
|                                                                           |
|  +--------------------------------------------------------------------+   |
|  |                         Frontend Layer                              |   |
|  |                                                                     |   |
|  |  +------------------+  +------------------+  +------------------+   |   |
|  |  | DocumentUpload   |  | DocumentList     |  | RAGChat          |   |   |
|  |  | - 파일 업로드      |  | - 문서 관리       |  | - RAG 기반 대화   |   |   |
|  |  +--------+---------+  +--------+---------+  +--------+---------+   |   |
|  |           |                    |                       |            |   |
|  |           +--------------------+-----------------------+            |   |
|  |                                |                                    |   |
|  |                                v                                    |   |
|  |  +------------------------------------------------------------+    |   |
|  |  |                   RAG React Hooks                           |    |   |
|  |  |  - useDocumentUpload                                        |    |   |
|  |  |  - useDocumentList                                          |    |   |
|  |  |  - useRAGSearch                                             |    |   |
|  |  |  - useRAGChat                                               |    |   |
|  |  +-----------------------------+------------------------------+    |   |
|  +----------------------------------|----------------------------------+   |
|                                     |                                      |
|                                     | HTTPS                                |
|                                     v                                      |
|  +--------------------------------------------------------------------+   |
|  |                      Edge Function Layer                            |   |
|  |                                                                     |   |
|  |  +-------------------------+  +-------------------------------+    |   |
|  |  | document-processor      |  | rag-search                    |    |   |
|  |  | - 텍스트 추출            |  | - 벡터 검색                    |    |   |
|  |  | - 청킹                  |  | - 하이브리드 검색               |    |   |
|  |  | - 임베딩 생성            |  | - 결과 재순위화                |    |   |
|  |  +----------+--------------+  +---------------+---------------+    |   |
|  +-------------|--------------------------------|---------------------+   |
|                |                                |                         |
|                v                                v                         |
|  +--------------------------------------------------------------------+   |
|  |                        Database Layer (Supabase)                    |   |
|  |                                                                     |   |
|  |  +-----------------+  +---------------------+  +-----------------+  |   |
|  |  | documents       |  | document_embeddings |  | document_chunks |  |   |
|  |  | - 원본 메타데이터 |  | - 벡터 (pgvector)    |  | - 텍스트 조각   |  |   |
|  |  +-----------------+  +---------------------+  +-----------------+  |   |
|  |                                                                     |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
|  +--------------------------------------------------------------------+   |
|  |                        External Services                            |   |
|  |                                                                     |   |
|  |  +-------------------------+  +-------------------------------+    |   |
|  |  | OpenAI Embeddings API   |  | Supabase Storage              |    |   |
|  |  | - text-embedding-3-small|  | - 원본 파일 저장               |    |   |
|  |  +-------------------------+  +-------------------------------+    |   |
|  |                                                                     |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
+===========================================================================+
```

---

## 2. 컴포넌트 설계

### 2.1 문서 처리 파이프라인

```
[파일 업로드]
      ↓
[텍스트 추출] (PDF/Word/Markdown)
      ↓
[청킹] (500-1000 토큰)
      ↓
[임베딩 생성] (OpenAI API)
      ↓
[벡터 저장] (pgvector)
```

### 2.2 검색 파이프라인

```
[사용자 질문]
      ↓
[질문 임베딩 생성]
      ↓
[벡터 검색] (코사인 유사도)
      ↓
[하이브리드 검색] (키워드 + 벡터)
      ↓
[재순위화] (최신성, 중요도)
      ↓
[Top-5 결과 반환]
      ↓
[Claude 프롬프트 구성]
```

---

## 3. 데이터베이스 스키마

### 3.1 documents 테이블

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'markdown'
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'ready', 'error'
  page_count INTEGER,
  chunk_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
```

### 3.2 document_chunks 테이블

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE UNIQUE INDEX idx_chunks_unique ON document_chunks(document_id, chunk_index);
```

### 3.3 document_embeddings 테이블

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector 인덱스 (코사인 유사도)
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE UNIQUE INDEX idx_embeddings_chunk ON document_embeddings(chunk_id);
```

---

## 4. Edge Functions 설계

### 4.1 document-processor

**엔드포인트**: `POST /functions/v1/document-processor`

**기능**:
1. 파일 텍스트 추출
2. 청킹
3. OpenAI 임베딩 생성
4. DB 저장

**처리 흐름**:
```typescript
async function processDocument(file: File, userId: string) {
  // 1. Storage 업로드
  const storagePath = await uploadToStorage(file);

  // 2. DB 레코드 생성
  const document = await createDocument({
    user_id: userId,
    title: file.name,
    storage_path: storagePath,
    status: 'processing'
  });

  // 3. 텍스트 추출
  const text = await extractText(file);

  // 4. 청킹
  const chunks = chunkText(text, { size: 1000, overlap: 100 });

  // 5. 임베딩 생성 (배치)
  const embeddings = await generateEmbeddings(chunks);

  // 6. DB 저장
  await saveChunksAndEmbeddings(document.id, chunks, embeddings);

  // 7. 상태 업데이트
  await updateDocument(document.id, { status: 'ready' });
}
```

### 4.2 rag-search

**엔드포인트**: `POST /functions/v1/rag-search`

**기능**:
1. 질문 임베딩 생성
2. 벡터 검색
3. 하이브리드 검색 (옵션)
4. 재순위화

**검색 쿼리**:
```sql
-- 벡터 검색 (코사인 유사도)
SELECT
  c.id,
  c.content,
  c.page_number,
  c.section_title,
  d.title AS document_title,
  1 - (e.embedding <=> $1::vector) AS similarity
FROM document_embeddings e
JOIN document_chunks c ON e.chunk_id = c.id
JOIN documents d ON e.document_id = d.id
WHERE d.user_id = $2
  AND d.status = 'ready'
ORDER BY e.embedding <=> $1::vector
LIMIT 5;
```

---

## 5. React 훅 설계

### 5.1 useDocumentUpload

```typescript
export function useDocumentUpload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');

  const upload = async (file: File) => {
    setStatus('uploading');

    // 파일 업로드
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/functions/v1/document-processor', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` }
    });

    setStatus('processing');

    // 폴링으로 처리 상태 확인
    const documentId = await response.json();
    await pollDocumentStatus(documentId);

    setStatus('done');
  };

  return { upload, progress, status };
}
```

### 5.2 useRAGSearch

```typescript
export function useRAGSearch() {
  const search = async (query: string, options?: SearchOptions) => {
    const response = await fetch('/functions/v1/rag-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        top_k: options?.topK ?? 5,
        threshold: options?.threshold ?? 0.7,
        filters: options?.filters
      })
    });

    return response.json();
  };

  return { search };
}
```

---

## 6. 보안 설계

### 6.1 RLS 정책

```sql
-- documents 테이블
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
ON documents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
