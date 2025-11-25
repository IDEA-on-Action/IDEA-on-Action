# RAG 기술 스택

> RAG 구현을 위한 기술 선택 및 라이브러리

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Draft
**관련 설계**: [architecture.md](architecture.md)

---

## 1. 기술 스택 개요

```
RAG 기술 스택
├── Vector Database
│   └── pgvector (PostgreSQL 확장)
│
├── Embeddings
│   └── OpenAI text-embedding-3-small
│
├── Text Processing
│   ├── pdf-parse (PDF 텍스트 추출)
│   ├── mammoth (Word 텍스트 추출)
│   └── marked (Markdown 파싱)
│
├── Backend
│   ├── Supabase Edge Functions (Deno)
│   └── Supabase Storage (파일 저장)
│
└── Frontend
    ├── React Hooks (상태 관리)
    └── React Query (서버 상태)
```

---

## 2. pgvector 사용법

### 2.1 설치 및 설정

```sql
-- pgvector 확장 설치
CREATE EXTENSION IF NOT EXISTS vector;

-- 벡터 컬럼 생성
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding VECTOR(1536) NOT NULL
);

-- 인덱스 생성 (IVFFlat)
CREATE INDEX ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 2.2 벡터 검색 쿼리

```sql
-- 코사인 유사도 검색
SELECT
  id,
  1 - (embedding <=> $1::vector) AS similarity
FROM document_embeddings
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- 유클리디안 거리
SELECT
  id,
  embedding <-> $1::vector AS distance
FROM document_embeddings
ORDER BY embedding <-> $1::vector
LIMIT 5;

-- 내적 (Dot Product)
SELECT
  id,
  (embedding <#> $1::vector) * -1 AS score
FROM document_embeddings
ORDER BY embedding <#> $1::vector
LIMIT 5;
```

---

## 3. OpenAI Embeddings API

### 3.1 API 호출 예시

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}
```

### 3.2 배치 처리

```typescript
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // 최대 2048개까지 배치 처리 가능
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map(d => d.embedding);
}
```

---

## 4. 텍스트 추출 라이브러리

### 4.1 PDF 텍스트 추출 (pdf-parse)

```typescript
import pdfParse from 'pdf-parse';

async function extractPdfText(fileBuffer: ArrayBuffer): Promise<string> {
  const data = await pdfParse(fileBuffer);
  return data.text;
}
```

### 4.2 Word 텍스트 추출 (mammoth)

```typescript
import mammoth from 'mammoth';

async function extractWordText(fileBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
  return result.value;
}
```

---

## 5. 텍스트 청킹

### 5.1 청킹 함수

```typescript
interface ChunkOptions {
  size: number;
  overlap: number;
}

function chunkText(text: string, options: ChunkOptions): string[] {
  const { size, overlap } = options;
  const chunks: string[] = [];

  // 문단 단위로 분리
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (currentTokens + paragraphTokens > size && currentChunk) {
      chunks.push(currentChunk.trim());

      // 오버랩 적용
      const overlapText = getLastNTokens(currentChunk, overlap);
      currentChunk = overlapText + ' ' + paragraph;
      currentTokens = overlap + paragraphTokens;
    } else {
      currentChunk += ' ' + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function estimateTokens(text: string): number {
  // 간단한 토큰 추정 (영어: ~4자/토큰, 한글: ~2자/토큰)
  return Math.ceil(text.length / 3);
}
```

---

## 6. React 훅 구현

### 6.1 useRAGChat

```typescript
import { useState } from 'react';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { useRAGSearch } from '@/hooks/useRAGSearch';

export function useRAGChat() {
  const { search } = useRAGSearch();
  const { sendMessage, messages, isLoading } = useClaudeChat();

  const sendRAGMessage = async (userMessage: string) => {
    // 1. RAG 검색
    const searchResults = await search(userMessage);

    // 2. 컨텍스트 주입 프롬프트 구성
    const context = searchResults
      .map((r, i) => `## 참고 문서 ${i + 1}\n출처: ${r.document_title} (페이지 ${r.page_number})\n${r.content}`)
      .join('\n\n');

    const enhancedPrompt = `
아래 참고 문서를 기반으로 답변하세요.

${context}

사용자 질문: ${userMessage}

답변 시 출처를 명시하세요.
    `.trim();

    // 3. Claude에게 전송
    await sendMessage(enhancedPrompt);
  };

  return {
    messages,
    sendMessage: sendRAGMessage,
    isLoading,
  };
}
```

---

## 7. 의존성 목록

### 7.1 프로덕션 의존성

| 패키지 | 버전 | 용도 | 번들 크기 |
|--------|------|------|----------|
| 없음 (서버 사이드만) | - | - | - |

### 7.2 Edge Function 의존성

| 패키지 | 버전 | 소스 |
|--------|------|------|
| openai | ^4.0.0 | npm: |
| pdf-parse | ^1.1.1 | npm: |
| mammoth | ^1.6.0 | npm: |
| @supabase/supabase-js | ^2.x | esm.sh |

---

## 8. 환경 변수

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Supabase (자동 설정)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
