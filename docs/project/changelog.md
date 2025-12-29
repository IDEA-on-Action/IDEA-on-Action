# Changelog

> IDEA on Action 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [2.40.6] - 2025-12-29 (테스트 파일 Workers API 마이그레이션)

### 🧪 Phase 6: 테스트 파일 마이그레이션 완료

44개 테스트 파일을 Supabase 모킹에서 Cloudflare Workers API 모킹으로 마이그레이션.

#### 마이그레이션 현황

| 카테고리 | 파일 수 | 주요 파일 |
|----------|---------|-----------|
| 훅 테스트 | 39개 | useCart, useOrders, useProjects 등 |
| 컨텍스트 테스트 | 2개 | PermissionContext, MCPPermissionContext |
| 라이브러리 테스트 | 2개 | mcp-token-service 등 |
| 컴포넌트 테스트 | 1개 | AdminSidebar |

#### 모킹 패턴 변경

```typescript
// Before (Supabase)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() }
}))

// After (Workers API)
vi.mock('@/integrations/cloudflare/client', () => ({
  cartApi: { get: vi.fn(), add: vi.fn() },
  ordersApi: { list: vi.fn() }
}))
```

#### 검증 결과

| 항목 | 결과 |
|------|------|
| Supabase import (tests/) | 0건 ✅ |
| 빌드 | 성공 ✅ |
| 린트 에러 | 0개 ✅ |

**Supabase 프로젝트 삭제 준비 완료**

---

## [2.40.5] - 2025-12-29 (Supabase Edge Function 완전 제거)

### 🔥 Phase 5: Supabase API 직접 호출 완전 제거

프로덕션 코드에서 모든 Supabase Edge Function 및 직접 API 호출 제거.

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/contexts/PermissionContext.tsx` | `supabase.rpc()` → `permissionsApi.getMyPermissions()` |
| `src/contexts/PermissionContext.tsx` | `supabase.from()` → `adminsApi.checkIsAdmin()` |
| `src/hooks/useMCPToken.ts` | `/functions/v1/oauth-token` → Workers API |
| `src/components/ai/ImageAnalyzer.tsx` | `/functions/v1/claude-vision` → Workers API |
| `src/lib/claude.ts` | `/functions/v1/claude-usage` → Workers API |

### ✅ Supabase 프로젝트 삭제 준비 완료

| 검증 항목 | 결과 |
|-----------|------|
| `/functions/v1/` 참조 | 0개 ✅ |
| `supabase.rpc()` 직접 호출 | 0개 ✅ |
| `supabase.from()` 직접 호출 | 0개 (주석 제외) ✅ |
| 빌드 | 성공 ✅ |
| 린트 | 0 에러 ✅ |

**Supabase 프로젝트를 안전하게 삭제할 수 있습니다.**

---

## [2.40.4] - 2025-12-29 (Supabase 환경변수 완전 제거)

### 🧹 Phase 4: 환경변수 및 CI/CD 정리

Supabase 프로젝트 삭제를 위한 최종 정리 작업.

#### 프로덕션 코드 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/claude.ts` | `VITE_SUPABASE_URL` → `VITE_WORKERS_API_URL` |
| `src/lib/image-optimizer.ts` | `supabase.co/storage` → `media.ideaonaction.ai` |
| `src/lib/media-utils.ts` | `isSupabaseStorageUrl` @deprecated 표시 |

#### 환경변수 정리

| 파일 | 변경 내용 |
|------|----------|
| `.github/workflows/ci.yml` | `VITE_SUPABASE_*` → `VITE_WORKERS_API_URL` |
| `.env.example` | Supabase 환경변수 제거 |
| `src/vite-env.d.ts` | `VITE_SUPABASE_*` 타입 제거 |

#### 테스트 마이그레이션

| 파일 | 변경 내용 |
|------|----------|
| `tests/unit/hooks/useCart.test.tsx` | `cartApi` 모킹으로 전환 |
| `tests/unit/hooks/useOrders.test.tsx` | `ordersApi` 모킹으로 전환 |
| `tests/unit/hooks/useProjects.test.tsx` | `projectsApi` 모킹으로 전환 |

### 📊 Supabase 삭제 준비 완료

| 항목 | 상태 |
|------|------|
| 프로덕션 코드 Supabase URL 참조 | ✅ 0개 |
| CI/CD Supabase 환경변수 | ✅ 제거 |
| 환경변수 타입 정의 | ✅ Workers API로 전환 |
| 빌드 | ✅ 성공 |
| 린트 | 0 에러, 5 경고 |

**다음 단계**: GitHub Secrets에서 `VITE_SUPABASE_*` 제거, Supabase 프로젝트 삭제 가능

---

## [2.40.3] - 2025-12-29 (프로덕션 코드 Workers API 완전 전환)

### 🔄 Phase 3: 프로덕션 코드 마이그레이션

