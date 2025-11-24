# Claude AI 통합 환경 변수 설정 가이드

> Claude API 연동을 위한 환경 변수 설정 가이드

**최종 업데이트**: 2025-11-24
**대상**: 개발자, DevOps

---

## 목차

1. [필요한 환경 변수 목록](#1-필요한-환경-변수-목록)
2. [Anthropic Console에서 API 키 발급](#2-anthropic-console에서-api-키-발급)
3. [Supabase 대시보드에서 설정](#3-supabase-대시보드에서-설정)
4. [로컬 개발 설정](#4-로컬-개발-설정)
5. [보안 고려사항](#5-보안-고려사항)
6. [문제 해결](#6-문제-해결)

---

## 1. 필요한 환경 변수 목록

### Edge Function 환경 변수 (Supabase Secrets)

| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `ANTHROPIC_API_KEY` | O | Anthropic API 키 | `sk-ant-api03-...` |
| `CLAUDE_MAX_TOKENS_DEFAULT` | X | 기본 최대 출력 토큰 (기본: 4096) | `4096` |
| `CLAUDE_RATE_LIMIT_RPM` | X | 분당 요청 제한 (기본: 60) | `60` |
| `CLAUDE_RATE_LIMIT_TPM` | X | 분당 토큰 제한 (기본: 100000) | `100000` |

### 프론트엔드 환경 변수 (Vite)

| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `VITE_SUPABASE_URL` | O | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | O | Supabase 공개 키 | `eyJhbGci...` |
| `VITE_CLAUDE_ENABLED` | X | Claude 기능 활성화 여부 | `true` |

---

## 2. Anthropic Console에서 API 키 발급

### 2.1 계정 생성 및 로그인

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. 계정이 없다면 **Sign Up** 클릭하여 회원가입
3. 이메일 인증 완료 후 로그인

### 2.2 API 키 발급

1. 로그인 후 좌측 메뉴에서 **API Keys** 클릭
2. **Create Key** 버튼 클릭
3. 키 이름 입력 (예: `idea-on-action-production`)
4. **Create Key** 확인

```
API Key 형식: sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.3 API 키 권한 설정 (선택)

Anthropic에서는 별도의 권한 스코프 설정이 없습니다.
모든 API 키는 동일한 권한을 가집니다.

### 2.4 API 키 보안 주의사항

- API 키는 **발급 시 한 번만** 표시됩니다
- 키를 분실하면 새로 발급해야 합니다
- 키를 코드에 직접 포함하지 마세요
- `.env` 파일은 `.gitignore`에 반드시 포함

---

## 3. Supabase 대시보드에서 설정

### 3.1 Supabase 프로젝트 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 해당 프로젝트 선택 (idea-on-action)

### 3.2 Edge Function Secrets 설정

1. 좌측 메뉴에서 **Edge Functions** 클릭
2. 상단의 **Manage Secrets** 버튼 클릭
3. **New Secret** 버튼으로 시크릿 추가

#### 필수 시크릿 추가

```bash
# 1. ANTHROPIC_API_KEY 추가
Name: ANTHROPIC_API_KEY
Value: sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 2. 선택적 설정 (필요시)
Name: CLAUDE_MAX_TOKENS_DEFAULT
Value: 4096

Name: CLAUDE_RATE_LIMIT_RPM
Value: 60

Name: CLAUDE_RATE_LIMIT_TPM
Value: 100000
```

### 3.3 시크릿 확인

```bash
# Supabase CLI로 확인
supabase secrets list --project-ref <project-ref>

# 예상 출력
ANTHROPIC_API_KEY    ********
CLAUDE_MAX_TOKENS_DEFAULT    4096
```

### 3.4 Edge Function 배포

시크릿 설정 후 Edge Function을 (재)배포해야 적용됩니다:

```bash
# Claude Chat 함수 배포
supabase functions deploy claude-chat --project-ref <project-ref>
```

---

## 4. 로컬 개발 설정

### 4.1 .env.local 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```bash
# d:\GitHub\idea-on-action\.env.local

# Supabase (필수)
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Claude 기능 활성화 (선택)
VITE_CLAUDE_ENABLED=true
```

### 4.2 로컬 Edge Function 개발

로컬에서 Edge Function을 테스트할 때는 `.env` 파일이 필요합니다:

```bash
# supabase/functions/.env

ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_MAX_TOKENS_DEFAULT=4096
```

### 4.3 로컬 개발 서버 실행

```bash
# 1. 프론트엔드 개발 서버
npm run dev

# 2. Supabase 로컬 (다른 터미널)
supabase start

# 3. Edge Functions 로컬 서버 (다른 터미널)
supabase functions serve --env-file supabase/functions/.env
```

### 4.4 환경 변수 검증

프론트엔드에서 환경 변수 확인:

```typescript
// 개발 모드에서만 콘솔에 출력
if (import.meta.env.DEV) {
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Claude Enabled:', import.meta.env.VITE_CLAUDE_ENABLED);
}
```

---

## 5. 보안 고려사항

### 5.1 API 키 보호

```
[브라우저] --X--> Anthropic API  (절대 금지!)
                    |
[브라우저] ----> [Supabase Edge Function] ----> Anthropic API
                    |
            (API 키는 서버에만 존재)
```

### 5.2 체크리스트

- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지 확인
- [ ] API 키가 프론트엔드 코드에 노출되지 않았는지 확인
- [ ] Supabase Edge Function에서만 API 키 사용
- [ ] API 키 주기적 로테이션 (권장: 90일)

### 5.3 API 키 로테이션 절차

1. Anthropic Console에서 새 API 키 발급
2. Supabase Secrets 업데이트
3. Edge Function 재배포
4. 정상 작동 확인 후 구 API 키 삭제

```bash
# Supabase CLI로 시크릿 업데이트
supabase secrets set ANTHROPIC_API_KEY="sk-ant-api03-NEW_KEY" --project-ref <project-ref>

# 함수 재배포
supabase functions deploy claude-chat --project-ref <project-ref>
```

### 5.4 Rate Limiting

프로덕션 환경에서는 Rate Limiting을 설정하세요:

```typescript
// Edge Function 내 Rate Limit 체크 예시
const RATE_LIMIT = {
  RPM: parseInt(Deno.env.get('CLAUDE_RATE_LIMIT_RPM') ?? '60'),
  TPM: parseInt(Deno.env.get('CLAUDE_RATE_LIMIT_TPM') ?? '100000'),
};
```

---

## 6. 문제 해결

### 6.1 API 키 오류

**증상**: `401 Unauthorized` 또는 `invalid_api_key` 에러

**해결**:
1. API 키 형식 확인 (`sk-ant-api03-`로 시작)
2. Supabase Secrets에 키가 올바르게 설정되었는지 확인
3. Edge Function 재배포

```bash
# 시크릿 확인
supabase secrets list --project-ref <project-ref>

# 시크릿 재설정
supabase secrets set ANTHROPIC_API_KEY="sk-ant-api03-..." --project-ref <project-ref>

# 함수 재배포
supabase functions deploy claude-chat --project-ref <project-ref>
```

### 6.2 Rate Limit 초과

**증상**: `429 Too Many Requests` 에러

**해결**:
1. 요청 빈도 확인
2. 지수 백오프(Exponential Backoff) 적용
3. Anthropic 요금제 업그레이드 고려

```typescript
// 재시도 로직 예시
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

### 6.3 환경 변수 미로드

**증상**: `undefined` 환경 변수

**해결**:
1. 파일명 확인 (`.env.local`, not `.env`)
2. 변수 접두사 확인 (`VITE_` 필수)
3. 개발 서버 재시작

```bash
# 개발 서버 재시작
npm run dev
```

### 6.4 Edge Function 로그 확인

```bash
# 실시간 로그 확인
supabase functions logs claude-chat --project-ref <project-ref>

# 또는 Supabase Dashboard에서
# Edge Functions > claude-chat > Logs
```

---

## 관련 문서

- [Claude API 공식 문서](https://docs.anthropic.com/claude/reference/messages)
- [Supabase Edge Functions 가이드](https://supabase.com/docs/guides/functions)
- [프로젝트 보안 가이드](/docs/guides/security/README.md)
- [MCP 배포 체크리스트](/docs/guides/mcp-deployment-checklist.md)

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2025-11-24 | 1.0.0 | 최초 작성 |
