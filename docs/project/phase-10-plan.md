# Phase 10: SSO & 인증 강화 구현 계획

**작성일**: 2025-10-19
**예상 기간**: 2-3주
**목표**: 엔터프라이즈급 인증 및 권한 관리 시스템 구축

---

## 📋 목차

1. [현재 상태 분석](#현재-상태-분석)
2. [구현 범위](#구현-범위)
3. [Week 1: OAuth 확장 & 프로필 관리](#week-1-oauth-확장--프로필-관리)
4. [Week 2: 2FA & 보안 강화](#week-2-2fa--보안-강화)
5. [Week 3: RBAC & 감사 로그](#week-3-rbac--감사-로그)
6. [데이터베이스 스키마](#데이터베이스-스키마)
7. [완료 기준](#완료-기준)

---

## 현재 상태 분석

### ✅ 이미 구현된 기능

1. **OAuth 로그인**
   - Google OAuth ✅
   - GitHub OAuth ✅
   - Kakao OAuth ✅

2. **이메일/비밀번호 로그인**
   - 기본 로그인 ✅
   - useAuth 훅 ✅

3. **권한 관리 (기본)**
   - user_roles 테이블 ✅
   - useIsAdmin 훅 ✅
   - AdminRoute 컴포넌트 ✅

4. **세션 관리**
   - Supabase Auth 세션 ✅
   - 자동 로그아웃 ✅

### 🔜 추가할 기능

1. **추가 OAuth 제공자**
   - Microsoft (Azure AD) 🔜
   - Apple 🔜
   - LinkedIn (선택) 🔜

2. **2단계 인증 (2FA)**
   - TOTP (Time-based One-Time Password) 🔜
   - SMS 인증 (선택) 🔜
   - 백업 코드 🔜

3. **고급 권한 관리**
   - 역할 기반 접근 제어 (RBAC) 🔜
   - 권한 계층 구조 🔜
   - 커스텀 권한 🔜

4. **보안 기능**
   - 이메일 인증 🔜
   - 비밀번호 재설정 🔜
   - 계정 잠금 (브루트 포스 방지) 🔜
   - 로그인 알림 🔜

5. **사용자 프로필 관리**
   - 프로필 편집 🔜
   - 아바타 업로드 🔜
   - 계정 연결/해제 🔜

6. **감사 로그**
   - 로그인/로그아웃 기록 🔜
   - 권한 변경 기록 🔜
   - 민감한 작업 기록 🔜

---

## 구현 범위

### Week 1: OAuth 확장 & 프로필 관리 (5-7일)

#### 1.1. 추가 OAuth 제공자 통합

**Microsoft (Azure AD)**
- Supabase Microsoft OAuth 설정
- useAuth 훅에 signInWithMicrosoft 추가
- Login 페이지에 Microsoft 버튼 추가

**Apple**
- Supabase Apple OAuth 설정
- useAuth 훅에 signInWithApple 추가
- Login 페이지에 Apple 버튼 추가

**구현 파일**:
- `src/hooks/useAuth.ts` - OAuth 함수 추가
- `src/pages/Login.tsx` - OAuth 버튼 추가
- `.env.local` - OAuth 클라이언트 ID 추가

#### 1.2. 사용자 프로필 관리

**데이터베이스**:
```sql
-- user_profiles 테이블 확장
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  avatar_url text,
  display_name text,
  bio text,
  phone text,
  location jsonb, -- {country, city, timezone}
  preferences jsonb DEFAULT '{}', -- 사용자 설정
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  last_login_at timestamptz,
  last_login_ip inet,
  updated_at timestamptz DEFAULT now();
```

**구현 파일**:
- `src/pages/Profile.tsx` - 프로필 편집 페이지 (확장)
- `src/components/profile/ProfileForm.tsx` - 프로필 폼
- `src/components/profile/AvatarUpload.tsx` - 아바타 업로드
- `src/components/profile/ConnectedAccounts.tsx` - 연결된 계정 관리
- `src/hooks/useProfile.ts` - 프로필 CRUD 훅

#### 1.3. 이메일 인증 시스템

**플로우**:
1. 회원가입 시 인증 이메일 발송
2. 이메일 링크 클릭 → 인증 완료
3. 미인증 사용자 제한 기능

**구현 파일**:
- `src/pages/VerifyEmail.tsx` - 이메일 인증 페이지
- `src/components/auth/EmailVerificationBanner.tsx` - 미인증 알림
- `src/hooks/useEmailVerification.ts` - 인증 훅

---

### Week 2: 2FA & 보안 강화 (5-7일)

#### 2.1. TOTP 2단계 인증

**데이터베이스**:
```sql
-- two_factor_auth 테이블 생성
CREATE TABLE two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret text NOT NULL, -- TOTP secret (암호화 저장)
  enabled boolean DEFAULT false,
  backup_codes text[], -- 백업 코드 (해시 저장)
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX idx_two_factor_auth_user ON two_factor_auth(user_id);
```

**구현 파일**:
- `src/lib/auth/totp.ts` - TOTP 생성/검증 로직
- `src/pages/settings/TwoFactorSetup.tsx` - 2FA 설정 페이지
- `src/pages/TwoFactorVerify.tsx` - 2FA 검증 페이지
- `src/components/auth/TwoFactorForm.tsx` - 2FA 입력 폼
- `src/components/settings/BackupCodes.tsx` - 백업 코드 표시
- `src/hooks/useTwoFactor.ts` - 2FA 훅

**라이브러리**:
- `otpauth` - TOTP 생성/검증
- `qrcode` - QR 코드 생성

#### 2.2. 비밀번호 재설정

**플로우**:
1. 비밀번호 재설정 요청 (이메일 입력)
2. 재설정 링크 발송
3. 새 비밀번호 설정
4. 모든 세션 무효화 (선택)

**구현 파일**:
- `src/pages/ForgotPassword.tsx` - 비밀번호 찾기
- `src/pages/ResetPassword.tsx` - 비밀번호 재설정
- `src/hooks/usePasswordReset.ts` - 비밀번호 재설정 훅

#### 2.3. 보안 기능

**계정 잠금** (브루트 포스 방지):
```sql
-- login_attempts 테이블
CREATE TABLE login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  success boolean NOT NULL,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
```

**로그인 알림**:
- 새 기기 로그인 시 이메일 알림
- 위치 정보 저장 (IP 기반)

**구현 파일**:
- `src/lib/auth/security.ts` - 보안 유틸리티
- `src/hooks/useSecurity.ts` - 보안 훅

---

### Week 3: RBAC & 감사 로그 (5-7일)

#### 3.1. 역할 기반 접근 제어 (RBAC)

**데이터베이스**:
```sql
-- roles 테이블 (미리 정의된 역할)
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, -- 'admin', 'manager', 'user'
  display_name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]', -- ['services.create', 'services.update', ...]
  is_system boolean DEFAULT false, -- 시스템 역할 (삭제 불가)
  created_at timestamptz DEFAULT now()
);

-- permissions 테이블 (권한 정의)
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, -- 'services.create'
  resource text NOT NULL, -- 'services'
  action text NOT NULL, -- 'create', 'read', 'update', 'delete'
  description text,
  created_at timestamptz DEFAULT now()
);

-- user_roles 테이블 확장 (role_id 참조)
ALTER TABLE user_roles
  ADD COLUMN role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  ADD COLUMN granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN granted_at timestamptz DEFAULT now(),
  ADD COLUMN expires_at timestamptz; -- 임시 권한
```

**구현 파일**:
- `src/lib/auth/rbac.ts` - RBAC 유틸리티
- `src/hooks/usePermissions.ts` - 권한 확인 훅
- `src/components/auth/PermissionGuard.tsx` - 권한 가드 컴포넌트
- `src/pages/admin/RoleManagement.tsx` - 역할 관리 페이지
- `src/pages/admin/UserManagement.tsx` - 사용자 관리 페이지

#### 3.2. 감사 로그 (Audit Log)

**데이터베이스**:
```sql
-- audit_logs 테이블
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'login', 'logout', 'service.create', ...
  resource_type text, -- 'service', 'order', 'user'
  resource_id uuid,
  old_data jsonb, -- 변경 전 데이터
  new_data jsonb, -- 변경 후 데이터
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

**구현 파일**:
- `src/lib/audit/logger.ts` - 감사 로그 유틸리티
- `src/hooks/useAuditLog.ts` - 감사 로그 훅
- `src/pages/admin/AuditLogs.tsx` - 감사 로그 조회 페이지
- `src/components/admin/AuditLogTable.tsx` - 감사 로그 테이블

#### 3.3. 세션 관리

**데이터베이스**:
```sql
-- user_sessions 테이블
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  device_info jsonb, -- {os, browser, device}
  is_active boolean DEFAULT true,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);
```

**구현 파일**:
- `src/pages/settings/Sessions.tsx` - 세션 관리 페이지
- `src/components/settings/SessionCard.tsx` - 세션 카드
- `src/hooks/useSessions.ts` - 세션 관리 훅

---

## 데이터베이스 스키마

### 전체 ERD (Phase 10 추가 분)

```
auth.users (Supabase)
    ↓
user_profiles (확장)
    - avatar_url
    - display_name
    - email_verified
    - last_login_at

user_roles (확장)
    - role_id → roles.id
    - granted_by
    - expires_at

roles (신규)
    - name (admin, manager, user)
    - permissions (jsonb)

permissions (신규)
    - name (services.create)
    - resource
    - action

two_factor_auth (신규)
    - secret
    - backup_codes

login_attempts (신규)
    - ip_address
    - success

audit_logs (신규)
    - action
    - resource_type
    - old_data / new_data

user_sessions (신규)
    - session_token
    - device_info
    - is_active
```

---

## 완료 기준

### Week 1: OAuth 확장 & 프로필 관리
- [ ] Microsoft OAuth 로그인 동작
- [ ] Apple OAuth 로그인 동작
- [ ] 프로필 편집 페이지 완성
- [ ] 아바타 업로드 기능
- [ ] 연결된 계정 관리
- [ ] 이메일 인증 시스템
- [ ] 빌드 에러 없음

### Week 2: 2FA & 보안 강화
- [ ] TOTP 2FA 설정 및 검증
- [ ] 백업 코드 생성 및 복구
- [ ] 비밀번호 재설정 플로우
- [ ] 계정 잠금 (브루트 포스 방지)
- [ ] 로그인 알림
- [ ] 빌드 에러 없음

### Week 3: RBAC & 감사 로그
- [ ] 역할 관리 페이지
- [ ] 사용자 관리 페이지
- [ ] 권한 확인 훅 동작
- [ ] 감사 로그 자동 기록
- [ ] 감사 로그 조회 페이지
- [ ] 세션 관리 페이지
- [ ] E2E 테스트 10개 이상
- [ ] 빌드 에러 없음
- [ ] 문서 업데이트

---

## 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 6238 - TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

---

**다음 단계**: Week 1 구현 시작 (Microsoft/Apple OAuth + 프로필 관리)
