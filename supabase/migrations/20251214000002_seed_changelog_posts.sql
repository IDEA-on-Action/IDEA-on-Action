-- Changelog 포스트 삽입 (최신 8개 버전)
-- v2.37.0 ~ v2.28.0

INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  post_type,
  status,
  published_at,
  meta_title,
  category_id
)
VALUES
-- v2.37.0
(
  'v2.37.0 - 문서 정리, 자체 블로그, 성능 최적화',
  'v2-37-0-release-notes',
  '문서 구조 개선, WordPress에서 Supabase 자체 블로그로 전환, 번들 크기 감소 및 로딩 성능 개선',
  '## 📚 문서 구조 개선

루트 폴더 정리 및 문서 관리 규칙 강화.

### 변경 사항

| 항목 | 설명 | 상태 |
|-----|------|------|
| 루트 정리 | 구현 기록 파일 2개 → docs/archive/ 이동 | ✅ |
| CHANGELOG 통합 | 루트 삭제, docs/project/changelog.md로 단일화 | ✅ |
| 링크 업데이트 | versioning, deployment 문서 링크 수정 | ✅ |
| 문서 관리 규칙 | DOCUMENT_MANAGEMENT.md 강화 | ✅ |

## 📝 자체 블로그 구축

WordPress → Supabase 자체 블로그 시스템 전환.

### 주요 기능

| 기능 | 파일 | 설명 |
|-----|------|------|
| post_type 컬럼 | `20251214000001_add_post_type_column.sql` | blog, changelog, devlog, announcement |
| 새 카테고리 | DB | 개발 일지, 릴리즈 노트 |
| Blog.tsx 전환 | `src/pages/Blog.tsx` | WordPress → Supabase |
| Changelog DB 연동 | `src/pages/stories/Changelog.tsx` | 하드코딩 제거 |
| 훅 확장 | `useBlogPosts.ts` | post_type, tag_id 필터 추가 |

## ⚡ 성능 최적화

번들 크기 감소 및 로딩 성능 개선.

### 최적화 항목

| 항목 | 설명 | 효과 |
|-----|------|------|
| Dashboard 차트 | lazy loading 적용 | 초기 번들 감소 |
| Sentry 조건부 로딩 | 프로덕션만 로드 | 개발 환경 성능 개선 |
| PWA Precache | vendor, skill 청크 제외 | 캐시 크기 최적화 |

### 생성된 파일

- `src/components/admin/charts/DailyRevenueChart.tsx`
- `src/components/admin/charts/PaymentMethodChart.tsx`',
  'changelog',
  'published',
  '2025-12-14 00:00:00+00',
  'v2.37.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.36.1
(
  'v2.36.1 - 토스페이먼츠 빌링키 디버깅',
  'v2-36-1-release-notes',
  '토스페이먼츠 빌링키 발급 및 구독 결제 안정화, billing_keys INSERT 403 오류 수정',
  '## 💳 결제 시스템

토스페이먼츠 빌링키 발급 및 구독 결제 안정화.

### 수정된 항목

| 항목 | 설명 | 상태 |
|-----|------|------|
| billing_keys INSERT 403 오류 | Supabase 세션 명시적 재설정 | ✅ |
| 구독 성공 페이지 인증 race condition | 인증 상태 안정화 | ✅ |
| 빌링키/구독 저장 로직 | billing_keys 조인 분리 | ✅ |
| 디버깅 로그 | 빌링키 발급 요청 상세 로그 추가 | ✅ |

## 🔧 개발 환경

| 항목 | 설명 | 상태 |
|-----|------|------|
| Vitest 메모리 최적화 | 단일 워커로 메모리 최적화 강화 | ✅ |
| recharts React 충돌 | 인스턴스 충돌 오류 수정 | ✅ |',
  'changelog',
  'published',
  '2025-12-14 00:00:00+00',
  'v2.36.1',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.36.0
(
  'v2.36.0 - Minu 연동 Phase 2',
  'v2-36-0-release-notes',
  'Minu 세션/권한/팀/Audit Log 시스템 구축',
  '## 🎯 Minu 연동

세션/권한/팀/Audit Log 시스템 구축.

### 주요 기능

- **세션 관리 시스템**: 사용자 세션 추적 및 관리
- **권한 관리 시스템**: 역할 기반 접근 제어 (RBAC)
- **팀 관리 시스템**: 조직 및 팀 구조 관리
- **Audit Log 시스템**: 모든 중요 작업 로깅 및 감사 추적

### 아키텍처

Minu 서비스와의 통합을 위한 핵심 인프라 구축으로 안전하고 확장 가능한 멀티 테넌트 환경을 제공합니다.',
  'changelog',
  'published',
  '2025-12-09 00:00:00+00',
  'v2.36.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.35.0
(
  'v2.35.0 - RAG 검색 고도화, Minu Sandbox',
  'v2-35-0-release-notes',
  'RAG 하이브리드 검색 및 고급 랭킹 알고리즘 구현, Minu Sandbox 환경 구축',
  '## 🔍 RAG 검색

하이브리드 검색 및 고급 랭킹 알고리즘 구현.

### 주요 기능

| 기능 | 파일 | 설명 |
|-----|------|------|
| 하이브리드 검색 | `hybrid-search.ts` | 키워드 + 시맨틱 검색 |
| 랭킹 알고리즘 | `ranking.ts` | TF-IDF, BM25, MMR |

### 검색 성능 향상

- **키워드 검색**: 전통적인 키워드 매칭으로 정확한 결과 제공
- **시맨틱 검색**: 의미 기반 검색으로 관련성 높은 결과 발견
- **하이브리드 랭킹**: TF-IDF, BM25, MMR 알고리즘으로 최적 순위 결정

## 🧪 Minu Sandbox

Sandbox 환경 구축 및 API 클라이언트.

### 생성된 파일

- `sandbox-client.ts` - Sandbox API 클라이언트
- `useMinuSandbox.ts` - Sandbox 모드 관리 훅
- `minu-sandbox.ts` - Sandbox 환경 설정

### 품질 지표

| 지표 | v2.34.0 | v2.35.0 | 변화 |
|------|---------|---------|------|
| 유닛 테스트 | 1746개 | 1880개 | +134개 |
| 번들 크기 | 1644 KB | 1636 KB | -0.5% |',
  'changelog',
  'published',
  '2025-12-09 00:00:00+00',
  'v2.35.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.34.1
(
  'v2.34.1 - 토스페이먼츠 라이브 키 설정',
  'v2-34-1-release-notes',
  '토스페이먼츠 카드심사 완료 후 라이브 키 설정 및 API 키 테스트',
  '## 💳 결제 시스템

토스페이먼츠 카드심사 완료 후 라이브 키 설정.

### 설정 완료 항목

| 환경 | 키 종류 | 상태 |
|-----|--------|------|
| `.env.local` | API 개별 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 결제위젯 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 보안 키 | ✅ |
| Supabase Secrets | `TOSS_SECRET_KEY` | ✅ |
| Vercel 환경변수 | `VITE_TOSS_*` | ✅ |

### API 키 테스트

- **API 개별 연동 키**: ✅ 인증 성공
- **결제위젯 연동 키**: ✅ 인증 성공

### 사용 중인 연동 방식

- **API 개별 연동**: 일반결제, 정기결제(빌링키 발급)
- **결제위젯**: 향후 위젯 UI 사용 시 (예비)

### 보안 고려사항

모든 Secret 키는 환경변수로 관리되며, 클라이언트 코드에 노출되지 않습니다.',
  'changelog',
  'published',
  '2025-12-09 00:00:00+00',
  'v2.34.1',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.30.0
(
  'v2.30.0 - 기술 부채 해소 및 문서 동기화',
  'v2-30-0-release-notes',
  'TODO 주석 11개 구현 완료, 테스트 60개 추가, 프로젝트 문서 동기화',
  '## 🔧 기술 부채 해소

TODO 주석 11개 구현 완료로 코드 품질 개선.

### 구현된 TODO 항목

1. **Minu Find**: 발견 프로세스 초기 단계 컴포넌트 (플레이스홀더 제거)
2. **Minu Frame**: RFP 생성 프로세스 컴포넌트 (플레이스홀더 제거)
3. **Minu Build**: 프로젝트 진행 추적 컴포넌트 (플레이스홀더 제거)
4. **Minu Keep**: 운영/유지보수 대시보드 (플레이스홀더 제거)
5. **Central Hub**: 알림 구독 컴포넌트 구현
6. **기타 TODO 주석**: 6개 구현

### 테스트 확장

- 신규 테스트 60개 추가
- Minu 서비스 테스트 커버리지 향상
- Central Hub 테스트 보강

## 📚 문서 동기화

프로젝트 문서 간 정보 일관성 확보.

### 업데이트된 문서

- `docs/project/roadmap.md`: 테스트 수 업데이트 (Unit 1066 → 1126, 총 6466 → 6526)
- `project-todo.md`: v2.30.0 섹션 추가, 품질 지표 업데이트
- `docs/project/changelog.md`: v2.30.0 변경 사항 기록

## 📊 품질 지표

| 지표 | 이전 (v2.29.0) | 이후 (v2.30.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1066개 | 1126개 | +60개 |
| E2E 테스트 | 5400개 | 5400개 | 유지 |
| 총 테스트 | 6466개 | 6526개 | +60개 |
| TODO 주석 | 11개 | 0개 | -11개 |
| 린트 경고 | 0개 | 0개 | 유지 |
| 번들 크기 | ~1644 KiB | ~1644 KiB | 유지 |

## 🎯 완료 기준

- ✅ TODO 주석 11개 구현
- ✅ 테스트 +60개 추가
- ✅ 문서 동기화 (roadmap, todo, changelog)
- ✅ 린트 경고 0개 유지
- ✅ 버전 정보 일관성 확보',
  'changelog',
  'published',
  '2025-12-02 00:00:00+00',
  'v2.30.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.29.0
(
  'v2.29.0 - Claude Skills Phase 3 (pptx Skill)',
  'v2-29-0-release-notes',
  'pptx Skill 완성, Central Hub ExportButton 확장, 번들 최적화로 analytics 청크 17% 감소',
  '## 🎨 pptx Skill 완성

5개 병렬 에이전트 작업으로 PowerPoint 생성 기능 완성.

### 생성된 파일

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

### 기능

- **제목 슬라이드**: 브랜드 로고, 날짜 범위, 보고서 제목
- **요약 슬라이드**: 4개 KPI 카드 (총 이벤트, 이슈, 평균 응답시간, 가동률)
- **이벤트 슬라이드**: 이벤트 통계 표 (최대 20개)
- **이슈 슬라이드**: 이슈 현황 표 (최대 15개), 심각도별 색상 구분
- **ExportButton**: xlsx/pptx 선택 드롭다운, 로딩/에러 상태 처리

## 🧪 테스트 확장

### 생성된 파일

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

## ⚡ 번들 최적화

pages-admin-analytics 청크 크기 17% 감소.

### 수정된 파일

- `vite.config.ts`: manualChunks 규칙 추가
- `src/pages/admin/Analytics.tsx`: AnalyticsDataProvider 분리

### 효과

- **pages-admin-analytics**: 1,128KB → 935KB (-193KB, -17%)
- **초기 로딩 시간 단축**

## 📊 품질 지표

| 지표 | 이전 (v2.28.0) | 이후 (v2.29.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1012개 | 1066개 | +54개 |
| E2E 테스트 | 195개 | 5400개 | +5205개 |
| 총 테스트 | 1207개 | 6466개 | +5259개 |
| pptx Skill | 60% | 95% | +35% |
| 번들 크기 | ~1545 KiB | ~1644 KiB | +99 KiB |
| analytics 청크 | 1,128KB | 935KB | -193KB (-17%) |
| 린트 에러 | 0개 | 0개 | 유지 |

## 🎯 완료 기준

- ✅ pptx 슬라이드 생성 함수 5개 구현
- ✅ Central Hub ExportButton 확장
- ✅ 테스트 +54개 (useAlertSubscriptions 35개, usePptxGenerate 19개)
- ✅ 번들 최적화 -17%
- ✅ 린트 에러 0개',
  'changelog',
  'published',
  '2025-12-02 00:00:00+00',
  'v2.29.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
),

-- v2.28.0
(
  'v2.28.0 - Central Hub 고도화',
  'v2-28-0-release-notes',
  'Central Hub 알림 구독 관리 UI 구현, pptx Skill 추가, 테스트 강화 및 번들 최적화',
  '## 🎯 Central Hub 고도화

알림 구독 관리 UI 구현.

### 생성된 파일

- `src/components/central-hub/AlertSubscriptionManager.tsx`: 알림 구독 관리 컴포넌트

### 기능

- **구독 목록 표시**: Card 형태로 직관적 표시
- **추가/수정/삭제**: Dialog + Form으로 사용자 친화적 인터페이스
- **필터링**: 전체/서비스/심각도/이벤트 타입별 필터
- **상태 처리**: 로딩/에러/빈 상태 모두 처리

## 📊 pptx Skill 구현

Claude Skills Phase 3로 PowerPoint 생성 기능 추가.

### 생성된 파일

- `src/hooks/usePptxGenerate.ts`: pptx 문서 생성 훅 (681줄)

### 기능

- **6가지 슬라이드 타입 지원**: Title, Content, TwoColumn, Chart, Image, Quote
- **pptxgenjs 동적 로딩**: 번들 최적화
- **진행률 추적**: 0-100% 실시간 진행 상황
- **브랜드 컬러 적용**: 일관된 브랜드 아이덴티티

## 🧪 테스트 강화

### 생성된 파일

- `tests/unit/skills/useClaudeSkill.test.tsx`: Claude Skill 훅 테스트 (20개)
- `tests/e2e/minu/sandbox.spec.ts`: Minu Sandbox E2E 테스트 (23개)

## ⚡ 번들 최적화

Giscus 댓글 컴포넌트 Lazy Load 적용.

### 수정된 파일

- `src/components/community/GiscusComments.tsx`: 래퍼 컴포넌트로 변경
- `src/components/community/GiscusCommentsCore.tsx`: 실제 구현 분리
- `vite.config.ts`: `components-giscus` 번들 설정 추가

### 효과

- **별도 번들 분리**: 3.05 KB
- **초기 로딩 시간 단축**

## 🔧 기술 부채 해소

린트 경고 22개 수정 (any 타입 → 명시적 타입).',
  'changelog',
  'published',
  '2025-12-02 00:00:00+00',
  'v2.28.0',
  (SELECT id FROM post_categories WHERE slug = 'release-notes')
);
