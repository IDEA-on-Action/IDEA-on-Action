# Sprint 3: 프롬프트 템플릿 관리

> Claude AI 통합을 위한 재사용 가능한 프롬프트 템플릿 시스템 구축

**시작일**: 2025-11-25
**예상 소요**: 5시간
**관련 명세**: [spec/claude-integration/requirements.md](../../spec/claude-integration/requirements.md)
**관련 설계**: [plan/claude-integration/prompt-templates/architecture.md](../../plan/claude-integration/prompt-templates/architecture.md)
**선행 조건**: Sprint 2 완료 ✅

---

## 목표

1. `prompt_templates` 테이블 마이그레이션
2. TypeScript 타입 정의 (prompt-templates.types.ts)
3. usePromptTemplates 훅 구현
4. useClaudeSkill 훅 템플릿 연동
5. 템플릿 선택 UI 컴포넌트
6. 팀 공유 기능 (Public/Private)
7. E2E 테스트 6개
8. 시스템 템플릿 초기 데이터 (RFP, 요구사항 분석)

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (1.5h)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-PT-001  │  │ TASK-PT-003  │  │ TASK-PT-005  │       │
│  │ DB Schema    │  │ React 훅     │  │ UI 컴포넌트   │       │
│  │ TASK-PT-002  │  │              │  │              │       │
│  │ TypeScript   │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (2h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ 시스템 템플릿│  │ TASK-PT-004  │  │ TASK-PT-006  │       │
│  │ 초기 데이터  │  │ Skill 연동   │  │ 팀 공유      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (1.5h)                          │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Agent 1      │  │ Agent 2      │                         │
│  │ TASK-PT-007  │  │ 문서화       │                         │
│  │ E2E 테스트   │  │ Admin 가이드 │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

**예상 총 소요 시간**: 5시간 (병렬 실행 3 Phase)
**단일 실행 시**: ~10시간 (50% 시간 절감)

---

## 작업 목록

### TASK-PT-001: DB 마이그레이션 - prompt_templates 테이블

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 1 (Phase 1)

**작업 내용**:

#### 1. 마이그레이션 파일 생성

```sql
-- supabase/migrations/20251125000001_create_prompt_templates.sql

-- =====================================================
-- 프롬프트 템플릿 관리 시스템
-- Sprint 3: Claude Integration
-- =====================================================

-- 1. prompt_templates 테이블 생성
CREATE TABLE IF NOT EXISTS prompt_templates (
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
  parent_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,

  -- 소유권 및 통계
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_category CHECK (
    category IN ('rfp', 'requirements', 'planning', 'report', 'analysis', 'custom', 'system')
  )
);

-- 2. 인덱스 생성
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_created_by ON prompt_templates(created_by);
CREATE INDEX idx_prompt_templates_is_public ON prompt_templates(is_public);
CREATE INDEX idx_prompt_templates_service_id ON prompt_templates(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_prompt_templates_usage_count ON prompt_templates(usage_count DESC);
CREATE INDEX idx_prompt_templates_parent_id ON prompt_templates(parent_id) WHERE parent_id IS NOT NULL;

-- Full-Text Search 인덱스 (템플릿 이름 및 설명)
CREATE INDEX idx_prompt_templates_name_fts
ON prompt_templates
USING GIN (to_tsvector('korean', name || ' ' || COALESCE(description, '')));

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_prompt_templates_updated_at
BEFORE UPDATE ON prompt_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS 활성화
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성

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

-- 6. 코멘트 추가
COMMENT ON TABLE prompt_templates IS '프롬프트 템플릿 저장소';
COMMENT ON COLUMN prompt_templates.variables IS '템플릿 변수 정의 (JSONB 배열)';
COMMENT ON COLUMN prompt_templates.output_schema IS '출력 스키마 (JSON Schema)';
COMMENT ON COLUMN prompt_templates.is_system IS '시스템 템플릿 여부 (삭제/수정 불가)';
COMMENT ON COLUMN prompt_templates.parent_id IS '부모 템플릿 ID (버전 관리용)';
```

#### 2. 로컬 마이그레이션 테스트

```bash
# Supabase CLI로 로컬 테스트
npx supabase migration up

# 테이블 생성 확인
npx supabase db diff
```

#### 3. 프로덕션 배포

```bash
# Supabase 프로덕션 마이그레이션
npx supabase db push
```

**완료 기준**:
- [ ] 마이그레이션 파일 생성 완료
- [ ] 로컬 테스트 통과
- [ ] 프로덕션 배포 성공
- [ ] RLS 정책 동작 확인

---

### TASK-PT-002: TypeScript 타입 정의

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-PT-001
**담당**: Agent 1 (Phase 1)

**작업 내용**:

#### 1. 타입 파일 생성

**파일**: `src/types/prompt-templates.types.ts`

```typescript
/**
 * 프롬프트 템플릿 타입 정의
 * Sprint 3: Claude Integration
 */

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

#### 2. 타입 내보내기

**파일**: `src/types/index.ts` (추가)

```typescript
// Prompt Templates
export * from './prompt-templates.types'
```

**완료 기준**:
- [ ] 타입 파일 생성 완료
- [ ] 타입 내보내기 설정 완료
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-PT-003: usePromptTemplates 훅 구현

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-PT-002
**담당**: Agent 2 (Phase 1)

**작업 내용**:

#### 1. 훅 파일 생성

**파일**: `src/hooks/ai/usePromptTemplates.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  PromptTemplate,
  CreatePromptTemplateRequest,
  UpdatePromptTemplateRequest,
  PromptTemplateFilter,
  PromptTemplateSortOptions
} from '@/types'

