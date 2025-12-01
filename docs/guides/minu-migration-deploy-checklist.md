# Minu Phase 2 마이그레이션 배포 체크리스트

> **프로젝트**: IDEA on Action
> **작성일**: 2025-12-01
> **마이그레이션 버전**: Phase 2 (20251201000001~000006)
> **상태**: ✅ 검증 완료 - 배포 준비됨

---

## 📋 개요

Minu Phase 2를 위한 6개 마이그레이션 파일의 프로덕션 배포 체크리스트입니다.

### 마이그레이션 파일 목록

| 순서 | 파일명 | 설명 | 상태 |
|------|--------|------|------|
| 1 | `20251201000001_create_rate_limit_table.sql` | Rate Limiting 테이블 | ✅ 정상 |
| 2 | `20251201000002_create_user_sessions.sql` | 사용자 세션 관리 | ⚠️ 수정 필요 |
| 3 | `20251201000003_create_rbac_tables.sql` | RBAC 시스템 | ✅ 정상 |
| 4 | `20251201000004_create_teams_table.sql` | 팀/조직 관리 | ✅ 정상 |
| 5 | `20251201000005_create_audit_log.sql` | 감사 로그 | ⚠️ 수정 필요 |
| 6 | `20251201000006_create_health_metrics.sql` | 헬스 메트릭 | ⚠️ 수정 필요 |

---

## 🔍 마이그레이션 파일 검증 결과

### ✅ 1. Rate Limit Table (20251201000001)

**상태**: 정상

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ 인덱스 설정 적절 (키, 윈도우, 만료 시간)
- ✅ RLS 정책 정상 (Service Role + Authenticated 읽기)
- ✅ TTL 자동 정리 함수 및 pg_cron 스케줄러 구현
- ✅ 예외 처리 포함 (pg_cron 미설치 시 대응)
- ✅ 롤백 가능

**특이사항**:
- `pg_cron` 확장 필수 (5분마다 만료 엔트리 정리)
- Supabase 프로덕션에서 `pg_cron` 설치 여부 확인 필요

---

### ⚠️ 2. User Sessions (20251201000002)

**상태**: 수정 필요

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ 인덱스 설정 적절
- ⚠️ **이슈**: `oauth_refresh_tokens` 테이블 참조 FK 존재
  - `refresh_token_id UUID REFERENCES oauth_refresh_tokens(id) ON DELETE SET NULL`
  - `oauth_refresh_tokens` 테이블이 존재하는지 확인 필요
  - **확인 완료**: `20251127000000_create_oauth_tables.sql`에 테이블 존재
- ✅ RLS 정책 정상 (사용자는 자신의 세션만 조회/삭제)
- ⚠️ **이슈**: RLS 정책 `auth.role()` 함수 사용
  - `CREATE POLICY "Service role can manage all sessions" ... USING (auth.role() = 'service_role');`
  - Supabase에서 `auth.role()`은 `service_role`을 반환하지 않을 수 있음
  - **권장 수정**: `TO service_role` 사용 권장
- ✅ TTL 정리 함수 구현
- ✅ 롤백 가능

