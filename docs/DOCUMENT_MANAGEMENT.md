# 문서 및 SQL 스크립트 관리 규칙

프로젝트의 모든 문서와 SQL 스크립트는 **통합 관리 체계**를 따릅니다.

## 📁 통합 관리 구조

```
idea-on-action/
├── 📄 핵심 문서 (루트)
│   ├── CLAUDE.md              # 프로젝트 개발 문서 (현황, 히스토리)
│   ├── constitution.md        # 프로젝트 헌법 (불변 원칙)
│   ├── README.md              # 프로젝트 소개
│   └── project-todo.md        # 할 일 목록
│
├── 📋 SDD 문서
│   ├── spec/                  # Stage 1: 명세 (요구사항)
│   ├── plan/                  # Stage 2: 계획 (아키텍처)
│   └── tasks/                 # Stage 3: 작업 (스프린트)
│
├── 📚 docs/ - 모든 문서 통합
│   ├── README.md              # 📌 문서 인덱스 (필수 확인)
│   ├── DOCUMENT_MANAGEMENT.md # 🆕 문서 관리 규칙 (이 파일)
│   │
│   ├── guides/                # 실무 가이드
│   │   ├── database/          # DB 가이드
│   │   ├── deployment/        # 배포 가이드
│   │   ├── cms/               # CMS 가이드
│   │   ├── testing/           # 테스트 가이드
│   │   └── ...
│   │
│   ├── project/               # 프로젝트 문서
│   │   ├── changelog.md       # 변경 로그
│   │   └── roadmap.md         # 로드맵
│   │
│   ├── archive/               # 히스토리 보관
│   │   ├── 2025-11-16/        # 날짜별 보관
│   │   └── ...
│   │
│   ├── api/                   # API 문서
│   │   └── hooks/             # React Hooks API
│   │
│   └── reports/               # 리포트
│       ├── refactoring/       # 리팩토링 리포트
│       └── performance/       # 성능 리포트
│
├── 🗄️ scripts/ - SQL 및 스크립트
│   ├── sql/                   # 프로덕션 DB 관리
│   │   ├── backups/           # DB 백업
│   │   ├── migrations/        # 프로덕션 마이그레이션
│   │   ├── data/              # 데이터 추가/삭제
│   │   ├── fixes/             # 스키마/권한 수정 (30+개)
│   │   └── README.md
│   │
│   ├── validation/            # 검증 스크립트
│   │   ├── check-*.sql        # 스키마/데이터 검증
│   │   └── verify-*.sql       # RLS/권한 검증
│   │
│   └── *.cjs                  # Node.js 스크립트
│
├── 🔧 supabase/
│   ├── migrations/            # 공식 마이그레이션만 (타임스탬프)
│   │   └── YYYYMMDDHHMMSS_*.sql
│   ├── functions/             # Edge Functions
│   └── README.md
│
└── 🧪 tests/
    └── fixtures/              # 테스트 데이터
```

---

## 📜 문서 관리 원칙

### 1. Single Source of Truth (SSoT)

**원칙**: 모든 정보는 하나의 공식 위치에만 존재합니다.

- ✅ **정보 중복 금지**: 같은 내용을 여러 파일에 복사하지 않음
- ✅ **참조 링크 사용**: 다른 문서를 참조할 때는 링크 사용
- ✅ **마스터 문서 지정**: 정보의 공식 출처 명시

**예시**:
```markdown
<!-- ❌ 잘못된 예: 내용 복사 -->
## 배포 방법
1. npm run build
2. vercel deploy

<!-- ✅ 올바른 예: 링크 참조 -->
## 배포 방법
[배포 가이드](docs/guides/deployment/deployment-guide.md) 참조
```

### 2. 문서 위치 규칙

#### 루트 레벨 (최소화 - 4개만 허용)

- **CLAUDE.md**: 프로젝트 개발 현황, 최신 업데이트, 히스토리
- **constitution.md**: 프로젝트 헌법 (협상 불가능한 원칙)
- **README.md**: 프로젝트 소개, 빠른 시작
- **project-todo.md**: 할 일 목록

**⚠️ 중요**: 루트 레벨에는 위 4개 파일만 허용됩니다. 다른 모든 문서는 `docs/` 하위에 위치해야 합니다.

#### docs/ 아래 (모든 문서 통합)