interface UsePromptTemplatesOptions {
  filter?: PromptTemplateFilter
  sortOptions?: PromptTemplateSortOptions
  enabled?: boolean
}

export function usePromptTemplates(options: UsePromptTemplatesOptions = {}) {
  const queryClient = useQueryClient()
  const {
    filter = {},
    sortOptions = { sortBy: 'created_at', sortOrder: 'desc' },
    enabled = true
  } = options

  // ================== 조회 ==================

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['prompt-templates', filter, sortOptions],
    queryFn: async () => {
      let query = supabase
        .from('prompt_templates')
        .select('*')

      // 필터 적용
      if (filter.category) {
        query = query.eq('category', filter.category)
      }
      if (filter.is_public !== undefined) {
        query = query.eq('is_public', filter.is_public)
      }
      if (filter.service_id) {
        query = query.eq('service_id', filter.service_id)
      }
      if (filter.created_by) {
        query = query.eq('created_by', filter.created_by)
      }
      if (filter.search) {
        query = query.textSearch('name', filter.search, {
          type: 'websearch',
          config: 'korean'
        })
      }

      // 정렬 적용
      query = query.order(sortOptions.sortBy, {
        ascending: sortOptions.sortOrder === 'asc'
      })

      const { data, error } = await query

      if (error) throw error
      return data as PromptTemplate[]
    },
    enabled
  })

  // ================== 생성 ==================

  const createMutation = useMutation({
    mutationFn: async (data: CreatePromptTemplateRequest) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Unauthorized')

      const { data: template, error } = await supabase
        .from('prompt_templates')
        .insert({
          ...data,
          created_by: user.user.id,
          variables: data.variables || [],
          is_public: data.is_public || false
        })
        .select()
        .single()

      if (error) throw error
      return template as PromptTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
    }
  })

  // ================== 업데이트 ==================

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string
      data: UpdatePromptTemplateRequest
    }) => {
      const { data: template, error } = await supabase
        .from('prompt_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return template as PromptTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
    }
  })

  // ================== 삭제 ==================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
    }
  })

  // ================== 복제 ==================

  const duplicateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      // 원본 템플릿 조회
      const { data: original, error: fetchError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 복제본 생성
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Unauthorized')

      const { data: duplicate, error: insertError } = await supabase
        .from('prompt_templates')
        .insert({
          ...original,
          id: undefined,
          name: newName,
          parent_id: id,
          created_by: user.user.id,
          usage_count: 0,
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single()

      if (insertError) throw insertError
      return duplicate as PromptTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
    }
  })

  // ================== 사용 통계 증가 ==================

  const incrementUsageMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.rpc('increment_template_usage', {
        template_id: templateId
      })

      if (error) throw error
    }
  })

  // ================== 변수 치환 ==================

  function replaceVariables(
    template: PromptTemplate,
    variables: Record<string, any>
  ): string {
    let result = template.user_prompt_template

    template.variables.forEach((variable) => {
      const value = variables[variable.name] ?? variable.defaultValue ?? ''
      const placeholder = `{{${variable.name}}}`
      result = result.replaceAll(placeholder, String(value))
    })

    return result
  }

  return {
    templates,
    isLoading,
    error: error as Error | null,

    // CRUD 작업
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, data: UpdatePromptTemplateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteMutation.mutateAsync,
    duplicateTemplate: (id: string, newName: string) =>
      duplicateMutation.mutateAsync({ id, newName }),

    // 사용 통계
    incrementUsage: incrementUsageMutation.mutateAsync,

    // 변수 치환
    replaceVariables
  }
}
```

#### 2. Supabase RPC 함수 (사용 통계 증가)

**마이그레이션 파일에 추가**:

```sql
-- 템플릿 사용 통계 증가 함수
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prompt_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**완료 기준**:
- [ ] 훅 파일 생성 완료
- [ ] RPC 함수 마이그레이션 추가
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-PT-004: useClaudeSkill 훅 템플릿 연동

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-PT-003
**담당**: Agent 2 (Phase 2)

