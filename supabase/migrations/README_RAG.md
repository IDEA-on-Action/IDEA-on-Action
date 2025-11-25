# RAG (Retrieval-Augmented Generation) 시스템 마이그레이션

**버전**: 2.18.0
**작성일**: 2025-11-25
**상태**: ✅ 완료

---

## 📋 개요

IDEA on Action 프로젝트에 RAG (Retrieval-Augmented Generation) 시스템을 구현하기 위한 데이터베이스 마이그레이션입니다.

### 핵심 기능

1. **문서 관리**: 다양한 소스의 문서를 저장하고 관리
2. **임베딩 벡터 저장**: pgvector를 사용한 벡터 임베딩 저장
3. **유사도 검색**: 코사인 유사도 기반 벡터 검색
4. **하이브리드 검색**: 벡터 검색 + 전체 텍스트 검색 결합
5. **컨텍스트 생성**: AI 프롬프트용 컨텍스트 자동 생성

---

## 📁 마이그레이션 파일

### 1. `20251125200000_create_rag_documents.sql`

**테이블**: `rag_documents`

문서 원본 관리 및 메타데이터 저장

**주요 컬럼**:
- `id`: 문서 UUID
- `user_id`: 소유자 (auth.users 외래키)
- `title`, `content`: 제목 및 전체 내용
- `source_type`: `file`, `url`, `manual`, `service_data`
- `service_id`: `minu-find`, `minu-frame`, `minu-build`, `minu-keep`
- `project_id`: 프로젝트 연결 (projects 외래키)
- `status`: `active`, `archived`, `processing`
- `embedding_status`: `pending`, `processing`, `completed`, `failed`
- `chunk_count`: 생성된 청크 수 (자동 계산)
- `is_public`: 공개 문서 여부
- `tags`, `category`, `metadata`: 분류 및 추가 정보

**생성된 것들**:
- ✅ 인덱스 19개 (Full-Text Search, GIN 포함)
- ✅ RLS 정책 10개 (사용자/관리자/서비스 역할)
- ✅ 트리거 1개 (`updated_at` 자동 업데이트)
- ✅ 유틸리티 함수 3개:
  - `search_rag_documents()`: 문서 전체 텍스트 검색
  - `get_pending_documents()`: 임베딩 대기 문서 조회
  - `get_document_stats()`: 문서 통계 조회

---

### 2. `20251125200001_create_rag_embeddings.sql`

**테이블**: `rag_embeddings`

문서 청크 임베딩 벡터 저장 및 관리

**주요 컬럼**:
- `id`: 임베딩 UUID
- `document_id`: 문서 ID (CASCADE DELETE)
- `chunk_index`: 청크 순서 (0부터)
- `chunk_text`: 청크 텍스트 내용
- `embedding`: 벡터 (1536차원, OpenAI text-embedding-3-small)
- `token_count`: 청크 토큰 수
- `metadata`: 청크별 메타데이터

**생성된 것들**:
- ✅ 인덱스 6개 (IVFFlat 벡터 인덱스 포함)
- ✅ **IVFFlat 인덱스**: 코사인 유사도 검색 최적화 (lists=100)
- ✅ RLS 정책 8개 (문서 소유권 기반)
- ✅ 트리거 2개:
  - `update_document_chunk_count_on_insert()`: 청크 추가 시 카운트 증가
  - `update_document_chunk_count_on_delete()`: 청크 삭제 시 카운트 감소
- ✅ 유틸리티 함수 2개:
  - `get_document_chunks()`: 문서의 모든 청크 조회
  - `get_embedding_stats()`: 임베딩 통계 조회

---

### 3. `20251125200002_create_rag_search_function.sql`

**검색 함수**: RAG 핵심 검색 로직

**생성된 함수들**:

#### 1) `search_rag_embeddings()`
벡터 유사도 기반 RAG 검색

**파라미터**:
- `query_embedding`: 쿼리 임베딩 벡터 (1536차원)
- `match_threshold`: 유사도 임계값 (기본 0.7)
- `match_count`: 반환할 청크 수 (기본 5)
- `filter_service_id`: 서비스 필터
- `filter_user_id`: 사용자 필터
- `filter_project_id`: 프로젝트 필터
- `include_public`: 공개 문서 포함 여부

**반환**:
- 청크 정보 (id, document_id, chunk_text)
- 유사도 점수 (코사인 유사도)
- 메타데이터 (문서 정보, 소스 정보)

