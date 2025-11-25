# 프롬프트 템플릿 관리 시스템 아키텍처

> Claude AI 통합을 위한 재사용 가능한 프롬프트 템플릿 관리 시스템

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-integration/requirements.md](../../../spec/claude-integration/requirements.md)
**관련 스프린트**: [tasks/claude-integration/sprint-3.md](../../../tasks/claude-integration/sprint-3.md)

---

## 1. 시스템 개요

프롬프트 템플릿 시스템은 Claude AI 통합에서 반복적으로 사용되는 프롬프트를 체계적으로 관리하고, 팀원 간 공유 및 버전 관리를 지원합니다.

### 핵심 기능

1. **템플릿 생성 및 편집**: 사용자 정의 프롬프트 템플릿 작성
2. **변수 치환**: 동적 프롬프트 생성 (예: `{{projectName}}`, `{{deadline}}`)
3. **카테고리 관리**: RFP, 요구사항 분석, 보고서 등 카테고리 분류
4. **팀 공유**: Public/Private 템플릿 구분, 조직 내 공유
5. **버전 관리**: 템플릿 수정 이력 추적 (parent_id 참조)
6. **사용 통계**: 인기 템플릿 추천 (usage_count)

---

## 2. 시스템 아키텍처

```
+========================================================================+
|                  프롬프트 템플릿 관리 시스템 아키텍처                    |
+========================================================================+
|                                                                         |
|  +-----------------------------------------------------------------+   |
|  |                     Frontend Layer (React)                       |   |
|  |                                                                  |   |
|  |  +-------------------+  +---------------------+                 |   |
|  |  | TemplateSelector  |  | TemplateEditor      |                 |   |
|  |  | - 템플릿 목록      |  | - 템플릿 생성/편집   |                 |   |
|  |  | - 카테고리 필터    |  | - 변수 정의         |                 |   |
|  |  | - 검색 / 정렬     |  | - 미리보기          |                 |   |
|  |  +--------+----------+  +---------+-----------+                 |   |
|  |           |                       |                             |   |
|  |           +----------+------------+                             |   |
|  |                      v                                          |   |
|  |  +---------------------------------------------------+          |   |
|  |  |         React Hooks Layer                          |          |   |
|  |  |                                                    |          |   |
|  |  |  +-----------------+  +---------------------+     |          |   |
|  |  |  | usePrompt       |  | useClaudeSkill      |     |          |   |
|  |  |  | Templates       |  | (with templates)    |     |          |   |
|  |  |  | - CRUD 작업     |  | - 템플릿 기반 생성  |     |          |   |
|  |  |  | - 변수 치환     |  | - 결과 캐싱         |     |          |   |
|  |  |  | - 버전 관리     |  +---------------------+     |          |   |
|  |  |  +-----------------+                              |          |   |
|  |  +-------------------------+------------------------+          |   |
|  +----------------------------|---------------------------------+   |
|                               |                                      |
|                               | Supabase SDK                         |
|                               v                                      |
|  +-------------------------------------------------------------------+
|  |                    Database Layer (PostgreSQL)                     |
|  |                                                                    |
|  |  +----------------------------------------------------------+     |
|  |  |               prompt_templates 테이블                     |     |
|  |  |                                                           |     |
|  |  |  id, name, description, category                          |     |
|  |  |  system_prompt, user_prompt_template                      |     |
|  |  |  variables, output_schema                                 |     |
|  |  |  is_public, is_system, service_id                         |     |
|  |  |  version, parent_id, created_by                           |     |
|  |  |  usage_count, created_at, updated_at                      |     |
|  |  +----------------------------------------------------------+     |
|  |                                                                    |
|  |  +----------------------------------------------------------+     |
|  |  |                    RLS 정책                               |     |
|  |  |                                                           |     |
|  |  |  - SELECT: is_public=true OR created_by=current_user     |     |
|  |  |  - INSERT: authenticated users only                      |     |
|  |  |  - UPDATE: created_by=current_user                       |     |
|  |  |  - DELETE: created_by=current_user (is_system=false)     |     |
|  |  +----------------------------------------------------------+     |
|  +-------------------------------------------------------------------+
|                                                                         |
+========================================================================+
```

---

## 3. 데이터베이스 스키마

### 3.1 prompt_templates 테이블

