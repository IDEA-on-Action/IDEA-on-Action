# 대화 컨텍스트 관리 인수 조건 명세서

> 대화 컨텍스트 관리 기능의 성공 기준 및 검증 방법

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Active
**관련 문서**: [requirements.md](./requirements.md)

---

## 1. 개요

본 문서는 대화 컨텍스트 관리 기능의 **인수 조건(Acceptance Criteria)**을 BDD(Behavior-Driven Development) 형식으로 정의합니다.

### 1.1 작성 원칙
- **Given-When-Then** 형식으로 시나리오 작성
- **측정 가능한** 성공 기준
- **테스트 가능한** 검증 방법

---

## 2. 기능적 인수 조건 (Functional AC)

### AC-CC-01: 세션 생성

**시나리오**: 사용자가 새 대화를 시작할 때

```gherkin
Given 사용자가 로그인한 상태이고
When "새 대화" 버튼을 클릭하면
Then 새로운 세션이 생성되고
And 세션 제목이 "새 대화 {날짜}" 형식으로 자동 설정되며
And 세션 ID가 반환되고
And 사용자에게 빈 채팅 화면이 표시됩니다
```

**검증 방법**:
- DB에 새 레코드가 생성되었는지 확인
- user_id가 JWT에서 추출된 값과 일치하는지 확인
- status가 'active'인지 확인

---

### AC-CC-02: 세션 목록 조회

**시나리오**: 사용자가 이전 대화 목록을 확인할 때

```gherkin
Given 사용자에게 5개의 저장된 대화가 있고
When 대화 목록 페이지에 접근하면
Then 모든 대화가 최근 활동 순으로 표시되고
And 각 대화의 제목, 생성일, 메시지 개수가 표시되며
And 다른 사용자의 대화는 표시되지 않습니다
```

**검증 방법**:
- updated_at 내림차순으로 정렬되었는지 확인
- message_count가 실제 메시지 개수와 일치하는지 확인
- RLS가 작동하여 본인 세션만 조회되는지 확인

---

### AC-CC-03: 메시지 저장 (User)

**시나리오**: 사용자가 메시지를 전송할 때

```gherkin
Given 활성화된 대화 세션이 있고
When 사용자가 "RFP 작성을 도와줘"라고 입력하고 전송하면
Then 메시지가 DB에 저장되고
And role이 'user'로 설정되며
And sequence가 자동으로 증가하고
And 채팅 화면에 메시지가 표시됩니다
```

**검증 방법**:
- conversation_messages 테이블에 레코드 생성 확인
- sequence가 이전 메시지보다 1 증가했는지 확인
- session_id가 현재 세션과 일치하는지 확인

---

### AC-CC-04: 메시지 저장 (Assistant)

**시나리오**: AI가 응답을 생성할 때

```gherkin
Given 사용자 메시지가 저장된 상태이고
When Claude API가 응답을 반환하면
Then assistant 메시지가 DB에 저장되고
And token_count와 model 정보가 기록되며
And 세션의 total_tokens가 증가하고
And 채팅 화면에 응답이 표시됩니다
```

**검증 방법**:
- token_count가 API 응답의 usage.output_tokens와 일치하는지 확인
- model이 "claude-3-5-sonnet-20241022"로 설정되었는지 확인
- total_tokens가 이전 값 + token_count인지 확인

---

### AC-CC-05: 세션 불러오기

**시나리오**: 사용자가 저장된 대화를 다시 열 때

```gherkin
Given 20개 메시지가 있는 세션이 저장되어 있고
When 사용자가 해당 세션을 클릭하면
Then 모든 메시지가 순서대로 로딩되고
And 시스템 프롬프트가 복원되며
And 새 메시지를 전송할 수 있습니다
```

**검증 방법**:
- 메시지가 sequence 오름차순으로 표시되는지 확인
- system_prompt가 DB 값과 일치하는지 확인
- 새 메시지 전송 시 sequence가 21부터 시작하는지 확인

---

### AC-CC-06: 컨텍스트 요약 제안

**시나리오**: 대화가 길어질 때

```gherkin
Given 세션에 15개 메시지가 있고
When 사용자가 채팅 화면을 확인하면
Then "컨텍스트 요약" 버튼이 표시되고
And 버튼에 "토큰 절약 가능" 배지가 표시됩니다
```

**검증 방법**:
- 메시지 개수가 10개 이상일 때만 버튼 표시 확인
- 버튼이 UI에 올바르게 렌더링되는지 확인

---

