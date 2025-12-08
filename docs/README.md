# 📚 IDEA on Action 문서 가이드

> 프로젝트 문서 전체 인덱스 및 탐색 가이드

**업데이트**: 2025-11-19 (문서 및 SQL 관리 규칙 추가)

---

## 📂 문서 구조 (2025-11-16 통합 완료)

```
docs/
├── README.md (이 파일)       # 문서 인덱스
├── DOCUMENT_MANAGEMENT.md    # 문서 및 SQL 관리 규칙 ⭐ 필독!
├── guides/                   # 실무 가이드 ⭐ 통합
│   ├── analytics/            # 분석 도구 (GA4, Sentry)
│   ├── auth/                 # 인증 시스템 (OAuth, 2FA)
│   ├── cms/                  # CMS 관리자 모드
│   ├── components/           # 컴포넌트 가이드 (신규)
│   ├── database/             # 데이터베이스 스키마
│   ├── deployment/           # 배포 가이드 (DevOps 통합)
│   ├── design-system/        # 디자인 시스템
│   ├── external-services/    # 외부 서비스 연동
│   ├── services-platform/    # 서비스 플랫폼 (토스 페이먼츠)
│   ├── storage/              # 파일 저장소
│   ├── testing/              # 테스트 가이드
│   └── versioning/           # 버전 관리 (신규)
├── reports/                  # 분석 보고서 ⭐ 신규
│   ├── performance/          # 성능 분석
│   └── refactoring/          # 리팩토링 보고서
├── archive/                  # 히스토리 보관 ⭐ 확장
│   ├── daily-summaries/      # 일일 작업 요약
│   ├── hotfixes/             # 긴급 수정 기록
│   ├── deployments/          # 배포 기록
│   ├── database-migrations/  # 과거 DB 마이그레이션 (2020-2024)
│   ├── blog/                 # 블로그 초안
│   ├── analysis-reports/     # 과거 분석 보고서
│   ├── phase-plans/          # Phase 계획 문서
│   ├── v1.5.0-summaries/     # v1.5.0 요약
│   └── v2.0-planning/        # v2.0 기획
├── project/                  # 프로젝트 관리
│   ├── roadmap.md            # 로드맵
│   └── changelog.md          # 변경 로그
├── database/                 # 데이터베이스 (유지)
│   └── migrations/           # 마이그레이션 파일
├── testing/                  # 테스트 전략 (유지)
└── payments/                 # 결제 시스템 (유지)
```

### 2025-11-19 주요 업데이트