```sql
CREATE TABLE prompt_templates (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 템플릿 메타데이터
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',

  -- 프롬프트 내용
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,

  -- 변수 및 출력 스키마
  variables JSONB DEFAULT '[]',
  output_schema JSONB,

  -- 공유 및 권한
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  service_id TEXT,

  -- 버전 관리
  version TEXT DEFAULT '1.0.0',
  parent_id UUID REFERENCES prompt_templates(id),

  -- 소유권 및 통계
  created_by UUID NOT NULL REFERENCES auth.users,
  usage_count INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_created_by ON prompt_templates(created_by);
CREATE INDEX idx_prompt_templates_is_public ON prompt_templates(is_public);
CREATE INDEX idx_prompt_templates_service_id ON prompt_templates(service_id);
CREATE INDEX idx_prompt_templates_usage_count ON prompt_templates(usage_count DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompt_templates_updated_at
BEFORE UPDATE ON prompt_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 데이터 구조 상세

#### variables (JSONB)
```json
[
  {
    "name": "projectName",
    "type": "string",
    "required": true,
    "description": "프로젝트 이름",
    "defaultValue": ""
  },
  {
    "name": "deadline",
    "type": "date",
    "required": true,
    "description": "마감일",
    "defaultValue": null
  },
  {
    "name": "budget",
    "type": "number",
    "required": false,
    "description": "예산 (만원)",
    "defaultValue": 1000
  }
]
```

#### output_schema (JSONB)
```json
{
  "type": "object",
  "properties": {
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "content": { "type": "string" }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "wordCount": { "type": "number" },
        "generatedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

## 4. TypeScript 타입 정의

### 4.1 prompt-templates.types.ts

```typescript
// src/types/prompt-templates.types.ts

/**
 * 프롬프트 템플릿 변수 정의
 */
export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  required: boolean
  description?: string
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    enum?: any[]
  }
}

/**
 * 프롬프트 템플릿 출력 스키마
 */
export interface PromptOutputSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  additionalProperties?: boolean
}

/**
 * 프롬프트 템플릿 카테고리
 */
export type PromptTemplateCategory =
  | 'rfp'           // RFP 생성
  | 'requirements'  // 요구사항 분석
  | 'planning'      // 프로젝트 계획
  | 'report'        // 보고서 작성
  | 'analysis'      // 데이터 분석
  | 'custom'        // 사용자 정의
  | 'system'        // 시스템 템플릿

/**
 * 프롬프트 템플릿 (DB 모델)
 */
export interface PromptTemplate {
  id: string
  name: string
  description?: string
  category: PromptTemplateCategory

  // 프롬프트 내용
  system_prompt?: string
  user_prompt_template: string

  // 변수 및 스키마
  variables: PromptVariable[]
  output_schema?: PromptOutputSchema

  // 공유 및 권한
  is_public: boolean
  is_system: boolean
  service_id?: string

  // 버전 관리
  version: string
  parent_id?: string

  // 소유권 및 통계
  created_by: string
  usage_count: number

  // 타임스탬프
  created_at: string
  updated_at: string
}

/**
 * 프롬프트 템플릿 생성 요청
 */
export interface CreatePromptTemplateRequest {
  name: string
  description?: string
  category: PromptTemplateCategory
  system_prompt?: string
  user_prompt_template: string
  variables?: PromptVariable[]
  output_schema?: PromptOutputSchema
  is_public?: boolean
  service_id?: string
}

/**
 * 프롬프트 템플릿 업데이트 요청
 */
export interface UpdatePromptTemplateRequest {
  name?: string
  description?: string
  category?: PromptTemplateCategory
  system_prompt?: string
  user_prompt_template?: string
  variables?: PromptVariable[]
  output_schema?: PromptOutputSchema
  is_public?: boolean
}

/**
 * 프롬프트 템플릿 실행 요청
 */
export interface ExecutePromptTemplateRequest {
  template_id: string
  variables: Record<string, any>
  model?: string
  max_tokens?: number
  temperature?: number
}

/**
 * 프롬프트 템플릿 실행 결과
 */
export interface ExecutePromptTemplateResponse {
  result: string
  metadata: {
    template_id: string
    template_name: string
    variables_used: Record<string, any>
    tokens_used: number
    model: string
    duration_ms: number
  }
}

/**
 * 프롬프트 템플릿 검색 필터
 */
export interface PromptTemplateFilter {
  category?: PromptTemplateCategory
  is_public?: boolean
  service_id?: string
  search?: string
  created_by?: string
}

/**
 * 프롬프트 템플릿 정렬 옵션
 */
export type PromptTemplateSortBy = 'name' | 'created_at' | 'updated_at' | 'usage_count'
export type PromptTemplateSortOrder = 'asc' | 'desc'

export interface PromptTemplateSortOptions {
  sortBy: PromptTemplateSortBy
  sortOrder: PromptTemplateSortOrder
}
```

---

## 5. React 훅 설계

### 5.1 usePromptTemplates

**파일**: `src/hooks/ai/usePromptTemplates.ts`

```typescript
interface UsePromptTemplatesOptions {
  filter?: PromptTemplateFilter
  sortOptions?: PromptTemplateSortOptions
  enabled?: boolean
}

interface UsePromptTemplatesReturn {
  templates: PromptTemplate[]
  isLoading: boolean
  error: Error | null

  // CRUD 작업
  createTemplate: (data: CreatePromptTemplateRequest) => Promise<PromptTemplate>
  updateTemplate: (id: string, data: UpdatePromptTemplateRequest) => Promise<PromptTemplate>
  deleteTemplate: (id: string) => Promise<void>
  duplicateTemplate: (id: string, newName: string) => Promise<PromptTemplate>

  // 실행
  executeTemplate: (request: ExecutePromptTemplateRequest) => Promise<ExecutePromptTemplateResponse>

  // 변수 치환
  replaceVariables: (template: PromptTemplate, variables: Record<string, any>) => string

  // 버전 관리
  createVersion: (templateId: string, changes: UpdatePromptTemplateRequest) => Promise<PromptTemplate>
  getVersionHistory: (templateId: string) => Promise<PromptTemplate[]>

  // 통계
  incrementUsage: (templateId: string) => Promise<void>
}
```

### 5.2 useClaudeSkill (템플릿 연동)

**파일**: `src/hooks/ai/useClaudeSkill.ts` (확장)

```typescript
interface UseClaudeSkillOptions {
  // 기존 옵션...

  // 템플릿 관련 추가
  templateId?: string
  templateVariables?: Record<string, any>
}

// useClaudeSkill 내부에서 템플릿 자동 로드 및 변수 치환
```

---

## 6. UI 컴포넌트 설계

### 6.1 TemplateSelector

**경로**: `src/components/ai/TemplateSelector.tsx`

```typescript
interface TemplateSelectorProps {
  category?: PromptTemplateCategory
  onSelect: (template: PromptTemplate) => void
  selectedId?: string
}

// 기능:
// - 카테고리별 필터링
// - 검색 (이름, 설명)
// - 정렬 (인기순, 최신순, 이름순)
// - 미리보기 (템플릿 내용 보기)
// - 즐겨찾기 (로컬 스토리지)
```

### 6.2 TemplateEditor

**경로**: `src/components/ai/TemplateEditor.tsx`

```typescript
interface TemplateEditorProps {
  template?: PromptTemplate
  onSave: (data: CreatePromptTemplateRequest | UpdatePromptTemplateRequest) => Promise<void>
  onCancel: () => void
}

// 기능:
// - 템플릿 메타데이터 편집 (이름, 설명, 카테고리)
// - System Prompt 편집
// - User Prompt Template 편집
// - 변수 정의 UI (이름, 타입, 필수 여부, 기본값)
// - 변수 자동 감지 ({{변수명}} 패턴)
// - 실시간 미리보기 (변수 치환 결과)
// - 유효성 검증 (필수 필드, 변수 형식)
```

### 6.3 TemplateVariableForm

**경로**: `src/components/ai/TemplateVariableForm.tsx`

```typescript
interface TemplateVariableFormProps {
  template: PromptTemplate
  onSubmit: (variables: Record<string, any>) => void
  defaultValues?: Record<string, any>
}

// 기능:
// - 변수별 입력 필드 동적 생성
// - 타입별 입력 컴포넌트 (string → Input, date → DatePicker, 등)
// - 유효성 검증 (required, min/max, pattern)
// - 기본값 자동 입력
// - 미리보기 (변수 치환 결과)
```

---

## 7. RLS (Row Level Security) 정책

```sql
-- 조회: Public 템플릿 또는 본인이 생성한 템플릿
CREATE POLICY "Anyone can view public templates or their own"
ON prompt_templates
FOR SELECT
USING (
  is_public = true
  OR created_by = auth.uid()
);

-- 삽입: 인증된 사용자만 가능
CREATE POLICY "Authenticated users can create templates"
ON prompt_templates
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- 업데이트: 본인이 생성한 템플릿만 수정 가능 (시스템 템플릿 제외)
CREATE POLICY "Users can update their own templates"
ON prompt_templates
FOR UPDATE
USING (
  created_by = auth.uid()
  AND is_system = false
);

-- 삭제: 본인이 생성한 템플릿만 삭제 가능 (시스템 템플릿 제외)
CREATE POLICY "Users can delete their own templates"
ON prompt_templates
FOR DELETE
USING (
  created_by = auth.uid()
  AND is_system = false
);
```

---

## 8. 시스템 템플릿 (초기 데이터)

### 8.1 RFP 생성 템플릿

```sql
INSERT INTO prompt_templates (
  name, description, category,
  system_prompt, user_prompt_template,
  variables, is_public, is_system
) VALUES (
  'RFP 생성 - 정부 SI',
  '정부 SI 프로젝트용 제안요청서 생성 템플릿',
  'rfp',
  '당신은 정부 SI 프로젝트의 RFP 작성 전문가입니다. 전자정부프레임워크 기반으로 제안요청서를 작성해주세요.',
  '다음 정보를 바탕으로 정부 SI 프로젝트 RFP를 작성해주세요:

프로젝트명: {{projectName}}
발주처: {{agency}}
예산: {{budget}}만원
기간: {{duration}}개월
마감일: {{deadline}}

RFP 구조:
1. 과업개요
2. 과업범위
3. 기술요구사항
4. 납품물
5. 평가기준',
  '[
    {"name": "projectName", "type": "string", "required": true, "description": "프로젝트명"},
    {"name": "agency", "type": "string", "required": true, "description": "발주처"},
    {"name": "budget", "type": "number", "required": true, "description": "예산 (만원)"},
    {"name": "duration", "type": "number", "required": true, "description": "기간 (개월)"},
    {"name": "deadline", "type": "date", "required": true, "description": "마감일"}
  ]'::jsonb,
  true,
  true
);
```

### 8.2 요구사항 분석 템플릿

```sql
INSERT INTO prompt_templates (
  name, description, category,
  system_prompt, user_prompt_template,
  variables, is_public, is_system
) VALUES (
  '요구사항 분석',
  '사용자 스토리를 기능 요구사항으로 변환',
  'requirements',
  '당신은 비즈니스 애널리스트입니다. 사용자 스토리를 구체적인 기능 요구사항으로 분석해주세요.',
  '다음 사용자 스토리를 분석하여 기능 요구사항을 도출해주세요:

{{userStory}}

프로젝트 컨텍스트:
- 프로젝트명: {{projectName}}
- 대상 사용자: {{targetUsers}}
- 핵심 기능: {{coreFeatures}}

요구사항 형식:
- 기능 요구사항 (FR)
- 비기능 요구사항 (NFR)
- 제약사항',
  '[
    {"name": "userStory", "type": "string", "required": true, "description": "사용자 스토리"},
    {"name": "projectName", "type": "string", "required": true, "description": "프로젝트명"},
    {"name": "targetUsers", "type": "string", "required": true, "description": "대상 사용자"},
    {"name": "coreFeatures", "type": "string", "required": false, "description": "핵심 기능"}
  ]'::jsonb,
  true,
  true
);
```

---

## 9. 성능 최적화

### 9.1 캐싱 전략

- **React Query 캐싱**: 템플릿 목록 5분 캐시
- **Supabase Realtime**: 템플릿 변경 시 자동 업데이트
- **변수 치환 결과 캐싱**: 동일 변수 조합은 메모이제이션

### 9.2 검색 최적화

- **Full-Text Search**: PostgreSQL GIN 인덱스
- **Debounce**: 검색 입력 300ms 디바운스

---

## 10. 보안 고려사항

1. **XSS 방지**: 템플릿 내용 sanitize (DOMPurify)
2. **SQL Injection 방지**: Prepared Statements 사용
3. **템플릿 검증**: 악의적인 프롬프트 패턴 감지
4. **Rate Limiting**: 템플릿 실행 횟수 제한 (시간당 100회)
5. **권한 검증**: RLS 정책으로 소유권 확인

---

## 11. 미래 확장 가능성

### Phase 2 (향후 계획)
- **템플릿 마켓플레이스**: 커뮤니티 템플릿 공유
- **템플릿 분석**: 성공률, 사용 패턴 분석
- **AI 추천**: 컨텍스트 기반 템플릿 추천
- **버전 비교**: Diff 뷰어로 변경사항 시각화
- **템플릿 체인**: 여러 템플릿 연결 실행 (파이프라인)

---

## 12. 참고 문서

- [Claude Integration 전체 아키텍처](../architecture.md)
- [Sprint 3 작업 계획](../../../tasks/claude-integration/sprint-3.md)
- [useClaudeSkill 훅 문서](../../../docs/guides/ai/claude-skills.md)
- [Supabase RLS 가이드](../../../docs/guides/database/supabase-rls.md)
