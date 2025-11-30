# Minu 연동 Phase 2 작업 계획

> ideaonaction.ai ↔ Minu 서비스 연동 완성을 위한 상세 실행 계획

**작성일**: 2025-11-30
**참조**: [docs/guides/minu-integration-guidelines.md](../docs/guides/minu-integration-guidelines.md)
**Phase 1 완료일**: 2025-11-28 (v2.22.0)

---

## 📊 현황 요약

### Phase 1 완료 항목 (10개)

| 카테고리 | 항목 | 구현 위치 |
|----------|------|-----------|
| OAuth | 12개 클라이언트 등록 | `20251128000001_seed_oauth_clients_multi_env.sql` |
| OAuth | Redirect URI 화이트리스트 | 마이그레이션 |
| OAuth | PKCE S256 적용 | `oauth-token/index.ts` |
| OAuth | Token 유효기간 (1h/30d) | `oauth-token/index.ts` |
| JWT | HS256 알고리즘 통일 | `oauth-token/index.ts` |
| JWT | subscription 클레임 포함 | `oauth-token/index.ts` |
| 보안 | CORS 동적 검증 | `_shared/cors.ts` |
| 보안 | Webhook HMAC-SHA256 | `webhook-send/index.ts` |
| API | RFC 7807 에러 포맷 | `_shared/problem-details.ts` |
| 테스트 | 5개 플랜 테스트 계정 | `20251128000002_seed_minu_test_accounts.sql` |

---

## 🎯 Phase 2 목표

**Minu 팀이 연동 개발을 진행할 수 있도록 필수 인프라 완성**

1. API 문서화 (OpenAPI/Swagger)
2. Rate Limiting 전역 적용
3. 세션/권한 관리 API 구현
4. 운영 모니터링 체계 구축

---

## 📅 Sprint 계획

### Sprint 2-1: API 문서화 + Rate Limiting (3일)

**목표**: Minu 팀 연동 개발 착수 가능

#### 작업 1.1: OpenAPI 스펙 작성 (1.5일)

```yaml
# 생성할 파일: docs/api/openapi.yaml
openapi: 3.0.3
info:
  title: ideaonaction.ai API
  version: 1.0.0
paths:
  /functions/v1/oauth-authorize:
  /functions/v1/oauth-token:
  /functions/v1/oauth-revoke:
  /functions/v1/api-v1-health:
  /functions/v1/subscription-api:
  /functions/v1/user-api:
```

| 엔드포인트 | 문서화 범위 |
|-----------|------------|
| OAuth | authorize, token, revoke, introspect |
| User | profile, update, delete |
| Subscription | list, check, webhook events |
| Health | status, dependencies |

**산출물**:
- `docs/api/openapi.yaml` - OpenAPI 3.0 스펙
- `docs/api/README.md` - API 사용 가이드
- Swagger UI 정적 페이지 (선택)

#### 작업 1.2: Rate Limiting 구현 (1일)

```typescript
// 생성할 파일: supabase/functions/_shared/rate-limit.ts
interface RateLimitConfig {
  windowMs: number;      // 시간 윈도우 (ms)
  maxRequests: number;   // 최대 요청 수
  keyGenerator: (req: Request) => string; // 키 생성
}

// 기본 정책
const DEFAULT_LIMITS = {
  oauth: { windowMs: 60_000, maxRequests: 10 },   // 1분 10회
  api: { windowMs: 60_000, maxRequests: 60 },     // 1분 60회
  webhook: { windowMs: 60_000, maxRequests: 100 }, // 1분 100회
};
```

**적용 대상 Edge Functions**:
- `oauth-authorize` - 10 req/min
- `oauth-token` - 10 req/min
- `subscription-api` - 60 req/min
- `user-api` - 60 req/min

**산출물**:
- `supabase/functions/_shared/rate-limit.ts`
- Redis/Upstash 연동 또는 Supabase 테이블 기반 구현

#### 작업 1.3: Sandbox 환경 설정 (0.5일)

| 환경 | URL | 용도 |
|------|-----|------|
| Sandbox | `sandbox.ideaonaction.ai` | Minu 팀 테스트 |

