# 프롬프트 템플릿 React 훅 구현 완료

## 개요

프롬프트 템플릿 기능의 React 훅을 구현하여 Claude Skills에서 DB 기반 템플릿 관리를 가능하게 했습니다.

**구현일**: 2025-11-25
**작업자**: AI Agent (Claude)
**관련 TASK**: TASK-PT-003, TASK-PT-004

---

## 구현 내용

### 1. 타입 정의 파일

**파일**: `src/types/prompt-templates.types.ts`

#### 주요 타입

- **PromptTemplateDB**: Supabase 테이블 레코드 (snake_case)
- **PromptTemplate**: 클라이언트용 타입 (camelCase)
- **PromptTemplateMetadata**: 템플릿 메타데이터 (태그, 카테고리, 통계)
- **CreatePromptTemplateInput**: 템플릿 생성 입력
- **UpdatePromptTemplateInput**: 템플릿 업데이트 입력
- **PromptTemplateFilters**: 조회 필터 (skillType, serviceId, isSystem 등)
- **RenderedPrompt**: 렌더링된 프롬프트 결과

#### 유틸리티 함수

```typescript
// DB ↔ 클라이언트 변환
dbToPromptTemplate(db: PromptTemplateDB): PromptTemplate
promptTemplateToDb(template: Partial<PromptTemplate>): Partial<PromptTemplateDB>
```

---

### 2. React 훅 구현

**파일**: `src/hooks/usePromptTemplates.ts`

#### 조회 훅

**usePromptTemplates(filters?: PromptTemplateFilters)**

```typescript
const { data, isLoading, error, refetch } = usePromptTemplates({
  skillType: 'rfp-generator',
  isActive: true,
  limit: 20,
});
```

**지원 필터**:
- `skillType`: Skill 유형
- `serviceId`: Minu 서비스 ID
- `isSystem`: 시스템 템플릿 여부
- `isPublic`: 공개 여부
- `isActive`: 활성 여부
- `createdBy`: 생성자 UUID (내 템플릿)
- `search`: 검색어 (name, description)
- `orderBy`, `orderDirection`: 정렬
- `limit`, `offset`: 페이지네이션

#### CRUD 훅

**useCreatePromptTemplate()**

```typescript
const createTemplate = useCreatePromptTemplate();
await createTemplate.mutateAsync({
  name: '내 RFP 템플릿',
  description: '정부 SI 프로젝트용',
  skillType: 'rfp-generator',
  systemPrompt: '...',
  userPromptTemplate: '...',
  variables: ['projectName', 'clientName'],
  version: '1.0.0',
  serviceId: 'minu-frame',
  isPublic: false,
  metadata: { tags: ['정부', 'SI'] },
});
```

**useUpdatePromptTemplate()**

```typescript
const updateTemplate = useUpdatePromptTemplate();
await updateTemplate.mutateAsync({
  id: 'template-uuid',
  name: '수정된 이름',
  isPublic: true,
});
```

**useDeletePromptTemplate()**

```typescript
const deleteTemplate = useDeletePromptTemplate();
await deleteTemplate.mutateAsync('template-uuid');
```

#### 사용 횟수 증가

**useIncrementTemplateUsage()**

```typescript
const incrementUsage = useIncrementTemplateUsage();
await incrementUsage.mutateAsync('template-uuid');
```

**특징**:
- Silent fail (에러가 발생해도 사용자에게 알리지 않음)
- RPC 함수 `increment_template_usage` 호출
- 통계 업데이트용

---

### 3. 프롬프트 렌더링

**renderPrompt(template: string, variables: Record<string, unknown>): string**

Handlebars 스타일 템플릿 렌더링:

```typescript
// 일반 변수
'안녕하세요, {{name}}님!' → '안녕하세요, 홍길동님!'

// 조건부 블록
'{{#if hasEmail}}이메일: {{email}}{{/if}}'
  → hasEmail: true → '이메일: test@example.com'
  → hasEmail: false → ''

// 중첩 객체
'프로젝트: {{project.name}}' → '프로젝트: 테스트 프로젝트'

// 배열 (번호 매긴 목록)
'목표: {{objectives}}'
  → objectives: ['목표1', '목표2']
  → '목표: 1. 목표1\n2. 목표2'

// 객체 (JSON)
'설정: {{config}}'
  → config: { debug: true }
  → '설정: {\n  "debug": true\n}'
```

**renderPromptTemplate(template: PromptTemplate, variables: Record<string, unknown>): RenderedPrompt**

```typescript
const rendered = renderPromptTemplate(template, {
  projectName: '테스트 프로젝트',
  clientName: '고객사',
});

console.log(rendered.systemPrompt); // 렌더링된 시스템 프롬프트
console.log(rendered.userPrompt);   // 렌더링된 사용자 프롬프트
console.log(rendered.variables);    // 사용된 변수
```

---

### 4. useClaudeSkill DB 연동

**파일**: `src/hooks/useClaudeSkill.ts` 수정

#### 변경 사항

**Before**:
```typescript
// 하드코딩된 템플릿만 사용
const template = useMemo(() => PROMPT_TEMPLATES[skillType], [skillType]);
```

