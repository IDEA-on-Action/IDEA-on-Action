# AI Tool Use 요구사항 명세

> **작성일**: 2025-11-25
> **버전**: 1.0.0
> **상태**: Draft

---

## 📋 개요

Claude AI가 IDEA on Action 시스템의 데이터를 직접 조회하여 정확한 답변을 제공할 수 있도록, **Tool Use (Function Calling)** 기능을 통합합니다.

### 배경

현재 Claude AI 통합은 대화형 채팅만 지원하며, 시스템 데이터를 조회하려면 사용자가 직접 화면을 확인하고 정보를 입력해야 합니다. Tool Use를 도입하면 AI가 자동으로 데이터베이스를 조회하고, 실시간 정보를 기반으로 응답할 수 있습니다.

### 목표

1. **자동 데이터 조회**: AI가 사용자 질문에 따라 적절한 데이터 조회 도구 선택
2. **정확한 답변**: 실시간 시스템 데이터 기반 응답 (추측 없음)
3. **권한 보안**: 로그인한 사용자의 권한 범위 내에서만 데이터 접근
4. **확장 가능**: 새로운 도구 추가가 용이한 구조

---

## 👥 사용자 스토리

### US-001: 이슈 조회

**As a** 프로젝트 관리자
**I want** AI에게 "현재 Minu Build에서 발생한 critical 이슈를 보여줘"라고 질문하면
**So that** AI가 자동으로 service_issues 테이블을 조회하여 최신 이슈 목록을 제공한다

**인수 조건**:
- AC-001-1: 사용자가 자연어로 이슈 조회 요청
- AC-001-2: AI가 `issues.tool`을 자동 선택하여 실행
- AC-001-3: 필터 조건(service_id, severity, status)을 질문에서 추출
- AC-001-4: 조회된 이슈 목록을 읽기 쉬운 형식으로 응답
- AC-001-5: 권한 없는 사용자는 에러 메시지 수신

### US-002: 프로젝트 진행률 확인

**As a** 서비스 관리자
**I want** "지금 진행 중인 프로젝트의 진행률을 알려줘"라고 요청하면
**So that** AI가 projects 테이블과 service_events를 조회하여 실시간 진행 상태를 보고한다

**인수 조건**:
- AC-002-1: 진행 중 상태(status='active')인 프로젝트 필터링
- AC-002-2: 프로젝트별 최근 이벤트 조회
- AC-002-3: 진행률(progress), 마일스톤, 마지막 업데이트 시각 포함
- AC-002-4: 여러 프로젝트가 있을 경우 목록으로 제공
- AC-002-5: 본인이 참여 중인 프로젝트만 조회 (RLS 적용)

### US-003: 서비스 헬스 체크

**As a** 시스템 운영자
**I want** "Minu 서비스들의 현재 상태를 확인해줘"라고 요청하면
**So that** AI가 service_health 테이블을 조회하여 각 서비스의 가동 상태와 메트릭을 보고한다

**인수 조건**:
- AC-003-1: 4개 Minu 서비스(Find, Frame, Build, Keep)의 헬스 상태 조회
- AC-003-2: 상태(healthy/degraded/unhealthy/unknown) 시각적 표현
- AC-003-3: 메트릭(응답시간, 에러율, 가동률) 포함
- AC-003-4: 이상 징후 발견 시 우선적으로 언급
- AC-003-5: 마지막 ping 시각 포함

### US-004: 이벤트 타임라인 조회

**As a** 프로젝트 멤버
**I want** "최근 24시간 동안 Minu Build에서 발생한 이벤트를 시간순으로 보여줘"라고 요청하면
**So that** AI가 service_events 테이블을 조회하여 이벤트 타임라인을 제공한다

**인수 조건**:
- AC-004-1: 날짜 범위 필터링 (자연어에서 "최근 24시간" 파싱)
- AC-004-2: 시간 내림차순 정렬 (최신순)
- AC-004-3: 이벤트 타입(progress.updated, task.completed 등) 표시
- AC-004-4: 페이로드 주요 정보 요약 (stage, task_name 등)
- AC-004-5: 최대 50개까지 제한 (페이지네이션 안내)

