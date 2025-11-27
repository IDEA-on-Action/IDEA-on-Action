# Template Version Management 사용 가이드

**생성일**: 2025-11-27
**버전**: v1.0.0
**작성자**: Claude AI

> 문서 템플릿의 버전 관리 시스템 사용 방법을 설명합니다.

---

## 📋 목차

1. [개요](#개요)
2. [데이터베이스 구조](#데이터베이스-구조)
3. [React 훅 사용법](#react-훅-사용법)
4. [UI 컴포넌트 사용법](#ui-컴포넌트-사용법)
5. [고급 기능](#고급-기능)
6. [문제 해결](#문제-해결)

---

## 개요

### 주요 기능

- **자동 버전 생성**: 템플릿 콘텐츠 변경 시 자동으로 새 버전 생성
- **버전 복원**: 이전 버전으로 롤백 가능
- **버전 비교**: 두 버전 간 차이점 확인
- **버전 통계**: 총 버전 수, 기여자 수 등 통계 정보

### 기술 스택

- **DB**: PostgreSQL + pgvector (Supabase)
- **백엔드**: Supabase Edge Functions (RPC)
- **프론트엔드**: React + React Query + shadcn/ui
- **타입**: TypeScript (strict mode)

---

## 데이터베이스 구조

### 테이블: `template_versions`

```sql
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (template_id, version)
);
```

### 주요 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 버전 고유 ID |
| `template_id` | UUID | 템플릿 ID (외래키) |
| `version` | INTEGER | 버전 번호 (1부터 시작) |
| `content` | JSONB | 해당 버전의 템플릿 콘텐츠 |
| `change_summary` | TEXT | 변경 요약 (선택) |
| `created_by` | UUID | 버전 생성자 ID |
| `created_at` | TIMESTAMPTZ | 버전 생성 시간 |

### RLS (Row Level Security)

- **SELECT**: 인증된 사용자 모두 조회 가능
- **INSERT**: 관리자만 생성 가능
- **DELETE**: 관리자만 삭제 가능

---

## React 훅 사용법

### 1. 기본 사용법

```tsx
import { useTemplateVersions } from '@/hooks/useTemplateVersions';

function MyComponent() {
  const {
    versions,       // 버전 목록
    isLoading,      // 로딩 상태
    error,          // 에러 정보
    restoreVersion, // 복원 함수
    compareVersions,// 비교 함수
    stats,          // 통계 정보
    refetch         // 새로고침
  } = useTemplateVersions({
    templateId: 'xxx-xxx-xxx'
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <div>
      <h2>총 {stats?.total_versions}개 버전</h2>
      <ul>
        {versions.map(v => (
          <li key={v.id}>버전 {v.version}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. 버전 복원

```tsx
const handleRestore = async (versionId: string) => {
  try {
    await restoreVersion(versionId);
    toast.success('버전이 복원되었습니다');
  } catch (err) {
    toast.error('복원 실패');
  }
};
```

### 3. 버전 비교

```tsx
const handleCompare = (v1Id: string, v2Id: string) => {
  const comparison = compareVersions(v1Id, v2Id);

  if (!comparison) {
    console.log('버전을 찾을 수 없음');
    return;
  }

  console.log('추가된 항목:', comparison.diff.added);
  console.log('삭제된 항목:', comparison.diff.removed);
  console.log('변경된 항목:', comparison.diff.changed);
  console.log('변경 비율:', comparison.changeRate * 100 + '%');
};
```

### 4. 편의 훅

#### 최신 버전 조회

```tsx
import { useLatestTemplateVersion } from '@/hooks/useTemplateVersions';

const latestVersion = useLatestTemplateVersion('template-id');
console.log(latestVersion?.version); // 5
```

#### 버전 개수 조회

```tsx
import { useTemplateVersionCount } from '@/hooks/useTemplateVersions';

const versionCount = useTemplateVersionCount('template-id');
console.log(versionCount); // 5
```

---

## UI 컴포넌트 사용법

### 1. TemplateVersionHistory 컴포넌트

```tsx
import { TemplateVersionHistory } from '@/components/skills/TemplateVersionHistory';

function TemplatePage({ templateId }: { templateId: string }) {
  return (
    <div>
      <h1>템플릿 관리</h1>

      <TemplateVersionHistory
        templateId={templateId}
        maxItems={10}
        onVersionSelect={(version) => {
          console.log('선택된 버전:', version);
        }}
        onRestoreComplete={(version) => {
          console.log('복원 완료:', version);
        }}
      />
    </div>
  );
}
```

### 2. Props 설명

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `templateId` | string | ✅ | 템플릿 ID |
| `className` | string | ❌ | 추가 CSS 클래스 |
| `onVersionSelect` | function | ❌ | 버전 선택 콜백 |
| `onRestoreComplete` | function | ❌ | 복원 완료 콜백 |
| `maxItems` | number | ❌ | 최대 표시 개수 (기본: 10) |

### 3. 주요 기능

#### 타임라인 뷰

- 버전별 카드 형태로 표시
- 타임라인 점과 라인으로 시각화
- 현재 버전 배지 표시

#### 버전 정보

- 버전 번호
- 변경 요약
- 생성자 이메일
- 생성 시간 (상대 시간)
- 항목 개수

#### 액션 버튼

- **비교**: 현재 버전과 비교 (ArrowRightLeft 아이콘)
- **복원**: 해당 버전으로 복원 (RotateCcw 아이콘)

#### 복원 확인 다이얼로그

- 복원 전 확인 다이얼로그 표시
- "현재 버전도 새로운 버전으로 저장됨" 안내
- 취소/복원 버튼

#### 비교 모달

- 추가된 항목 (녹색 배경)
- 삭제된 항목 (빨간색 배경)
- 변경된 항목 (노란색 배경)
- 변경 비율 표시

---

## 고급 기능

### 1. 자동 버전 생성 트리거

템플릿 콘텐츠가 변경되면 자동으로 새 버전이 생성됩니다.

```sql
-- 트리거 함수
CREATE TRIGGER template_version_trigger
  BEFORE UPDATE OF content ON document_templates
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION auto_create_template_version();
```

### 2. RPC 함수

#### `get_template_versions(p_template_id UUID)`

특정 템플릿의 버전 목록을 조회합니다 (생성자 정보 포함).

```tsx
const { data } = await supabase.rpc('get_template_versions', {
  p_template_id: templateId
});
```

#### `restore_template_version(p_template_id UUID, p_version_id UUID)`

특정 버전으로 템플릿을 복원합니다.

```tsx
const { data } = await supabase.rpc('restore_template_version', {
  p_template_id: templateId,
  p_version_id: versionId
});
```

#### `get_template_version_stats(p_template_id UUID)`

템플릿 버전 통계를 조회합니다.

```tsx
const { data } = await supabase.rpc('get_template_version_stats', {
  p_template_id: templateId
});
```

### 3. 버전 비교 알고리즘

간단한 키 기반 diff 알고리즘을 사용합니다:

```typescript
function calculateDiff(obj1, obj2): VersionDiff {
  const added = [];    // obj2에만 있는 키
  const removed = [];  // obj1에만 있는 키
  const changed = [];  // 값이 다른 키

  // ... 비교 로직
  return { added, removed, changed };
}
```

---

## 문제 해결

### 1. 버전이 자동 생성되지 않음

**원인**: 트리거가 비활성화되었거나 콘텐츠 변경이 감지되지 않음

**해결**:
```sql
-- 트리거 확인
SELECT * FROM pg_trigger WHERE tgname = 'template_version_trigger';

-- 트리거 재생성
DROP TRIGGER IF EXISTS template_version_trigger ON document_templates;
CREATE TRIGGER template_version_trigger
  BEFORE UPDATE OF content ON document_templates
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION auto_create_template_version();
```

### 2. 복원 시 권한 에러

**원인**: 관리자 권한이 없음

**해결**:
```sql
-- 현재 사용자 역할 확인
SELECT r.name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();

-- 관리자 역할 추가 (관리자만 가능)
INSERT INTO user_roles (user_id, role_id)
SELECT 'user-uuid', r.id
FROM roles r
WHERE r.name = 'admin';
```

### 3. 버전 비교 결과가 이상함

**원인**: JSONB 구조가 복잡하거나 중첩된 경우

**해결**:
- 현재 비교 알고리즘은 1단계 키만 비교합니다.
- 중첩된 객체 비교가 필요한 경우, `calculateDiff` 함수를 재귀적으로 수정하세요.

```typescript
// 개선된 비교 함수 (재귀)
function deepDiff(obj1: any, obj2: any, path = ''): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // 재귀 비교 로직
  // ...

  return changes;
}
```

### 4. 버전 목록이 너무 많아 느림

**원인**: 대량의 버전이 존재하여 렌더링 성능 저하

**해결**:
```tsx
// maxItems로 제한
<TemplateVersionHistory
  templateId={templateId}
  maxItems={20} // 기본 10개
/>

// 또는 페이지네이션 추가
const [page, setPage] = useState(1);
const itemsPerPage = 10;
const displayedVersions = versions.slice(
  (page - 1) * itemsPerPage,
  page * itemsPerPage
);
```

---

## 참고 자료

### 관련 파일

- **마이그레이션**: `supabase/migrations/20251127000003_create_template_versions.sql`
- **타입 정의**: `src/types/template-version.types.ts`
- **React 훅**: `src/hooks/useTemplateVersions.ts`
- **UI 컴포넌트**: `src/components/skills/TemplateVersionHistory.tsx`

### 외부 문서

- [Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [shadcn/ui](https://ui.shadcn.com/)
- [date-fns](https://date-fns.org/)

---

**마지막 업데이트**: 2025-11-27
**문서 버전**: v1.0.0
**작성자**: Claude AI