**작업 내용**:

#### 1. useClaudeSkill 확장

**파일**: `src/hooks/ai/useClaudeSkill.ts` (수정)

```typescript
// 기존 옵션 인터페이스에 추가
interface UseClaudeSkillOptions {
  // ... 기존 옵션

  // 템플릿 관련 추가
  templateId?: string
  templateVariables?: Record<string, any>
}

// useClaudeSkill 훅 내부에서 템플릿 자동 로드
export function useClaudeSkill(
  skillType: SkillType,
  options: UseClaudeSkillOptions = {}
) {
  const { templateId, templateVariables, ...restOptions } = options
  const { templates } = usePromptTemplates({ enabled: !!templateId })

  // 템플릿 자동 적용
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === templateId)
      if (template && templateVariables) {
        const prompt = replaceVariables(template, templateVariables)
        // 프롬프트 자동 설정
        setPrompt(prompt)
      }
    }
  }, [templateId, templates, templateVariables])

  // ... 나머지 훅 로직
}
```

**완료 기준**:
- [ ] useClaudeSkill 템플릿 연동 완료
- [ ] 템플릿 자동 로드 동작 확인

---

### TASK-PT-005: 템플릿 선택 UI 컴포넌트

**예상 시간**: 45분
**상태**: ⏳ 대기
**의존성**: TASK-PT-003
**담당**: Agent 3 (Phase 1)

**작업 내용**:

#### 1. TemplateSelector 컴포넌트

**파일**: `src/components/ai/TemplateSelector.tsx`

```typescript
import { useState } from 'react'
import { Search, Filter, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePromptTemplates } from '@/hooks/ai/usePromptTemplates'
import type { PromptTemplate, PromptTemplateCategory } from '@/types'

interface TemplateSelectorProps {
  category?: PromptTemplateCategory
  onSelect: (template: PromptTemplate) => void
  selectedId?: string
}

export function TemplateSelector({
  category,
  onSelect,
  selectedId
}: TemplateSelectorProps) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<PromptTemplateCategory | undefined>(
    category
  )
  const [sortBy, setSortBy] = useState<'usage_count' | 'created_at'>('usage_count')

  const { templates, isLoading } = usePromptTemplates({
    filter: {
      category: filterCategory,
      search: search || undefined
    },
    sortOptions: {
      sortBy,
      sortOrder: 'desc'
    }
  })

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="템플릿 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체</SelectItem>
            <SelectItem value="rfp">RFP</SelectItem>
            <SelectItem value="requirements">요구사항</SelectItem>
            <SelectItem value="planning">계획</SelectItem>
            <SelectItem value="report">보고서</SelectItem>
            <SelectItem value="analysis">분석</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usage_count">인기순</SelectItem>
            <SelectItem value="created_at">최신순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 템플릿 목록 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            템플릿이 없습니다.
          </div>
        ) : (
          templates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-colors hover:border-primary ${
                selectedId === template.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.is_public && (
                    <Badge variant="secondary">공개</Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {template.description || '설명 없음'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>사용: {template.usage_count}회</span>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
```

**완료 기준**:
- [ ] TemplateSelector 컴포넌트 생성 완료
- [ ] 검색/필터/정렬 동작 확인
- [ ] 반응형 레이아웃 확인

---

### TASK-PT-006: 팀 공유 기능 (Public/Private)

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-PT-005
**담당**: Agent 3 (Phase 2)

**작업 내용**:

#### 1. 공개/비공개 토글 UI

**파일**: `src/components/ai/TemplateEditor.tsx` (신규)