**신규 문서**:
- **DOCUMENT_MANAGEMENT.md** - 문서 및 SQL 관리 규칙 ⭐ 필독!
- **archive/database-migrations/** - 과거 DB 마이그레이션 보관 (2020-2024)
- **guides/services-platform/** - 토스 페이먼츠 서비스 플랫폼 가이드

**scripts 폴더 구조**:
- **scripts/sql/fixes/** - 30개 DB 수정 스크립트 (RLS, 권한, 컬럼 등)
- **scripts/validation/** - 7개 검증 스크립트 (DB, RLS, 콘텐츠)

**관리 규칙** (DOCUMENT_MANAGEMENT.md):
- SQL 파일: supabase/migrations/ (타임스탬프 규칙)
- 수정 스크립트: scripts/sql/fixes/ (문제 설명 네이밍)
- 검증 스크립트: scripts/validation/ (체크리스트 포함)
- 과거 마이그레이션: docs/archive/database-migrations/ (연도별 보관)

### 2025-11-16 통합 변경 사항

**통합된 폴더** (9개 → 3개):
- \`devops/\` → \`guides/deployment/\` (5개 파일)
- \`components/\` → \`guides/components/\` (6개 파일)
- \`versioning/\` → \`guides/versioning/\` (2개 파일)
- \`performance/\` → \`reports/performance/\` (2개 파일)
- \`refactoring/\` → \`reports/refactoring/\` (6개 파일)
- \`summary/\` → \`archive/daily-summaries/\` (4개 파일)
- \`hotfix/\` → \`archive/hotfixes/\` (1개 파일)
- \`deployment/\` → \`archive/deployments/\` (4개 파일)
- \`blog/\` → \`archive/blog/\` (2개 파일)

---

## 🆕 최신 문서 (2025-11-19)

### ⭐ 필독 문서
**[DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md)** - 문서 및 SQL 관리 규칙

이 문서는 다음을 정의합니다:
- SQL 파일 배치 규칙 (migrations, fixes, validation)
- 파일 네이밍 컨벤션 (타임스탬프, 문제 설명)
- 아카이빙 정책 (과거 마이그레이션 보관)
- 검증 스크립트 작성 가이드

### 📍 전체 문서 인덱스
전체 문서 목록은 **[INDEX.md](INDEX.md)**를 참고하세요. (41+ 문서, ~400 KB)

### 서비스 플랫폼 (토스 페이먼츠 심사)
- ✅ [DB 셋업 요약](guides/services-platform/db-setup-summary.md) - 3개 테이블, 21개 컬럼
- ✅ [장바구니 통합](guides/services-platform/cart-integration-summary.md) - 서비스 아이템 관리
- ✅ [배포 체크리스트](guides/services-platform/production-deployment-checklist.md) - 종합 가이드

### CMS Phase 4 완료
- ✅ [배포 체크리스트](guides/deployment/cms-phase4-deployment-checklist.md) - 71개 항목
- ✅ [E2E 테스트 가이드](guides/testing/e2e-test-guide.md) - 215개 테스트
- ✅ [Admin 가이드](guides/cms/) - 6개 사용자 가이드
- ✅ [API 문서](api/hooks/) - 55개 훅 문서화

---

## 🎯 빠른 탐색

### 처음 시작하시나요?
1. **[CLAUDE.md](../CLAUDE.md)** - 프로젝트 전체 개요 (필독!)
2. **[DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md)** - 문서 및 SQL 관리 규칙 ⭐ 필독!
3. **[INDEX.md](INDEX.md)** - 전체 문서 인덱스
4. **[guides/setup/](guides/setup/)** - 초기 개발 환경 설정
5. **[guides/deployment/](guides/deployment/)** - 배포 방법

### 개발 중이신가요?
- **[guides/design-system/](guides/design-system/)** - 디자인 시스템 가이드
- **[guides/components/](guides/components/)** - 컴포넌트 사용 가이드 ⭐ 신규
- **[api/hooks/](api/hooks/)** - React 훅 API 문서 (55개) ⭐ 신규
- **[project-todo.md](../project-todo.md)** - 작업 목록
- **[project/changelog.md](project/changelog.md)** - 변경 로그

### 운영 관련
- **[DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md)** - 문서 및 SQL 관리 규칙 ⭐
- **[guides/deployment/](guides/deployment/)** - Vercel 배포 (DevOps 통합)
- **[guides/cms/](guides/cms/)** - CMS 관리자 가이드
- **[guides/services-platform/](guides/services-platform/)** - 서비스 플랫폼 (토스 페이먼츠) ⭐ 신규
- **[reports/](reports/)** - 성능/리팩토링 보고서
- **[archive/deployments/](archive/deployments/)** - 과거 배포 기록
- **[archive/database-migrations/](archive/database-migrations/)** - 과거 DB 마이그레이션 ⭐ 신규

---

## 📖 실무 가이드 (guides/)

### 📚 전체 가이드 인덱스
**[guides/README.md](guides/README.md)** 참조

주요 가이드:
- **analytics/** - GA4, Sentry 설정
- **auth/** - OAuth, 2FA 설정
- **cms/** - CMS 관리자 모드 사용법
- **components/** - Header, Footer, Hero 등 컴포넌트
- **database/** - Supabase 스키마 및 마이그레이션
- **deployment/** - Vercel 배포 및 CI/CD (DevOps 통합)
- **design-system/** - 디자인 시스템 가이드
- **external-services/** - 결제, 이메일, 스토리지 연동
- **services-platform/** - 서비스 플랫폼 (토스 페이먼츠) ⭐ 신규
- **storage/** - 파일 저장소 관리
- **testing/** - Playwright, Vitest 테스트
- **versioning/** - 버전 관리 및 릴리스

---

## 📊 분석 보고서 (reports/)

### 📚 전체 보고서 인덱스
**[reports/README.md](reports/README.md)** 참조

### 성능 분석 (performance/)
프론트엔드 성능 관련 분석 보고서

**최신 보고서**:
- \`admin-chunk-separation-report.md\` - Admin 코드 분리 (번들 38% 감소)

### 리팩토링 (refactoring/)
코드 리팩토링 관련 보고서

**최신 보고서**:
- \`final-summary-phase1-5-2025-11-16.md\` - Phase 1-5 전체 요약
- \`phase5-selective-optimization-2025-11-16.md\` - 선택적 최적화
- \`phase4-dependencies-cleanup-2025-11-16.md\` - Dependencies 정리
- \`phase3-parallel-summary-2025-11-16.md\` - Vite Bundle 최적화

---

## 📦 히스토리 보관 (archive/)

### 📚 전체 아카이브 인덱스
**[archive/README.md](archive/README.md)** 참조

과거 개발 히스토리, 일일 요약, 배포 기록 보관

**최근 아카이브**:
- **database-migrations/** - 과거 DB 마이그레이션 (2020-2024) ⭐ 신규
  - 78개 마이그레이션 파일, 연도별 분류
  - 테이블 생성, RLS 정책, 트리거, 뷰 등
  - README.md에 전체 목록 및 검색 가이드
- **daily-summaries/** - 일일 작업 요약
  - \`2025-11-15-work-summary.md\` - 11월 15일 작업 요약
  - \`2025-11-15-order-number-fix.md\` - 주문번호 Race Condition 해결
- **deployments/** - 배포 기록
  - \`2025-11-15-production-deployment.md\` - 프로덕션 배포 기록

---

## 📊 프로젝트 관리 (project/)

### 로드맵
**파일**: \`project/roadmap.md\`

**최신 상태**: Phase 1-14 완료 ✅, Version 2.0 진행 중 🚀

### 변경 로그
**파일**: \`project/changelog.md\`

**최신 버전**: 2.0.0 (2025-11-16)

---

## 🔗 외부 링크

### 주요 문서
- **[CLAUDE.md](../CLAUDE.md)** - 프로젝트 메인 문서
- **[project-todo.md](../project-todo.md)** - TODO 목록
- **[README.md](../README.md)** - GitHub README

### 외부 참고 자료
- [Vite 문서](https://vitejs.dev/)
- [React 문서](https://react.dev/)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)

---

## 📝 문서 작성 가이드

### 필독 규칙
**[DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md)** - 문서 및 SQL 관리 규칙 ⭐

이 문서는 다음을 정의합니다:
- SQL 파일 배치 및 네이밍 규칙
- 문서 분류 기준 (guides, reports, archive)
- 아카이빙 정책 및 검증 스크립트 작성 가이드

### 문서 추가 시
1. **[DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md)** 읽기
2. 적절한 디렉토리 선택 (guides/, reports/, archive/)
3. Markdown 형식 (.md) 사용
4. 관련 폴더의 README.md에 링크 추가

### 문서 분류 기준
- **guides/** - 설정/사용 가이드 (How-to)
- **reports/** - 분석/보고서 (What happened)
- **archive/** - 과거 기록 (History)

### SQL 파일 규칙
- **supabase/migrations/** - 공식 마이그레이션 (타임스탬프 네이밍)
- **scripts/sql/fixes/** - 수정 스크립트 (문제 설명 네이밍)
- **scripts/validation/** - 검증 스크립트 (체크리스트 포함)
- **docs/archive/database-migrations/** - 과거 마이그레이션 보관

---

**Last Updated**: 2025-12-09
**Project Version**: 2.35.0
**주요 업데이트**: v2.35.0 RAG 검색 고도화, Minu Sandbox, 테스트 확장, 문서 자동화, 성능 최적화