**구성 항목**:
- Vercel Preview 브랜치 (`sandbox`)
- 별도 Supabase 프로젝트 또는 스키마 분리
- 테스트 데이터 자동 시드

---

### Sprint 2-2: 세션 관리 API (2일)

**목표**: 다중 기기/세션 관리 기능 제공

#### 작업 2.1: 세션 정책 정의 (0.5일)

| 정책 | 값 | 비고 |
|------|-----|------|
| 세션 타임아웃 | 30분 (비활성) | 설정 가능 |
| 동시 로그인 | 5개 기기 | 초과 시 가장 오래된 세션 만료 |
| Remember Me | 30일 | Refresh Token 유효기간 |
| 강제 로그아웃 | 즉시 | 모든 세션 무효화 |

#### 작업 2.2: 세션 관리 API 구현 (1.5일)

```
# 새 Edge Function: session-api

GET  /sessions              # 활성 세션 목록
DELETE /sessions/:id        # 특정 세션 종료
DELETE /sessions            # 전체 세션 종료 (강제 로그아웃)
```

**DB 스키마 추가**:

```sql
-- 마이그레이션: 20251201000001_create_user_sessions.sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_id UUID REFERENCES oauth_refresh_tokens(id),
  device_info JSONB,
  ip_address INET,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active_at);
```

**산출물**:
- `supabase/functions/session-api/index.ts`
- `supabase/migrations/20251201000001_create_user_sessions.sql`
- `tests/e2e/api/session-api.spec.ts`

---

### Sprint 2-3: 권한 관리 API (2일)

**목표**: 역할 기반 접근 제어 (RBAC) 구현

#### 작업 3.1: 역할 모델 정의 (0.5일)

```
Organization
└── Team
    └── User (Role: owner | admin | member | viewer)
        └── Service Access (Find, Frame, Build, Keep)
```

| 역할 | 권한 |
|------|------|
| owner | 모든 권한 + 조직 삭제 + 결제 관리 |
| admin | 모든 기능 + 멤버 관리 |
| member | 구독 플랜 범위 내 기능 |
| viewer | 읽기 전용 |

#### 작업 3.2: 권한 API 구현 (1.5일)

```
# 새 Edge Function: permission-api

GET  /permissions/check     # 권한 확인 { resource, action }
GET  /roles                 # 역할 목록
POST /roles/assign          # 역할 할당
DELETE /roles/:user_id      # 역할 제거
```

**DB 스키마 추가**:

```sql
-- 마이그레이션: 20251202000001_create_rbac_tables.sql
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE role_permissions (
  role user_role PRIMARY KEY,
  permissions JSONB NOT NULL
);

-- 기본 권한 설정
INSERT INTO role_permissions (role, permissions) VALUES
('owner', '{"*": ["*"]}'),
('admin', '{"users": ["read", "invite", "remove"], "content": ["*"]}'),
('member', '{"content": ["read", "create", "update"]}'),
('viewer', '{"content": ["read"]}');
```

**산출물**:
- `supabase/functions/permission-api/index.ts`
- `supabase/migrations/20251202000001_create_rbac_tables.sql`
- `src/hooks/usePermissions.ts`
- `tests/e2e/api/permission-api.spec.ts`

---

### Sprint 2-4: 팀 관리 API (1.5일)

**목표**: 조직/팀 생성 및 멤버 관리

#### 작업 4.1: 팀 관리 API 구현 (1.5일)

```
# 새 Edge Function: team-api

POST   /teams               # 팀 생성
GET    /teams               # 팀 목록
GET    /teams/:id           # 팀 상세
PUT    /teams/:id           # 팀 수정
DELETE /teams/:id           # 팀 삭제

POST   /teams/:id/members   # 멤버 초대
DELETE /teams/:id/members/:user_id  # 멤버 제거
PUT    /teams/:id/members/:user_id  # 역할 변경
```

**산출물**:
- `supabase/functions/team-api/index.ts`
- `supabase/migrations/20251203000001_create_teams_table.sql`
- `tests/e2e/api/team-api.spec.ts`

