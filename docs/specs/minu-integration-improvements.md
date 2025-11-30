# Minu 서비스 연동 개선 기획서

> **문서 버전**: 1.0.0
> **작성일**: 2025-11-30
> **상태**: 검토 대기
> **담당**: 개발팀

---

## 1. 개요

### 1.1 목적
Minu 서비스 연동 검토 결과 발견된 개선 필요 사항을 정리하고, 해결 방안을 제시합니다.

### 1.2 배경
현재 Minu 서비스 연동(OAuth 2.0, MCP 인증, MCP 서버)의 핵심 구성요소는 완비되어 있으나, 배포 전 수정이 필요한 몇 가지 항목이 확인되었습니다.

### 1.3 우선순위 정의
| 등급 | 설명 |
|------|------|
| 🔴 P0 (Critical) | 즉시 수정 필요, 런타임 오류 발생 가능 |
| 🔶 P1 (High) | 배포 전 수정 권장 |
| 🟡 P2 (Medium) | 향후 개선 사항 |

---

## 2. 개선 항목

### 2.1 [P0] corsHeaders 변수 미선언 사용

#### 현황
- **파일**: `supabase/functions/mcp-auth/index.ts`
- **문제**: `corsHeaders` 전역 변수가 선언되지 않은 상태에서 `errorResponse()` 함수 내부에서 사용됨
- **영향**: 런타임 `ReferenceError` 발생 가능

#### 문제 코드 (라인 251-255)
```typescript
function errorResponse(...): Response {
  // ...
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },  // ❌ corsHeaders 미정의
  })
}
```

#### 해결 방안
`errorResponse()` 및 `successResponse()` 함수에 origin 파라미터를 추가하거나, 메인 핸들러에서 생성한 corsHeaders를 전달하도록 수정

```typescript
// 방안 1: 함수 파라미터로 전달
function errorResponse(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,  // 추가
  details?: Record<string, unknown>,
  hint?: string
): Response {
  // ...
}

// 방안 2: 전역 변수 활용 (하위 호환성)
// cors.ts에서 export된 corsHeaders 사용
import { corsHeaders } from '../_shared/cors.ts'
```

#### 작업 범위
- [ ] `supabase/functions/mcp-auth/index.ts` 수정
- [ ] `supabase/functions/oauth-token/index.ts` 동일 패턴 확인 및 수정
- [ ] 단위 테스트 추가

#### 예상 소요 시간
30분

---

### 2.2 [P1] MCP 서버 패키지명 불일치

#### 현황
- **파일**: `mcp-server/package.json`
- **문제**: 패키지명이 `@idea-on-action/compass-mcp-server`로 되어있어 Minu 브랜딩과 불일치
- **영향**: 코드 일관성 저하, 유지보수 혼란

#### 현재 상태
```json
{
  "name": "@idea-on-action/compass-mcp-server",
  "description": "MCP Server for Compass Navigator integration with IDEA on Action"
}
```

#### 개선안
```json
{
  "name": "@idea-on-action/minu-mcp-server",
  "description": "MCP Server for Minu Platform integration with IDEA on Action"
}
```

#### 작업 범위
- [ ] `mcp-server/package.json` 수정
  - name 변경
  - description 변경
  - keywords 업데이트
- [ ] 관련 문서 업데이트 (있는 경우)

#### 예상 소요 시간
15분

---

### 2.3 [P1] 환경 변수 설정 확인

#### 현황
- **문제**: 프로덕션 배포에 필수적인 환경 변수가 설정되어 있는지 확인 필요
- **영향**: 토큰 발급/검증 실패, 서비스 간 통신 불가

#### 필수 환경 변수 체크리스트

| 환경 변수 | 용도 | 설정 위치 |
|-----------|------|-----------|
| `MCP_JWT_SECRET` | MCP 토큰 서명 | Supabase Edge Functions |
| `OAUTH_JWT_SECRET` | OAuth 토큰 서명 | Supabase Edge Functions |
| `WEBHOOK_SECRET_MINU_FIND` | Minu Find 웹훅 검증 | Supabase Edge Functions |
| `WEBHOOK_SECRET_MINU_FRAME` | Minu Frame 웹훅 검증 | Supabase Edge Functions |
| `WEBHOOK_SECRET_MINU_BUILD` | Minu Build 웹훅 검증 | Supabase Edge Functions |
| `WEBHOOK_SECRET_MINU_KEEP` | Minu Keep 웹훅 검증 | Supabase Edge Functions |