프로덕션 코드에서 `supabase` 변수를 직접 사용하던 6개 파일을 Workers API로 마이그레이션.

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/admin/AdminServices.tsx` | `servicesApi.list()`, `servicesApi.delete()` 사용 |
| `src/pages/admin/CreateService.tsx` | `servicesApi.getCategories()`, `servicesApi.create()` 사용 |
| `src/pages/admin/AdminUsers.tsx` | `callWorkersApi('/api/v1/admin/users/search')` 사용 |
| `src/lib/claude.ts` | localStorage 기반 토큰 조회로 변경 |
| `src/lib/audit/audit-logger.ts` | Workers API `/api/v1/audit/log` 엔드포인트 사용 |
| `src/lib/auth/mcp-token-service.ts` | 4개 MCP 토큰 RPC를 Workers API로 마이그레이션 |

### 📊 Supabase 마이그레이션 완료 현황

| 항목 | 상태 |
|------|------|
| 프로덕션 코드 `supabase` 직접 사용 | 0개 (완전 제거) |
| `@supabase/supabase-js` import in `src/` | 0개 |
| 테스트 호환성 shim | `src/integrations/supabase/client.ts` 유지 |

---

## [2.40.2] - 2025-12-29 (Vercel/Supabase 레거시 정리)

### 🧹 레거시 리소스 정리

Cloudflare Workers 마이그레이션 완료 후 Vercel/Supabase 레거시 리소스 정리.

#### Phase 1: 즉시 정리

| 항목 | 변경 내용 |
|------|----------|
| `.vercelignore` | 파일 삭제 (Cloudflare Pages 사용) |
| Vercel Toolbar CSS | `src/index.css` 25줄 제거 |
| `VITE_SUPABASE_JWT_SECRET` | `.env.local`에서 제거 |
| npm prune | 9개 extraneous 패키지 제거 |

#### Phase 2: 타입 import 정리

| 파일 | 변경 내용 |
|------|----------|
| `src/skills/xlsx/queries.ts` | `LegacySupabaseClient` 로컬 타입 정의 |
| `src/skills/xlsx/generators/eventReportWithChart.ts` | 동일 |
| `src/skills/xlsx/centralHubExport.ts` | 동일 |
| `src/components/profile/ProfileHeader.tsx` | `AuthUser` 로컬 타입 정의 |

### 🔄 마이그레이션

| 파일 | 변경 내용 |
|------|----------|
| `scripts/deploy/generate-sitemap.ts` | Supabase → Workers API 마이그레이션 |
| 8개 훅 테스트 파일 | Workers API 모킹으로 마이그레이션 |

### 📊 결과

| 항목 | 수치 |
|------|------|
| `@supabase/supabase-js` import in `src/` | 0개 (완전 제거) |
| 빌드 | ✅ 성공 |
| 린트 | 0 에러, 5 경고 |

---

## [2.40.1] - 2025-12-28 (ExcelJS 보안 패치)

### 🔒 보안 수정

xlsx 라이브러리의 High severity 보안 취약점 해결을 위해 ExcelJS로 마이그레이션.

#### 해결된 취약점

| 취약점 | 심각도 | CVE |
|--------|--------|-----|
| Prototype Pollution | High | GHSA-4r6h-8v6p-xvw6 |
| ReDoS | High | GHSA-5pgg-2g8v-p9 |

#### 취약점 현황

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 총 취약점 | 7개 | 6개 |
| High severity | 1개 | 0개 |

### 🔄 마이그레이션 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/skills/excel/types.ts` | 신규 - ExcelJS 타입 정의 |
| `src/lib/skills/excel/adapter.ts` | 신규 - xlsx API 호환 어댑터 |
| `src/lib/skills/lazy-loader.ts` | ExcelJS 로더 추가 |
| `src/hooks/useXlsxExport.ts` | ExcelJS 내보내기 |
| `src/lib/skills/xlsx/import.ts` | ExcelJS 파일 읽기 |
| `src/lib/skills/xlsx/chartInsert.ts` | ExcelJS 이미지 삽입 API |
| `src/lib/skills/xlsx-chart.ts` | ExcelJS 차트 삽입 |
| `src/lib/skills/xlsx/chart-exporter.ts` | ExcelJS ZIP 내보내기 |
| `src/skills/xlsx/useXlsxExport.ts` | Central Hub 내보내기 |
| `src/skills/xlsx/generators/eventReportWithChart.ts` | 차트 리포트 |

### 📦 의존성 변경

- ➕ `exceljs ^4.4.0`
- ➖ `xlsx` (보안 취약점으로 제거)

---

## [2.40.0] - 2025-12-28 (Cloudflare Workers 마이그레이션 100% 완료)

### 🎉 주요 변경사항

Supabase Edge Functions에서 Cloudflare Workers로 전체 마이그레이션 완료.

#### 마이그레이션 현황

| 항목 | 수치 |
|------|------|
| 총 핸들러 | 31개 (100%) |
| D1 테이블 | 80개 |
| Worker 크기 | 562.63 KiB (gzip 101.78 KiB) |

#### Phase 12 핸들러 (최종)

| 핸들러 | 엔드포인트 | 기능 |
|--------|-----------|------|
| `webhook-send` | POST /webhooks/send | HMAC-SHA256 서명 웹훅 발송 |
| `newsletter-send` | POST /notifications/newsletter/send | Resend API 배치 이메일 |
| `github-releases` | POST /cron/github-releases/sync | GitHub 릴리즈 동기화 |
| `weekly-recap` | POST /cron/weekly-recap/generate | 주간 활동 요약 자동 생성 |

#### 마이그레이션 Phase 요약

| Phase | 내용 | 핸들러 수 |
|-------|------|---------|
| 1-2 | 기본 API, Users, Sessions, Teams | 8 |
| 3 | OAuth 2.0, 토스페이먼츠 결제 | 5 |
| 4 | RAG 검색, R2 스토리지 | 2 |
| 5-6 | Auth, Realtime WebSocket | 2 |
| 7 | MCP Auth/Events/Router/Sync | 4 |
| 8 | Minu SSO OAuth/Token/Webhook | 3 |
| 9 | Cron 정기결제 처리 | 1 |
| 10 | Profile Sync | 1 |
| 11 | Claude AI Chat/Vision | 1 |
| 12 | Webhook/Newsletter/GitHub/Recap | 4 |

### 🗂️ 코드 정리

- Supabase Edge Functions → `supabase/functions-archive/` 아카이브
- 32개 함수 참조용 보관
- README 문서 추가

### 🛠️ 기술 스택

| 항목 | 기술 |
|------|------|
| Runtime | Cloudflare Workers (Hono) |
| Database | D1 (SQLite) |
| Storage | R2 |
| Cache | KV Namespace |
| Realtime | Durable Objects |
| Vector | Vectorize |

---

## [2.38.0] - 2025-12-17 (Newsletter 자동 발송 및 컨텐츠 버전 관리)

