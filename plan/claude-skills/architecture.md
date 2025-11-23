# Claude Skills 아키텍처 설계

> 생각과 행동 허브 및 Minu 시리즈를 위한 Claude Skills 시스템 아키텍처

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IDEA on Action - Claude Skills 아키텍처                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Frontend Layer                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │   Dashboard  │  │  RFP Wizard  │  │    Report Viewer         │   │   │
│  │  │  Components  │  │  Components  │  │    Components            │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘   │   │
│  │         │                 │                        │                 │   │
│  │         ▼                 ▼                        ▼                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                    Skills Integration Layer                  │    │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │    │   │
│  │  │  │  xlsx   │  │  docx   │  │  pptx   │  │ frontend-design │ │    │   │
│  │  │  │  Skill  │  │  Skill  │  │  Skill  │  │     Skill       │ │    │   │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │    │   │
│  │  └───────┼────────────┼───────────┼─────────────────┼──────────┘    │   │
│  └──────────┼────────────┼───────────┼─────────────────┼───────────────┘   │
│             │            │           │                 │                    │
│             ▼            ▼           ▼                 ▼                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Layer                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │                    MCP Orchestrator                           │    │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │    │   │
│  │  │  │  Auth Hub  │  │ Event Hub  │  │   Data Sync Service    │  │    │   │
│  │  │  └─────┬──────┘  └─────┬──────┘  └───────────┬────────────┘  │    │   │
│  │  └────────┼───────────────┼─────────────────────┼───────────────┘    │   │
│  └───────────┼───────────────┼─────────────────────┼────────────────────┘   │
│              │               │                     │                        │
│              ▼               ▼                     ▼                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Data Layer (Supabase)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │   │
│  │  │    service   │  │    service   │  │      service_health      │    │   │
│  │  │    _events   │  │    _issues   │  │       + templates        │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      External Services                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Minu Find  │  │ Minu Frame  │  │ Minu Build  │  │  Minu Keep  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 설계

### 2.1 Skills Integration Layer

Skills를 React 애플리케이션에 통합하는 계층입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skills Integration Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    useSkills (React Hook)                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │    │
│  │  │ useXlsx  │ │ useDocx  │ │ usePptx  │ │ useFrontend│  │    │
│  │  │  Export  │ │ Generate │ │ Generate │ │  Design    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SkillsProvider (Context)               │    │
│  │  - 전역 설정 관리                                         │    │
│  │  - 인증 토큰 주입                                         │    │
│  │  - 에러 핸들링 통합                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 핵심 인터페이스

```typescript
// src/types/skills.types.ts

export interface SkillsConfig {
  supabaseClient: SupabaseClient;
  userId: string;
  serviceId?: ServiceId;
  onError?: (error: SkillError) => void;
}

export interface UseXlsxExportOptions {
  filename?: string;
  dateRange?: DateRange;
  sheets?: SheetConfig[];
}

export interface UseDocxGenerateOptions {
  template: TemplateType;
  variables: Record<string, unknown>;
  outputFilename?: string;
}

export interface SkillResult<T> {
  data: T | null;
  error: SkillError | null;
  isLoading: boolean;
  progress?: number;
}
```

### 2.2 xlsx Skill 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         xlsx Skill                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   ExcelGenerator                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ SheetBuilder │  │ ChartBuilder │  │ StyleManager │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   DataFetcher                            │    │
│  │  - service_events 조회                                    │    │
│  │  - service_issues 조회                                    │    │
│  │  - service_health 조회                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   FileDownloader                         │    │
│  │  - Blob 생성                                              │    │
│  │  - 다운로드 트리거                                         │    │
│  │  - 메모리 정리                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 docx Skill 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         docx Skill                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   TemplateEngine                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │TemplateLoader│  │VariableParser│  │ ContentBuilder│   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   DocumentBuilder                        │    │
│  │  - 섹션 생성                                              │    │
│  │  - 테이블 생성                                            │    │
│  │  - 이미지 삽입                                            │    │
│  │  - 스타일 적용                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 템플릿 유형                               │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ RFP     │  │ Weekly  │  │ Monthly │  │Incident │    │    │
│  │  │Template │  │ Report  │  │ Report  │  │ Report  │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 MCP Orchestrator 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Orchestrator                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Auth Hub                            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │    │
│  │  │TokenIssuer │  │TokenVerifier│ │ RefreshHandler     │ │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Event Hub                            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │    │
│  │  │EventRouter │  │RetryHandler│  │ DeadLetterQueue    │ │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Data Sync Service                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │    │
│  │  │ SyncManager│  │CacheManager│  │ ConflictResolver   │ │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 플로우

