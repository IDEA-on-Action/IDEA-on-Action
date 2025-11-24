# Claude Skills 기술 스택

> Claude Skills 통합을 위한 기술 선택 및 의존성 관리

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [architecture.md](architecture.md)

---

## 1. 기술 스택 개요

```
Claude Skills 기술 스택
├── Frontend
│   ├── React 18.x (UI 프레임워크)
│   ├── TypeScript 5.x (타입 시스템)
│   ├── React Query 5.x (서버 상태 관리)
│   ├── shadcn/ui (UI 컴포넌트)
│   └── Tailwind CSS 3.4.x (스타일링)
│
├── Document Generation
│   ├── SheetJS (xlsx) - Excel 생성
│   ├── docx - Word 문서 생성
│   ├── pptxgenjs - PowerPoint 생성 (선택)
│   └── pdf-lib - PDF 처리 (선택)
│
├── Backend
│   ├── Supabase Edge Functions (Deno)
│   ├── PostgreSQL (Supabase)
│   └── Supabase Realtime (WebSocket)
│
├── Storage
│   └── Supabase Storage (파일 저장)
│
└── Security
    ├── HMAC-SHA256 (웹훅 서명)
    ├── JWT (서비스 토큰)
    └── RLS (Row Level Security)
```

---

## 2. Frontend 기술

### 2.1 React 18 + TypeScript

**선택 이유**:
- **기존 스택 유지**: 프로젝트 전체가 React 18 + TypeScript 기반
- **Server Components 준비**: 향후 Next.js 마이그레이션 대비
- **Strict Mode 호환**: 기존 strict 설정 유지

**버전**: React 18.x, TypeScript 5.x

### 2.2 React Query (TanStack Query)

**선택 이유**:
- **기존 사용 중**: Central Hub에서 이미 React Query 사용
- **캐싱 최적화**: 5분 TTL로 API 호출 최소화
- **Realtime 통합**: Supabase Realtime과 쉽게 연동

**버전**: @tanstack/react-query 5.x

```typescript
// 캐싱 전략 예시
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      refetchOnWindowFocus: false,
    },
  },
});
```

### 2.3 UI 컴포넌트

**선택 이유**:
- **shadcn/ui**: 기존 디자인 시스템 통일
- **Radix UI**: 접근성 기본 제공
- **Tailwind CSS**: 유틸리티 클래스 기반 스타일링

**신규 컴포넌트 계획**:
- `ServiceHealthCard` - 서비스 상태 카드
- `EventTimeline` - 이벤트 타임라인
- `IssueList` - 이슈 목록
- `RFPWizard` - RFP 입력 마법사
- `ExportButton` - Excel/Word 내보내기 버튼

---

## 3. Document Generation 기술

### 3.1 SheetJS (xlsx)

**선택 이유**:
- **브라우저 호환**: 클라이언트 사이드 Excel 생성
- **무료 버전 충분**: 기본 기능으로 요구사항 충족
- **널리 사용됨**: 커뮤니티 지원 활발

**버전**: xlsx 0.18.x

**설치**:
```bash
npm install xlsx
```

**사용 예시**:
```typescript
import * as XLSX from 'xlsx';

export function generateExcel(data: EventData[]): Blob {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

**제한사항**:
- 차트 생성 기능 제한 (Pro 버전 필요)
- 대용량 파일 시 메모리 사용량 증가

### 3.2 docx 라이브러리

**선택 이유**:
- **TypeScript 네이티브**: 타입 정의 기본 제공
- **활발한 유지보수**: 최근까지 업데이트 활발
- **문서화 우수**: 공식 문서 상세함

**버전**: docx 8.x

**설치**:
```bash
npm install docx
```

**사용 예시**:
```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function generateDocument(data: RFPData): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: data.title,
              bold: true,
              size: 28,
            }),
          ],
        }),
        // ... more content
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
```

**제한사항**:
- 복잡한 레이아웃 제한
- 이미지 삽입 시 Base64 변환 필요

### 3.3 pptxgenjs (Sprint 5 구현)

**선택 이유**:
- **브라우저 호환**: 클라이언트 사이드 생성
- **TypeScript 지원**: 타입 정의 제공
- **비교적 안정적**: 널리 사용되는 라이브러리
- **16:9 레이아웃**: 현대적 프레젠테이션 지원

**버전**: pptxgenjs ^3.12.0

**설치**:
```bash
npm install pptxgenjs
```

**사용 예시**:
```typescript
import PptxGenJS from 'pptxgenjs';