#### 확인 방법
```bash
# Supabase CLI로 환경 변수 확인
supabase secrets list

# 또는 Supabase Dashboard > Settings > Edge Functions > Secrets
```

#### 작업 범위
- [ ] Supabase Dashboard에서 환경 변수 설정 확인
- [ ] 누락된 환경 변수 추가
- [ ] `.env.example` 문서화 업데이트

#### 예상 소요 시간
20분

---

### 2.4 [P1] ESLint 의존성 누락

#### 현황
- **문제**: `@eslint/js` 패키지가 설치되지 않아 `npm run lint` 실행 불가
- **영향**: CI/CD 파이프라인 실패, 코드 품질 검사 불가

#### 오류 메시지
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@eslint/js'
imported from /home/user/IDEA-on-Action/eslint.config.js
```

#### 해결 방안
```bash
npm install --save-dev @eslint/js
```

#### 작업 범위
- [ ] 누락된 ESLint 의존성 설치
- [ ] `npm run lint` 정상 동작 확인
- [ ] CI/CD 파이프라인 테스트

#### 예상 소요 시간
10분

---

### 2.5 [P2] MCP 서버 파일 내 Compass 참조 정리

#### 현황
- **파일**: `mcp-server/src/server.ts`
- **문제**: 주석 및 설정에 "Compass Navigator" 참조가 남아있음
- **영향**: 코드 일관성 저하 (기능에는 영향 없음)

#### 현재 상태 (라인 1-6)
```typescript
/**
 * Compass Navigator MCP Server
 *
 * Main server configuration and setup for the MCP server
 * that provides integration between Compass Navigator and IDEA on Action.
 */
```

#### 개선안
```typescript
/**
 * Minu Platform MCP Server
 *
 * Main server configuration and setup for the MCP server
 * that provides integration between Minu services and IDEA on Action.
 */
```

#### 작업 범위
- [ ] `mcp-server/src/server.ts` 주석 수정
- [ ] `mcp-server/src/index.ts` 확인 및 수정
- [ ] 기타 Compass 참조 파일 검색 및 수정

#### 예상 소요 시간
15분

---

## 3. 작업 계획

### 3.1 Phase 1: Critical 수정 (P0)
| 항목 | 담당 | 예상 시간 | 완료 기준 |
|------|------|----------|----------|
| corsHeaders 변수 수정 | - | 30분 | Edge Function 배포 후 정상 동작 |

### 3.2 Phase 2: 배포 전 수정 (P1)
| 항목 | 담당 | 예상 시간 | 완료 기준 |
|------|------|----------|----------|
| 환경 변수 확인 | - | 20분 | 모든 필수 변수 설정 확인 |
| ESLint 의존성 | - | 10분 | `npm run lint` 성공 |
| 패키지명 변경 | - | 15분 | package.json 업데이트 |

### 3.3 Phase 3: 향후 개선 (P2)
| 항목 | 담당 | 예상 시간 | 완료 기준 |
|------|------|----------|----------|
| Compass 참조 정리 | - | 15분 | grep 검색 결과 0건 |

---

## 4. 테스트 계획

### 4.1 수정 후 검증 항목
- [ ] MCP Auth Edge Function 배포 및 토큰 발급 테스트
- [ ] OAuth Token Edge Function 배포 및 인증 플로우 테스트
- [ ] MCP 서버 로컬 실행 테스트
- [ ] E2E 테스트 스위트 실행

### 4.2 테스트 명령어
```bash
# MCP 서버 로컬 테스트
cd mcp-server && npm run dev

# E2E 테스트
npm run test:e2e

# Edge Function 배포
supabase functions deploy mcp-auth
supabase functions deploy oauth-token
```

---

## 5. 참고 문서

- [Minu 통합 가이드](../guides/minu-integration-guidelines.md)
- [MCP 서버 명세](./mcp-server-spec.md)
- [OAuth 타입 가이드](../guides/minu-integration-types-overview.md)

---

## 6. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2025-11-30 | Claude | 초기 작성 |
