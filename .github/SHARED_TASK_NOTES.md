# Continuous Claude 공유 작업 노트

> 반복 간 진행 상황 전달을 위한 공유 메모

**마지막 업데이트**: 2025-12-28
**현재 버전**: v2.40.0 (완료)

---

## 현재 목표

v2.40.0: Cloudflare Workers 마이그레이션 100% 완료

---

## 완료된 작업

### v2.40.0 (2025-12-28, 완료)

- [x] Cloudflare Workers 마이그레이션 100% 완료 (31/31 핸들러)
- [x] Phase 12 최종 핸들러 구현
  - `webhook-send`: HMAC-SHA256 서명 웹훅 발송
  - `newsletter-send`: Resend API 배치 이메일
  - `github-releases`: GitHub 릴리즈 동기화
  - `weekly-recap`: 주간 활동 요약 자동 생성
- [x] D1 마이그레이션 적용 (80개 테이블)
- [x] Supabase Edge Functions 아카이브 정리
  - 32개 함수 → `supabase/functions-archive/` 이동
  - README 문서 추가

### v2.39.0 (2025-12-19, 완료)

- [x] Minu SSO Edge Functions 구현
  - `minu-oauth-callback`: OAuth 콜백 처리, PKCE 검증, 세션 관리
  - `minu-token-exchange`: Minu 토큰 → Central Hub JWT 교환
  - `minu-webhook`: 구독/결제/사용량 이벤트 웹훅 수신
- [x] Edge Functions 배포 완료
  - minu-oauth-callback (116.4kB)
  - minu-token-exchange (184.2kB)
  - minu-webhook (113.3kB)
- [x] Minu SSO React 훅 구현
  - `useMinuSSO.ts`: PKCE OAuth 플로우, 토큰 관리, 구독 확인
- [x] Minu API 클라이언트 구현
  - `minu-client.ts`: 토큰 교환, 사용자 정보, 구독 조회
  - `minu.types.ts`: 서비스, OAuth, 토큰, 웹훅 타입 정의
- [x] Supabase 마이그레이션 수동 적용 완료 ✅
  - 파일: `20251217100000_minu_oauth_sessions.sql`
  - 테이블: minu_oauth_sessions, minu_subscriptions, minu_tokens
  - 함수: get_minu_subscription, upsert_minu_subscription

### v2.38.0 (2025-12-17, 릴리스 완료)

- [x] Newsletter 자동 발송 시스템 구현
  - newsletter-send Edge Function 생성 및 배포 ✅
  - newsletter_drafts 테이블 (스케줄링, 세그먼트 필터)
  - newsletter_send_logs 테이블 (발송 추적)
  - useNewsletterDrafts 훅 (CRUD, 발송, 예약)
  - Resend API 배치 발송 (50명씩)
- [x] 구독자 세그멘테이션 지원
  - segment_filter JSONB 필드 (상태, 토픽 기반)
  - 마이그레이션: 20251217000001_newsletter_scheduler.sql
- [x] 컨텐츠 버전 관리 시스템 구현
  - content_versions 테이블 (변경 이력 추적)
  - RLS 정책 (관리자 읽기, service_role 쓰기)
  - create_content_version() 버전 생성 함수
  - get_content_versions() 히스토리 조회
  - restore_content_version() 복원 기능
  - compare_content_versions() 비교 기능
  - auto_version_blog_post() 자동 트리거
  - useContentVersions.ts React 훅
- [x] v2.38.0 버전 릴리스
  - GitHub Release 생성 ✅
  - 태그 v2.38.0 푸시 ✅
- [x] PWA Precache 최적화
  - 1627 KiB → 157 KiB (90% 감소)
  - JS 번들을 runtime caching으로 전환
  - 11개 항목만 precache (CSS, 폰트, workbox)
- [x] LCP/CLS 개선
  - Hero 로고: loading="eager", fetchPriority="high"
  - Google Fonts 최적화 (필수 weight만 로드)
  - 폰트 fallback으로 CLS 방지
- [x] SEO 메타 태그 개선
  - Schema.org Organization 마크업
  - Schema.org WebSite + SearchAction
  - robots, canonical 메타 태그
- [x] 빌드/린트 검증 완료
  - 린트 경고 0개
  - 빌드 성공

### v2.37.10 (2025-12-17)

- [x] 문서 버전 동기화 (CLAUDE.md, docs/INDEX.md)

### v2.37.8 (2025-12-17)

- [x] receive-service-event 하이브리드 인증 구현
  - JWT Bearer 토큰 인증 (mcp-auth 발급)
  - HMAC-SHA256 서명 검증 (기존 웹훅 방식)
  - jwt-verify.ts 유틸리티 생성
- [x] BaseEvent 스키마 지원 추가
  - @idea-on-action/events 패키지 형식 지원
  - Legacy 웹훅 형식과 호환
  - normalizePayload() 함수로 두 스키마 정규화
- [x] 토큰 갱신 엔드포인트 확인
  - POST /functions/v1/mcp-auth/refresh
  - Access Token: 15분, Refresh Token: 7일
  - Token Rotation 보안 정책 적용

### v2.37.7 (2025-12-17)

- [x] 토스페이먼츠 라이브 결제 키 환경변수 설정
- [x] Supabase Secrets 업데이트 (TOSS_PAYMENTS_SECRET_KEY, TOSS_SECRET_KEY)

### v2.37.6 (2025-12-15)

- [x] MCP Auth 서비스 토큰 시스템 설정
  - Supabase Secrets 설정: WEBHOOK_SECRET_MINU_FIND, MCP_JWT_SECRET
  - service_tokens, mcp_audit_log 테이블 생성
  - mcp-auth Edge Function CORS 버그 수정 및 재배포
  - 서비스 토큰 발급 스크립트 생성 (scripts/generate-service-token.cjs)
  - .env.example, .env.local 환경 변수 문서화

### v2.37.5 (2025-12-15)

- [x] Minu 서비스 Inbound 이벤트 시스템 구현
  - receive-service-event: minu-portal 추가, 9개 이벤트 타입 라우팅
  - mcp-router: 8개 라우팅 규칙 추가
  - inbound-events.types.ts: 타입 정의 생성
  - usage-tracker.ts: 사용량 집계 헬퍼 생성
- [x] Edge Functions 배포 완료 (receive-service-event, mcp-router)

### v2.37.1 (2025-12-15)

- [x] Continuous Claude 워크플로우 설정
- [x] 컨텍스트 파일 생성
- [x] Fast Refresh 경고 해결
- [x] 버전 동기화 및 릴리스

---

## 진행 중인 작업

v2.39.0 모든 작업 완료 ✅

---

## 실패한 시도

- Supabase 마이그레이션 `supabase db push --include-all` 실패
  - 원인: "relation idx_projects_status already exists" (42P07)
  - 해결: Dashboard SQL Editor에서 수동 적용 ✅

---

## 다음 우선순위

1. ~~Minu SSO Edge Functions~~ ✅ 배포 완료 (2025-12-19)
2. ~~Supabase 마이그레이션 수동 적용~~ ✅ 완료 (2025-12-19)
3. ~~환경 변수 설정~~ ✅ 완료 (MINU_FIND_CLIENT_ID, SECRET, WEBHOOK_SECRET)
4. Minu SSO 통합 테스트
5. Lighthouse 접근성 100%

---

## 메모

- project-todo.md 참조하여 우선순위 높은 항목 처리
- 린트 에러 0개, 빌드 성공 유지 필수
- 테스트 커버리지 확대 지속
- Minu Find 서비스 토큰 발급 완료 - Vercel 환경 변수 설정 필요
