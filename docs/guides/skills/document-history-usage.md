# Document History 사용 가이드

생성된 문서(xlsx, docx, pptx) 이력을 관리하는 기능입니다.

## 개요

### 주요 기능
- ✅ 문서 이력 저장 및 조회
- ✅ 파일 유형별 필터링
- ✅ 파일 크기 자동 포맷팅
- ✅ 삭제 기능 (확인 다이얼로그)
- ✅ 재다운로드 기능 (Storage 연동)
- ✅ 사용자별 통계 조회

### 파일 구조
```
src/
├── types/
│   └── document-history.types.ts        # 타입 정의
├── hooks/
│   └── useDocumentHistory.ts            # React 훅
└── components/skills/
    └── DocumentHistoryList.tsx          # UI 컴포넌트

supabase/migrations/
└── 20251127000001_create_generated_documents.sql  # DB 마이그레이션
```

---

## 1. DB 마이그레이션

### 실행 방법
```bash
# 로컬 DB에 적용
supabase db reset

# 또는 특정 마이그레이션만 실행
supabase migration up
```

### 테이블 스키마
```sql
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xlsx', 'docx', 'pptx')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS 정책
- ✅ 사용자는 자신의 문서만 조회
- ✅ 사용자는 자신의 문서만 삽입
- ✅ 사용자는 자신의 문서만 삭제

---

## 2. React 훅 사용법

### useDocumentHistory

문서 이력을 조회하고 관리하는 훅입니다.

```tsx
import { useDocumentHistory } from '@/hooks/useDocumentHistory';

function MyComponent() {
  const {
    documents,        // 문서 목록
    isLoading,        // 로딩 상태
    error,            // 에러 정보
    saveDocument,     // 문서 저장 함수
    deleteDocument,   // 문서 삭제 함수
    refetch,          // 데이터 새로고침
  } = useDocumentHistory();

  // 파일 유형별 필터링
  const xlsxOnly = useDocumentHistory({ fileType: 'xlsx' });

  return (
    <div>
      {documents.map(doc => (
        <div key={doc.id}>{doc.file_name}</div>
      ))}
    </div>
  );
}
```

### 문서 저장 예시

```tsx
import { useDocumentHistory } from '@/hooks/useDocumentHistory';
import { useAuth } from '@/hooks/useAuth';

function DocumentGenerator() {
  const { user } = useAuth();
  const { saveDocument } = useDocumentHistory();

  const handleGenerate = async () => {
    // 문서 생성 로직...
    const blob = new Blob([/* ... */]);

    // 이력 저장
    await saveDocument({
      user_id: user!.id,
      file_name: 'report.xlsx',
      file_type: 'xlsx',
      file_size: blob.size,
      storage_path: null,  // 또는 Supabase Storage 경로
      metadata: {
        title: '주간 보고서',
        category: 'weekly',
      },
      input_data: {
        projectName: '프로젝트 A',
        weekNumber: 45,
      },
    });
  };

  return <button onClick={handleGenerate}>생성</button>;
}
```

### useDocumentStats

사용자별 문서 통계를 조회하는 훅입니다.

```tsx
import { useDocumentStats } from '@/hooks/useDocumentHistory';

function StatsWidget() {
  const { stats, isLoading } = useDocumentStats();

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div>
      {stats.map(({ file_type, count, total_size }) => (
        <div key={file_type}>
          {file_type}: {count}개, {formatFileSize(total_size)}
        </div>
      ))}
    </div>
  );
}
```

---

## 3. UI 컴포넌트 사용법

### DocumentHistoryList

문서 이력을 테이블 형식으로 표시하는 컴포넌트입니다.

```tsx
import { DocumentHistoryList } from '@/components/skills';

function HistoryPage() {
  return (
    <div>
      <h1>문서 이력</h1>

      {/* 기본 사용 */}
      <DocumentHistoryList />

      {/* 파일 유형 필터링 */}
      <DocumentHistoryList fileType="xlsx" />

      {/* 재다운로드 핸들러 */}
      <DocumentHistoryList
        onRedownload={(doc) => {
          if (doc.storage_path) {
            window.open(doc.storage_path);
          }
        }}
      />

      {/* 커스텀 빈 상태 메시지 */}
      <DocumentHistoryList
        emptyMessage="아직 생성된 Excel 문서가 없습니다"
      />
    </div>
  );
}
```

### Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `fileType` | `'xlsx' \| 'docx' \| 'pptx'` | ❌ | - | 파일 유형 필터 |
| `className` | `string` | ❌ | - | CSS 클래스명 |
| `onRedownload` | `(doc) => void` | ❌ | - | 재다운로드 핸들러 |
| `emptyMessage` | `string` | ❌ | "생성된 문서가 없습니다" | 빈 상태 메시지 |

---

## 4. 유틸리티 함수

### formatFileSize

파일 크기를 읽기 쉬운 형식으로 변환합니다.

```tsx
import { formatFileSize } from '@/hooks/useDocumentHistory';

formatFileSize(1024);       // "1 KB"
formatFileSize(1048576);    // "1 MB"
formatFileSize(1234567, 1); // "1.2 MB"
```

### getFileTypeIcon

파일 유형별 Lucide 아이콘 이름을 반환합니다.

```tsx
import { getFileTypeIcon } from '@/hooks/useDocumentHistory';

