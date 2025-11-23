# Bug Fixes Log

> 프로젝트에서 발생한 버그와 해결 방법을 기록합니다.
> 향후 유사한 문제 발생 시 빠른 해결을 위한 참조 문서입니다.

**최종 업데이트**: 2025-11-23

---

## 목차

1. [2025-11-23: StoriesHub RLS 권한 오류 (newsletter_archive, changelog_entries)](#2025-11-23-storieshub-rls-권한-오류)
2. [2025-11-23: notices 테이블 접근 에러](#2025-11-23-notices-테이블-접근-에러)
3. [2025-11-23: StoriesHub 레이아웃 누락](#2025-11-23-storieshub-레이아웃-누락)

---

## 2025-11-23: StoriesHub RLS 권한 오류

### 증상
- `/stories` 페이지에서 뉴스레터 섹션과 변경사항 섹션이 로드되지 않음
- "아직 발행된 뉴스레터가 없습니다", "아직 등록된 변경사항이 없습니다" 메시지 표시
- 콘솔에 403 Forbidden 에러 반복 발생

### 에러 메시지
```
GET https://zykjdneewbzyazfukzyg.supabase.co/rest/v1/newsletter_archive?select=*&order=sent_at.desc&limit=3 403 (Forbidden)

[useNewsletterArchive] 조회 에러: {code: '42501', details: null, hint: null, message: 'permission denied for table newsletter_archive'}

GET https://zykjdneewbzyazfukzyg.supabase.co/rest/v1/changelog_entries?select=*%2Cproject%3Aprojects%28id%2Ctitle%2Cslug%29&order=released_at.desc&limit=3 403 (Forbidden)

[useChangelog] 조회 에러: {code: '42501', details: null, hint: null, message: 'permission denied for table changelog_entries'}
```

### 원인
- `newsletter_archive`와 `changelog_entries` 테이블에 RLS가 활성화되어 있음
- 마이그레이션 파일에 RLS 정책이 정의되어 있었으나, **프로덕션 DB에 적용되지 않음**
- `anon` 역할에 테이블 SELECT 권한(GRANT)이 누락됨
- PostgreSQL 에러 코드 `42501` = permission denied

### 해결
Supabase 대시보드 SQL Editor에서 아래 SQL 실행:

```sql
-- 1. newsletter_archive 테이블
DROP POLICY IF EXISTS "newsletter_archive_select_public" ON public.newsletter_archive;
ALTER TABLE public.newsletter_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_archive_select_public"
  ON public.newsletter_archive
  FOR SELECT
  TO public
  USING (true);

GRANT SELECT ON public.newsletter_archive TO anon;
GRANT SELECT ON public.newsletter_archive TO authenticated;

-- 2. changelog_entries 테이블
DROP POLICY IF EXISTS "changelog_select_public" ON public.changelog_entries;
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "changelog_select_public"
  ON public.changelog_entries
  FOR SELECT
  TO public
  USING (true);

GRANT SELECT ON public.changelog_entries TO anon;
GRANT SELECT ON public.changelog_entries TO authenticated;

-- 3. projects 테이블 권한 (changelog JOIN용)
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.projects TO authenticated;
```

### 관련 파일
- `supabase/migrations/20251123220000_fix_stories_hub_rls.sql` - 마이그레이션 파일
- `scripts/fix-stories-hub-rls.cjs` - RLS 진단 스크립트
- `src/hooks/useNewsletterArchive.ts` - 뉴스레터 아카이브 훅
- `src/hooks/useChangelog.ts` - 변경 로그 훅

### 교훈
1. **RLS 정책 ≠ 테이블 접근 권한**: RLS 정책이 있어도 GRANT 없으면 접근 불가
2. **마이그레이션 적용 확인 필수**: `supabase db push` 실행 후 실제 적용 여부 확인
3. **Service Role vs Anon 테스트**: Service Role은 RLS 우회하므로, 반드시 anon 키로 테스트

### 진단 방법
```bash
# RLS 진단 스크립트 실행
node scripts/fix-stories-hub-rls.cjs
```

출력 예시:
```
📋 RLS 정책 확인...
❌ [anon] newsletter_archive 조회 실패: 42501 permission denied
❌ [anon] changelog_entries 조회 실패: 42501 permission denied
```

### 새 테이블 체크리스트
```sql
-- 1. RLS 활성화
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- 2. RLS 정책 생성 (TO public 또는 TO anon, authenticated)
CREATE POLICY "{policy_name}"
  ON public.{table_name}
  FOR SELECT
  TO public
  USING (true);

-- 3. GRANT 권한 부여 (필수!)
GRANT SELECT ON public.{table_name} TO anon;
GRANT SELECT ON public.{table_name} TO authenticated;
```

---

## 2025-11-23: notices 테이블 접근 에러

### 증상
- `/stories` 페이지에서 공지사항이 로드되지 않음
- 콘솔에 Supabase API 에러 발생

### 에러 1: 400 Bad Request

**에러 메시지**:
```
GET https://...supabase.co/rest/v1/notices?select=*,author:author_id(id,email,raw_user_meta_data)... 400 (Bad Request)
```

**원인**:
- `auth.users` 테이블은 Supabase 시스템 테이블로, 일반 테이블처럼 FK 조인이 불가능
- `author:author_id(id, email, raw_user_meta_data)` 쿼리 구문이 실패

**해결**:
```typescript
// 변경 전 (src/hooks/useNotices.ts)
.select(`
  *,
  author:author_id(id, email, raw_user_meta_data)
`)

// 변경 후
.select('*')
```

**교훈**:
- Supabase의 `auth.users`는 특수 시스템 테이블
- 사용자 정보가 필요하면 별도 `profiles` 테이블 생성 후 조인 필요
- 또는 별도 API 호출로 사용자 정보 조회

---

### 에러 2: 401 Unauthorized

**에러 메시지**:
```
GET https://...supabase.co/rest/v1/notices?select=*&status=eq.published... 401 (Unauthorized)
```

**원인**:
- RLS 정책은 올바르게 설정되어 있었음 (`TO anon, authenticated`)
- 그러나 `anon` 역할에 테이블 SELECT 권한(GRANT)이 누락됨

**해결**:
```sql
-- Supabase SQL Editor에서 실행
GRANT SELECT ON public.notices TO anon;
GRANT SELECT ON public.notices TO authenticated;
```

**마이그레이션 파일**: `supabase/migrations/20251123100000_fix_notices_rls_anon.sql`

**교훈**:
- RLS 정책과 테이블 GRANT 권한은 별개
- RLS 정책에 `TO anon` 추가해도 GRANT 없으면 접근 불가
- 새 테이블 생성 시 항상 GRANT 권한 확인 필요

**체크리스트** (새 테이블 생성 시):
```sql
-- 1. RLS 활성화
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- 2. RLS 정책 생성
CREATE POLICY "..." ON public.{table_name} FOR SELECT TO anon, authenticated USING (...);

-- 3. GRANT 권한 부여 (중요!)
GRANT SELECT ON public.{table_name} TO anon;
GRANT SELECT ON public.{table_name} TO authenticated;
```

---

## 2025-11-23: StoriesHub 레이아웃 누락

### 증상
- `/stories` 페이지에서 글로벌 Header/Footer가 표시되지 않음
- 다른 페이지들과 레이아웃 불일치

### 원인
- `StoriesHub.tsx` 컴포넌트가 `PageLayout` 으로 감싸지지 않음
- 다른 Hub 페이지들(`ProjectsHub`, `ConnectHub`)은 `PageLayout` 사용 중

### 해결
```typescript
// src/pages/stories/StoriesHub.tsx
import { PageLayout } from "@/components/layouts";

export default function StoriesHub() {
  return (
    <PageLayout>
      <div className="container py-12">
        {/* 페이지 내용 */}
      </div>
    </PageLayout>
  );
}
```

### 교훈
- 새 페이지 생성 시 항상 `PageLayout` 적용 확인
- Hub 페이지들은 일관된 레이아웃 구조 유지 필요

---

## 버그 픽스 기록 템플릿

새로운 버그 수정 시 아래 템플릿을 사용하세요:

```markdown
## YYYY-MM-DD: [버그 제목]

### 증상
- 사용자가 경험한 문제 설명

### 에러 메시지
```
실제 에러 메시지 또는 콘솔 로그
```

### 원인
- 근본 원인 분석

### 해결
```typescript/sql/etc
// 수정된 코드
```

### 관련 파일
- `path/to/file1.ts`
- `path/to/file2.sql`

### 교훈
- 향후 예방을 위한 교훈
- 체크리스트 항목 추가 (필요시)
```

---

## 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 개발 문서
- [Supabase RLS 가이드](../guides/database/) - 데이터베이스 보안 설정
- [컴포넌트 레이아웃](../guides/design-system/) - 디자인 시스템