### US-005: 사용자 프로필 조회

**As a** 팀 리더
**I want** "서민원 님의 현재 역할과 참여 프로젝트를 알려줘"라고 요청하면
**So that** AI가 profiles 테이블을 조회하여 사용자 정보와 프로젝트 참여 내역을 제공한다

**인수 조건**:
- AC-005-1: 이름 또는 이메일로 사용자 검색
- AC-005-2: 역할(role), 권한(permissions) 표시
- AC-005-3: 현재 참여 중인 프로젝트 목록
- AC-005-4: 본인 또는 관리자만 상세 정보 접근 가능
- AC-005-5: 민감 정보(비밀번호, API 키) 제외

---

## 🛠️ 지원 도구 (Tools)

### 1. issues.tool - 이슈 조회

**목적**: service_issues 테이블 조회

**입력 파라미터**:
```typescript
{
  service_id?: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep',
  severity?: 'critical' | 'high' | 'medium' | 'low',
  status?: 'open' | 'in_progress' | 'resolved' | 'closed',
  project_id?: string,
  limit?: number // 기본값 20
}
```

**출력 형식**:
```typescript
{
  total: number,
  issues: Array<{
    id: string,
    service_id: string,
    severity: string,
    title: string,
    description: string,
    status: string,
    created_at: string,
    updated_at: string
  }>
}
```

### 2. events.tool - 이벤트 조회

**목적**: service_events 테이블 조회

**입력 파라미터**:
```typescript
{
  service_id?: ServiceId,
  event_type?: EventType,
  project_id?: string,
  from_date?: string, // ISO 8601
  to_date?: string,   // ISO 8601
  limit?: number      // 기본값 50
}
```

**출력 형식**:
```typescript
{
  total: number,
  events: Array<{
    id: string,
    service_id: string,
    event_type: string,
    project_id?: string,
    payload: Record<string, unknown>,
    created_at: string
  }>
}
```

### 3. health.tool - 헬스 조회

**목적**: service_health 테이블 조회

**입력 파라미터**:
```typescript
{
  service_id?: ServiceId // 생략 시 전체 조회
}
```

**출력 형식**:
```typescript
{
  services: Array<{
    service_id: string,
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
    last_ping: string,
    metrics: {
      response_time_ms?: number,
      error_rate?: number,
      uptime_percent?: number
    },
    updated_at: string
  }>
}
```

### 4. projects.tool - 프로젝트 조회

**목적**: projects 테이블 조회

**입력 파라미터**:
```typescript
{
  status?: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled',
  service_id?: ServiceId,
  user_id?: string, // 본인 프로젝트만 조회
  limit?: number    // 기본값 20
}
```

**출력 형식**:
```typescript
{
  total: number,
  projects: Array<{
    id: string,
    title: string,
    description: string,
    status: string,
    progress: number,
    service_id?: string,
    created_at: string,
    updated_at: string
  }>
}
```

### 5. users.tool - 사용자 조회

**목적**: profiles 테이블 조회

**입력 파라미터**:
```typescript
{
  email?: string,
  full_name?: string,
  role?: 'admin' | 'manager' | 'member' | 'viewer',
  limit?: number // 기본값 10
}
```

**출력 형식**:
```typescript
{
  total: number,
  users: Array<{
    id: string,
    email: string,
    full_name: string,
    role: string,
    created_at: string
    // 민감 정보 제외
  }>
}
```

---

## 🔐 보안 요구사항

### SEC-001: 인증 필수

- 모든 도구 실행은 JWT 토큰 검증 필수
- Supabase Auth 토큰 또는 MCP Auth 토큰 지원
- 토큰 없으면 `401 Unauthorized` 응답

### SEC-002: RLS 적용

- 도구가 실행하는 모든 쿼리는 RLS 정책 적용
- 사용자는 본인이 접근 가능한 데이터만 조회
- RLS 정책: `auth.uid() = user_id` 또는 `role = 'admin'`

### SEC-003: Rate Limiting