### AC-CC-07: 컨텍스트 요약 실행

**시나리오**: 사용자가 컨텍스트 요약을 실행할 때

```gherkin
Given 15개 메시지가 있는 세션이 있고
When "컨텍스트 요약" 버튼을 클릭하면
Then 최근 10개를 제외한 5개 메시지가 요약되고
And 요약본이 session.summary에 저장되며
And 요약된 메시지의 is_summarized가 true로 설정되고
And 사용자에게 "5개 메시지가 요약되었습니다" 알림이 표시됩니다
```

**검증 방법**:
- Claude API 호출로 요약이 생성되었는지 확인
- summary 컬럼에 값이 저장되었는지 확인
- is_summarized = true인 메시지가 5개인지 확인

---

### AC-CC-08: 요약 후 API 전송

**시나리오**: 요약 후 새 메시지를 전송할 때

```gherkin
Given 5개 메시지가 요약된 세션이 있고
When 사용자가 새 메시지를 전송하면
Then Claude API에 요약본 + 최근 10개 메시지만 전송되고
And 요약된 5개 메시지는 전송되지 않습니다
```

**검증 방법**:
- API 요청 페이로드에 메시지가 11개(요약 1개 + 최근 10개)인지 확인
- 요약본이 system 역할로 전송되는지 확인

---

### AC-CC-09: 대화 포크

**시나리오**: 사용자가 대화를 분기할 때

```gherkin
Given 10개 메시지가 있는 세션이 있고
When 사용자가 5번째 메시지 옆의 "여기서 분기" 버튼을 클릭하면
Then 새로운 세션이 생성되고
And 1~5번 메시지가 새 세션에 복사되며
And parent_session_id가 원본 세션 ID로 설정되고
And fork_index가 1로 설정되며
And 새 세션이 활성화됩니다
```

**검증 방법**:
- 새 세션의 메시지 개수가 5개인지 확인
- parent_session_id가 원본 세션 ID와 일치하는지 확인
- 원본 세션은 변경되지 않았는지 확인

---

### AC-CC-10: Markdown 내보내기

**시나리오**: 사용자가 대화를 내보낼 때

```gherkin
Given 10개 메시지가 있는 세션이 있고
When "내보내기" 버튼을 클릭하면
Then Markdown 파일이 다운로드되고
And 파일명이 "conversation-{session_id}-{date}.md" 형식이며
And 모든 메시지가 role별로 포맷팅되고
And 메타데이터(생성일, 모델, 토큰)가 포함됩니다
```

**검증 방법**:
- 다운로드된 파일의 내용이 올바른 Markdown 형식인지 확인
- 메시지 개수가 일치하는지 확인
- 메타데이터가 정확한지 확인

**예상 출력 (일부)**:
```markdown
# 새 대화 2025-11-25

**생성일**: 2025-11-25 14:30:00
**모델**: claude-3-5-sonnet-20241022
**총 토큰**: 1,234

---

**User**: RFP 작성을 도와줘

**Assistant**: 네, RFP 작성을 도와드리겠습니다. 어떤 프로젝트에 대한 RFP인가요?
```

---

### AC-CC-11: 세션 아카이브

**시나리오**: 사용자가 대화를 아카이브할 때

```gherkin
Given 활성화된 세션이 있고
When "아카이브" 버튼을 클릭하면
Then 세션 상태가 'archived'로 변경되고
And 세션 목록에서 숨겨지며
And "아카이브된 대화 보기" 필터로만 확인할 수 있습니다
```

**검증 방법**:
- status가 'archived'로 변경되었는지 확인
- 기본 목록 조회 시 표시되지 않는지 확인
- status='archived' 필터로 조회 시 표시되는지 확인

---

### AC-CC-12: 세션 제목 수정

**시나리오**: 사용자가 세션 제목을 변경할 때

```gherkin
Given 세션 제목이 "새 대화 2025-11-25"인 세션이 있고
When 사용자가 제목을 "RFP 작성 프로젝트"로 수정하면
Then 제목이 DB에 업데이트되고
And 세션 목록에서 변경된 제목이 표시됩니다
```

**검증 방법**:
- title 컬럼이 업데이트되었는지 확인
- updated_at이 갱신되었는지 확인

---

### AC-CC-13: 프롬프트 템플릿 적용

**시나리오**: 사용자가 템플릿으로 세션을 생성할 때

```gherkin
Given "RFP 작성 전문가" 템플릿이 있고
When 사용자가 해당 템플릿으로 새 대화를 시작하면
Then 세션의 system_prompt가 템플릿 내용으로 설정되고
And template_id가 기록되며
And 첫 메시지부터 템플릿 역할이 적용됩니다
```