### 3.1 Excel Export 플로우

```
사용자                UI 컴포넌트           useXlsxExport          Supabase
  │                      │                      │                     │
  │  Export 클릭         │                      │                     │
  ├─────────────────────>│                      │                     │
  │                      │  exportToExcel()     │                     │
  │                      ├─────────────────────>│                     │
  │                      │                      │  데이터 조회         │
  │                      │                      ├────────────────────>│
  │                      │                      │                     │
  │                      │                      │  데이터 반환         │
  │                      │                      │<────────────────────┤
  │                      │                      │                     │
  │                      │                      │  Excel 생성         │
  │                      │                      │  (SheetJS)          │
  │                      │                      │                     │
  │                      │  Blob URL 반환       │                     │
  │                      │<─────────────────────┤                     │
  │                      │                      │                     │
  │  파일 다운로드        │                      │                     │
  │<─────────────────────┤                      │                     │
```

### 3.2 RFP 생성 플로우

```
사용자          RFPWizard           useDocxGenerate         TemplateEngine
  │                │                      │                      │
  │  단계별 입력    │                      │                      │
  ├───────────────>│                      │                      │
  │                │                      │                      │
  │  ...반복...    │                      │                      │
  │                │                      │                      │
  │  완료 클릭     │                      │                      │
  ├───────────────>│  generateDocument()  │                      │
  │                ├─────────────────────>│                      │
  │                │                      │  loadTemplate()      │
  │                │                      ├─────────────────────>│
  │                │                      │                      │
  │                │                      │  template 반환        │
  │                │                      │<─────────────────────┤
  │                │                      │                      │
  │                │                      │  변수 치환 + 빌드     │
  │                │                      │                      │
  │                │  Blob URL 반환       │                      │
  │                │<─────────────────────┤                      │
  │  파일 다운로드  │                      │                      │
  │<───────────────┤                      │                      │
```

### 3.3 MCP 인증 플로우

```
Minu 서비스        Edge Function          Auth Hub             Supabase
     │                  │                    │                    │
     │  Webhook 요청     │                    │                    │
     ├─────────────────>│                    │                    │
     │                  │  verifySignature() │                    │
     │                  ├───────────────────>│                    │
     │                  │                    │  HMAC 검증          │
     │                  │                    │                    │
     │                  │  verified          │                    │
     │                  │<───────────────────┤                    │
     │                  │                    │                    │
     │                  │  서비스 토큰 발급   │                    │
     │                  ├───────────────────>│                    │
     │                  │                    │  JWT 생성           │
     │                  │                    │                    │
     │                  │  JWT 토큰 반환      │                    │
     │                  │<───────────────────┤                    │
     │                  │                    │                    │
     │                  │  DB에 이벤트 저장   │                    │
     │                  ├─────────────────────────────────────────>│
     │                  │                    │                    │
     │  200 OK          │                    │                    │
     │<─────────────────┤                    │                    │
```

---

## 4. 데이터베이스 스키마 확장

### 4.1 document_templates 테이블

```sql
-- 문서 템플릿 관리 테이블
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('rfp', 'weekly_report', 'monthly_report', 'incident_report', 'manual')),
  service_id TEXT CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'hub')),

  -- 템플릿 내용
  content JSONB NOT NULL, -- 템플릿 구조 정의
  variables JSONB NOT NULL DEFAULT '[]', -- 변수 목록

  -- 버전 관리
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 메타데이터
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_templates_type ON document_templates(template_type);
CREATE INDEX idx_templates_service ON document_templates(service_id);
CREATE INDEX idx_templates_active ON document_templates(is_active);

-- RLS 정책
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자 템플릿 조회"
  ON document_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "관리자만 템플릿 수정"
  ON document_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 4.2 generated_documents 테이블

```sql
-- 생성된 문서 기록 테이블
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 문서 정보
  template_id UUID REFERENCES document_templates(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('xlsx', 'docx', 'pptx', 'pdf')),
  filename TEXT NOT NULL,

  -- 생성 컨텍스트
  service_id TEXT CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'hub')),
  variables_used JSONB, -- 사용된 변수 값

  -- 파일 정보
  file_path TEXT, -- Storage 경로
  file_size_bytes BIGINT,

  -- 메타데이터
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- 인덱스
CREATE INDEX idx_documents_user ON generated_documents(created_by);
CREATE INDEX idx_documents_service ON generated_documents(service_id);
CREATE INDEX idx_documents_created ON generated_documents(created_at DESC);
CREATE INDEX idx_documents_expires ON generated_documents(expires_at);

