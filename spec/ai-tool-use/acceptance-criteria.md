# AI Tool Use 인수 조건

> **작성일**: 2025-11-25
> **버전**: 1.0.0
> **상태**: Draft

---

## 📋 개요

AI Tool Use 기능의 성공 기준을 정의합니다. 각 기능이 요구사항을 충족하는지 검증하기 위한 구체적이고 측정 가능한 조건들입니다.

---

## 🎯 핵심 인수 조건

### AC-001: 도구 정의 (Tool Definition)

**조건**:
- [ ] 모든 도구는 JSON Schema 형식으로 정의됨
- [ ] 도구 이름은 `{domain}.tool` 형식 (예: `issues.tool`)
- [ ] 설명은 AI가 이해할 수 있는 자연어로 작성
- [ ] 입력 스키마는 `type: 'object'` 형식
- [ ] 필수 파라미터는 `required` 배열에 명시

**검증 방법**:
```typescript
// 예시
const toolDefinition: ClaudeTool = {
  name: 'issues.tool',
  description: 'Minu 서비스의 이슈 목록을 조회합니다.',
  input_schema: {
    type: 'object',
    properties: {
      service_id: { type: 'string', enum: ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'] },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      limit: { type: 'number', default: 20 }
    },
    required: [] // 모두 선택적
  }
};
```

**통과 기준**:
- 5개 도구(issues, events, health, projects, users) 모두 정의됨
- TypeScript 타입 체크 통과
- JSON Schema 유효성 검증 통과

---

### AC-002: 도구 자동 선택

**조건**:
- [ ] 사용자 질문에서 의도를 파악하여 적절한 도구 선택
- [ ] "이슈를 보여줘" → `issues.tool` 선택
- [ ] "프로젝트 진행률" → `projects.tool` 선택
- [ ] "서비스 상태" → `health.tool` 선택
- [ ] 여러 도구가 필요하면 순차적으로 실행

**검증 방법**:
```typescript
// E2E 테스트
describe('Tool Selection', () => {
  it('should select issues.tool for issue queries', async () => {
    const response = await sendMessage('Minu Build의 critical 이슈를 보여줘');
    expect(response.content).toContainEqual({
      type: 'tool_use',
      name: 'issues.tool',
      input: {
        service_id: 'minu-build',
        severity: 'critical'
      }
    });
  });
});
```

**통과 기준**:
- 80% 이상의 테스트 케이스에서 올바른 도구 선택
- 도구 선택 실패 시 사용자에게 명확한 안내

---

### AC-003: 도구 실행 및 응답

**조건**:
- [ ] 도구 실행 결과를 AI가 응답에 반영
- [ ] `tool_use` 블록 수신 → 서버에서 도구 실행 → `tool_result` 반환
- [ ] AI가 `tool_result`를 바탕으로 자연어 응답 생성
- [ ] 결과가 없을 경우 "조회 결과가 없습니다" 안내
- [ ] 에러 발생 시 에러 메시지를 `tool_result`의 `is_error: true`로 전달

**검증 방법**:
```typescript
// 유닛 테스트
describe('Tool Execution', () => {
  it('should execute tool and return result', async () => {
    const toolUse = {
      type: 'tool_use',
      id: 'tool_001',
      name: 'issues.tool',
      input: { service_id: 'minu-build', severity: 'critical' }
    };

    const result = await executeTool(toolUse, userId, supabase);

    expect(result).toEqual({
      type: 'tool_result',
      tool_use_id: 'tool_001',
      content: expect.stringContaining('total'),
      is_error: false
    });
  });
});
```

**통과 기준**:
- 도구 실행 성공률 95% 이상
- 평균 실행 시간 500ms 이하
- 에러 발생 시 적절한 에러 메시지 반환

---

### AC-004: 권한 검증

**조건**:
- [ ] 로그인하지 않은 사용자는 도구 실행 불가 (`401 Unauthorized`)
- [ ] JWT 토큰 검증 실패 시 도구 실행 불가
- [ ] RLS 정책에 따라 사용자가 접근 가능한 데이터만 조회
- [ ] 관리자는 모든 데이터 조회 가능
- [ ] 일반 사용자는 본인 관련 데이터만 조회 가능

**검증 방법**:
```typescript
// 통합 테스트
describe('Authorization', () => {
  it('should reject request without token', async () => {
    const response = await fetch('/functions/v1/claude-ai/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'issues.tool', input: {} })
    });

    expect(response.status).toBe(401);
  });

  it('should apply RLS for non-admin users', async () => {
    const result = await executeTool(
      { name: 'projects.tool', input: {} },
      'user_123', // 일반 사용자
      supabase
    );

    // 본인이 참여한 프로젝트만 조회
    const projects = JSON.parse(result.content).projects;
    expect(projects.every(p => p.members.includes('user_123'))).toBe(true);
  });
});
```