### ✨ 신규 기능

Newsletter 자동 발송 시스템 구현 및 컨텐츠 변경 이력 추적 기능 추가.

#### Newsletter 자동 발송 시스템

| 파일 | 설명 |
|------|------|
| `supabase/functions/newsletter-send/index.ts` | Resend API 배치 발송 (50명씩) |
| `supabase/migrations/20251217000001_newsletter_scheduler.sql` | `newsletter_drafts`, `newsletter_send_logs` 테이블 |
| `src/hooks/useNewsletterDrafts.ts` | CRUD, 예약, 즉시 발송, 통계 훅 |

- 드래프트 상태: draft → scheduled → sending → sent/failed
- 구독자 세그멘테이션: `segment_filter` JSONB (상태, 토픽 기반)
- 테스트 모드 지원: 단일 이메일로 테스트 발송

#### 컨텐츠 버전 관리 시스템

| 파일 | 설명 |
|------|------|
| `supabase/migrations/20251217000002_content_versions.sql` | `content_versions` 테이블 |
| `src/hooks/useContentVersions.ts` | 버전 조회, 복원, 비교 훅 |

- 지원 타입: blog_post, notice, service, portfolio, page
- 자동 버전 생성: `auto_version_blog_post()` 트리거
- 버전 복원: `restore_content_version()` 함수
- 버전 비교: `compare_content_versions()` 함수

#### 배포

| Function | 상태 |
|----------|------|
| newsletter-send | ✅ 배포됨 |

### 🚀 성능 최적화

#### PWA Precache 90% 감소

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| Precache 크기 | 1627 KiB | 157 KiB |
| 항목 수 | 28개 | 11개 |

- JS 번들을 runtime caching (CacheFirst)으로 전환
- CSS, 폰트, workbox만 precache 유지

#### LCP/CLS 개선

| 최적화 | 변경 내용 |
|--------|----------|
| Hero 이미지 | `loading="eager"`, `fetchPriority="high"` |
| Google Fonts | 필수 weight만 로드 (9→4개) |
| CLS 방지 | 시스템 폰트 fallback, `font-display: swap` |

#### SEO 메타 태그 개선

- Schema.org Organization 마크업 추가
- Schema.org WebSite + SearchAction 마크업 추가
- `robots`, `canonical` 메타 태그 추가

### 🛠️ Supabase 마이그레이션

Dashboard SQL Editor에서 수동 적용 완료:

- `20251217000001_newsletter_scheduler.sql`
- `20251217000002_content_versions.sql`

---

## [2.37.10] - 2025-12-17 (Minu 서비스 연동 개선)

### ✨ 신규 기능

Minu 서비스 연동 기능 전면 점검 및 개선. 공유 모듈 생성, 스키마 검증 강화, 단위 테스트 추가.

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `supabase/functions/_shared/constants.ts` | JWT 설정, 서비스 ID, Scope, 보안 상수 통합 |
| `supabase/functions/_shared/error-codes.ts` | 에러 코드, 메시지, HTTP 상태 코드 매핑 |
| `supabase/functions/_shared/schemas.ts` | Zod 스키마 (BaseEvent, LegacyPayload) |

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `cors.ts` | `x-signature`, `x-service-id`, `x-timestamp` 헤더 추가 |
| `mcp-auth/index.ts` | 공유 상수 import, `minu-portal` 서비스 ID 추가 |
| `jwt-verify.ts` | 공유 상수/에러 코드 import |
| `receive-service-event/index.ts` | Zod 스키마 검증 추가, 에러 응답 통일 |

#### 단위 테스트 추가 (81개)

| 파일 | 테스트 수 | 내용 |
|------|----------|------|
| `constants.test.ts` | 14개 | 서비스 ID, Scope, JWT 설정 검증 |
| `error-codes.test.ts` | 14개 | 에러 코드/상태 코드 매핑 검증 |
| `schemas.test.ts` | 24개 | BaseEvent/Legacy 스키마 검증 |
| `security.test.ts` | 29개 | Timing-safe 비교, 타임스탬프, HMAC 검증 |

#### 배포

| Function | 크기 | 상태 |
|----------|------|------|
| mcp-auth | 147.5kB | ✅ 배포됨 |
| receive-service-event | 209.9kB | ✅ 배포됨 |

---

## [2.37.9] - 2025-12-17 (Preview 도메인 및 단건결제 테스트 환경)

### ✨ 신규 기능

Preview 배포 환경(`preview.ideaonaction.ai`) 구축 및 단건결제 테스트 환경 설정.

#### CORS 설정 업데이트

| 파일 | 변경 내용 |
|------|----------|
| `supabase/functions/_shared/cors.ts` | `https://preview.ideaonaction.ai` 도메인 추가 |

#### Git 브랜치 설정

| 브랜치 | 용도 |
|--------|------|
| `main` | Production (`www.ideaonaction.ai`) |
| `staging` | Preview (`preview.ideaonaction.ai`) |
| `test/toss-payment-debug` | 단건결제 디버깅용 |

#### Vercel 환경 설정

| 환경 | 토스페이먼츠 키 |
|------|----------------|
| Production | `live_ck_*` (라이브 키) |
| Preview/Development | `test_ck_*` (테스트 키) |

#### 외부 서비스 설정

| 서비스 | 설정 항목 |
|--------|----------|
| Supabase | Redirect URLs에 `preview.ideaonaction.ai` 추가 |
| Google OAuth | Authorized origins/redirect URIs 추가 |
| Edge Functions | 27개 함수 재배포 (CORS 적용) |

---

## [2.37.8] - 2025-12-17 (receive-service-event 하이브리드 인증)

### ✨ 신규 기능