**검증 방법**:
- system_prompt가 템플릿의 system_prompt와 일치하는지 확인
- template_id가 올바르게 설정되었는지 확인

---

### AC-CC-14: 토큰 사용량 추적

**시나리오**: 대화가 진행될 때

```gherkin
Given 세션의 total_tokens가 500이고
When assistant 메시지가 300 토큰으로 저장되면
Then 세션의 total_tokens가 800으로 업데이트되고
And 세션 목록에서 토큰 사용량이 표시됩니다
```

**검증 방법**:
- total_tokens가 자동으로 증가했는지 확인
- 메시지의 token_count 합계와 일치하는지 확인

---

### AC-CC-15: 메시지 페이지네이션

**시나리오**: 대화가 매우 길 때

```gherkin
Given 200개 메시지가 있는 세션이 있고
When 세션을 불러오면
Then 처음에는 100개만 로딩되고
And "이전 메시지 더보기" 버튼이 표시되며
And 버튼 클릭 시 다음 100개가 로딩됩니다
```

**검증 방법**:
- 초기 로딩 시 100개만 로딩되는지 확인
- offset 파라미터가 올바르게 작동하는지 확인
- 모든 메시지를 로딩할 때까지 반복 가능한지 확인

---

## 3. 비기능적 인수 조건 (Non-Functional AC)

### AC-CC-16: 성능 - 세션 목록 조회

**요구사항**: NFR-CC-01

```gherkin
Given 사용자에게 50개의 세션이 있고
When 세션 목록 페이지를 로딩하면
Then 500ms 이내에 응답이 완료되고
And 페이지가 렌더링됩니다
```

**검증 방법**:
- Performance API로 응답 시간 측정
- Lighthouse 성능 점수 90+ 유지

**측정 지표**:
- API 응답 시간: < 500ms
- 페이지 로딩 시간: < 1s

---

### AC-CC-17: 성능 - 메시지 로딩

**요구사항**: NFR-CC-01

```gherkin
Given 100개 메시지가 있는 세션이 있고
When 세션을 불러오면
Then 1초 이내에 모든 메시지가 표시됩니다
```

**검증 방법**:
- 메시지 로딩 시간 측정
- 네트워크 탭에서 API 응답 시간 확인

**측정 지표**:
- 메시지 조회 API: < 800ms
- 렌더링 시간: < 200ms

---

### AC-CC-18: 보안 - RLS 검증

**요구사항**: NFR-CC-03

```gherkin
Given 사용자 A와 사용자 B가 각각 세션을 가지고 있고
When 사용자 A가 사용자 B의 세션 ID로 접근을 시도하면
Then 403 Forbidden 에러가 반환되고
And 어떤 데이터도 노출되지 않습니다
```

**검증 방법**:
- 다른 사용자 토큰으로 API 호출 시도
- RLS 정책이 올바르게 작동하는지 확인

**보안 체크리스트**:
- [ ] RLS 정책이 모든 테이블에 적용됨
- [ ] JWT의 user_id로만 접근 가능
- [ ] SQL Injection 방어

---

### AC-CC-19: 확장성 - 대용량 메시지 처리

**요구사항**: NFR-CC-01, NFR-CC-02

```gherkin
Given 1,000개 메시지가 있는 세션이 있고
When 페이지네이션으로 메시지를 로딩하면
Then 각 페이지가 2초 이내에 로딩되고
And 메모리 사용량이 500MB를 초과하지 않습니다
```

**검증 방법**:
- Chrome DevTools Memory Profiler로 메모리 사용량 측정
- 페이지네이션 동작 확인

**측정 지표**:
- 페이지당 로딩 시간: < 2s
- 메모리 사용량: < 500MB

---

### AC-CC-20: 사용성 - 에러 핸들링

**요구사항**: NFR-CC-04

```gherkin
Given 네트워크가 불안정한 상태이고
When 메시지 저장 API가 실패하면
Then 사용자에게 "메시지 저장에 실패했습니다. 다시 시도해주세요." 알림이 표시되고
And 입력한 내용이 유지되며
And "재시도" 버튼이 제공됩니다
```

**검증 방법**:
- 네트워크를 차단하고 API 호출 시도
- 에러 메시지가 올바르게 표시되는지 확인