-- RLS 정책
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자 자신의 문서만 조회"
  ON generated_documents FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "사용자 자신의 문서만 생성"
  ON generated_documents FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 만료 문서 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM generated_documents
  WHERE expires_at < now();
END;
$$;
```

### 4.3 service_tokens 테이블

```sql
-- 서비스 간 인증 토큰 테이블
CREATE TABLE service_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 토큰 정보
  service_id TEXT NOT NULL CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')),
  token_hash TEXT NOT NULL, -- SHA256 해시

  -- 권한
  permissions JSONB NOT NULL DEFAULT '[]',

  -- 유효 기간
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- 인덱스
CREATE INDEX idx_tokens_service ON service_tokens(service_id);
CREATE INDEX idx_tokens_expires ON service_tokens(expires_at);
CREATE INDEX idx_tokens_hash ON service_tokens(token_hash);

-- RLS 정책
ALTER TABLE service_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role만 토큰 관리"
  ON service_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

---

## 5. API 설계

### 5.1 Skills API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/skills/xlsx/export` | Excel 내보내기 |
| POST | `/api/skills/docx/generate` | Word 문서 생성 |
| POST | `/api/skills/pptx/generate` | PowerPoint 생성 |
| GET | `/api/templates` | 템플릿 목록 조회 |
| GET | `/api/templates/:id` | 템플릿 상세 조회 |
| GET | `/api/documents` | 생성 문서 목록 |
| GET | `/api/documents/:id/download` | 문서 다운로드 |

### 5.2 MCP API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/mcp/auth/token` | 서비스 토큰 발급 |
| POST | `/api/mcp/auth/verify` | 토큰 검증 |
| POST | `/api/mcp/auth/refresh` | 토큰 갱신 |
| POST | `/api/mcp/events/route` | 이벤트 라우팅 |
| GET | `/api/mcp/health` | 서비스 헬스 체크 |

---

## 6. 보안 설계

### 6.1 인증 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        인증 아키텍처                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    사용자 인증 (Supabase Auth)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │ OAuth2   │  │ Email/PW │  │  Magic   │              │    │
│  │  │ (Google) │  │          │  │  Link    │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    서비스 인증 (MCP)                      │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              HMAC-SHA256 서명 검증               │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                         │                                │    │
│  │                         ▼                                │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              JWT 서비스 토큰 발급                │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 권한 매트릭스

| 역할 | 템플릿 조회 | 문서 생성 | 템플릿 수정 | MCP 토큰 발급 |
|------|------------|----------|------------|--------------|
| guest | ❌ | ❌ | ❌ | ❌ |
| user | ✅ | ✅ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ | ❌ |
| service_role | ✅ | ✅ | ✅ | ✅ |

---

## 7. 기술 스택 요약

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **Frontend** | React 18 + TypeScript | 기존 스택 유지 |
| **State** | React Query (TanStack) | 서버 상태 관리 최적화 |
| **UI** | shadcn/ui + Tailwind | 기존 디자인 시스템 활용 |
| **xlsx** | SheetJS (xlsx) | 브라우저 호환, 무료 |
| **docx** | docx 라이브러리 | TypeScript 지원, 활발한 유지보수 |
| **Backend** | Supabase Edge Functions | 기존 인프라 활용 |
| **Database** | PostgreSQL (Supabase) | 기존 DB 활용 |
| **Realtime** | Supabase Realtime | 기존 Realtime 활용 |
| **Storage** | Supabase Storage | 파일 저장 통합 |

---

## 8. 확장성 고려사항

### 8.1 새 Skill 추가

1. `src/skills/` 디렉토리에 새 Skill 모듈 생성
2. `useSkills` 훅에 새 Skill 등록
3. `SkillsProvider`에 설정 추가
4. 문서 업데이트

### 8.2 새 템플릿 추가

1. `document_templates` 테이블에 레코드 추가
2. 변수 스키마 정의
3. 관리자 UI에서 활성화
4. E2E 테스트 작성

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