**수정 권장 사항**:
```sql
-- 기존 (잠재적 문제)
CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  USING (auth.role() = 'service_role');

-- 권장 (명시적 Role 지정)
CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### ✅ 3. RBAC Tables (20251201000003)

**상태**: 정상

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ ENUM 타입 생성 (중복 방지 처리)
- ✅ 인덱스 설정 적절
- ✅ RLS 정책 정상 (권한 기반 접근 제어)
- ✅ 권한 확인 함수 구현 (`check_permission`, `get_user_role`, `get_role_permissions`)
- ✅ 기본 권한 시드 데이터 (owner, admin, member, viewer)
- ✅ `updated_at` 자동 갱신 트리거
- ✅ 롤백 가능

**특이사항**:
- `organization_id`는 추후 `organizations` 테이블과 FK 연결 예정 (현재 UUID만 저장)
- 다음 마이그레이션(20251201000004)에서 FK 제약 조건 추가됨

---

### ✅ 4. Teams Table (20251201000004)

**상태**: 정상

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ 테이블 생성 순서 정상 (`organizations` → `teams` → `team_members` → `team_invitations`)
- ✅ FK 제약 조건 정상 (CASCADE 처리)
- ✅ 인덱스 설정 적절
- ✅ RLS 정책 정상 (조직/팀 멤버 기반 접근 제어)
- ✅ 자동 owner 추가 트리거 (`add_organization_owner`, `add_team_owner`)
- ✅ `organization_members` 테이블에 FK 추가 (조건부 처리)
- ✅ 초대 토큰 생성 함수 구현
- ✅ `role_permissions` 테이블 업데이트 (teams 리소스 권한 추가)
- ✅ `updated_at` 자동 갱신 트리거
- ✅ 롤백 가능

**의존성**:
- **필수 선행 마이그레이션**: `20251201000003_create_rbac_tables.sql`
  - `organization_members` 테이블
  - `role_permissions` 테이블
  - `check_permission` 함수
  - `update_updated_at_column` 함수

---

### ⚠️ 5. Audit Log (20251201000005)

**상태**: 수정 필요

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ 인덱스 설정 적절 (행위자, 리소스, 조직, 이벤트, 시간, 액션, 상태)
- ✅ 복합 인덱스 설정 (리소스+시간, 행위자+시간)
- ⚠️ **이슈**: RLS 정책에서 `public.admins` 테이블 참조
  - `audit_log_admin_read` 정책: `SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid() AND admins.role IN ('admin', 'super_admin')`
  - **확인 완료**: `20251115170300_create_admins_table_v2.sql`에 테이블 존재
  - 관리자만 모든 감사 로그 조회 가능
- ✅ 사용자는 자신의 감사 로그만 조회 가능
- ✅ Edge Functions(서비스 역할)만 삽입 가능
- ✅ 유틸리티 함수 구현 (`cleanup_old_audit_logs`, `get_resource_audit_logs`, `get_user_audit_logs`)
- ✅ 90일 이전 데이터 자동 삭제 함수
- ⚠️ **주의**: 자동 정리 스케줄러 미구현 (수동 실행 필요)
- ✅ 롤백 가능

**권장 사항**:
1. **자동 정리 스케줄러 추가** (선택사항):
   ```sql
   -- pg_cron을 사용한 자동 정리 (매일 자정)
   SELECT cron.schedule(
     'cleanup-audit-logs',
     '0 0 * * *',
     $$SELECT cleanup_old_audit_logs();$$
   );
   ```

2. **파티셔닝 고려** (대용량 데이터 시):
   - 월별 또는 분기별 파티셔닝 적용
   - 현재는 단일 테이블로 충분

---

### ⚠️ 6. Health Metrics (20251201000006)

**상태**: 수정 필요

**검증 항목**:
- ✅ SQL 문법 정상
- ✅ 인덱스 설정 적절 (시간, 엔드포인트, 상태 코드)
- ✅ 체크 제약 조건 정상 (`status_code` 100~599, `latency_ms` >= 0)
- ✅ 집계 뷰 구현 (`health_metrics_hourly`, `health_metrics_latest`, `health_metrics_summary`)
- ✅ 24시간 데이터 자동 삭제 함수 구현
- ⚠️ **이슈**: RLS 정책에서 `public.admins` 테이블 참조
  - `health_metrics_read_policy`: `SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid() AND admins.role IN ('admin', 'super_admin')`
  - **확인 완료**: `20251115170300_create_admins_table_v2.sql`에 테이블 존재
- ⚠️ **이슈**: RLS 정책 `auth.role()` 함수 사용
  - `health_metrics_service_policy`: `USING (auth.role() = 'service_role')`
  - **권장 수정**: `TO service_role` 사용 권장
- ✅ 권한 설정 (뷰는 anon/authenticated 읽기 가능, 테이블은 service_role만)
- ⚠️ **주의**: 자동 정리 스케줄러 미구현 (수동 실행 필요)
- ✅ 롤백 가능

**수정 권장 사항**:
```sql
-- 기존 (잠재적 문제)
CREATE POLICY "health_metrics_service_policy"
  ON health_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 권장 (명시적 Role 지정)