**통과 기준**:
- 권한 없는 요청 차단률 100%
- RLS 정책 우회 사례 0건
- 관리자 권한 정상 작동

---

### AC-005: Rate Limiting

**조건**:
- [ ] 도구 실행도 기존 Claude API Rate Limit 적용 (분당 20회)
- [ ] 초과 시 `429 Too Many Requests` 응답
- [ ] `X-RateLimit-Remaining`, `X-RateLimit-Reset` 헤더 포함
- [ ] Rate Limit은 사용자별 독립 적용
- [ ] 관리자는 더 높은 한도 (분당 100회)

**검증 방법**:
```typescript
// 부하 테스트
describe('Rate Limiting', () => {
  it('should limit requests to 20 per minute', async () => {
    const requests = Array(25).fill(null).map(() =>
      sendMessage('이슈를 보여줘', { userId: 'user_123' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThanOrEqual(5);
  });
});
```

**통과 기준**:
- Rate Limit 정확도 100%
- 초과 요청 차단률 100%
- 헤더 정보 정확성 100%

---

### AC-006: Graceful Fallback

**조건**:
- [ ] 도구 실행 실패 시 AI가 일반 응답으로 대체
- [ ] "데이터를 조회할 수 없습니다. [이유]" 형식 안내
- [ ] 타임아웃 발생 시 10초 후 중단
- [ ] 네트워크 에러 시 재시도 없이 즉시 fallback
- [ ] 전체 요청이 실패하지 않고 부분 응답 제공

**검증 방법**:
```typescript
// 에러 시뮬레이션
describe('Graceful Fallback', () => {
  it('should respond gracefully when tool fails', async () => {
    // DB 연결 끊기 시뮬레이션
    mockSupabase.from('service_issues').select.mockRejectedValue(new Error('Connection lost'));

    const response = await sendMessage('이슈를 보여줘');

    expect(response.content).toContain('데이터를 조회할 수 없습니다');
    expect(response.content).toContain('Connection lost');
  });
});
```

**통과 기준**:
- 도구 실패 시 응답 생성률 100%
- 사용자에게 명확한 에러 원인 전달
- 전체 요청 실패율 0%

---

## 🔍 세부 인수 조건 (도구별)

### AC-100: issues.tool

**입력 검증**:
- [ ] `service_id`는 유효한 ServiceId 타입
- [ ] `severity`는 4가지 값 중 하나
- [ ] `status`는 4가지 값 중 하나
- [ ] `limit`은 1~100 범위

**출력 검증**:
- [ ] `total` 필드는 숫자
- [ ] `issues` 배열은 최대 `limit` 크기
- [ ] 각 이슈는 필수 필드 포함 (id, title, severity, status)
- [ ] 날짜 필드는 ISO 8601 형식

**성능**:
- [ ] 평균 실행 시간 300ms 이하
- [ ] 100개 이슈 조회 시 500ms 이하

---

### AC-200: events.tool

**입력 검증**:
- [ ] `from_date`, `to_date`는 ISO 8601 형식
- [ ] `event_type`은 유효한 EventType 타입
- [ ] 날짜 범위는 최대 30일

**출력 검증**:
- [ ] 시간 내림차순 정렬 (최신순)
- [ ] `payload` 필드는 JSON 객체
- [ ] 페이지네이션 안내 (total > limit일 때)

**성능**:
- [ ] 평균 실행 시간 400ms 이하
- [ ] 1000개 이벤트 조회 시 800ms 이하

---

### AC-300: health.tool

**입력 검증**:
- [ ] `service_id` 생략 가능 (전체 조회)
- [ ] 유효하지 않은 service_id는 에러

**출력 검증**:
- [ ] 4개 서비스 모두 조회 (service_id 생략 시)
- [ ] 각 서비스는 status, metrics 포함
- [ ] metrics는 숫자 타입
- [ ] `last_ping`은 ISO 8601 형식

**캐싱**:
- [ ] 1분간 결과 캐싱 (성능 최적화)
- [ ] 캐시 만료 후 재조회

---

### AC-400: projects.tool

**입력 검증**:
- [ ] `status`는 유효한 프로젝트 상태
- [ ] `user_id` 생략 시 본인 프로젝트 조회
- [ ] 관리자는 모든 프로젝트 조회 가능

**출력 검증**:
- [ ] `progress` 필드는 0~100 숫자
- [ ] 각 프로젝트는 title, status, created_at 포함
- [ ] RLS 적용 확인 (본인 프로젝트만)

**성능**:
- [ ] 평균 실행 시간 350ms 이하