receive-service-event Edge Function에 하이브리드 인증 및 BaseEvent 스키마 지원 추가. JWT Bearer 토큰과 HMAC-SHA256 서명 방식을 모두 지원하여 Minu 서비스 연동 유연성 확보.

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `supabase/functions/_shared/jwt-verify.ts` | mcp-auth 발급 JWT 검증 유틸리티 |

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/functions/receive-service-event/index.ts` | 하이브리드 인증 (JWT + HMAC), BaseEvent 스키마 지원 |

#### 인증 방식

| 방식 | 헤더 | 용도 |
|------|------|------|
| JWT Bearer | `Authorization: Bearer <token>` | mcp-auth 발급 토큰 (15분 만료) |
| HMAC-SHA256 | `X-Signature`, `X-Service-Id`, `X-Timestamp` | 웹훅 서명 검증 |

#### 지원 페이로드 스키마

| 스키마 | 필드 | 설명 |
|--------|------|------|
| BaseEvent | `id`, `type`, `service`, `timestamp`, `version`, `data`, `metadata` | @idea-on-action/events 패키지 형식 |
| Legacy | `event_type`, `payload`, `project_id`, `user_id` | 기존 웹훅 형식 |

#### 토큰 갱신 엔드포인트

| 항목 | 값 |
|------|-----|
| URL | `POST /functions/v1/mcp-auth/refresh` |
| 요청 | `{ "grant_type": "refresh_token", "refresh_token": "rt_..." }` |
| Access Token 유효기간 | 15분 |
| Refresh Token 유효기간 | 7일 |

---

## [2.37.7] - 2025-12-17 (토스페이먼츠 결제 키 설정)

### ⚙️ 설정

토스페이먼츠 라이브 결제 키 환경변수 설정 및 Supabase Edge Function secrets 업데이트.

#### 설정된 환경변수 (.env.local)

| 변수 | 용도 |
|------|------|
| `VITE_TOSS_WIDGET_CLIENT_KEY` | 결제위젯 클라이언트 키 |
| `VITE_TOSS_WIDGET_SECRET_KEY` | 결제위젯 시크릿 키 |
| `VITE_TOSS_BILLING_CLIENT_KEY` | 정기결제용 클라이언트 키 (bill_ideao51b9) |
| `VITE_TOSS_BILLING_SECRET_KEY` | 정기결제용 시크릿 키 |
| `VITE_TOSS_NORMAL_*` | 일반결제용 키 (wh_ideaonaowz) - 심사 미완료 |

#### 설정된 Supabase Secrets

| Secret | 용도 |
|--------|------|
| `TOSS_PAYMENTS_SECRET_KEY` | 정기결제 빌링키 발급 |
| `TOSS_SECRET_KEY` | 결제위젯 결제 승인 |

---

## [2.37.6] - 2025-12-15 (MCP Auth 서비스 토큰 시스템)

### ✨ 신규 기능

MCP Auth 서비스 토큰 시스템 설정. Minu 서비스들이 ideaonaction.ai API에 인증된 요청을 보낼 수 있도록 토큰 기반 인증 시스템 구축.

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `scripts/generate-service-token.cjs` | 서비스 토큰 발급 스크립트 |
| `supabase/migrations/20251215001001_create_service_tokens.sql` | service_tokens 테이블 생성 |
| `supabase/migrations/20251215001002_create_mcp_audit_log.sql` | mcp_audit_log 테이블 생성 |

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/functions/mcp-auth/index.ts` | CORS 버그 수정 및 재배포 |
| `.env.example` | MCP_JWT_SECRET 환경 변수 문서화 |

#### 설정된 Supabase Secrets

| Secret | 용도 |
|--------|------|
| `WEBHOOK_SECRET_MINU_FIND` | Minu Find 웹훅 서명 검증 |
| `MCP_JWT_SECRET` | JWT 토큰 서명/검증 |

---

## [2.37.5] - 2025-12-15 (Minu Inbound 이벤트 시스템)

### ✨ 신규 기능

Minu 서비스(Find, Frame, Build, Keep, Portal)에서 발송하는 Outbound 이벤트를 수신하는 Inbound 이벤트 시스템 구현.

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/functions/receive-service-event/index.ts` | minu-portal 서비스 추가, 9개 이벤트 타입 라우팅 |
| `supabase/functions/mcp-router/index.ts` | minu-portal 서비스 추가, 8개 라우팅 규칙 추가 |

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `src/types/inbound-events.types.ts` | Inbound 이벤트 타입 정의 (명세 기반) |
| `supabase/functions/_shared/usage-tracker.ts` | 사용량 집계 헬퍼 |
| `spec/events-package-spec.md` | @idea-on-action/events 패키지 명세 |
| `spec/outbound-events-spec.md` | Minu Find Outbound 이벤트 명세 |

#### 지원 이벤트 타입

| 카테고리 | 이벤트 타입 |
|---------|------------|
| 사용량 | `api.usage_reported`, `agent.executed`, `opportunity.searched` |
| 사용자 활동 | `user.opportunity_viewed`, `user.filter_created`, `user.briefing_shared`, `user.favorite_added` |
| 시스템 | `source.synced`, `opportunity.ingested`, `system.health_check` |

---

## [2.37.4] - 2025-12-15 (WordPress HTML 엔티티 수정)

### 🐛 버그 수정

WordPress API가 반환하는 HTML 엔티티 인코딩 문제 수정.

#### 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/wordpress.ts` | `decodeHtmlEntities` 헬퍼 함수 추가, 제목/카테고리/태그/작성자명 디코딩 |

#### 수정 내용

| 항목 | Before | After |
|------|--------|-------|
| 제목 | `AI &#8211; 미래` | `AI – 미래` |
| 카테고리/태그 | `&amp;` | `&` |
| 특수 문자 | `&#039;`, `&ndash;`, `&mdash;` | `'`, `–`, `—` |

---

## [2.37.3] - 2025-12-15 (E2E 테스트 안정화)

### 🧪 E2E 테스트 개선

사용자/관리자 기능 E2E 테스트 안정화 및 CI/CD 호환성 개선.

#### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `tests/e2e/auth/login.spec.ts` | Strict mode violation 해결 - 로그인 버튼 선택자 수정 |
| `tests/e2e/helpers/auth.ts` | `waitForURL` → `waitForFunction` 변경으로 유연한 네비게이션 감지 |
| `tests/e2e/admin/admin-users.spec.ts` | 환경 변수 기반 조건부 skip 로직 추가 |
| `tests/fixtures/users.ts` | 테스트 사용자 fixture 개선 |

#### 신규 테스트 파일

| 파일 | 설명 |
|------|------|
| `tests/e2e/auth/protected-routes.spec.ts` | 보호된 라우트 접근 제어 테스트 |
| `tests/e2e/admin/admin-roles.spec.ts` | 역할별 권한 테스트 (super_admin, admin, editor) |
| `tests/e2e/admin/admin-sidebar.spec.ts` | 관리자 사이드바 메뉴 접근 권한 테스트 |

#### 테스트 결과

| 항목 | 값 |
|------|-----|
| 통과 | 16 |
| 건너뜀 | 84 (환경 변수 미설정 시) |
| 실패 | 0 |
| 소요 시간 | 17.9분 |

#### CI/CD 실행 방법

```bash
# 기본 실행 (인증 없이)
npx playwright test tests/e2e/auth/ tests/e2e/admin/

# 전체 실행 (인증 포함)
E2E_SUPER_ADMIN_PASSWORD=<password> npx playwright test tests/e2e/auth/ tests/e2e/admin/
```

---

## [2.37.2] - 2025-12-15 (WordPress 블로그 연동)

### 🔗 WordPress 블로그 연동

자체 Supabase 블로그를 테스트 완료 시까지 비활성화하고, 기존 WordPress 블로그 연동으로 전환.

#### 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Blog.tsx` | `useWordPressPosts` 훅으로 교체, WordPress 카테고리/태그 필터 |
| `src/pages/BlogPost.tsx` | WordPress 상세 페이지, HTML 콘텐츠 렌더링 |
| `src/pages/stories/StoriesHub.tsx` | 블로그 섹션 WordPress 연동 |

#### 기능

| 항목 | 설명 |
|------|------|
| 블로그 목록 | WordPress.com API에서 포스트 조회 |
| 블로그 상세 | 사이트 내에서 WordPress 콘텐츠 렌더링 |
| 원본 링크 | WordPress 원본 페이지로 이동 버튼 |
| 댓글 | WordPress 원본 페이지에서 확인 안내 |
| Admin 메뉴 | 그대로 유지 (테스트 완료 후 활성화 예정) |

### 🐛 버그 수정

| 파일 | 수정 내용 |
|------|----------|
| `AdminBlogCategories.tsx` | `postCount`가 undefined일 때 NaN 표시 버그 수정 |
| `DataTable.tsx` | 페이지네이션 버튼 접근성 오류 수정 (aria-label 추가) |

---

## [2.37.1] - 2025-12-14 (Continuous Claude 도입)

### 🔄 Continuous Claude 자율 개발 루프

자동화된 반복 개발 시스템 도입.

#### 추가된 파일

| 파일 | 설명 |
|------|------|
| `.github/workflows/continuous-claude.yml` | 워크플로우 (수동/스케줄 트리거) |
| `.github/SHARED_TASK_NOTES.md` | 컨텍스트 연속성 파일 |
| `CLAUDE.md` 섹션 추가 | Continuous Claude 원칙 문서화 |

#### 설정

| 항목 | 값 |
|------|-----|
| 스케줄 | 매일 자정 KST (15:00 UTC) |
| 기본 비용 제한 | $10/세션 |
| 기본 시간 제한 | 2시간 |
| 병합 전략 | squash |
| 브랜치 접두어 | `claude/` |

---

## [2.37.0] - 2025-12-14 (문서 정리, 자체 블로그, 성능 최적화)

### 📚 문서 구조 개선

루트 폴더 정리 및 문서 관리 규칙 강화.

#### 변경 사항

| 항목 | 설명 | 상태 |
|-----|------|------|
| 루트 정리 | 구현 기록 파일 2개 → docs/archive/ 이동 | ✅ |
| CHANGELOG 통합 | 루트 삭제, docs/project/changelog.md로 단일화 | ✅ |
| 링크 업데이트 | versioning, deployment 문서 링크 수정 | ✅ |
| 문서 관리 규칙 | DOCUMENT_MANAGEMENT.md 강화 | ✅ |

### 📝 자체 블로그 구축

WordPress → Supabase 자체 블로그 시스템 전환.

#### 주요 기능

| 기능 | 파일 | 설명 |
|-----|------|------|
| post_type 컬럼 | `20251214000001_add_post_type_column.sql` | blog, changelog, devlog, announcement |
| 새 카테고리 | DB | 개발 일지, 릴리즈 노트 |
| Blog.tsx 전환 | `src/pages/Blog.tsx` | WordPress → Supabase |
| Changelog DB 연동 | `src/pages/stories/Changelog.tsx` | 하드코딩 제거 |
| 훅 확장 | `useBlogPosts.ts` | post_type, tag_id 필터 추가 |

### ⚡ 성능 최적화

번들 크기 감소 및 로딩 성능 개선.

#### 최적화 항목

| 항목 | 설명 | 효과 |
|-----|------|------|
| Dashboard 차트 | lazy loading 적용 | 초기 번들 감소 |
| Sentry 조건부 로딩 | 프로덕션만 로드 | 개발 환경 성능 개선 |
| PWA Precache | vendor, skill 청크 제외 | 캐시 크기 최적화 |

#### 생성된 파일

- `src/components/admin/charts/DailyRevenueChart.tsx`
- `src/components/admin/charts/PaymentMethodChart.tsx`

---

## [2.36.1] - 2025-12-14 (토스페이먼츠 빌링키 디버깅)

### 💳 결제 시스템