CREATE POLICY "health_metrics_service_policy"
  ON health_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**권장 사항**:
1. **자동 정리 스케줄러 추가** (선택사항):
   ```sql
   -- pg_cron을 사용한 자동 정리 (매 시간)
   SELECT cron.schedule(
     'cleanup-health-metrics',
     '0 * * * *',
     $$SELECT cleanup_old_health_metrics();$$
   );
   ```

---

## 🚨 발견된 이슈 요약

### Critical (배포 전 필수 수정)

**없음** - 모든 마이그레이션 파일은 배포 가능 상태입니다.

### Warning (권장 수정)

| 파일 | 이슈 | 영향 | 수정 권장도 |
|------|------|------|------------|
| `20251201000002_create_user_sessions.sql` | `auth.role()` 함수 사용 (RLS 정책) | Service Role 정책이 작동하지 않을 수 있음 | 중간 |
| `20251201000006_create_health_metrics.sql` | `auth.role()` 함수 사용 (RLS 정책) | Service Role 정책이 작동하지 않을 수 있음 | 중간 |
| `20251201000005_create_audit_log.sql` | 자동 정리 스케줄러 미구현 | 데이터 축적으로 인한 성능 저하 (장기) | 낮음 |
| `20251201000006_create_health_metrics.sql` | 자동 정리 스케줄러 미구현 | 데이터 축적으로 인한 성능 저하 (단기) | 중간 |

### Info (참고사항)

| 파일 | 내용 |
|------|------|
| `20251201000001_create_rate_limit_table.sql` | `pg_cron` 확장 필수 (자동 정리 기능) |
| `20251201000002_create_user_sessions.sql` | `oauth_refresh_tokens` 테이블 의존성 (✅ 존재 확인됨) |
| `20251201000003_create_rbac_tables.sql` | `organization_id`는 다음 마이그레이션에서 FK 연결 |
| `20251201000004_create_teams_table.sql` | 3개 마이그레이션에 의존 (RBAC 시스템) |
| `20251201000005_create_audit_log.sql` | `public.admins` 테이블 의존성 (✅ 존재 확인됨) |
| `20251201000006_create_health_metrics.sql` | `public.admins` 테이블 의존성 (✅ 존재 확인됨) |

---

## 📝 배포 전 체크리스트

### 1. 환경 확인

- [ ] **Supabase 프로덕션 인스턴스 접근 권한 확보**
- [ ] **데이터베이스 백업 완료** (롤백 대비)
- [ ] **`pg_cron` 확장 설치 확인** (Rate Limit 자동 정리용)
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'pg_cron';
  ```
- [ ] **기존 테이블 존재 확인** (의존성 검증)
  - `oauth_refresh_tokens` (✅ 확인됨)
  - `public.admins` (✅ 확인됨)
  - `organization_members` (생성 예정 - 마이그레이션 3에서)

### 2. 마이그레이션 파일 수정 (선택사항 - 권장)

#### 2.1. `20251201000002_create_user_sessions.sql` 수정

**위치**: Line 59-61

**기존 코드**:
```sql
CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  USING (auth.role() = 'service_role');
```

**수정 코드**:
```sql
CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### 2.2. `20251201000006_create_health_metrics.sql` 수정

**위치**: Line 132-136

**기존 코드**:
```sql
CREATE POLICY "health_metrics_service_policy"
  ON health_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**수정 코드**:
```sql
CREATE POLICY "health_metrics_service_policy"
  ON health_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3. 마이그레이션 순서 확인

**중요**: 반드시 아래 순서대로 실행해야 합니다.

```
1. 20251201000001_create_rate_limit_table.sql (독립)
2. 20251201000002_create_user_sessions.sql (독립, oauth_refresh_tokens 참조)
3. 20251201000003_create_rbac_tables.sql (독립)
4. 20251201000004_create_teams_table.sql (3번 의존)
5. 20251201000005_create_audit_log.sql (독립, admins 참조)
6. 20251201000006_create_health_metrics.sql (독립, admins 참조)
```

