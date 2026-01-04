# Changelog

> IDEA on Action 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [3.2.2] - 2026-01-04 🔄 GitHub Releases 자동 동기화

### ✨ 신규 기능

- **GitHub Releases 자동 동기화 시스템**
  - `/api/v1/changelog-entries` API 엔드포인트 생성
  - `syncGitHubReleases` 함수 분리 (Cron에서 직접 호출)
  - 매시간 Cron 트리거 추가 (`0 * * * *`)
  - StoriesHub 변경사항 섹션 `useChangelog` 훅으로 변경
  - D1 데이터베이스 초기 설정 (projects, changelog_entries)

### 📝 문서

- **배포 방식 문서화**
  - CLAUDE.md에 배포 섹션 추가
  - Cloudflare Pages 자동 배포 명시
  - Vercel 사용 금지 경고 추가

---

## [3.2.1] - 2026-01-01 🔧 대규모 @deprecated Re-export 마이그레이션

### 🔧 리팩토링

- **@deprecated Re-export 대규모 마이그레이션**
  - Hooks re-export 20개 삭제 (108 → 88개)
  - Types re-export 20개 삭제 (51 → 31개)
  - 300개+ 파일 import 경로 직접 경로로 변경
  - useAuth (137 사용처), useToast (23 사용처) 마이그레이션
  - central-hub.types, cms.types, skills.types 등 고사용 타입 마이그레이션

- **Types 폴더 도메인별 재구성** (56개 파일)
  - 8개 하위 폴더: `ai/`, `auth/`, `cms/`, `documents/`, `services/`, `subscription/`, `integrations/`, `shared/`
  - 하위 호환성 re-export 파일 생성 (35개)

- **Hooks 폴더 도메인별 재구성** (106개 파일)
  - 15개 하위 폴더: `ai/`, `auth/`, `analytics/`, `cms/`, `content/`, `documents/`, `integrations/`, `media/`, `newsletter/`, `payments/`, `projects/`, `realtime/`, `services/`, `subscription/`, `teams/`
  - `src/hooks/index.ts` barrel export (178줄)
  - 하위 호환성 re-export 파일 생성 (86개)
  - 서브폴더 내 상대 경로 import → 절대 경로 수정 (45개 파일)

- **AlertCenter 컴포넌트 분리** (1,057줄 → 8개 파일)
  - `src/components/central-hub/alert-center/` 폴더 구조화
  - `types.ts`, `utils.ts`, `AlertCenterSkeleton.tsx`
  - `IssueAlertItem.tsx`, `EventAlertItem.tsx`, `AlertItem.tsx`
  - `AlertGroupComponent.tsx`, `index.tsx`

- **TODO 코드 정리**
  - `isXlsxLoaded()`, `isDocxLoaded()`, `isPptxLoaded()` 함수 구현
  - AIChatWidget 대화 저장 TODO → `@see BL-AI-002` 레퍼런스
  - useMCPPermission 권한 구분 TODO → `@see BL-005` 레퍼런스
  - pdf/generate.ts DOCX→PDF TODO → `@limitation` 문서화

### 📝 문서

- Re-export 파일에 `@deprecated` 주석으로 새 경로 안내

---

## [3.2.0] - 2025-12-31 📊 D1 모니터링 대시보드

### ✨ 신규 기능

- **D1 성능 모니터링 대시보드** (Phase 13)
  - 개요 탭: 테이블 목록, 행 수, 데이터베이스 상태
  - 성능 탭: 쿼리 통계, 시계열 차트, 슬로우 쿼리 목록
  - 쿼리 탭: 읽기 전용 SQL 실행 및 결과 표시
  - Recharts 동적 import로 번들 최적화
  - KV 기반 24시간 시계열 데이터 저장
  - 슬로우 쿼리 (100ms+) 자동 추적

### 🔧 리팩토링

- **A2UI Form 훅 분리**: Fast Refresh 경고 해결
  - `useA2UIForm.ts` 파일 분리
  - `A2UIFormContext.tsx`는 Provider/Context만 유지

