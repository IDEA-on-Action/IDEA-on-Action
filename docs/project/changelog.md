# Changelog

> IDEA on Action 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

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