**의존성 그래프**:
```
[oauth_refresh_tokens] ← [20251201000002_create_user_sessions.sql]
[20251201000003_create_rbac_tables.sql] ← [20251201000004_create_teams_table.sql]
[public.admins] ← [20251201000005_create_audit_log.sql]
[public.admins] ← [20251201000006_create_health_metrics.sql]
```

### 4. 배포 방법

#### 방법 1: Supabase CLI (권장)

```bash
# 로컬에서 실행 (프로덕션 프로젝트 연결)
supabase link --project-ref <production-project-id>

# 마이그레이션 상태 확인
supabase db remote list

# 마이그레이션 실행 (순서대로 자동 적용)
supabase db push

# 또는 개별 실행
supabase db execute --file supabase/migrations/20251201000001_create_rate_limit_table.sql
supabase db execute --file supabase/migrations/20251201000002_create_user_sessions.sql
supabase db execute --file supabase/migrations/20251201000003_create_rbac_tables.sql
supabase db execute --file supabase/migrations/20251201000004_create_teams_table.sql
supabase db execute --file supabase/migrations/20251201000005_create_audit_log.sql
supabase db execute --file supabase/migrations/20251201000006_create_health_metrics.sql
```

#### 방법 2: Supabase Dashboard SQL Editor

1. Supabase Dashboard → SQL Editor 접속
2. 마이그레이션 파일 순서대로 복사 & 실행
3. 각 실행 후 에러 확인

#### 방법 3: GitHub Actions CI/CD (자동화)

```yaml
# .github/workflows/deploy-migrations.yml 예시
name: Deploy Migrations
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - production
          - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase db push
```

### 5. 배포 후 검증

#### 5.1. 테이블 생성 확인

```sql
-- 모든 테이블이 생성되었는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'rate_limit_entries',
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams',
    'team_members',
    'team_invitations',
    'audit_log',
    'health_metrics'
  )
ORDER BY table_name;

-- 예상 결과: 10개 테이블
```

#### 5.2. RLS 활성화 확인

```sql
-- 모든 테이블의 RLS가 활성화되었는지 확인
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'rate_limit_entries',
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams',
    'team_members',
    'team_invitations',
    'audit_log',
    'health_metrics'
  );

-- 예상 결과: 모든 테이블 rowsecurity = true
```

#### 5.3. 인덱스 생성 확인

```sql
-- 주요 인덱스 확인
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'rate_limit_entries',
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams',
    'team_members',
    'team_invitations',
    'audit_log',
    'health_metrics'
  )
ORDER BY tablename, indexname;

-- 예상 결과: 30+ 인덱스
```

#### 5.4. 함수 생성 확인

```sql
-- 주요 함수 확인
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'cleanup_expired_rate_limit_entries',
    'cleanup_expired_sessions',
    'check_permission',
    'get_user_role',
    'get_role_permissions',
    'add_organization_owner',
    'add_team_owner',
    'generate_invitation_token',
    'cleanup_old_audit_logs',
    'get_resource_audit_logs',
    'get_user_audit_logs',
    'cleanup_old_health_metrics'
  )
ORDER BY routine_name;

-- 예상 결과: 12개 함수
```

#### 5.5. 트리거 생성 확인

```sql
-- 트리거 확인
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams'
  )
ORDER BY event_object_table, trigger_name;

-- 예상 결과: 7개 트리거
```

#### 5.6. 뷰 생성 확인

```sql
-- 뷰 확인
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'health_metrics_hourly',
    'health_metrics_latest',
    'health_metrics_summary'
  );

-- 예상 결과: 3개 뷰
```

#### 5.7. pg_cron 스케줄러 확인

```sql
-- pg_cron 스케줄 확인
SELECT
  jobid,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE command LIKE '%rate_limit%'
   OR command LIKE '%audit_log%'
   OR command LIKE '%health_metrics%';

-- 예상 결과: 1~3개 스케줄 (수정 사항에 따라)
```