### 🔒 보안

- **npm audit 취약점 수정**: 3 high → 0
  - qs, body-parser, express 업데이트

### 🧪 테스트

- **useConversationManager 테스트 수정**
  - URL 인코딩 (`%3A`) 반영

---

## [3.1.0] - 2025-12-31 🤖 A2UI 시스템 완성

### ✨ 신규 기능

- **A2UI (Agent-to-UI) 시스템**
  - Phase 1: 코어 렌더러 구현
  - Phase 2: 사이드 패널 구현
  - 25+ 컴포넌트 카탈로그
  - 스트리밍 UI: StreamingText, StreamingIndicator
- **AI 채팅 위젯 A2UI 통합**
  - Feature Flag: VITE_FEATURE_TOOL_USE

### 🧪 테스트

- A2UI 유닛 테스트 71개
- useMinuSSO 훅 유닛 테스트 20개

---

## [3.0.1] - 2025-12-30 🚀 성능 및 접근성 개선

### ♿ 접근성 (Accessibility)

- **Lighthouse 접근성 100% 달성**
- 15개 UI 컴포넌트에 aria-hidden, aria-label 추가
- 한글 스크린리더 텍스트 적용
- dialog, select, pagination, sheet, accordion 등 개선

### ⚡ 성능 (Performance)

- **폰트 비동기 로드**: Pretendard, JetBrains Mono preload + onload
  - 렌더 차단 2147ms → 0ms
- **이미지 WebP 변환**: 로고 파일 68KB 절약
  - logo-full: 76KB → 51KB (32% 감소)
  - logo-symbol: 29KB → 14KB (53% 감소)
  - logo-grayscale: 68KB → 40KB (42% 감소)

### 🧪 테스트

- **Minu SSO E2E 테스트**: 27개 테스트 케이스 추가
  - PKCE OAuth 플로우
  - 토큰 갱신/로그아웃
  - 세션 관리, 에러 처리
  - 구독 통합 테스트

### 🔒 보안

- **npm audit 취약점 수정**: 6개 → 4개
  - esbuild 0.25.0 override 적용

---

## [3.0.0] - 2025-12-29 🎉 Cloudflare 전환 완료

### 🚀 Major Release: Cloudflare 인프라 전환 완료

**Supabase → Cloudflare 완전 마이그레이션 완료!**

v2.40.x 시리즈를 통해 진행된 Cloudflare Workers 전환 작업이 완료되어 v3.0.0 메이저 버전을 릴리스합니다.

#### 🏗️ 인프라 변경 요약

| 항목 | Before (v2.x) | After (v3.0) |
|------|---------------|--------------|
| **Backend** | Supabase Edge Functions | Cloudflare Workers (Hono) |
| **Database** | Supabase PostgreSQL | Cloudflare D1 (SQLite) |
| **Storage** | Supabase Storage | Cloudflare R2 |
| **Cache** | - | Cloudflare KV |
| **Realtime** | Supabase Realtime | Durable Objects |
| **Vector DB** | - | Cloudflare Vectorize |
| **Hosting** | Vercel | Cloudflare Pages |

#### 📊 마이그레이션 성과

| 항목 | 수치 |
|------|------|
| Workers API 핸들러 | 31개 |
| D1 테이블 | 80개 |
| 삭제된 Supabase 코드 | 480+ 파일, 120,000+ 줄 |
| Worker 크기 | 562.63 KiB (gzip 101.78 KiB) |

#### ✅ 완료된 마이그레이션 Phase

| Phase | 내용 | 핸들러 |
|-------|------|--------|
| 1-2 | 기본 API, Users, Sessions, Teams | 8개 |
| 3 | OAuth 2.0, 토스페이먼츠 결제 | 5개 |
| 4 | RAG 검색, R2 스토리지 | 2개 |
| 5-6 | Auth, Realtime WebSocket | 2개 |
| 7 | MCP Auth/Events/Router/Sync | 4개 |
| 8 | Minu SSO OAuth/Token/Webhook | 3개 |
| 9 | Cron 정기결제 처리 | 1개 |
| 10 | Profile Sync | 1개 |
| 11 | Claude AI Chat/Vision | 1개 |
| 12 | Webhook/Newsletter/GitHub/Recap | 4개 |