토스페이먼츠 빌링키 발급 및 구독 결제 안정화.

#### 수정된 항목

| 항목 | 설명 | 상태 |
|-----|------|------|
| billing_keys INSERT 403 오류 | Supabase 세션 명시적 재설정 | ✅ |
| 구독 성공 페이지 인증 race condition | 인증 상태 안정화 | ✅ |
| 빌링키/구독 저장 로직 | billing_keys 조인 분리 | ✅ |
| 디버깅 로그 | 빌링키 발급 요청 상세 로그 추가 | ✅ |

### 🔧 개발 환경

| 항목 | 설명 | 상태 |
|-----|------|------|
| Vitest 메모리 최적화 | 단일 워커로 메모리 최적화 강화 | ✅ |
| recharts React 충돌 | 인스턴스 충돌 오류 수정 | ✅ |

---

## [2.36.0] - 2025-12-09 (Minu 연동 Phase 2)

### 🎯 Minu 연동

세션/권한/팀/Audit Log 시스템 구축.

#### 주요 기능

- 세션 관리 시스템
- 권한 관리 시스템
- 팀 관리 시스템
- Audit Log 시스템

---

## [2.35.0] - 2025-12-09 (RAG 검색 고도화, Minu Sandbox)

### 🔍 RAG 검색

하이브리드 검색 및 고급 랭킹 알고리즘 구현.

#### 주요 기능

| 기능 | 파일 | 설명 |
|-----|------|------|
| 하이브리드 검색 | `hybrid-search.ts` | 키워드 + 시맨틱 검색 |
| 랭킹 알고리즘 | `ranking.ts` | TF-IDF, BM25, MMR |

### 🧪 Minu Sandbox

Sandbox 환경 구축 및 API 클라이언트.

#### 생성된 파일

- `sandbox-client.ts` - Sandbox API 클라이언트
- `useMinuSandbox.ts` - Sandbox 모드 관리 훅
- `minu-sandbox.ts` - Sandbox 환경 설정

### 📊 품질 지표

| 지표 | v2.34.0 | v2.35.0 | 변화 |
|------|---------|---------|------|
| 유닛 테스트 | 1746개 | 1880개 | +134개 |
| 번들 크기 | 1644 KB | 1636 KB | -0.5% |

---

## [2.34.1] - 2025-12-09 (토스페이먼츠 라이브 키 설정)

### 💳 결제 시스템

토스페이먼츠 카드심사 완료 후 라이브 키 설정.

#### 설정 완료 항목

| 환경 | 키 종류 | 상태 |
|-----|--------|------|
| `.env.local` | API 개별 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 결제위젯 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 보안 키 | ✅ |
| Supabase Secrets | `TOSS_SECRET_KEY` | ✅ |
| Vercel 환경변수 | `VITE_TOSS_*` | ✅ |

#### API 키 테스트
- API 개별 연동 키: ✅ 인증 성공
- 결제위젯 연동 키: ✅ 인증 성공

#### 사용 중인 연동 방식
- **API 개별 연동**: 일반결제, 정기결제(빌링키 발급)
- **결제위젯**: 향후 위젯 UI 사용 시 (예비)

---

## [2.30.0] - 2025-12-02 (기술 부채 해소 및 문서 동기화)

### 🔧 기술 부채 해소

TODO 주석 11개 구현 완료로 코드 품질 개선.

#### 구현된 TODO 항목
1. Minu Find: 발견 프로세스 초기 단계 컴포넌트 (플레이스홀더 제거)
2. Minu Frame: RFP 생성 프로세스 컴포넌트 (플레이스홀더 제거)
3. Minu Build: 프로젝트 진행 추적 컴포넌트 (플레이스홀더 제거)
4. Minu Keep: 운영/유지보수 대시보드 (플레이스홀더 제거)
5. Central Hub: 알림 구독 컴포넌트 구현
6. 기타 TODO 주석 6개 구현

#### 테스트 확장
- 신규 테스트 60개 추가
- Minu 서비스 테스트 커버리지 향상
- Central Hub 테스트 보강

### 📚 문서 동기화

프로젝트 문서 간 정보 일관성 확보.

#### 업데이트된 문서
- `docs/project/roadmap.md`: 테스트 수 업데이트 (Unit 1066 → 1126, 총 6466 → 6526)
- `project-todo.md`: v2.30.0 섹션 추가, 품질 지표 업데이트
- `docs/project/changelog.md`: v2.30.0 변경 사항 기록

### 📊 품질 지표

