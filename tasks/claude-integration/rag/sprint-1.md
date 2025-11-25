# Sprint 1: RAG 기반 인프라 구축

> 문서 처리 및 임베딩 생성 파이프라인 구축

**시작일**: 2025-11-26 (예정)
**예상 소요**: 12시간 (1.5일)
**관련 명세**: [spec/claude-integration/rag/requirements.md](../../../spec/claude-integration/rag/requirements.md)
**관련 설계**: [plan/claude-integration/rag/architecture.md](../../../plan/claude-integration/rag/architecture.md)
**선행 조건**: Claude Integration Sprint 2 완료 ✅

---

## 목표

1. pgvector 설정 및 DB 마이그레이션
2. 문서 처리 Edge Function 구현
3. 텍스트 추출 (PDF/Word/Markdown)
4. 텍스트 청킹 로직
5. OpenAI 임베딩 생성
6. 벡터 저장 및 인덱싱
7. TypeScript 타입 정의

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-RAG-001 │  │ TASK-RAG-002 │  │ TASK-RAG-003 │       │
│  │ DB Migration │  │ TypeScript   │  │ Text Extract │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (5h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-RAG-004 │  │ TASK-RAG-005 │  │ TASK-RAG-006 │       │
│  │ Chunking     │  │ Embeddings   │  │ Edge Function│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (4h)                            │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Agent 1      │  │ Agent 2      │                         │
│  │ TASK-RAG-007 │  │ TASK-RAG-008 │                         │
│  │ React Hooks  │  │ E2E Tests    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 작업 목록

### TASK-RAG-001: pgvector 설정 및 DB 마이그레이션

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 1 (Phase 1)

**작업 내용**:

```sql
-- 마이그레이션 파일: 20251126000000_create_rag_schema.sql

-- pgvector 확장 설치
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 테이블
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'markdown', 'txt')),
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  page_count INTEGER,
  chunk_count INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 문서 청크 테이블
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 임베딩 테이블
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE UNIQUE INDEX idx_chunks_unique ON document_chunks(document_id, chunk_index);

CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE UNIQUE INDEX idx_embeddings_chunk ON document_embeddings(chunk_id);

-- pgvector 인덱스 (IVFFlat)
CREATE INDEX idx_embeddings_vector ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RLS 정책
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can read own chunks"
ON document_chunks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_chunks.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read own embeddings"
ON document_embeddings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_embeddings.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Service role은 모든 작업 가능
CREATE POLICY "Service can manage all documents"
ON documents FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service can manage all chunks"
ON document_chunks FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service can manage all embeddings"
ON document_embeddings FOR ALL
TO service_role
USING (true);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] pgvector 확장 설치
- [ ] 3개 테이블 생성
- [ ] 인덱스 및 RLS 정책 설정
- [ ] 로컬 DB에서 마이그레이션 테스트

---

### TASK-RAG-002: TypeScript 타입 정의

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 2 (Phase 1)

**작업 내용**: (요약)

```typescript
// src/types/rag.types.ts

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'markdown' | 'txt';
  file_size: number;
  storage_path: string;
  status: 'processing' | 'ready' | 'error';
  page_count?: number;
  chunk_count?: number;
  error_message?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  page_number?: number;
  section_title?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentEmbedding {
  id: string;
  chunk_id: string;
  document_id: string;
  embedding: number[];
  created_at: string;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  page_number?: number;
  section_title?: string;
  similarity: number;
}

export interface ChunkOptions {
  size: number;
  overlap: number;
  minSize?: number;
  maxSize?: number;
}

export interface SearchOptions {
  top_k?: number;
  threshold?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  document_ids?: string[];
  file_types?: string[];
  date_range?: { start: string; end: string };
}
```

**완료 조건**:
- [ ] rag.types.ts 파일 생성
- [ ] 20+ 타입 정의
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-RAG-003: 텍스트 추출 라이브러리

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 3 (Phase 1)

**작업 내용**: (요약)

```typescript
// src/lib/rag/text-extractor.ts

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(
  fileBuffer: ArrayBuffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractPdfText(fileBuffer);
    case 'docx':
      return extractWordText(fileBuffer);
    case 'markdown':
    case 'txt':
      return new TextDecoder().decode(fileBuffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}

async function extractWordText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
```

**완료 조건**:
- [ ] text-extractor.ts 구현
- [ ] PDF/Word/Markdown 지원
- [ ] 에러 핸들링
- [ ] 단위 테스트 5개

---

### TASK-RAG-004 ~ TASK-RAG-008

(나머지 작업들은 동일한 패턴으로 작성되며, 핵심 내용만 포함)

- **TASK-RAG-004**: 청킹 로직 구현
- **TASK-RAG-005**: OpenAI 임베딩 생성
- **TASK-RAG-006**: Edge Function 구현
- **TASK-RAG-007**: React 훅 구현
- **TASK-RAG-008**: E2E 테스트 12개

---

## 완료 조건

- [ ] pgvector 설정 완료
- [ ] 문서 처리 Edge Function 배포
- [ ] 텍스트 추출 구현
- [ ] 청킹 로직 구현
- [ ] 임베딩 생성 구현
- [ ] TypeScript 타입 정의 완료
- [ ] React 훅 구현
- [ ] E2E 테스트 통과
- [ ] 빌드 성공

---

## 다음 Sprint

[Sprint 2: RAG 검색 및 통합](sprint-2.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