export function usePptxGenerate() {
  const generatePresentation = async (slides: SlideContent[], filename: string) => {
    const pptx = new PptxGenJS();

    // 브랜드 스타일 설정
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'IDEA on Action';
    pptx.company = '생각과행동';
    pptx.subject = 'Generated Presentation';

    for (const slide of slides) {
      const pptSlide = pptx.addSlide();
      // 슬라이드 타입별 처리
    }

    await pptx.writeFile({ fileName: filename });
  };

  return { generatePresentation };
}
```

**제한사항**:
- 복잡한 차트는 데이터만 전달 (시각화 제한)
- 애니메이션/전환 효과 미지원
- 마스터 슬라이드 커스텀 제한

### 3.4 pdf-lib (선택)

**선택 이유**:
- **순수 JavaScript**: 외부 의존성 없음
- **PDF 편집/생성 모두 지원**: 다양한 활용 가능
- **작은 번들 크기**: 성능 영향 최소화

**버전**: pdf-lib 1.x

**설치** (필요 시):
```bash
npm install pdf-lib
```

---

## 4. Backend 기술

### 4.1 Supabase Edge Functions (Deno)

**선택 이유**:
- **기존 인프라 활용**: Central Hub Edge Functions 재사용
- **빠른 콜드 스타트**: 50ms 이하 시작 시간
- **TypeScript 네이티브**: 추가 설정 불필요

**환경 변수**:
```bash
# 기존 Central Hub 환경 변수 활용
MINU_FIND_WEBHOOK_SECRET=...
MINU_FRAME_WEBHOOK_SECRET=...
MINU_BUILD_WEBHOOK_SECRET=...
MINU_KEEP_WEBHOOK_SECRET=...

# 신규 Skills 환경 변수
SKILLS_JWT_SECRET=...
SKILLS_STORAGE_BUCKET=generated-documents
```

### 4.2 PostgreSQL (Supabase)

**선택 이유**:
- **기존 DB 활용**: 추가 인프라 불필요
- **RLS 지원**: 보안 정책 일관성 유지
- **JSONB 지원**: 유연한 스키마 확장

**신규 테이블**:
- `document_templates` - 문서 템플릿
- `generated_documents` - 생성된 문서 기록
- `service_tokens` - 서비스 간 인증 토큰

### 4.3 Supabase Realtime

**선택 이유**:
- **기존 구현 활용**: Central Hub Realtime 패턴 재사용
- **WebSocket 관리 자동화**: 연결 관리 불필요
- **Broadcast + Presence**: 다양한 실시간 기능

---

## 5. Storage 기술

### 5.1 Supabase Storage

**선택 이유**:
- **기존 인프라 활용**: 추가 설정 불필요
- **RLS 통합**: 파일 접근 제어 일관성
- **Signed URL**: 임시 다운로드 URL 생성

**버킷 구성**:
```typescript
// 버킷 이름: generated-documents
// 구조:
// generated-documents/
//   ├── {user_id}/
//   │   ├── xlsx/
//   │   │   └── {document_id}.xlsx
//   │   ├── docx/
//   │   │   └── {document_id}.docx
//   │   └── pptx/
//   │       └── {document_id}.pptx
```

**만료 정책**:
- 파일 보관: 7일
- Signed URL 유효기간: 1시간

---

## 6. 보안 기술

### 6.1 HMAC-SHA256

**용도**: 웹훅 서명 검증 (Central Hub 동일)

```typescript
import * as crypto from 'crypto';

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 6.2 JWT (서비스 토큰)

