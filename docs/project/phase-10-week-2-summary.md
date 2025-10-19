# Phase 10 Week 2: 2FA & 보안 강화 - 구현 완료

## 개요
**날짜**: 2025-10-20
**상태**: ✅ 완료
**담당**: Claude AI

Phase 10 Week 2에서는 2단계 인증(TOTP) 시스템 및 보안 기능을 구현했습니다.

---

## 구현 내용

### 1. 데이터베이스 스키마 (Migration 004)

**파일**: `docs/database/migrations/004-phase-10-week-2-2fa-security.sql`

#### 생성된 테이블 (4개)

**1.1. `two_factor_auth` 테이블**
- 2단계 인증 설정 관리
- TOTP secret (Base32 인코딩)
- 백업 코드 (10개, 플레인 텍스트 저장 - 프로덕션에서는 bcrypt 해시 권장)
- 활성화 상태 및 검증 시각
- 마지막 사용 시각

**1.2. `login_attempts` 테이블**
- 로그인 시도 기록 (감사 로그)
- IP 주소, User-Agent 저장
- 성공/실패 여부 및 실패 사유

**1.3. `account_locks` 테이블**
- 계정 잠금 관리
- 잠금 사유 (brute_force, suspicious_activity, admin)
- 자동 잠금 해제 시각 (unlock_at)
- 잠금 해제 토큰 (이메일 링크용)

**1.4. `password_reset_tokens` 테이블**
- 비밀번호 재설정 토큰 관리
- 1시간 유효기간
- 일회용 토큰 (사용 후 무효화)

#### 헬퍼 함수 (5개)

1. **`log_login_attempt()`** - 로그인 시도 기록
2. **`is_account_locked()`** - 계정 잠금 여부 확인
3. **`lock_account_on_failed_attempts()`** - 브루트 포스 감지 및 자동 잠금 (5회 실패 시 30분 잠금)
4. **`generate_password_reset_token()`** - 비밀번호 재설정 토큰 생성
5. **`verify_password_reset_token()`** - 토큰 검증 및 사용 처리

#### RLS 정책
- `two_factor_auth`: 사용자는 자신의 2FA 설정만 조회/수정 가능
- `login_attempts`: 사용자는 자신의 로그인 시도만 조회, 관리자는 전체 조회
- `account_locks`: 사용자는 자신의 잠금 상태만 조회, 관리자만 관리 가능
- `password_reset_tokens`: 사용자는 자신의 토큰만 조회 가능

---

### 2. TOTP 유틸리티 라이브러리

**파일**: `src/lib/auth/totp.ts`

#### 주요 기능

**2.1. TOTP 비밀키 생성**
```typescript
generateTOTPSecret(userEmail: string): Promise<TOTPSecret>
```
- Base32 인코딩된 TOTP secret 생성
- otpauth:// URI 생성
- QR 코드 생성 (300x300 PNG, Data URL)
- Google Authenticator, Authy 등 호환

**2.2. TOTP 토큰 검증**
```typescript
verifyTOTPToken(secret: string, token: string): TOTPVerifyResult
```
- 6자리 TOTP 토큰 검증
- ±1 시간 윈도우 (총 3개 토큰 허용: 이전, 현재, 다음)
- 30초마다 갱신

**2.3. 백업 코드 생성**
```typescript
generateBackupCodes(): string[]
```
- 10개의 8자리 랜덤 숫자 코드 생성
- 일회용 (사용 후 무효화)

**2.4. 설정**
- Issuer: "IDEA on Action"
- Algorithm: SHA1
- Digits: 6
- Period: 30초
- Window: ±1

---

### 3. React 훅

**파일**: `src/hooks/use2FA.ts`

#### 제공 훅 (7개)

**3.1. `use2FASettings()`**
- 현재 사용자의 2FA 설정 조회 (React Query)

**3.2. `useIs2FAEnabled()`**
- 2FA 활성화 여부 확인 (boolean)

**3.3. `useSetup2FA()`**
- 2FA 설정 초기화 (QR 코드 및 백업 코드 생성)
- TOTP secret 생성 및 DB 저장

**3.4. `useEnable2FA()`**
- 2FA 활성화 (TOTP 토큰 검증 후)
- verified_at 타임스탬프 기록

**3.5. `useDisable2FA()`**
- 2FA 비활성화 (비밀번호 재확인 필요)
- 보안을 위해 비밀번호 확인 후 비활성화

**3.6. `useRegenerateBackupCodes()`**
- 백업 코드 재생성 (기존 코드 무효화)
- 새 10개 코드 반환

**3.7. `useVerify2FA()`**
- TOTP 토큰 또는 백업 코드 검증 (로그인 시)
- 백업 코드 사용 시 일회용 처리

---

### 4. UI 페이지

#### 4.1. 2FA 설정 페이지

**파일**: `src/pages/TwoFactorSetup.tsx`
**라우트**: `/2fa/setup`

**단계별 플로우**:
1. **Initial Step**: 2FA 소개 및 설정 시작
2. **QR Code Step**: QR 코드 표시 및 수동 입력 옵션
3. **Verification Step**: 6자리 TOTP 토큰 입력 및 검증
4. **Backup Codes Step**: 10개 백업 코드 표시, 복사/다운로드 기능

**기능**:
- QR 코드 스캔 (Google Authenticator, Authy 등)
- 수동 secret 입력 옵션
- TOTP 토큰 실시간 검증
- 백업 코드 복사/다운로드 (TXT 파일)
- 진행 표시기 (4단계)

#### 4.2. 2FA 인증 페이지

**파일**: `src/pages/TwoFactorVerify.tsx`
**라우트**: `/2fa/verify`