| 지표 | 이전 (v2.29.0) | 이후 (v2.30.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1066개 | 1126개 | +60개 |
| E2E 테스트 | 5400개 | 5400개 | 유지 |
| 총 테스트 | 6466개 | 6526개 | +60개 |
| TODO 주석 | 11개 | 0개 | -11개 |
| 린트 경고 | 0개 | 0개 | 유지 |
| 번들 크기 | ~1644 KiB | ~1644 KiB | 유지 |

### 🎯 완료 기준

- [x] TODO 주석 11개 구현
- [x] 테스트 +60개 추가
- [x] 문서 동기화 (roadmap, todo, changelog)
- [x] 린트 경고 0개 유지
- [x] 버전 정보 일관성 확보

---

## [2.29.0] - 2025-12-02 (Claude Skills Phase 3 완료 - pptx Skill)

### 🎨 pptx Skill 완성

5개 병렬 에이전트 작업으로 PowerPoint 생성 기능 완성.

#### 생성된 파일

**pptx 슬라이드 생성 함수 (5개)**:
- `src/lib/skills/pptx/titleSlide.ts`: 제목 슬라이드 생성 (128줄)
- `src/lib/skills/pptx/summarySlide.ts`: KPI 요약 슬라이드 생성 (271줄)
- `src/lib/skills/pptx/eventsSlide.ts`: 이벤트 현황 슬라이드 생성 (323줄)
- `src/lib/skills/pptx/issuesSlide.ts`: 이슈 현황 슬라이드 생성 (437줄)
- `src/lib/skills/pptx/index.ts`: 통합 export 및 프레젠테이션 생성 (143줄)

**Central Hub 통합**:
- `src/components/central-hub/ExportButton.tsx`: xlsx/pptx 드롭다운 메뉴 (239줄)

**번들 최적화**:
- `src/pages/admin/analytics/AnalyticsDataProvider.tsx`: 훅 분리로 청크 크기 감소 (59줄)

#### 기능
- 제목 슬라이드: 브랜드 로고, 날짜 범위, 보고서 제목
- 요약 슬라이드: 4개 KPI 카드 (총 이벤트, 이슈, 평균 응답시간, 가동률)
- 이벤트 슬라이드: 이벤트 통계 표 (최대 20개)
- 이슈 슬라이드: 이슈 현황 표 (최대 15개), 심각도별 색상 구분
- ExportButton: xlsx/pptx 선택 드롭다운, 로딩/에러 상태 처리

### 🧪 테스트 확장

#### 생성된 파일
- `tests/unit/hooks/useAlertSubscriptions.test.tsx`: 35개 테스트 케이스 (727줄)
  - 구독 목록 조회 (5개)
  - 구독 추가 (6개)
  - 구독 수정 (6개)
  - 구독 삭제 (6개)
  - 필터링 (5개)
  - 에러 처리 (4개)
  - 캐싱 (3개)
- `tests/unit/hooks/usePptxGenerate.test.tsx`: 19개 테스트 케이스 (767줄)
  - 동적 로딩 (3개)
  - 슬라이드 생성 (6개)
  - 진행률 추적 (3개)
  - 에러 처리 (4개)
  - 메모리 정리 (3개)

### ⚡ 번들 최적화

pages-admin-analytics 청크 크기 17% 감소.

#### 수정된 파일
- `vite.config.ts`: manualChunks 규칙 추가
- `src/pages/admin/Analytics.tsx`: AnalyticsDataProvider 분리

#### 효과
- pages-admin-analytics: 1,128KB → 935KB (-193KB, -17%)
- 초기 로딩 시간 단축

### 📊 품질 지표

| 지표 | 이전 (v2.28.0) | 이후 (v2.29.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1012개 | 1066개 | +54개 |
| E2E 테스트 | 195개 | 5400개 | +5205개 |
| 총 테스트 | 1207개 | 6466개 | +5259개 |
| pptx Skill | 60% | 95% | +35% |
| 번들 크기 | ~1545 KiB | ~1644 KiB | +99 KiB |
| analytics 청크 | 1,128KB | 935KB | -193KB (-17%) |
| 린트 에러 | 0개 | 0개 | 유지 |

### 🎯 완료 기준

- [x] pptx 슬라이드 생성 함수 5개 구현
- [x] Central Hub ExportButton 확장
- [x] 테스트 +54개 (useAlertSubscriptions 35개, usePptxGenerate 19개)
- [x] 번들 최적화 -17%
- [x] 린트 에러 0개

---

## [2.28.0] - 2025-12-02 (v2.28.0 병렬 작업 Phase 1+2 완료)

### 🎯 Central Hub 고도화

알림 구독 관리 UI 구현.

#### 생성된 파일
- `src/components/central-hub/AlertSubscriptionManager.tsx`: 알림 구독 관리 컴포넌트

#### 기능
- 구독 목록 표시 (Card 형태)
- 추가/수정/삭제 (Dialog + Form)
- 필터링 (전체/서비스/심각도/이벤트)
- 로딩/에러/빈 상태 처리

### 📊 pptx Skill 구현

Claude Skills Phase 3로 PowerPoint 생성 기능 추가.

#### 생성된 파일
- `src/hooks/usePptxGenerate.ts`: pptx 문서 생성 훅 (681줄)

#### 기능
- 6가지 슬라이드 타입 지원 (Title, Content, TwoColumn, Chart, Image, Quote)
- pptxgenjs 동적 로딩 (번들 최적화)
- 진행률 추적 (0-100%)
- 브랜드 컬러 적용

### 🧪 테스트 강화

#### 생성된 파일
- `tests/unit/skills/useClaudeSkill.test.tsx`: Claude Skill 훅 테스트 (20개)
- `tests/e2e/minu/sandbox.spec.ts`: Minu Sandbox E2E 테스트 (23개)

### ⚡ 번들 최적화

Giscus 댓글 컴포넌트 Lazy Load 적용.

#### 수정된 파일
- `src/components/community/GiscusComments.tsx`: 래퍼 컴포넌트로 변경
- `src/components/community/GiscusCommentsCore.tsx`: 실제 구현 분리
- `vite.config.ts`: `components-giscus` 번들 설정 추가

#### 효과
- 별도 번들 분리: 3.05 KB
- 초기 로딩 시간 단축

### 🔧 기술 부채 해소

린트 경고 22개 수정 (any 타입 → 명시적 타입).

#### 수정된 파일
- `tests/unit/hooks/useServiceEvents.test.tsx`
- `tests/unit/hooks/useServiceHealth.test.tsx`
- `tests/unit/hooks/useServiceIssues.test.tsx`

### 📊 품질 지표

| 지표 | 이전 | 이후 | 변화 |
|------|------|------|------|
| 유닛 테스트 | 992개 | 1012개 | +20개 |
| E2E 테스트 | 172개 | 195개 | +23개 |
| 린트 에러 | 0개 | 0개 | 유지 |
| 린트 경고 | 22개 | 0개 | -22개 |

---

## [2.27.0] - 2025-12-02 (Claude Skills Phase 2 + 기술 부채 해소)

### 📝 docx Skill 구현

Claude Skills Phase 2로 Word 문서 생성 기능 추가.

#### 생성된 파일
- `src/hooks/useDocxExport.ts`: docx 문서 생성 훅
- `src/types/docx.ts`: docx 관련 타입 정의
- `tests/unit/skills/useDocxExport.test.ts`: 8개 테스트 케이스

### 🧪 Central Hub 테스트 강화

Central Hub 훅 테스트 94개 추가.

#### 테스트 파일
- `tests/unit/hooks/useServiceEvents.test.tsx`: 서비스 이벤트 훅 테스트
- `tests/unit/hooks/useServiceIssues.test.tsx`: 서비스 이슈 훅 테스트
- `tests/unit/hooks/useServiceHealth.test.tsx`: 서비스 헬스 훅 테스트

### 🔧 기술 부채 해소

#### 수정된 항목
- TODO 주석 5개 제거 및 구현
- `any` 타입 1개 수정

### 📊 품질 지표

| 지표 | 이전 | 이후 | 변화 |
|------|------|------|------|
| 유닛 테스트 | 869개 | 971개 | +102개 |
| 린트 에러 | 0개 | 0개 | 유지 |
| 번들 크기 | 1545 KB | 1545 KB | 유지 |

---

## [2.26.0] - 2025-12-01 (xlsx Skill 고도화 + 테스트 확장)

### 📊 xlsx Skill 고도화

Claude Skills Phase 1 xlsx Skill 95% 완료.

#### 기능
- 차트 삽입 기능 구현
- 다중 시트 지원
- 스타일 적용 개선

### 🧪 테스트 확장

#### 추가된 테스트
- `tests/unit/skills/xlsx-chart-insert.test.ts`: 5개 테스트 케이스
- 결제/구독 훅 테스트 강화

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| xlsx Skill 완성도 | 95% |
| 린트 에러 | 0개 |

---

## [2.25.0] - 2025-12-01 (Central Hub Phase 2 + MCP 권한 시스템)

### 🔐 MCP 권한 시스템

MCPProtected HOC 및 권한 관리 인프라 구현.

#### 생성된 컴포넌트 (src/components/mcp/)
- `MCPProtected.tsx`: 서비스별 권한 보호 HOC
- `MCPLoading.tsx`: 권한 확인 중 로딩 UI
- `MCPFallback.tsx`: 권한 없음 시 Fallback UI (4가지 사유별)
- `MCPError.tsx`: 에러 UI

#### 생성된 훅/Context
- `useMCPPermission.ts`: 서비스별 권한 확인 훅
- `MCPPermissionContext.tsx`: 전역 권한 캐시 관리

### 📊 Central Hub 대시보드 고도화

#### 신규 차트 컴포넌트
- `UsageChart.tsx`: 서비스별 사용량 막대 차트
- `TrendChart.tsx`: 이벤트/이슈/응답시간 트렌드 라인 차트

#### 고급 필터 및 알림 센터
- `EnhancedFilter.tsx`: 멀티 서비스, 날짜 범위, 심각도, 상태 필터
- `AlertCenter.tsx`: 그룹화, 일괄 처리, 우선순위 표시

### 🔧 페이지 리팩토링

Minu 서비스 페이지에 MCP 권한 시스템 적용.

#### 수정된 페이지
- `MinuFindPage.tsx`: useMCPServicePermission 훅 적용
- `MinuFramePage.tsx`: useMCPServicePermission 훅 적용
- `MinuBuildPage.tsx`: useMCPServicePermission 훅 적용
- `MinuKeepPage.tsx`: useMCPServicePermission 훅 적용
- `CentralHubDashboard.tsx`: 관리자 권한 체크 강화

### 🐛 버그 수정

- `useRAGSearch.ts`: debounce 타이머 cleanup 추가 (테스트 환경 에러 수정)

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| 신규 컴포넌트 | 10개 |
| 수정된 파일 | 12개 |
| Central Hub 컴포넌트 | 14개 |
| 린트 에러 | 0개 |
| 번들 크기 | 1545 KB |

---

## [2.24.0] - 2025-12-01 (병렬 작업 완료 + 테스트 강화)

### 🧪 테스트 강화

대규모 테스트 추가 및 RLS 정책 수정.

#### 주요 작업
- **인증/결제 훅 테스트**: 158개 테스트 케이스 추가
- **결제/구독 훅 테스트**: 49개 테스트 케이스 추가
- **유닛 테스트 수정**: 42개 실패 테스트 수정 및 린트 경고 해결

### 📦 번들 최적화

- **pptxgenjs 의존성 제거**: 미사용 기능 정리 (~100KB 절감)
- **번들 크기 개선**: -41% 최적화

### 🔧 Minu 연동 Phase 2 완료

API 인프라 전체 구현 완료.

#### 생성된 Edge Functions
- `session-api`: 세션 관리 API
- `permission-api`: 권한 관리 API (RBAC)
- `team-api`: 팀 관리 API
- `api-v1-health`: Health API 확장 (detailed, metrics, ready, live)

#### 생성된 공유 모듈
- `rate-limit.ts`: Rate Limiting
- `audit-log.ts`, `audit-events.ts`: Audit Log

### 🎯 Central Hub 알림 시스템

AdminHub 대시보드 확장 및 Claude Skills 기반 구현.

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| Unit Tests | 808개 통과 (+73개) |
| 번들 크기 | 1544 KB (-41%) |
| 린트 에러 | 0개 |

---


---

## 📁 이전 버전 아카이브

v2.23.0 이전 버전(2025년 11월)의 변경 내역은 아카이브로 이동되었습니다.

- **[2025년 11월 아카이브](../archive/changelog-2025-november.md)** - v2.0.0 ~ v2.23.0

---

## Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Phase 완료, Breaking Changes (2.0.0, 3.0.0...)
MINOR: 주요 기능 추가 (1.1.0, 1.2.0...)
PATCH: 버그 수정, 문서 업데이트 (1.0.1, 1.0.2...)
```

---

## Related Documents

- [Roadmap](./roadmap.md) - 프로젝트 로드맵
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