---

### AC-500: users.tool

**입력 검증**:
- [ ] `email` 또는 `full_name` 중 하나 필수
- [ ] `role`은 유효한 역할 타입

**출력 검증**:
- [ ] 민감 정보 제외 (비밀번호, API 키)
- [ ] 본인 또는 관리자만 상세 정보 접근
- [ ] 검색 결과는 최대 10개

**보안**:
- [ ] 비인가 접근 차단 (본인 외 조회 불가)
- [ ] 관리자는 모든 사용자 조회 가능

---

## 📊 전체 시스템 인수 조건

### AC-900: 통합 시나리오

**시나리오 1: 복합 질문**
```
사용자: "Minu Build의 critical 이슈가 있으면 보여주고, 현재 프로젝트 진행률도 알려줘"

기대 결과:
1. issues.tool 실행 (service_id='minu-build', severity='critical')
2. projects.tool 실행 (service_id='minu-build', status='active')
3. AI가 두 결과를 종합하여 응답 생성
```

**시나리오 2: 에러 복구**
```
사용자: "최근 이벤트를 보여줘"

상황: DB 연결 실패

기대 결과:
1. events.tool 실행 시도
2. 에러 발생 → is_error: true 반환
3. AI가 "현재 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요" 응답
```

**시나리오 3: 권한 제한**
```
사용자: "모든 사용자 목록을 보여줘"

상황: 일반 사용자 (관리자 아님)

기대 결과:
1. users.tool 실행 → RLS 적용
2. 빈 결과 또는 본인만 조회
3. AI가 "권한이 없어 조회할 수 없습니다" 응답
```

---

### AC-901: 성능 벤치마크

**목표**:
- [ ] 도구 실행 P50: 300ms 이하
- [ ] 도구 실행 P95: 800ms 이하
- [ ] 도구 실행 P99: 1500ms 이하
- [ ] 전체 요청 완료: 3초 이하 (도구 1~2회 사용 시)

**측정 방법**:
```typescript
describe('Performance Benchmark', () => {
  it('should meet P95 latency target', async () => {
    const latencies = await Promise.all(
      Array(100).fill(null).map(async () => {
        const start = Date.now();
        await executeTool({ name: 'issues.tool', input: {} }, userId, supabase);
        return Date.now() - start;
      })
    );

    latencies.sort((a, b) => a - b);
    const p95 = latencies[94];

    expect(p95).toBeLessThanOrEqual(800);
  });
});
```

---

### AC-902: 에러 처리

**커버해야 할 에러**:
- [ ] 401 Unauthorized (토큰 없음)
- [ ] 403 Forbidden (권한 없음)
- [ ] 429 Too Many Requests (Rate Limit)
- [ ] 500 Internal Server Error (DB 연결 실패)
- [ ] 504 Gateway Timeout (타임아웃)

**각 에러별 응답**:
```typescript
const errorResponses = {
  401: 'tool_result with is_error: true, content: "인증이 필요합니다"',
  403: 'tool_result with is_error: true, content: "권한이 없습니다"',
  429: 'tool_result with is_error: true, content: "요청 한도를 초과했습니다"',
  500: 'tool_result with is_error: true, content: "서버 오류가 발생했습니다"',
  504: 'tool_result with is_error: true, content: "요청 시간이 초과되었습니다"'
};
```

---

### AC-903: 로깅 및 모니터링

**필수 로그**:
- [ ] 도구 실행 시작/종료 시각
- [ ] 입력 파라미터 (민감 정보 제외)
- [ ] 실행 결과 (성공/실패)
- [ ] 에러 발생 시 스택 트레이스
- [ ] 사용자 ID, 요청 ID

**모니터링 지표**:
- [ ] 도구별 사용 횟수
- [ ] 도구별 평균 실행 시간
- [ ] 도구별 에러율
- [ ] 사용자별 도구 사용 패턴

**저장 위치**:
- `claude_usage_logs` 테이블 (기존 활용)
- 새 컬럼 추가: `tool_name`, `tool_input`, `tool_result`

---

## ✅ 최종 승인 조건

**릴리스 전 체크리스트**:
- [ ] 모든 핵심 인수 조건 (AC-001 ~ AC-006) 통과
- [ ] 5개 도구 모두 정상 작동
- [ ] E2E 테스트 커버리지 80% 이상
- [ ] 성능 벤치마크 목표 달성
- [ ] 보안 취약점 0건
- [ ] 문서 작성 완료 (사용자 가이드, API 문서)
- [ ] 스테이징 환경 테스트 통과
- [ ] 코드 리뷰 승인

---

**작성자**: Claude (AI Developer)
**리뷰어**: 서민원
**승인일**: TBD