**에러 핸들링 체크리스트**:
- [ ] 모든 API 호출에 try-catch 적용
- [ ] 에러 메시지가 사용자 친화적
- [ ] 재시도 옵션 제공
- [ ] 로딩 상태 표시

---

## 4. 테스트 매트릭스

### 4.1 기능 테스트 매트릭스

| AC ID | 테스트 유형 | 우선순위 | 자동화 가능 | 담당 |
|-------|-----------|---------|-----------|------|
| AC-CC-01 | E2E | P0 | ✅ | Playwright |
| AC-CC-02 | E2E | P0 | ✅ | Playwright |
| AC-CC-03 | Integration | P0 | ✅ | Vitest |
| AC-CC-04 | Integration | P0 | ✅ | Vitest |
| AC-CC-05 | E2E | P0 | ✅ | Playwright |
| AC-CC-06 | E2E | P1 | ✅ | Playwright |
| AC-CC-07 | E2E | P1 | ✅ | Playwright |
| AC-CC-08 | Integration | P1 | ✅ | Vitest |
| AC-CC-09 | E2E | P2 | ✅ | Playwright |
| AC-CC-10 | E2E | P1 | ✅ | Playwright |
| AC-CC-11 | E2E | P1 | ✅ | Playwright |
| AC-CC-12 | E2E | P1 | ✅ | Playwright |
| AC-CC-13 | Integration | P1 | ✅ | Vitest |
| AC-CC-14 | Integration | P0 | ✅ | Vitest |
| AC-CC-15 | E2E | P1 | ✅ | Playwright |

### 4.2 비기능 테스트 매트릭스

| AC ID | 테스트 유형 | 도구 | 목표 | 담당 |
|-------|-----------|------|------|------|
| AC-CC-16 | Performance | Lighthouse | < 500ms | Playwright |
| AC-CC-17 | Performance | Lighthouse | < 1s | Playwright |
| AC-CC-18 | Security | Supabase Test | RLS 통과 | Vitest |
| AC-CC-19 | Load | Artillery | 1000 req/s | CI/CD |
| AC-CC-20 | Usability | Manual | 에러 처리 | QA |

---

## 5. Definition of Done (DoD)

### 5.1 기능 완료 기준

**각 기능은 다음 조건을 모두 충족해야 완료로 간주합니다**:

#### 코드
- [ ] TypeScript strict mode 통과
- [ ] ESLint 경고 0개
- [ ] 모든 함수에 JSDoc 주석 작성
- [ ] any 타입 사용 금지

#### 테스트
- [ ] E2E 테스트 작성 및 통과
- [ ] 통합 테스트 작성 및 통과
- [ ] 테스트 커버리지 80% 이상
- [ ] 모든 엣지 케이스 테스트

#### 문서
- [ ] API 문서 업데이트
- [ ] 사용자 가이드 업데이트
- [ ] CLAUDE.md 업데이트

#### 보안
- [ ] RLS 정책 적용 및 검증
- [ ] SQL Injection 방어 확인
- [ ] XSS 방어 확인

#### 성능
- [ ] API 응답 시간 목표 달성
- [ ] Lighthouse 점수 90+ 유지
- [ ] 메모리 누수 없음

#### 배포
- [ ] 로컬 빌드 성공
- [ ] Staging 배포 성공
- [ ] 프로덕션 배포 성공
- [ ] 모니터링 설정 (Sentry)

---

### 5.2 Sprint 완료 기준

**각 Sprint는 다음 조건을 모두 충족해야 완료로 간주합니다**:

#### 기능
- [ ] 모든 P0 기능 구현 완료
- [ ] 모든 인수 조건 통과

#### 품질
- [ ] 전체 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] QA 테스트 통과

#### 문서
- [ ] 릴리스 노트 작성
- [ ] Changelog 업데이트
- [ ] 배포 가이드 업데이트

#### 배포
- [ ] Staging 검증 완료
- [ ] 프로덕션 배포 완료
- [ ] 롤백 계획 수립

---

## 6. 테스트 시나리오 예시

### 6.1 E2E 테스트 (Playwright)

**파일**: `tests/e2e/conversation-context.spec.ts`