**After**:
```typescript
// DB 템플릿 가져오기 (시스템 템플릿 + 활성 상태)
const { data: dbTemplatesResponse } = usePromptTemplates({
  skillType,
  isSystem: true,
  isActive: true,
  limit: 1, // 가장 최신 템플릿 1개만
  orderBy: 'updated_at',
  orderDirection: 'desc',
});

// DB 템플릿 우선, 없으면 하드코딩 템플릿 사용
const template = useMemo(() => {
  if (dbTemplatesResponse?.data && dbTemplatesResponse.data.length > 0) {
    const dbTemplate = dbTemplatesResponse.data[0];
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      skillType: dbTemplate.skillType,
      systemPrompt: dbTemplate.systemPrompt,
      userPromptTemplate: dbTemplate.userPromptTemplate,
      variables: dbTemplate.variables,
      version: dbTemplate.version,
      serviceId: dbTemplate.serviceId ?? undefined,
    } as PromptTemplate;
  }

  // Fallback: 하드코딩 템플릿
  return PROMPT_TEMPLATES[skillType];
}, [skillType, dbTemplatesResponse]);
```

#### 동작 방식

1. **DB 조회**: 시스템 템플릿 중 활성 상태인 최신 템플릿 1개 조회
2. **Fallback**: DB에 템플릿이 없으면 하드코딩 템플릿 사용
3. **하위 호환**: 기존 API 호환성 유지

---

## 테스트

**파일**: `tests/hooks/usePromptTemplates.test.tsx`

### 테스트 케이스

#### usePromptTemplates
- ✅ 필터 없이 템플릿 목록 조회
- ✅ skillType 필터로 조회

#### renderPrompt
- ✅ 일반 변수 치환
- ✅ 조건부 블록 처리
- ✅ 중첩 객체 변수 처리
- ✅ 배열을 번호 매긴 목록으로 변환
- ✅ 객체를 JSON으로 변환

#### renderPromptTemplate
- ✅ 템플릿 전체 렌더링

---

## 빌드 결과

```bash
✓ built in 23.77s

PWA v1.1.0
mode      generateSW
precache  27 entries (1620.83 KiB)
```

**TypeScript 타입 체크**: ✅ 에러 없음

---

## 사용 예시

### 1. 템플릿 목록 조회

```typescript
import { usePromptTemplates } from '@/hooks/usePromptTemplates';

function TemplateSelector() {
  const { data, isLoading, error } = usePromptTemplates({
    skillType: 'rfp-generator',
    isActive: true,
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <ul>
      {data?.data.map((template) => (
        <li key={template.id}>
          {template.name} (v{template.version})
        </li>
      ))}
    </ul>
  );
}
```

### 2. 템플릿 생성

```typescript
import { useCreatePromptTemplate } from '@/hooks/usePromptTemplates';

function CreateTemplateButton() {
  const createTemplate = useCreatePromptTemplate();

  const handleCreate = async () => {
    await createTemplate.mutateAsync({
      name: '내 RFP 템플릿',
      description: '정부 SI 프로젝트용',
      skillType: 'rfp-generator',
      systemPrompt: '당신은 RFP 작성 전문가입니다.',
      userPromptTemplate: '프로젝트: {{projectName}}\n고객사: {{clientName}}',
      variables: ['projectName', 'clientName'],
      version: '1.0.0',
      serviceId: 'minu-frame',
    });
  };

  return (
    <button onClick={handleCreate} disabled={createTemplate.isPending}>
      {createTemplate.isPending ? '생성 중...' : '템플릿 생성'}
    </button>
  );
}
```

### 3. 프롬프트 렌더링

```typescript
import { renderPromptTemplate } from '@/hooks/usePromptTemplates';

function RenderPromptExample() {
  const template = /* ... */;

  const rendered = renderPromptTemplate(template, {
    projectName: '스마트시티 구축',
    clientName: '서울시',
  });

  console.log('System:', rendered.systemPrompt);
  console.log('User:', rendered.userPrompt);
}
```

### 4. useClaudeSkill (자동 DB 연동)

```typescript
import { useRFPGenerator } from '@/hooks/useClaudeSkill';

function RFPGenerator() {
  // DB 템플릿이 있으면 자동으로 사용, 없으면 하드코딩 템플릿 사용
  const { generateRFP, isGenerating, progress } = useRFPGenerator();

  const handleGenerate = async () => {
    const result = await generateRFP({
      projectName: '스마트시티 구축',
      clientName: '서울시',
      background: '...',
      objectives: ['목표1', '목표2'],
      category: 'government',
    });

    if (result.success) {
      console.log('RFP:', result.data);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? `${progress?.percent}% 진행 중...` : 'RFP 생성'}
    </button>
  );
}
```

---

## 다음 단계

### Agent 1 (DB & Migration)
- [x] prompt_templates 테이블 마이그레이션
- [ ] increment_template_usage RPC 함수 생성
- [ ] 시스템 템플릿 Seed 데이터 삽입

### Agent 3 (UI Components)
- [ ] TemplateSelector 컴포넌트
- [ ] TemplateEditor 컴포넌트
- [ ] TemplatePreview 컴포넌트

### E2E 테스트
- [ ] 템플릿 CRUD E2E 테스트
- [ ] useClaudeSkill DB 연동 E2E 테스트

---

## 의존성

### 패키지
- `@tanstack/react-query`: 서버 상태 관리
- `@supabase/supabase-js`: Supabase 클라이언트
- `sonner`: Toast 알림

### 내부 모듈
- `@/integrations/supabase/client`: Supabase 클라이언트 인스턴스
- `@/types/claude-skills.types`: Claude Skills 타입
- `@/hooks/useClaudeStreaming`: Claude API 통신

---

## 참고 문서

- [SDD 문서](../../spec/prompt-templates/)
- [DB 스키마](../../supabase/migrations/)
- [useClaudeSkill 훅](../../src/hooks/useClaudeSkill.ts)
- [Newsletter Admin 훅](../../src/hooks/useNewsletterAdmin.ts) (CRUD 패턴 참조)

---

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: ✅ 완료