#### 5.8. 권한 확인

```sql
-- 기본 권한 시드 데이터 확인
SELECT role, permissions
FROM role_permissions
ORDER BY role;

-- 예상 결과:
-- owner: {"*": ["*"]}
-- admin: {"users": [...], "content": [...], "teams": [...], ...}
-- member: {"content": [...], "teams": ["read"], ...}
-- viewer: {"content": ["read"], "teams": ["read"], ...}
```

#### 5.9. 샘플 데이터 삽입 테스트

```sql
-- Rate Limit 테스트
INSERT INTO rate_limit_entries (key, count, window_start, expires_at)
VALUES ('test:ip:127.0.0.1', 1, NOW(), NOW() + INTERVAL '1 minute')
RETURNING *;

-- 정상 삽입 확인 후 삭제
DELETE FROM rate_limit_entries WHERE key = 'test:ip:127.0.0.1';

-- 조직 생성 테스트 (현재 사용자 ID 필요)
-- SELECT auth.uid(); 로 현재 사용자 ID 확인 후 실행
-- INSERT INTO organizations (name, slug, created_by)
-- VALUES ('Test Org', 'test-org', '<your-user-id>')
-- RETURNING *;

-- owner 자동 추가 확인
-- SELECT * FROM organization_members WHERE organization_id = '<org-id>';
-- 예상 결과: created_by가 owner 역할로 추가됨
```

---

## 🔄 롤백 절차

### 배포 중 오류 발생 시

1. **즉시 배포 중단**
2. **오류 로그 기록**
3. **이미 적용된 마이그레이션 확인**:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version LIKE '20251201%'
   ORDER BY version DESC;
   ```
4. **역순으로 롤백** (아래 롤백 스크립트 실행)

### 롤백 스크립트

```sql
-- ============================================================================
-- ROLLBACK: Minu Phase 2 Migrations
-- 실행 순서: 역순 (6 → 5 → 4 → 3 → 2 → 1)
-- ============================================================================

-- 6. Health Metrics 롤백
DROP VIEW IF EXISTS health_metrics_summary;
DROP VIEW IF EXISTS health_metrics_latest;
DROP VIEW IF EXISTS health_metrics_hourly;
DROP FUNCTION IF EXISTS cleanup_old_health_metrics();
DROP TABLE IF EXISTS health_metrics CASCADE;