**용도**: 서비스 간 인증

**토큰 구조**:
```typescript
interface ServiceTokenPayload {
  iss: 'idea-on-action-hub';
  sub: ServiceId; // 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep'
  permissions: string[];
  iat: number;
  exp: number;
}
```

**유효기간**:
- Access Token: 1시간
- Refresh Token: 7일

### 6.3 RLS (Row Level Security)

**용도**: 데이터 접근 제어

**정책 패턴**:
```sql
-- 사용자 자신의 데이터만 접근
CREATE POLICY "user_own_data"
  ON generated_documents
  FOR ALL
  USING (created_by = auth.uid());

-- 관리자는 모든 데이터 접근
CREATE POLICY "admin_all_data"
  ON document_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

## 7. 의존성 목록

### 7.1 신규 추가 패키지

| 패키지 | 버전 | 용도 | 번들 영향 |
|--------|------|------|----------|
| `xlsx` | ^0.18.5 | Excel 생성 | ~300KB (gzip ~100KB) |
| `docx` | ^8.5.0 | Word 문서 생성 | ~200KB (gzip ~60KB) |

### 7.2 선택적 패키지

| 패키지 | 버전 | 용도 | 번들 영향 |
|--------|------|------|----------|
| `pptxgenjs` | ^3.12.0 | PowerPoint 생성 | ~400KB |
| `pdf-lib` | ^1.17.1 | PDF 처리 | ~200KB |

### 7.3 기존 패키지 (변경 없음)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@supabase/supabase-js` | ^2.75.0 | Supabase 클라이언트 |
| `@tanstack/react-query` | ^5.x | 서버 상태 관리 |
| `react` | ^18.x | UI 프레임워크 |
| `react-dom` | ^18.x | DOM 렌더링 |
| `typescript` | ^5.x | 타입 시스템 |

---

## 8. 성능 최적화

### 8.1 코드 스플리팅

```typescript
// Skills 모듈 동적 로딩
const XlsxSkill = lazy(() => import('./skills/xlsx'));
const DocxSkill = lazy(() => import('./skills/docx'));

// 사용 시
<Suspense fallback={<Loading />}>
  <XlsxSkill />
</Suspense>
```

### 8.2 번들 최적화

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'xlsx-skill': ['xlsx'],
          'docx-skill': ['docx'],
        },
      },
    },
  },
});
```

### 8.3 캐싱 전략

| 데이터 유형 | TTL | 무효화 조건 |
|------------|-----|-------------|
| 템플릿 목록 | 10분 | 템플릿 수정 시 |
| 생성 문서 목록 | 5분 | 새 문서 생성 시 |
| 서비스 헬스 | 30초 | Realtime 업데이트 |

---

## 9. 확장 계획

### 9.1 Phase 2: 서비스별 특화

- Minu Find: 시장 데이터 연동 (외부 API)
- Minu Frame: RFP 템플릿 고도화
- Minu Build: GitHub 연동 (이슈 → Excel)
- Minu Keep: SLA 모니터링 자동화

### 9.2 Phase 3: AI 통합

- Claude API 연동 (문서 요약, 분류)
- 자연어 → RFP 변환
- 자동 보고서 초안 생성

---

## 10. 마이그레이션 고려사항

### 10.1 기존 코드 영향

| 영역 | 영향 | 조치 |
|------|------|------|
| 번들 크기 | +500KB (xlsx + docx) | 코드 스플리팅 적용 |
| 빌드 시간 | +5초 예상 | Tree shaking 최적화 |
| 타입 정의 | 신규 타입 추가 | `src/types/skills.types.ts` 생성 |

### 10.2 호환성 검증

- [ ] React 18 Strict Mode 호환 확인
- [ ] TypeScript 5.x 타입 호환 확인
- [ ] Vite 빌드 호환 확인
- [ ] PWA precache 크기 확인

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