- 도구 실행도 Rate Limiting 대상
- 기존 Claude API Rate Limit (분당 20회) 공유
- 초과 시 `429 Too Many Requests` 응답

### SEC-004: SQL Injection 방지

- 사용자 입력은 파라미터 바인딩 처리
- 직접 SQL 문자열 연결 금지
- Supabase Client의 타입 안전 쿼리 사용

### SEC-005: 민감 정보 필터링

- 비밀번호, API 키, 개인정보 제외
- 도구 응답에 민감 필드 포함 금지
- 로그에도 민감 정보 기록 금지

---

## ⚙️ 비기능 요구사항

### NFR-001: 성능

- 도구 실행 시간: 평균 500ms 이하
- 타임아웃: 10초 (네트워크 에러 방지)
- 캐싱: 헬스 체크는 1분간 캐싱 가능

### NFR-002: 신뢰성

- 도구 실행 실패 시 graceful fallback
- AI가 "데이터를 조회할 수 없습니다" 응답
- 에러 로그는 `claude_usage_logs` 테이블에 기록

### NFR-003: 확장성

- 새로운 도구 추가 시 기존 코드 수정 최소화
- ToolRegistry 패턴으로 도구 등록/조회 관리
- JSON Schema 기반 타입 검증

### NFR-004: 모니터링

- 도구별 사용 횟수 추적
- 성공/실패율 모니터링
- 평균 응답 시간 기록

### NFR-005: 호환성

- Claude API 최신 버전(2024-10-22) 지원
- Supabase Edge Functions (Deno 환경)
- 프론트엔드: React 18 + TypeScript 5

---

## 📊 성공 지표

### 정량 지표

- **도구 사용률**: 전체 Claude 요청 중 도구 사용 비율 30% 이상
- **응답 정확도**: 도구 기반 응답의 정확도 95% 이상
- **성능**: 도구 실행 평균 시간 500ms 이하
- **에러율**: 도구 실행 실패율 5% 이하

### 정성 지표

- **사용자 만족도**: "AI가 정확한 정보를 제공한다" 피드백 긍정 80% 이상
- **효율성 개선**: 데이터 조회를 위한 화면 전환 횟수 50% 감소
- **신뢰성**: "AI가 추측하지 않고 실제 데이터를 보여준다" 인식 향상

---

## 🚫 제외 사항 (Out of Scope)

1. **데이터 수정**: Tool Use는 읽기 전용, 생성/수정/삭제 불가
2. **외부 API**: Minu 서비스 API 호출은 별도 구현 (1단계 제외)
3. **복잡한 분석**: 집계 쿼리, 차트 생성은 향후 고도화
4. **실시간 구독**: Realtime 이벤트 스트림은 별도 훅 사용
5. **파일 업로드/다운로드**: 도구로 파일 처리 불가

---

## 📚 참고 자료

- **Claude API 문서**: https://docs.anthropic.com/claude/docs/tool-use
- **기존 타입 정의**: `src/types/claude.types.ts` (ClaudeTool, ClaudeToolUseBlock)
- **Central Hub 타입**: `src/types/central-hub.types.ts`
- **MCP Auth 패턴**: `supabase/functions/mcp-auth/index.ts`
- **Rate Limiter**: `supabase/functions/claude-ai/rate-limiter.ts`

---

## 📝 용어 사전

| 용어 | 설명 |
|------|------|
| **Tool Use** | AI가 외부 함수나 API를 호출하여 데이터를 가져오는 기능 (Function Calling) |
| **Tool Definition** | JSON Schema 형식으로 도구 이름, 설명, 파라미터 정의 |
| **tool_use Block** | Claude 응답에서 도구 사용을 나타내는 콘텐츠 블록 |
| **tool_result Block** | 도구 실행 결과를 Claude에 전달하는 콘텐츠 블록 |
| **ToolRegistry** | 도구 정의를 등록/조회/실행하는 중앙 관리 클래스 |
| **RLS** | Row-Level Security, Supabase의 행 단위 보안 정책 |

---

**작성자**: Claude (AI Developer)
**리뷰어**: 서민원
**승인일**: TBD