#### 2) `hybrid_search_rag()`
벡터 + 전체 텍스트 하이브리드 검색

**추가 파라미터**:
- `query_text`: 전체 텍스트 검색용 쿼리
- `vector_weight`: 벡터 검색 가중치 (기본 0.7)
- `text_weight`: 텍스트 검색 가중치 (기본 0.3)

**반환**:
- 벡터 유사도 + 텍스트 랭크 결합 점수
- 각 점수 개별 표시

#### 3) `get_context_for_prompt()`
AI 프롬프트용 컨텍스트 자동 생성

**파라미터**:
- `max_tokens`: 최대 토큰 수 (기본 3000)
- 나머지는 `search_rag_embeddings()`와 동일

**반환**:
- `context`: 포매팅된 컨텍스트 텍스트
- `sources`: 소스 정보 JSON 배열
- `total_chunks`: 포함된 청크 수
- `total_tokens`: 총 토큰 수

#### 4) `find_similar_documents()`
특정 문서와 유사한 다른 문서 찾기

**파라미터**:
- `p_document_id`: 기준 문서 ID
- 나머지는 검색 옵션

**반환**:
- 유사 문서 목록 (평균 유사도 순)
- 매칭된 청크 수

#### 5) `get_search_performance_stats()`
검색 성능 통계 조회

**반환**:
- 인덱스 크기, 스캔 횟수
- 캐시 히트 비율

**생성된 것들**:
- ✅ 검색 함수 4개
- ✅ 통계 함수 1개
- ✅ 통계 뷰 1개 (`rag_index_stats`)

---

## 🔒 보안 (RLS)

### 문서 접근 규칙 (`rag_documents`)

| 역할 | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **인증된 사용자** | 본인 + 공개 문서 | 본인만 | 본인만 | 본인만 |
| **익명 사용자** | 공개 문서만 | ❌ | ❌ | ❌ |
| **관리자** | 전체 | ✅ | 전체 | 전체 |
| **서비스 역할** | 전체 | 전체 | 전체 | 전체 |

### 임베딩 접근 규칙 (`rag_embeddings`)

| 역할 | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **인증된 사용자** | 본인 문서 + 공개 문서 | 본인 문서만 | 본인 문서만 | 본인 문서만 |
| **익명 사용자** | 공개 문서만 | ❌ | ❌ | ❌ |
| **관리자** | 전체 | ✅ | ✅ | 전체 |
| **서비스 역할** | 전체 | 전체 | 전체 | 전체 |

---

## 🔍 사용 예시

### 1. 벡터 검색

```sql
SELECT * FROM search_rag_embeddings(
  query_embedding := '[0.1, 0.2, ..., 0.9]'::vector(1536),
  match_threshold := 0.75,
  match_count := 5,
  filter_service_id := 'minu-frame',
  filter_user_id := '123e4567-e89b-12d3-a456-426614174000'::uuid
);
```

### 2. 하이브리드 검색

```sql
SELECT * FROM hybrid_search_rag(
  query_embedding := '[0.1, 0.2, ..., 0.9]'::vector(1536),
  query_text := 'RFP 작성 방법',
  match_threshold := 0.7,
  match_count := 10,
  filter_service_id := 'minu-frame',
  vector_weight := 0.6,
  text_weight := 0.4
);
```

### 3. 프롬프트 컨텍스트 생성

```sql
SELECT * FROM get_context_for_prompt(
  query_embedding := '[0.1, 0.2, ..., 0.9]'::vector(1536),
  match_threshold := 0.75,
  match_count := 3,
  filter_service_id := 'minu-build',
  max_tokens := 2000
);
```

### 4. 유사 문서 찾기

```sql
SELECT * FROM find_similar_documents(
  p_document_id := '123e4567-e89b-12d3-a456-426614174000'::uuid,
  match_threshold := 0.8,
  match_count := 5
);
```

---

## 📊 인덱스 최적화

### IVFFlat 인덱스 튜닝

현재 설정: `lists = 100`

**권장 사항**:
- **벡터 수 < 10,000**: lists = 100 (현재 설정)
- **벡터 수 10,000~100,000**: lists = 300~500
- **벡터 수 > 100,000**: lists = sqrt(벡터 수)

**인덱스 재생성 예시**:
```sql
DROP INDEX IF EXISTS idx_rag_embeddings_vector;

CREATE INDEX idx_rag_embeddings_vector
  ON public.rag_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);
```