```typescript
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { usePromptTemplates } from '@/hooks/ai/usePromptTemplates'
import type { PromptTemplate } from '@/types'

interface TemplateEditorProps {
  template?: PromptTemplate
  onSave: () => void
}

export function TemplateEditor({ template, onSave }: TemplateEditorProps) {
  const [isPublic, setIsPublic] = useState(template?.is_public || false)
  const { updateTemplate } = usePromptTemplates()

  const handleTogglePublic = async () => {
    if (template) {
      await updateTemplate(template.id, { is_public: !isPublic })
      setIsPublic(!isPublic)
    }
  }

  return (
    <div className="space-y-4">
      {/* ... 템플릿 편집 필드 ... */}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="public-toggle">팀과 공유</Label>
          <div className="text-sm text-muted-foreground">
            이 템플릿을 조직 내 다른 사용자가 볼 수 있도록 설정
          </div>
        </div>
        <Switch
          id="public-toggle"
          checked={isPublic}
          onCheckedChange={handleTogglePublic}
        />
      </div>
    </div>
  )
}
```

**완료 기준**:
- [ ] Public/Private 토글 UI 생성 완료
- [ ] RLS 정책으로 권한 검증 확인

---

### TASK-PT-007: E2E 테스트 6개

**예상 시간**: 15분
**상태**: ⏳ 대기
**의존성**: TASK-PT-006
**담당**: Agent 3 (Phase 3)

**작업 내용**:

**파일**: `tests/e2e/prompt-templates.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('프롬프트 템플릿 관리', () => {
  test('템플릿 목록 조회', async ({ page }) => {
    await page.goto('/ai/templates')
    await expect(page.locator('h1')).toContainText('프롬프트 템플릿')
    await expect(page.locator('[data-testid="template-card"]')).toHaveCount.greaterThan(0)
  })

  test('템플릿 생성', async ({ page }) => {
    await page.goto('/ai/templates/new')
    await page.fill('[name="name"]', '테스트 템플릿')
    await page.fill('[name="user_prompt_template"]', '{{projectName}}에 대한 분석')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL(/\/ai\/templates\/[a-z0-9-]+/)
  })

  test('템플릿 검색', async ({ page }) => {
    await page.goto('/ai/templates')
    await page.fill('[placeholder="템플릿 검색..."]', 'RFP')
    await page.waitForTimeout(500) // debounce
    const cards = page.locator('[data-testid="template-card"]')
    await expect(cards.first()).toContainText('RFP')
  })

  test('카테고리 필터링', async ({ page }) => {
    await page.goto('/ai/templates')
    await page.click('[data-testid="category-filter"]')
    await page.click('text=요구사항')
    await page.waitForTimeout(300)
    const cards = page.locator('[data-testid="template-card"]')
    await expect(cards.first()).toContainText('requirements')
  })

  test('템플릿 Public 전환', async ({ page }) => {
    await page.goto('/ai/templates/[템플릿ID]/edit')
    const toggle = page.locator('#public-toggle')
    await toggle.click()
    await expect(toggle).toBeChecked()
  })

  test('변수 치환 미리보기', async ({ page }) => {
    await page.goto('/ai/templates/[템플릿ID]')
    await page.fill('[name="projectName"]', '신규 프로젝트')
    await page.click('[data-testid="preview-button"]')
    await expect(page.locator('[data-testid="preview-content"]')).toContainText('신규 프로젝트')
  })
})
```

**완료 기준**:
- [ ] E2E 테스트 6개 작성 완료
- [ ] 모든 테스트 통과

---

## 완료 기준

### Sprint 전체 완료 기준
- [ ] 모든 TASK 완료
- [ ] E2E 테스트 통과
- [ ] TypeScript 컴파일 에러 없음
- [ ] 프로덕션 빌드 성공
- [ ] 시스템 템플릿 2개 이상 등록

### 검증 항목
- [ ] 템플릿 CRUD 동작 확인
- [ ] 변수 치환 정상 동작
- [ ] Public/Private 권한 검증
- [ ] RLS 정책 동작 확인
- [ ] 검색/필터/정렬 동작 확인

---

## 참고 문서

- [아키텍처 설계](../../plan/claude-integration/prompt-templates/architecture.md)
- [Sprint 2 완료 보고서](./sprint-2.md)
- [useClaudeSkill 훅 문서](../../docs/guides/ai/claude-skills.md)