#### 🎯 주요 이점

- **성능 향상**: Edge 네트워크 기반 글로벌 저지연
- **비용 절감**: 서버리스 아키텍처로 운영 비용 최적화
- **확장성**: Cloudflare 글로벌 인프라 활용
- **통합 관리**: 단일 플랫폼에서 모든 인프라 관리

#### 📦 정리된 레거시

| 버전 | 작업 내용 | 파일 수 |
|------|----------|---------|
| v2.40.5 | Edge Function 코드 제거 | 5개 |
| v2.40.6 | 테스트 파일 마이그레이션 | 44개 |
| v2.40.7 | 스크립트/마이그레이션 삭제 | 250개 |
| v2.40.8 | 문서 파일 삭제 | 175개 |
| v2.40.9 | npm scripts 정리 | 11개 |

**Supabase 프로젝트 삭제 완료** ✅

---

## [2.40.9] - 2025-12-29 (Supabase 마이그레이션 완전 정리)

### 🧹 Phase 9: 최종 정리 및 검증

Supabase 마이그레이션 완료 후 orphaned scripts 제거 및 최종 검증.

#### 제거된 npm scripts (11개)

| 스크립트 | 사유 |
|---------|------|
| `generate:screenshots` | scripts/testing 폴더 삭제됨 |
| `check:rls` | scripts/db 폴더 삭제됨 |
| `fix:rls` | scripts/db 폴더 삭제됨 |
| `migrate:r2` | scripts/migrate-to-r2.ts 삭제됨 |
| `migrate:r2:dry` | scripts/migrate-to-r2.ts 삭제됨 |
| `migrate:d1:extract` | scripts/migrate-to-d1.ts 삭제됨 |
| `migrate:d1:execute` | scripts/d1-execute.ts 삭제됨 |
| `migrate:d1:all` | scripts/d1-execute.ts 삭제됨 |
| `migrate:supabase-to-d1` | scripts/migrate-supabase-to-d1.ts 삭제됨 |
| `migrate:supabase-to-d1:dry` | scripts/migrate-supabase-to-d1.ts 삭제됨 |
| `migrate:supabase-to-d1:table` | scripts/migrate-supabase-to-d1.ts 삭제됨 |

#### 최종 검증 결과

| 검증 항목 | 결과 |
|----------|------|
| `@supabase/supabase-js` import | 0개 ✅ |
| `supabase.(from\|rpc\|auth\|storage)(` 호출 | 0개 ✅ |
| `/functions/v1/` URL | 0개 ✅ |
| 빌드 | 성공 ✅ |
| 린트 | 0 에러 ✅ |
| 테스트 (샘플 82개) | 통과 ✅ |

---

## [2.40.0] ~ [2.40.8]

v2.40.x 시리즈의 상세 변경 내역은 v3.0.0 섹션에 통합되었습니다.

---

## [2.38.0] ~ [2.36.0]

12월 중순 버전 상세 내역은 [2025년 12월 초 아카이브](../archive/changelog-2025-december-early.md)를 참조하세요.

---

## 📁 이전 버전 아카이브

이전 버전의 변경 내역은 아카이브로 이동되었습니다.

- **[2025년 12월 초 아카이브](../archive/changelog-2025-december-early.md)** - v2.24.0 ~ v2.35.0
- **[2025년 11월 아카이브](../archive/changelog-2025-november.md)** - v2.0.0 ~ v2.23.0

---

## Version Format

```text
MAJOR.MINOR.PATCH

MAJOR: Phase 완료, Breaking Changes (2.0.0, 3.0.0...)
MINOR: 주요 기능 추가 (1.1.0, 1.2.0...)
PATCH: 버그 수정, 문서 업데이트 (1.0.1, 1.0.2...)
```

---

## Related Documents

- [Roadmap](./roadmap.md) - 프로젝트 로드맵
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