getFileTypeIcon('xlsx'); // "FileSpreadsheet"
getFileTypeIcon('docx'); // "FileText"
getFileTypeIcon('pptx'); // "Presentation"
```

### getFileTypeLabel

파일 유형별 한글 라벨을 반환합니다.

```tsx
import { getFileTypeLabel } from '@/hooks/useDocumentHistory';

getFileTypeLabel('xlsx'); // "Excel"
getFileTypeLabel('docx'); // "Word"
getFileTypeLabel('pptx'); // "PowerPoint"
```

---

## 5. 기존 Skill 훅과 통합

### useDocxGenerate와 통합

```tsx
import { useDocxGenerate } from '@/hooks/useDocxGenerate';
import { useDocumentHistory } from '@/hooks/useDocumentHistory';
import { useAuth } from '@/hooks/useAuth';

function RFPGenerator() {
  const { user } = useAuth();
  const { generate } = useDocxGenerate();
  const { saveDocument } = useDocumentHistory();

  const handleGenerate = async () => {
    // 1. 문서 생성
    const result = await generate({
      template: 'rfp',
      category: 'government',
      data: {
        projectName: '스마트시티 구축',
        clientName: '서울시',
        // ...
      },
    });

    // 2. 이력 저장
    if (result.success && user) {
      await saveDocument({
        user_id: user.id,
        file_name: result.fileName,
        file_type: 'docx',
        file_size: result.fileSize,
        metadata: {
          template: 'rfp',
          category: 'government',
          title: '스마트시티 구축 RFP',
        },
        input_data: {
          projectName: '스마트시티 구축',
          clientName: '서울시',
        },
      });
    }
  };

  return <button onClick={handleGenerate}>RFP 생성</button>;
}
```

### useXlsxExport와 통합

```tsx
import { useXlsxExport } from '@/hooks/useXlsxExport';
import { useDocumentHistory } from '@/hooks/useDocumentHistory';
import { useAuth } from '@/hooks/useAuth';

function DataExporter() {
  const { user } = useAuth();
  const { exportToExcel } = useXlsxExport();
  const { saveDocument } = useDocumentHistory();

  const handleExport = async () => {
    const fileName = `central-hub-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    // 1. Excel 내보내기
    await exportToExcel({ filename: fileName });

    // 2. 이력 저장 (파일 크기는 추정치)
    if (user) {
      await saveDocument({
        user_id: user.id,
        file_name: fileName,
        file_type: 'xlsx',
        file_size: 50000, // 실제 파일 크기로 교체
        metadata: {
          type: 'central-hub-report',
          sheets: 4,
        },
      });
    }
  };

  return <button onClick={handleExport}>Excel 내보내기</button>;
}
```

---

## 6. Storage 연동 (선택)

Supabase Storage에 파일을 업로드하고 경로를 저장하는 경우:

```tsx
import { supabase } from '@/integrations/supabase/client';
import { useDocumentHistory } from '@/hooks/useDocumentHistory';
import { useAuth } from '@/hooks/useAuth';

async function uploadAndSaveDocument(
  blob: Blob,
  fileName: string,
  fileType: 'xlsx' | 'docx' | 'pptx',
  user: User
) {
  const { saveDocument } = useDocumentHistory();

  // 1. Storage 업로드
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(`${user.id}/${fileName}`, blob);

  if (error) throw error;

  // 2. Public URL 가져오기
  const { data: publicUrl } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);

  // 3. 이력 저장
  await saveDocument({
    user_id: user.id,
    file_name: fileName,
    file_type: fileType,
    file_size: blob.size,
    storage_path: publicUrl.publicUrl,
    metadata: {
      bucket: 'documents',
      uploaded_at: new Date().toISOString(),
    },
  });

  return publicUrl.publicUrl;
}
```

---

## 7. 테스트 방법

### 로컬 개발
```bash
# 1. DB 마이그레이션
supabase db reset

# 2. 개발 서버 실행
npm run dev

# 3. 로그인 후 문서 생성 페이지 방문
# 4. 문서 생성 후 이력 확인
```

### E2E 테스트 예시
```typescript
// tests/e2e/document-history.spec.ts
import { test, expect } from '@playwright/test';

test.describe('DocumentHistory', () => {
  test('should display document history', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByText('생성된 문서가 없습니다')).toBeVisible();
  });

  test('should delete document', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: '삭제' }).first().click();
    await page.getByRole('button', { name: '삭제' }).click(); // 확인 다이얼로그
    await expect(page.getByText('문서가 삭제되었습니다')).toBeVisible();
  });
});
```

---

## 8. 문제 해결

### 문서가 표시되지 않음
1. RLS 정책 확인: 사용자가 로그인되어 있는지 확인
2. 쿼리 키 확인: React Query DevTools로 캐시 상태 확인
3. DB 확인: `SELECT * FROM generated_documents WHERE user_id = '...'`

### 삭제가 작동하지 않음
1. RLS 정책 확인: 사용자가 소유자인지 확인
2. 에러 로그 확인: 브라우저 콘솔 및 Supabase 로그

### 통계가 표시되지 않음
1. RPC 함수 확인: `get_user_document_stats` 함수가 생성되었는지 확인
2. 권한 확인: `SECURITY DEFINER` 설정 확인

---

## 참고 자료

- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query 문서](https://tanstack.com/query/latest/docs/react/overview)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [date-fns 문서](https://date-fns.org/)