-- 5. Audit Log 롤백
DROP FUNCTION IF EXISTS get_user_audit_logs(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_resource_audit_logs(VARCHAR, UUID, INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_audit_logs();
DROP TABLE IF EXISTS audit_log CASCADE;

-- 4. Teams 롤백
DROP FUNCTION IF EXISTS generate_invitation_token();
DROP TRIGGER IF EXISTS trigger_add_team_owner ON teams;
DROP FUNCTION IF EXISTS add_team_owner();
DROP TRIGGER IF EXISTS trigger_add_organization_owner ON organizations;
DROP FUNCTION IF EXISTS add_organization_owner();
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- organization_members FK 제거 (마이그레이션 4에서 추가한 것)
ALTER TABLE IF EXISTS organization_members
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

-- role_permissions 권한 업데이트 롤백 (teams 리소스 제거)
UPDATE role_permissions
SET permissions = permissions - 'teams',
    updated_at = NOW()
WHERE role IN ('admin', 'member', 'viewer');

-- 3. RBAC 롤백
DROP FUNCTION IF EXISTS get_role_permissions(user_role);
DROP FUNCTION IF EXISTS get_user_role(UUID, UUID);
DROP FUNCTION IF EXISTS check_permission(UUID, UUID, TEXT, TEXT);
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TYPE IF EXISTS user_role;

-- 2. User Sessions 롤백
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP TRIGGER IF EXISTS trigger_update_user_sessions_updated_at ON user_sessions;
DROP FUNCTION IF EXISTS update_user_sessions_updated_at();
DROP TABLE IF EXISTS user_sessions CASCADE;

-- 1. Rate Limit 롤백
-- pg_cron 스케줄 제거 (있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-rate-limit-entries');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DROP FUNCTION IF EXISTS cleanup_expired_rate_limit_entries();
DROP TABLE IF EXISTS rate_limit_entries CASCADE;

-- ============================================================================
-- 롤백 완료 확인
-- ============================================================================
SELECT 'Rollback completed' AS status;

-- 마이그레이션 히스토리에서 제거 (선택사항)
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20251201000001',
  '20251201000002',
  '20251201000003',
  '20251201000004',
  '20251201000005',
  '20251201000006'
);
```

---

## 🎯 배포 후 모니터링

### 1. 로그 모니터링 (첫 24시간)

```sql
-- 에러 로그 확인
SELECT * FROM audit_log
WHERE status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- 헬스 메트릭 요약
SELECT * FROM health_metrics_summary;

-- 시간별 헬스 메트릭
SELECT * FROM health_metrics_hourly
ORDER BY hour DESC
LIMIT 24;
```

### 2. 성능 모니터링

```sql
-- 테이블 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'rate_limit_entries',
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams',
    'team_members',
    'team_invitations',
    'audit_log',
    'health_metrics'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 인덱스 사용률 확인
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'rate_limit_entries',
    'user_sessions',
    'organization_members',
    'role_permissions',
    'organizations',
    'teams',
    'team_members',
    'team_invitations',
    'audit_log',
    'health_metrics'
  )
ORDER BY idx_scan DESC;
```

### 3. 자동 정리 함수 수동 실행 (선택사항)

```sql
-- Rate Limit 만료 엔트리 정리 (pg_cron 미설정 시)
SELECT cleanup_expired_rate_limit_entries();

-- User Sessions 만료 세션 정리
SELECT cleanup_expired_sessions();

-- Audit Log 오래된 데이터 정리 (90일+)
SELECT cleanup_old_audit_logs();

-- Health Metrics 오래된 데이터 정리 (24시간+)
SELECT cleanup_old_health_metrics();
```

---

## 📞 긴급 연락처

| 역할 | 이름 | 연락처 |
|------|------|--------|
| 프로젝트 관리자 | 서민원 | sinclairseo@gmail.com |
| DBA | TBD | - |
| DevOps | TBD | - |

---

## ✅ 최종 체크리스트

### 배포 전

- [ ] 데이터베이스 백업 완료
- [ ] `pg_cron` 확장 설치 확인
- [ ] 의존성 테이블 존재 확인 (`oauth_refresh_tokens`, `public.admins`)
- [ ] RLS 정책 수정 완료 (선택사항)
- [ ] 마이그레이션 순서 확인

### 배포 중

- [ ] 마이그레이션 1 실행 → 검증
- [ ] 마이그레이션 2 실행 → 검증
- [ ] 마이그레이션 3 실행 → 검증
- [ ] 마이그레이션 4 실행 → 검증
- [ ] 마이그레이션 5 실행 → 검증
- [ ] 마이그레이션 6 실행 → 검증

### 배포 후

- [ ] 테이블 생성 확인 (10개)
- [ ] RLS 활성화 확인
- [ ] 인덱스 생성 확인 (30+)
- [ ] 함수 생성 확인 (12개)
- [ ] 트리거 생성 확인 (7개)
- [ ] 뷰 생성 확인 (3개)
- [ ] pg_cron 스케줄 확인 (1~3개)
- [ ] 권한 시드 데이터 확인
- [ ] 샘플 데이터 삽입 테스트
- [ ] 로그 모니터링 설정
- [ ] 성능 모니터링 설정

---

## 📚 참고 문서

- [Supabase 마이그레이션 가이드](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL RLS 문서](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pg_cron 확장 문서](https://github.com/citusdata/pg_cron)
- [프로젝트 헌법](../../constitution.md)
- [개발 방법론](methodology.md)

---

## 🔖 버전 히스토리

| 버전 | 날짜 | 작성자 | 변경 내역 |
|------|------|--------|----------|
| 1.0.0 | 2025-12-01 | Claude AI | 초안 작성 - 6개 마이그레이션 검증 완료 |

---

**문서 끝**
