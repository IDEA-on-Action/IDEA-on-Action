# Supabase Auth → Workers Auth 점진적 마이그레이션 전략

> 작성일: 2025-12-27 | 상태: 진행 중 | Phase 5

## 개요

Supabase Auth에서 Cloudflare Workers 기반 자체 인증으로 점진적 전환을 위한 전략 문서입니다.

### 목표
- 서비스 중단 없는 인증 시스템 전환
- 기존 사용자 로그인 유지
- 신규 가입은 D1에 직접 저장
- 최종적으로 Supabase Auth 의존성 제거

## 현재 상태

| 항목 | Supabase | Workers |
|------|----------|---------|
| OAuth (Google, GitHub 등) | O | X (미구현) |
| 이메일/비밀번호 | O | O |
| 세션 관리 | O | O (KV 기반) |
| Rate Limiting | X | O |
| 비밀번호 재설정 | O | O |

## 마이그레이션 단계

### Phase 1: 이중 인증 구현 (현재)

**구현 완료:**
- `useAuth.ts` 훅에서 이중 인증 지원
- 로그인: Supabase 우선 → 실패 시 Workers
- 회원가입: Workers 전용 (D1 저장)
- 로그아웃: 양쪽 모두 처리

**파일:**
- `src/hooks/useAuth.ts` - 이중 인증 훅
- `src/integrations/cloudflare/client.ts` - Workers API 클라이언트
- `cloudflare-workers/src/handlers/auth/login.ts` - Workers 인증 핸들러

### Phase 2: 사용자 마이그레이션 (계획)

**전략:**
1. Supabase 로그인 성공 시 D1에 사용자 정보 동기화
2. 비밀번호는 새로 입력받아 재해시 (Supabase 해시 추출 불가)
3. `is_migrated` 플래그로 마이그레이션 상태 추적

**구현 예정:**
```typescript
// Supabase 로그인 성공 후 D1 동기화
async function syncUserToD1(user: SupabaseUser, password: string) {
  // 1. D1에 사용자 존재 여부 확인
  // 2. 없으면 새로 생성 (password 재해시)
  // 3. is_migrated = 1 설정
}
```

### Phase 3: OAuth 전환 (계획)

Workers에서 OAuth 직접 구현이 복잡하므로 두 가지 옵션:
1. Supabase OAuth 유지 + Workers 세션 동기화
2. Workers OAuth 핸들러 구현 (Google, GitHub 등)

**권장:** 옵션 1 (Supabase OAuth 유지)

### Phase 4: Supabase Auth 제거 (최종)

모든 사용자가 D1로 마이그레이션된 후:
1. Supabase Auth 비활성화
2. OAuth 연동 Workers 이전
3. Supabase 의존성 완전 제거

## 인증 흐름

### 로그인 흐름

```
사용자 → signInWithEmail(email, password)
           │
           ▼
     Supabase 로그인 시도
           │
     ┌─────┴─────┐
     │           │
   성공        실패
     │           │
     ▼           ▼
  Supabase   Workers 로그인 시도
  세션 설정        │
     │       ┌────┴────┐
     │       │         │
     │     성공      실패
     │       │         │
     │       ▼         ▼
     │   Workers    에러 반환
     │   토큰 설정
     │       │
     └───────┴──────────▶ 완료
```

### 회원가입 흐름

```
사용자 → signUpWithEmail(email, password, name)
           │
           ▼
     Workers API 호출
     (/auth/register)
           │
           ▼
     D1에 사용자 생성
     (password_hash, password_salt)
           │
           ▼
     JWT 토큰 발급
           │
           ▼
     localStorage에 저장
           │
           ▼
     완료
```

## 토큰 관리

### Workers 토큰 구조

```typescript
interface WorkersTokens {
  accessToken: string    // JWT, 1시간
  refreshToken: string   // JWT, 30일
  expiresAt: number     // timestamp
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl?: string | null
    isAdmin?: boolean
  }
}
```

### 저장 위치

| 토큰 | 저장소 | TTL |
|------|--------|-----|
| Access Token | localStorage | 1시간 |
| Refresh Token | localStorage + KV | 30일 |
| Auth Provider | localStorage | - |

## D1 스키마 변경

### 추가된 컬럼

```sql
-- d1-migrations/0007_auth_enhancement.sql
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE login_attempts ADD COLUMN user_id TEXT;
```

### users 테이블 구조

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT | UUID |
| email | TEXT | 이메일 (Unique) |
| password_hash | TEXT | SHA-256 해시 |
| password_salt | TEXT | 32바이트 랜덤 salt |
| name | TEXT | 표시 이름 |
| display_name | TEXT | 기존 이름 (호환성) |
| is_migrated | INTEGER | Supabase 마이그레이션 여부 |
| is_active | INTEGER | 계정 활성화 상태 |

## 환경 변수

### Workers 필수 시크릿

```bash
# wrangler secret put
JWT_SECRET=<strong-secret>
```

### 프론트엔드 환경 변수

```bash
# .env.local
VITE_WORKERS_API_URL=https://api.ideaonaction.ai
```

## 테스트 체크리스트

### 기능 테스트

- [ ] Supabase 이메일 로그인
- [ ] Workers 이메일 로그인
- [ ] 이중 인증 폴백
- [ ] Workers 회원가입
- [ ] Workers 토큰 갱신
- [ ] 로그아웃 (양쪽)
- [ ] OAuth 로그인 (Supabase)

### 통합 테스트

- [ ] 새로고침 후 세션 유지
- [ ] 토큰 만료 후 자동 갱신
- [ ] 다중 탭 세션 동기화

## 롤백 계획

문제 발생 시:
1. `useAuth.ts`에서 Workers 로직 비활성화
2. `AUTH_PROVIDER_KEY`를 'supabase'로 강제 설정
3. localStorage의 Workers 토큰 삭제

```typescript
// 롤백 코드
localStorage.removeItem('workers_auth_tokens')
localStorage.setItem('auth_provider', 'supabase')
```

## 참고 문서

- [Workers Auth 핸들러](../../cloudflare-workers/src/handlers/auth/login.ts)
- [useAuth Hook](../../src/hooks/useAuth.ts)
- [Cloudflare Client](../../src/integrations/cloudflare/client.ts)
- [D1 스키마](../../d1-migrations/0007_auth_enhancement.sql)