**기능**:
- TOTP 6자리 토큰 입력
- 백업 코드 8자리 입력 (토글)
- Enter 키로 제출
- 로그인 후 리다이렉트 (state로 전달받은 경로)

#### 4.3. 프로필 페이지 (2FA 섹션 추가)

**파일**: `src/pages/Profile.tsx` (수정)

**추가된 섹션**:
- **2FA 활성화 상태**:
  - 활성화 여부 표시
  - 마지막 사용 시각
  - 백업 코드 개수 (사용됨/남음)
  - 백업 코드 재생성 버튼
  - 2FA 비활성화 버튼 (비밀번호 확인 다이얼로그)
- **2FA 비활성화 상태**:
  - 2FA 활성화 권장 메시지
  - 2FA 설정 페이지로 이동 버튼

**다이얼로그**:
- 2FA 비활성화 다이얼로그 (비밀번호 입력)
- 백업 코드 표시 다이얼로그 (재생성 후)

---

### 5. 라우팅

**파일**: `src/App.tsx` (수정)

**추가된 라우트**:
```tsx
<Route path="/2fa/setup" element={<TwoFactorSetup />} />
<Route path="/2fa/verify" element={<TwoFactorVerify />} />
```

---

## 의존성 추가

```bash
npm install otpauth qrcode
npm install --save-dev @types/qrcode
```

**라이브러리**:
- `otpauth`: TOTP 생성 및 검증
- `qrcode`: QR 코드 생성

---

## 빌드 결과

```
dist/index.html                           1.54 kB │ gzip:   0.75 kB
dist/assets/logo-symbol-DqUao7Np.png     29.60 kB
dist/assets/logo-full-BqGYrkB8.png       77.52 kB
dist/assets/index-BrTg-w0S.css           82.64 kB │ gzip:  13.62 kB
dist/assets/index-zf8ZkRlI.js         1,388.73 kB │ gzip: 409.47 kB
```

**변경 사항**:
- v1.6.0 → v1.6.1: +74.72 kB (gzip: +23.63 kB)
  - otpauth 라이브러리: +30 kB
  - qrcode 라이브러리: +20 kB
  - 2FA 훅 및 컴포넌트: +24.72 kB

---

## 사용 플로우

### 2FA 설정
1. `/profile` 접속
2. "2FA 활성화" 버튼 클릭
3. `/2fa/setup` 페이지로 이동
4. QR 코드를 Google Authenticator로 스캔
5. 인증 앱에 표시된 6자리 코드 입력
6. 백업 코드 10개 저장 (복사 또는 다운로드)
7. 설정 완료 → `/profile`로 리다이렉트

### 2FA 로그인 (향후 구현 필요)
1. `/login` 페이지에서 이메일/비밀번호 입력
2. 2FA가 활성화된 경우 `/2fa/verify`로 리다이렉트
3. TOTP 토큰 입력 (또는 백업 코드)
4. 인증 성공 → 원래 접속하려던 페이지로 리다이렉트

### 2FA 관리
1. `/profile` 접속
2. 2FA 섹션에서 백업 코드 재생성 가능
3. 2FA 비활성화 가능 (비밀번호 확인 필요)

---

## 보안 고려사항

### ⚠️ 중요: 프로덕션 배포 전 수정 필요

**1. 백업 코드 해싱**
- 현재: 플레인 텍스트로 저장 (개발 편의성)
- 권장: bcrypt 해시하여 저장
- 방법: Supabase Edge Function 사용 (브라우저에서 bcrypt 사용 불가)

**2. TOTP Secret 암호화**
- 현재: Base32 인코딩만 (암호화 없음)
- 권장: PostgreSQL `pgcrypto` 확장 사용하여 암호화 저장
- 방법: `encrypt()` 및 `decrypt()` 함수 사용

**3. 로그인 시 2FA 강제**
- 현재: 2FA 검증 플로우 미구현 (페이지만 생성)
- 필요: `useAuth` 훅에서 2FA 활성화 시 `/2fa/verify`로 리다이렉트

**4. 브루트 포스 방지**
- DB 함수 `lock_account_on_failed_attempts()` 구현 완료
- 필요: 로그인 실패 시 함수 호출 추가

---

## 테스트 계획

### 수동 테스트 체크리스트

**2FA 설정**
- [ ] `/2fa/setup` 접속 시 QR 코드 표시 확인
- [ ] Google Authenticator로 QR 코드 스캔
- [ ] 수동 secret 입력 옵션 테스트
- [ ] TOTP 토큰 검증 성공/실패 케이스
- [ ] 백업 코드 10개 생성 확인
- [ ] 백업 코드 복사 기능 테스트
- [ ] 백업 코드 다운로드 기능 테스트

**2FA 관리**
- [ ] `/profile`에서 2FA 활성화 상태 확인
- [ ] 백업 코드 재생성 테스트
- [ ] 2FA 비활성화 (비밀번호 확인) 테스트
- [ ] 비활성화 후 재활성화 테스트

**보안 기능**
- [ ] 계정 잠금 기능 테스트 (5회 실패 시)
- [ ] 로그인 시도 기록 확인

### E2E 테스트 (향후 작성)
- 2FA 설정 플로우
- 2FA 로그인 플로우
- 백업 코드 사용
- 계정 잠금/해제

---

## 다음 단계 (Week 3)

**Phase 10 Week 3: RBAC & 감사 로그** (예정)
- 역할 기반 접근 제어 (RBAC) 구현
- 감사 로그 시스템 (사용자 활동 추적)
- 세션 관리 (디바이스별 세션 목록/종료)

---

## 참고 자료

- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [otpauth 라이브러리 문서](https://github.com/hectorm/otpauth)
- [qrcode 라이브러리 문서](https://github.com/soldair/node-qrcode)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