### 검색 성능 모니터링

```sql
-- 인덱스 사용 통계
SELECT * FROM rag_index_stats;

-- 검색 성능 통계
SELECT * FROM get_search_performance_stats();
```

---

## 🚀 배포 순서

### 1. 마이그레이션 실행 (순서 중요!)

```bash
# 1단계: 문서 테이블 생성
psql -d your_database -f 20251125200000_create_rag_documents.sql

# 2단계: 임베딩 테이블 생성
psql -d your_database -f 20251125200001_create_rag_embeddings.sql

# 3단계: 검색 함수 생성
psql -d your_database -f 20251125200002_create_rag_search_function.sql
```

### 2. Supabase 프로젝트 적용

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase Dashboard에서 수동 실행
# Settings > Database > SQL Editor
```

---

## ⚙️ Edge Function 통합

### Edge Function 구현 필요

**`/supabase/functions/rag-embed/index.ts`**:
- 문서 임베딩 생성 (OpenAI API)
- 청크 분할 (tiktoken)
- `rag_embeddings` 테이블에 저장
- `embedding_status` 업데이트

**`/supabase/functions/rag-search/index.ts`**:
- 쿼리 임베딩 생성
- `search_rag_embeddings()` 호출
- 결과 포매팅 및 반환

**`/supabase/functions/rag-chat/index.ts`**:
- `get_context_for_prompt()` 호출
- Claude API에 컨텍스트 + 쿼리 전송
- 스트리밍 응답 반환

---

## 🧪 테스트

### 1. 테이블 생성 확인

```sql
-- 테이블 존재 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rag_documents', 'rag_embeddings');

-- 인덱스 확인
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('rag_documents', 'rag_embeddings');
```

### 2. RLS 정책 확인

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rag_documents', 'rag_embeddings');
```

### 3. 함수 확인

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%rag%'
OR routine_name LIKE '%search%'
ORDER BY routine_name;
```

---

## 📦 의존성

### PostgreSQL 확장

- ✅ **pgvector**: 벡터 연산 및 유사도 검색
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

### 외부 서비스

- **OpenAI API**: 임베딩 생성 (`text-embedding-3-small`, 1536차원)
- **tiktoken**: 토큰 카운팅 (Edge Function에서 사용)

---

## 📈 향후 개선 사항

### Phase 2 (선택 사항)

1. **HNSW 인덱스**: IVFFlat 대신 더 빠른 검색
   ```sql
   CREATE INDEX ON rag_embeddings USING hnsw (embedding vector_cosine_ops);
   ```

2. **Reranking**: 검색 결과 재순위화 (Cohere Rerank API)

3. **Hybrid Fusion**: RRF (Reciprocal Rank Fusion) 적용

4. **벡터 압축**: Product Quantization (PQ) 적용

5. **캐싱**: Redis를 사용한 검색 결과 캐싱

---

## 🐛 트러블슈팅

### 문제 1: IVFFlat 인덱스가 사용되지 않음

**원인**: 데이터 수가 너무 적음 (< 1000개)

**해결**:
```sql
-- Sequential Scan 강제 비활성화 (테스트용)
SET enable_seqscan = off;

-- 또는 데이터 충분히 추가 후 VACUUM ANALYZE
VACUUM ANALYZE rag_embeddings;
```

### 문제 2: 검색 속도가 느림

**원인**: lists 파라미터가 부적절

**해결**:
```sql
-- 통계 확인
SELECT COUNT(*) FROM rag_embeddings;

-- lists 재계산: sqrt(벡터 수)
-- 예: 10,000개 → lists = 100
-- 예: 100,000개 → lists = 316
```

### 문제 3: RLS 정책 위반 에러

**원인**: 사용자 권한 부족

**해결**:
```sql
-- 서비스 역할로 실행 (Edge Function)
-- 또는 관리자 권한 확인
SELECT * FROM public.admins WHERE user_id = auth.uid();
```

---

## 📞 문의

문제가 발생하거나 질문이 있으시면:
- **GitHub Issues**: [IDEA-on-Action/idea-on-action](https://github.com/IDEA-on-Action/idea-on-action/issues)
- **이메일**: sinclairseo@gmail.com

---

**작성자**: Claude AI
**최종 수정일**: 2025-11-25
**버전**: 2.18.0