---

### Sprint 2-5: 운영 모니터링 (1.5일)

**목표**: 서비스 상태 페이지 및 알림 체계

#### 작업 5.1: 상태 페이지 API (0.5일)

```
# api-v1-health 확장

GET /health              # 기본 상태
GET /health/detailed     # 의존성 상태 (DB, Auth, Edge Functions)
GET /health/metrics      # 성능 메트릭 (응답 시간, 에러율)
```

#### 작업 5.2: Audit Log 구현 (1일)

```sql
-- 마이그레이션: 20251204000001_create_audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_type VARCHAR(50), -- 'user' | 'system' | 'service'
  resource_type VARCHAR(100),
  resource_id UUID,
  action VARCHAR(50),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

**산출물**:
- `supabase/functions/_shared/audit-log.ts`
- `supabase/migrations/20251204000001_create_audit_log.sql`

---

## 📋 전체 일정 요약

| Sprint | 기간 | 작업 내용 | 산출물 |
|--------|------|-----------|--------|
| 2-1 | 3일 | API 문서화, Rate Limiting | openapi.yaml, rate-limit.ts |
| 2-2 | 2일 | 세션 관리 API | session-api, user_sessions 테이블 |
| 2-3 | 2일 | 권한 관리 API | permission-api, RBAC 테이블 |
| 2-4 | 1.5일 | 팀 관리 API | team-api |
| 2-5 | 1.5일 | 운영 모니터링 | audit_log, health 확장 |

**총 예상 소요**: 10일 (2주)

---

## 🔧 기술 결정 사항

### Rate Limiting 구현 방식

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| Supabase 테이블 | 추가 비용 없음 | 성능 제한 | ✅ 초기 |
| Upstash Redis | 고성능 | 월 비용 발생 | 향후 확장 |
| Cloudflare | Edge 레벨 | 복잡도 증가 | - |

### JWT 알고리즘 전환 (향후)

| 단계 | 작업 | 시기 |
|------|------|------|
| 1 | RS256 키 쌍 생성 | Phase 3 |
| 2 | JWKS 엔드포인트 구현 | Phase 3 |
| 3 | 신규 토큰 RS256 발급 | Phase 3 |
| 4 | HS256 토큰 만료 대기 | 30일 후 |
| 5 | HS256 지원 제거 | Phase 4 |

---

## ✅ 완료 체크리스트

### Sprint 2-1
- [ ] OpenAPI 스펙 작성
- [ ] Swagger UI 또는 ReDoc 페이지
- [ ] Rate Limit 공유 모듈
- [ ] OAuth 엔드포인트 Rate Limit 적용
- [ ] API 엔드포인트 Rate Limit 적용

### Sprint 2-2
- [ ] 세션 정책 문서화
- [ ] user_sessions 테이블 생성
- [ ] session-api Edge Function
- [ ] 세션 목록 조회 API
- [ ] 강제 로그아웃 API

### Sprint 2-3
- [ ] RBAC 테이블 생성
- [ ] permission-api Edge Function
- [ ] 권한 확인 API
- [ ] usePermissions 훅

### Sprint 2-4
- [ ] teams 테이블 생성
- [ ] team-api Edge Function
- [ ] 멤버 초대/관리 API

### Sprint 2-5
- [ ] health API 확장
- [ ] audit_log 테이블 생성
- [ ] Audit Log 공유 모듈
- [ ] 주요 API 감사 로깅 적용

---

## 📝 의존성 및 리스크

### 의존성

| 항목 | 설명 | 해결 방안 |
|------|------|-----------|
| Minu 팀 피드백 | API 설계 검증 필요 | 스펙 공유 후 피드백 반영 |
| Supabase 제한 | Edge Function 동시 실행 | Rate Limit으로 조절 |

### 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 스펙 변경 | 재작업 발생 | 초기 Minu 팀 협의 |
| 성능 이슈 | API 응답 지연 | 캐싱 전략 적용 |

---

## 🔗 참고 문서

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)
- [Minu 연동 가이드라인](../docs/guides/minu-integration-guidelines.md)