- **docs/README.md**: 📌 **필수 확인** - 모든 문서의 인덱스
- **docs/guides/**: 실무 가이드 (개발자가 자주 참조)
- **docs/project/**: 프로젝트 문서 (changelog, roadmap)
  - **docs/project/changelog.md**: 단일 변경 로그 소스 (SSoT)
- **docs/archive/**: 히스토리 보관 (완료된 작업, 보고서)
  - **구현 보고서**: 완료된 기능 구현 보고서는 `docs/archive/YYYY-MM-DD/`로 이동
- **docs/api/**: API 문서
- **docs/reports/**: 분석 리포트

#### spec/, plan/, tasks/ (SDD 구조)
- **spec/**: 사용자 요구사항, 성공 기준
- **plan/**: 아키텍처 설계, 기술 스택
- **tasks/**: 스프린트별 작업 목록

### 3. 파일 명명 규칙

#### 마크다운 파일
- **kebab-case**: `file-name.md`
- **명확한 이름**: 내용을 즉시 알 수 있도록
- **날짜 포함**: 히스토리 문서는 `YYYY-MM-DD` 접두사
- **README.md**: 각 폴더마다 인덱스 파일

**예시**:
```
✅ deployment-guide.md
✅ 2025-11-16-work-summary.md
✅ phase5-selective-optimization.md
❌ guide.md (너무 일반적)
❌ DeploymentGuide.md (PascalCase 금지)
❌ deployment_guide.md (snake_case 금지)
```

#### SQL 파일
- **타임스탬프**: `YYYYMMDDHHMMSS_description.sql` (공식 마이그레이션)
- **kebab-case**: `action-target.sql` (임시 스크립트)
- **접두사 사용**: `fix-`, `check-`, `verify-`, `rollback-`

**예시**:
```
✅ 20251118000000_extend_services_table.sql (공식)
✅ fix-blog-rls-production.sql (임시 수정)
✅ check-services-schema.sql (검증)
❌ migration.sql (너무 일반적)
❌ Fix_Blog_RLS.sql (PascalCase 금지)
```

### 4. 문서 생명주기

```
1. 생성 (Creation)
   → docs/guides/ 또는 적절한 카테고리 폴더

2. 활성 (Active)
   → 프로젝트에서 활발히 참조되는 문서
   → 최신 상태 유지

3. 완료 (Completed)
   → 작업 완료 후 더 이상 변경되지 않는 문서
   → docs/archive/YYYY-MM-DD/ 이동

4. 보관 (Archived)
   → 히스토리 참조용
   → 삭제하지 않고 보관
```

**예시**:
```bash
# 활성 문서
docs/guides/deployment/deployment-guide.md

# 완료된 작업 보고서 → 아카이브
mv docs/daily-summary-2025-11-16.md docs/archive/2025-11-16/

# 완료된 리팩토링 리포트 → 보관
docs/archive/refactoring/phase5-selective-optimization-2025-11-16.md
```

---

## 🗄️ SQL 스크립트 관리 원칙

### 1. 공식 마이그레이션 vs 임시 스크립트

#### 공식 마이그레이션 (supabase/migrations/)
- **위치**: `supabase/migrations/`
- **형식**: `YYYYMMDDHHMMSS_description.sql`
- **실행**: `supabase db reset` 시 자동 실행
- **수정 금지**: 한 번 커밋하면 절대 수정하지 않음
- **용도**: 스키마 변경, 테이블 생성, RLS 정책

**예시**:
```
supabase/migrations/20251118000000_extend_services_table.sql
supabase/migrations/20251118000001_create_service_packages_table.sql
```

#### 임시 스크립트 (scripts/sql/)
- **위치**: `scripts/sql/backups/`, `data/`, `fixes/`
- **형식**: `action-target.sql`
- **실행**: 수동 실행 (`supabase db execute`)
- **수정 가능**: 필요 시 수정 가능
- **용도**: 데이터 추가, 긴급 수정, 백업

**예시**:
```
scripts/sql/data/insert-compass-navigator-plans.sql
scripts/sql/fixes/fix-blog-rls-production.sql
scripts/sql/backups/backup-production-2025-11-18.sql
```

### 2. SQL 파일 분류 기준

#### backups/ - 백업 파일
- **패턴**: `backup-{location}-{date}.sql`
- **예시**: `backup-production-2025-11-18.sql`
- **보관 기간**: 최소 3개월

#### migrations/ - 프로덕션 마이그레이션
- **패턴**: `production-migration-{description}.sql`
- **예시**: `production-migration-combined.sql`
- **용도**: 로컬→프로덕션 배포용 통합 스크립트

#### data/ - 데이터 스크립트
- **패턴**: `{action}-{target}.sql`
- **예시**: `insert-compass-navigator-plans.sql`, `delete-old-packages-plans.sql`
- **용도**: 데이터 추가, 삭제, 업데이트

#### fixes/ - 스키마/권한 수정
- **패턴**: `fix-{target}-{issue}.sql`
- **예시**: `fix-blog-rls-production.sql`, `fix-service-tables-permissions.sql`
- **용도**: 긴급 수정, RLS 정책 수정, 권한 부여

#### validation/ - 검증 스크립트
- **패턴**: `{action}-{target}.sql`
- **예시**: `check-services-schema.sql`, `verify-rls-policies.sql`
- **용도**: 스키마 검증, 데이터 검증, RLS 테스트

### 3. SQL 스크립트 작성 원칙

#### 멱등성 (Idempotency)
```sql
-- ✅ 여러 번 실행해도 안전
CREATE TABLE IF NOT EXISTS services (...);

-- ✅ 존재 여부 확인 후 삽입
INSERT INTO services (id, title)
VALUES ('uuid', 'title')
ON CONFLICT (id) DO NOTHING;

-- ❌ 중복 실행 시 에러
CREATE TABLE services (...);
INSERT INTO services (id, title) VALUES ('uuid', 'title');
```

#### 트랜잭션 사용
```sql
-- ✅ 트랜잭션으로 원자성 보장
BEGIN;
  -- 작업들
COMMIT;

-- ✅ 에러 시 롤백
BEGIN;
  -- 작업들
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
```

#### 검증 포함
```sql
-- ✅ 작업 전후 검증
DO $$
DECLARE
  count_before INTEGER;
  count_after INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_before FROM services;

  -- 작업

  SELECT COUNT(*) INTO count_after FROM services;
  RAISE NOTICE 'Before: %, After: %', count_before, count_after;
END $$;
```

---

## 📝 문서 작성 원칙

### 1. 구조화된 마크다운

#### 헤더 계층 (최대 3단계)
```markdown
# H1 - 문서 제목 (1개만)
## H2 - 주요 섹션
### H3 - 하위 섹션
```

#### 코드 블록 (언어 명시)
````markdown
```bash
npm run build
```

```typescript
const greeting: string = "Hello";
```
````

#### 링크 (상대 경로)
```markdown
[배포 가이드](../deployment/deployment-guide.md)
[Supabase 문서](https://supabase.com/docs)
```

### 2. 필수 섹션

모든 가이드 문서는 다음 섹션을 포함해야 합니다:

```markdown
# 문서 제목

간단한 설명 (1-2문장)

## 📋 목차 (선택 사항, 긴 문서만)

## 🎯 목적

이 문서가 해결하는 문제

## ✅ 전제 조건

- 필요한 환경
- 사전 지식

## 🚀 사용 방법

단계별 설명

## ⚠️ 주의사항

알아야 할 위험 요소

## 🔗 관련 문서

- [링크1](...)
- [링크2](...)
```

### 3. 시각적 요소

#### 이모지 (절제된 사용)
- 📁 폴더/디렉토리
- 📄 파일
- ✅ 완료/성공
- ❌ 실패/금지
- ⚠️ 주의/경고
- 🚀 배포/실행
- 🔧 설정/도구
- 📋 목록/체크리스트

#### 박스 (인용 블록)
```markdown
> **Note**: 추가 정보
> **Warning**: 주의사항
> **Tip**: 유용한 팁
```

---

## 🔄 문서 업데이트 규칙

### 1. 변경 시 반드시 업데이트

다음 작업 후 **즉시** 문서 업데이트:

1. **새 기능 추가** → 관련 가이드 업데이트
2. **버그 수정** → changelog.md 업데이트
3. **마이그레이션 실행** → README.md 또는 migration guide 업데이트
4. **환경 변수 추가** → env-setup-quick.md 업데이트
5. **배포** → CLAUDE.md 히스토리 업데이트

### 2. 업데이트 우선순위

#### 필수 (즉시)
- CLAUDE.md (프로젝트 현황)
- project-todo.md (할 일 목록)
- docs/project/changelog.md (변경 로그)

#### 중요 (당일)
- 관련 가이드 문서 (guides/)
- README.md (프로젝트 소개)

#### 선택 (주간)
- docs/project/roadmap.md (로드맵)
- 아카이브 정리

### 3. 문서 리뷰 체크리스트

커밋 전 확인:

- [ ] 링크 깨짐 없음 (상대 경로 확인)
- [ ] 코드 블록 언어 명시
- [ ] 이모지 과다 사용 없음
- [ ] 오타 확인
- [ ] 날짜 정확성 (YYYY-MM-DD)
- [ ] 관련 문서 링크 추가

---

## 🚨 문서 안티패턴 (금지)

### ❌ 하지 말아야 할 것

1. **중복 문서 생성**
   ```
   ❌ docs/deployment-guide.md
   ❌ docs/guides/deployment/deployment-guide.md
   → 하나만 유지, 나머지는 링크 참조
   ```

2. **루트에 문서 추가**
   ```
   ❌ my-guide.md (루트)
   ❌ AI_CHAT_WIDGET_IMPLEMENTATION.md (루트)
   ❌ CHANGELOG.md (루트 - docs/project/changelog.md와 중복)
   ✅ docs/guides/my-guide.md
   ✅ docs/archive/2025-12-14/AI_CHAT_WIDGET_IMPLEMENTATION.md
   ```

3. **의미 없는 이름**
   ```
   ❌ doc1.md, temp.md, new-file.md
   ✅ deployment-checklist.md
   ```

4. **깨진 링크 방치**
   ```
   ❌ [가이드](../old-location/guide.md) (404)
   ✅ [가이드](../guides/deployment/guide.md)
   ```

5. **과거 정보 삭제**
   ```
   ❌ 완료된 문서 삭제
   ✅ docs/archive/로 이동
   ```

6. **변경 로그 누락**
   ```
   ❌ 커밋만 하고 changelog.md 업데이트 안 함
   ✅ 커밋 + changelog.md 업데이트
   ```

---

## 📚 문서 발견성 (Discoverability)

### 1. 문서 인덱스 (docs/README.md)

모든 중요 문서는 `docs/README.md`에 링크되어야 합니다.

**구조**:
```markdown
# Documentation Index

## 🚀 빠른 시작
- [프로젝트 소개](../README.md)
- [개발 환경 설정](guides/env/env-setup-quick.md)

## 📘 가이드
- [배포 가이드](guides/deployment/deployment-guide.md)
- [데이터베이스 가이드](guides/database/README.md)

## 📊 프로젝트 문서
- [Changelog](project/changelog.md)
- [Roadmap](project/roadmap.md)
```

### 2. 폴더별 README.md

모든 폴더에는 `README.md`가 있어야 합니다:

```
docs/guides/deployment/
├── README.md              # 📌 폴더 인덱스
├── deployment-guide.md
└── vercel-deployment.md
```

### 3. 상호 참조 링크

관련 문서는 서로 링크되어야 합니다:

```markdown
## 🔗 관련 문서
- [Supabase 설정](../supabase/README.md)
- [마이그레이션 가이드](migrations/MIGRATION_GUIDE.md)
- [프로덕션 배포](../deployment/deployment-guide.md)
```

---

## 🔍 문서 검색 팁

### 1. 파일 이름으로 검색
```bash
# VS Code에서 Ctrl+P
deployment-guide.md

# 터미널에서
find docs -name "*deployment*"
```

### 2. 내용으로 검색
```bash
# VS Code에서 Ctrl+Shift+F
"supabase db reset"

# 터미널에서
grep -r "supabase db reset" docs/
```

### 3. docs/README.md 먼저 확인
- 📌 **모든 중요 문서의 인덱스**
- 카테고리별 정리
- 빠른 접근 링크

---

## 📋 체크리스트: 새 문서 추가 시

- [ ] 적절한 폴더에 위치 (docs/guides/, docs/project/, etc.)
- [ ] kebab-case 파일명 사용
- [ ] 필수 섹션 포함 (목적, 사용 방법, 주의사항, 관련 문서)
- [ ] docs/README.md에 링크 추가
- [ ] 폴더 README.md에 링크 추가
- [ ] 관련 문서에 상호 참조 링크 추가
- [ ] CLAUDE.md 히스토리 업데이트 (중요 문서인 경우)
- [ ] Git 커밋 메시지에 "docs:" 접두사 사용

---

## 📋 체크리스트: SQL 스크립트 추가 시

- [ ] 공식 마이그레이션 vs 임시 스크립트 구분
- [ ] 적절한 폴더에 위치 (supabase/migrations/ vs scripts/sql/)
- [ ] 타임스탬프 또는 명확한 이름 사용
- [ ] 멱등성 보장 (IF NOT EXISTS, ON CONFLICT)
- [ ] 트랜잭션 사용 (BEGIN/COMMIT)
- [ ] 검증 코드 포함 (RAISE NOTICE)
- [ ] 주석 추가 (목적, 날짜, 작성자)
- [ ] 로컬 DB에서 테스트
- [ ] scripts/sql/README.md 업데이트 (필요 시)

---

## 🔗 관련 문서

- [프로젝트 구조](guides/project-structure.md)
- [SDD 방법론](../CLAUDE.md#sdd-spec-driven-development-방법론)
- [Git 커밋 컨벤션](../CLAUDE.md#ai-협업-규칙-sdd-적용)
- [Supabase 마이그레이션 가이드](guides/database/migrations/MIGRATION_GUIDE.md)