```typescript
test.describe('대화 컨텍스트 관리', () => {
  test('AC-CC-01: 새 대화 생성', async ({ page }) => {
    // Given: 로그인한 상태
    await page.goto('/chat');

    // When: "새 대화" 버튼 클릭
    await page.click('button:has-text("새 대화")');

    // Then: 새 세션 생성 확인
    await expect(page.locator('[data-testid="chat-title"]'))
      .toContainText('새 대화');

    // And: 빈 채팅 화면 표시
    await expect(page.locator('[data-testid="message-list"]'))
      .toBeEmpty();
  });

  test('AC-CC-05: 세션 불러오기', async ({ page }) => {
    // Given: 20개 메시지가 있는 세션
    const sessionId = await createTestSession(20);

    // When: 세션 클릭
    await page.goto('/chat');
    await page.click(`[data-session-id="${sessionId}"]`);

    // Then: 모든 메시지 로딩
    await expect(page.locator('[data-testid="message"]'))
      .toHaveCount(20);

    // And: 순서대로 표시
    const messages = await page.locator('[data-testid="message"]').all();
    for (let i = 0; i < messages.length; i++) {
      await expect(messages[i]).toHaveAttribute('data-sequence', String(i + 1));
    }
  });

  test('AC-CC-07: 컨텍스트 요약', async ({ page }) => {
    // Given: 15개 메시지 세션
    const sessionId = await createTestSession(15);
    await page.goto(`/chat/${sessionId}`);

    // When: "컨텍스트 요약" 버튼 클릭
    await page.click('button:has-text("컨텍스트 요약")');

    // Then: 요약 완료 알림
    await expect(page.locator('.toast'))
      .toContainText('5개 메시지가 요약되었습니다');

    // And: is_summarized = true 확인
    const summarizedCount = await db
      .from('conversation_messages')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .eq('is_summarized', true);

    expect(summarizedCount.count).toBe(5);
  });
});
```

---

### 6.2 통합 테스트 (Vitest)

**파일**: `tests/integration/conversation-hooks.test.ts`

```typescript
describe('useConversationSession', () => {
  it('AC-CC-03: 사용자 메시지 저장', async () => {
    // Given: 활성 세션
    const { result } = renderHook(() => useConversationSession(sessionId));

    // When: 메시지 전송
    await act(async () => {
      await result.current.sendMessage('RFP 작성을 도와줘');
    });

    // Then: DB에 저장 확인
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .single();

    expect(data.content).toBe('RFP 작성을 도와줘');
    expect(data.sequence).toBeGreaterThan(0);
  });

  it('AC-CC-14: 토큰 사용량 추적', async () => {
    // Given: total_tokens = 500인 세션
    const { data: initialSession } = await supabase
      .from('conversation_sessions')
      .select('total_tokens')
      .eq('id', sessionId)
      .single();

    expect(initialSession.total_tokens).toBe(500);

    // When: 300 토큰 메시지 저장
    await saveMessage({
      session_id: sessionId,
      role: 'assistant',
      content: '...',
      token_count: 300,
    });

    // Then: total_tokens 증가 확인
    const { data: updatedSession } = await supabase
      .from('conversation_sessions')
      .select('total_tokens')
      .eq('id', sessionId)
      .single();

    expect(updatedSession.total_tokens).toBe(800);
  });
});
```

---

## 7. 인수 테스트 체크리스트

### 7.1 기능 테스트

**세션 관리**:
- [ ] AC-CC-01: 세션 생성
- [ ] AC-CC-02: 세션 목록 조회
- [ ] AC-CC-11: 세션 아카이브
- [ ] AC-CC-12: 세션 제목 수정

**메시지 관리**:
- [ ] AC-CC-03: 사용자 메시지 저장
- [ ] AC-CC-04: AI 메시지 저장
- [ ] AC-CC-05: 메시지 조회
- [ ] AC-CC-15: 메시지 페이지네이션

**고급 기능**:
- [ ] AC-CC-06: 컨텍스트 요약 제안
- [ ] AC-CC-07: 컨텍스트 요약 실행
- [ ] AC-CC-08: 요약 후 API 전송
- [ ] AC-CC-09: 대화 포크
- [ ] AC-CC-10: Markdown 내보내기
- [ ] AC-CC-13: 프롬프트 템플릿 적용
- [ ] AC-CC-14: 토큰 사용량 추적

### 7.2 비기능 테스트

**성능**:
- [ ] AC-CC-16: 세션 목록 조회 < 500ms
- [ ] AC-CC-17: 메시지 로딩 < 1s
- [ ] AC-CC-19: 대용량 메시지 처리

**보안**:
- [ ] AC-CC-18: RLS 검증

**사용성**:
- [ ] AC-CC-20: 에러 핸들링

---

## 8. 검증 완료 서명

**프로젝트 매니저**: _________________ 날짜: _______

**개발 리드**: _________________ 날짜: _______

**QA 리드**: _________________ 날짜: _______

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
