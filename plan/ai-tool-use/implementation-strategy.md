# AI Tool Use 구현 전략

> **작성일**: 2025-11-25
> **버전**: 1.0.0
> **상태**: Draft

---

## 📋 개요

AI Tool Use 기능을 안전하고 효율적으로 구현하기 위한 단계별 전략, 우선순위, 위험 관리 방안을 정의합니다.

---

## 🎯 구현 목표

### 핵심 목표

1. **안정성 우선**: 프로덕션 영향 최소화 (Zero Downtime)
2. **점진적 배포**: 작은 단위로 테스트 후 확장
3. **빠른 피드백**: 매일 데모 가능한 진척
4. **문서화 병행**: 코드와 문서 동시 작성

---

## 📅 구현 단계 (3 Sprints)

### Sprint 1: 인프라 & 기본 도구 (1주차, 40시간)

**목표**: ToolRegistry 구조 + 2개 도구 MVP

**작업 순서**:
```
Day 1-2: ToolRegistry 클래스 + 타입 정의
  ├─ tool-registry.ts 생성
  ├─ 타입 정의 (ToolExecutor, ToolExecutionContext)
  └─ 유닛 테스트 (register, getAllTools, execute)

Day 3-4: issues.tool + events.tool 구현
  ├─ tools-handler.ts 생성
  ├─ Zod 스키마 정의
  ├─ Supabase 쿼리 작성
  └─ 에러 핸들링

Day 5: claude-ai/index.ts 통합
  ├─ handleChat() 함수 수정
  ├─ tool_use 블록 처리
  ├─ tool_result 반환
  └─ 메시지 턴 관리 (최대 3턴)

Day 6-7: 테스트 & 디버깅
  ├─ 유닛 테스트 (80% 커버리지)
  ├─ 통합 테스트 (Supabase 연동)
  └─ 수동 테스트 (Postman)
```

**완료 기준** (Definition of Done):
- [ ] issues.tool, events.tool 정상 작동
- [ ] 유닛 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 스테이징 배포 성공

---

### Sprint 2: 나머지 도구 + 프론트엔드 (2주차, 40시간)

**목표**: 5개 도구 완성 + useClaudeTools 훅

**작업 순서**:
```
Day 1-2: health.tool + projects.tool + users.tool
  ├─ 각 도구 executor 구현
  ├─ RLS 정책 확인
  └─ 유닛 테스트

Day 3-4: useClaudeTools 훅 생성
  ├─ src/hooks/ai/useClaudeTools.ts
  ├─ 메시지 상태 관리
  ├─ 스트리밍 처리
  └─ 도구 실행 표시 (isToolExecuting)

Day 5-6: UI 컴포넌트
  ├─ ToolResultCard 컴포넌트
  ├─ ToolExecutingBadge 컴포넌트
  └─ 기존 ChatInterface 통합

Day 7: E2E 테스트
  ├─ tool-use.spec.ts 생성
  ├─ 5개 사용자 스토리 시나리오
  └─ 에러 복구 시나리오
```

**완료 기준**:
- [ ] 5개 도구 모두 정상 작동
- [ ] useClaudeTools 훅 테스트 통과
- [ ] UI 컴포넌트 Storybook 추가
- [ ] E2E 테스트 통과 (5개 시나리오)
- [ ] 스테이징 배포 성공

---

### Sprint 3: 스트리밍 + 최적화 + 문서 (3주차, 40시간)

**목표**: 프로덕션 배포 준비 완료

**작업 순서**:
```
Day 1-3: 스트리밍 지원
  ├─ handleChatStream() 수정
  ├─ 도구 실행 중 이벤트 전송
  ├─ 프론트엔드 스트리밍 처리
  └─ 테스트

Day 4-5: 성능 최적화
  ├─ 쿼리 최적화 (EXPLAIN ANALYZE)
  ├─ 인덱스 추가
  ├─ 헬스 체크 캐싱 (1분)
  └─ 번들 크기 최적화

Day 6: 모니터링 설정
  ├─ 로그 구조 정의
  ├─ 대시보드 쿼리 작성
  └─ 알림 설정 (에러율 10% 초과 시)

Day 7: 문서 작성
  ├─ API 문서 (OpenAPI Spec)
  ├─ 사용자 가이드
  ├─ 배포 가이드
  └─ README 업데이트
```

**완료 기준**:
- [ ] 스트리밍 모드 정상 작동
- [ ] 성능 벤치마크 목표 달성 (P95 < 800ms)
- [ ] 모니터링 대시보드 구축
- [ ] 문서 작성 완료
- [ ] 프로덕션 배포 승인

---

## 🔄 개발 워크플로우

### 일일 루틴

```
09:00 - 09:30  Stand-up (어제 완료, 오늘 계획, 블로커)
09:30 - 12:00  코딩 (Pomodoro 25분 집중)
12:00 - 13:00  점심
13:00 - 15:00  코딩 계속
15:00 - 16:00  테스트 작성
16:00 - 17:00  코드 리뷰 (Self or Pair)
17:00 - 18:00  문서 업데이트 + 다음 날 계획
```

### 커밋 전략

**Conventional Commits**:
```
feat(tools): Add issues.tool executor
fix(tools): Handle empty result gracefully
test(tools): Add unit tests for events.tool
docs(tools): Update API documentation
```

**브랜치 전략**:
```
main (프로덕션)
  └─ develop (개발)
       ├─ feature/tool-registry
       ├─ feature/issues-tool
       ├─ feature/events-tool
       └─ feature/useClaudeTools
```

**PR 체크리스트**:
- [ ] 테스트 통과 (유닛 + 통합)
- [ ] 린트 통과
- [ ] 타입 에러 없음
- [ ] 문서 업데이트
- [ ] 변경사항 CHANGELOG 기록

---

## 🧪 테스트 전략

### Test Pyramid

```
     ╱╲
    ╱  ╲       E2E (10%)
   ╱────╲      - 5개 사용자 시나리오
  ╱      ╲     - 에러 복구 시나리오
 ╱────────╲
╱          ╲   통합 (30%)
────────────   - Edge Function + DB
╱╲          ╱╲ - RLS 정책 검증
  ╲        ╱   - Rate Limiting 검증
   ╲      ╱
    ╲    ╱     유닛 (60%)
     ╲  ╱      - ToolRegistry 메서드
      ╲╱       - 각 도구 executor
               - 입력 검증 (Zod)
```

### 테스트 커버리지 목표

| 레이어 | 목표 | 현재 | 차이 |
|--------|------|------|------|
| 유닛 | 80% | 0% | +80% |
| 통합 | 70% | 0% | +70% |
| E2E | 50% | 0% | +50% |

---

## 🔐 보안 체크리스트

### 배포 전 필수 확인

- [ ] **인증**: JWT 토큰 검증 로직 테스트
- [ ] **RLS**: 모든 쿼리에 RLS 적용 확인
- [ ] **SQL Injection**: 파라미터 바인딩 확인
- [ ] **Rate Limiting**: 분당 20회 제한 동작 확인
- [ ] **민감 정보**: 로그에 비밀번호/API 키 없음
- [ ] **CORS**: 허용된 Origin만 접근 가능
- [ ] **HTTPS**: 모든 API 호출 HTTPS 강제

### 보안 테스트 시나리오

1. **토큰 없이 요청**: 401 Unauthorized
2. **만료된 토큰**: 401 Unauthorized
3. **타인 데이터 조회**: RLS로 차단 (빈 결과)
4. **SQL Injection 시도**: 파라미터 바인딩으로 무효화
5. **Rate Limit 초과**: 429 Too Many Requests

---

## 🚀 배포 전략

### 환경별 배포 순서

```
Local (개발자 머신)
  ↓ (코드 리뷰 + PR 머지)
Staging (스테이징 서버)
  ↓ (E2E 테스트 + QA)
Canary (10% 사용자)
  ↓ (24시간 모니터링)
Production (100% 사용자)
```

### Canary 배포 전략

**Feature Flag 사용**:
```typescript
// supabase/functions/claude-ai/index.ts

const isToolUseEnabled = (userId: string): boolean => {
  // 10% 롤아웃 (userId 해시 기반)
  const hash = hashUserId(userId);
  return (hash % 100) < 10;
};

async function handleChat(...) {
  const tools = isToolUseEnabled(userId)
    ? toolRegistry.getAllTools()
    : undefined;

  const response = await callClaudeAPI(messages, { tools });
  // ...
}
```

**모니터링 지표** (24시간 관찰):
- 에러율 < 5%
- P95 latency < 800ms
- 사용자 피드백 긍정률 > 80%

**롤백 조건**:
- 에러율 > 10%
- 크리티컬 버그 발견
- 성능 저하 (P95 > 1500ms)

---

## ⚠️ 위험 관리

### 식별된 위험 (Risks)

| ID | 위험 | 확률 | 영향 | 대응 방안 |
|----|------|------|------|----------|
| R-001 | Claude API Rate Limit 초과 | 중 | 높음 | 사용자별 제한, 큐잉 시스템 |
| R-002 | RLS 정책 미적용 (보안) | 낮 | 매우 높음 | 통합 테스트 강화, 코드 리뷰 |
| R-003 | 도구 실행 타임아웃 | 중 | 중 | 10초 제한, 에러 핸들링 |
| R-004 | DB 쿼리 성능 저하 | 중 | 중 | 인덱스 추가, 쿼리 최적화 |
| R-005 | 프론트엔드 번들 크기 증가 | 낮 | 낮음 | Tree-shaking, Code splitting |

### 대응 전략

**R-001: Rate Limit 초과**
- **예방**: 사용자별 분당 20회 제한
- **대응**: 대기 큐 + 재시도 로직
- **복구**: Rate Limit 로그 분석 후 한도 조정 요청

**R-002: RLS 미적용**
- **예방**: 모든 쿼리에 RLS 테스트 필수
- **대응**: Service Role Key 사용 금지
- **복구**: 즉시 롤백 + 보안 패치

**R-003: 타임아웃**
- **예방**: 쿼리 최적화, 페이지네이션
- **대응**: 10초 타임아웃 설정
- **복구**: 에러 메시지로 사용자 안내

---

## 📊 성공 지표 (KPI)

### 기술 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **도구 실행 성공률** | 95% 이상 | `(성공 수 / 전체 요청) * 100` |
| **평균 응답 시간** | 500ms 이하 | P50 latency |
| **에러율** | 5% 이하 | `(에러 수 / 전체 요청) * 100` |
| **테스트 커버리지** | 80% 이상 | Vitest coverage report |

### 비즈니스 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **도구 사용률** | 30% 이상 | `(도구 사용 요청 / 전체 채팅) * 100` |
| **사용자 만족도** | 80% 이상 | 피드백 설문 (5점 척도) |
| **화면 전환 감소** | 50% 감소 | 사용자 행동 분석 (GA4) |

---

## 🔄 롤백 계획

### 롤백 트리거

1. **크리티컬 버그**: 데이터 유출, 서비스 다운
2. **성능 저하**: P95 latency > 1500ms
3. **높은 에러율**: 에러율 > 10% (1시간 지속)

### 롤백 절차

```bash
# 1. Feature Flag 비활성화 (즉시)
UPDATE feature_flags SET enabled = false WHERE name = 'tool_use';

# 2. Edge Function 이전 버전으로 복구 (5분)
supabase functions deploy claude-ai --version v1.0.0

# 3. 프론트엔드 롤백 (10분)
git revert HEAD
npm run build
npm run deploy

# 4. 사용자 공지
echo "Tool Use 기능을 일시적으로 비활성화했습니다." > status.txt
```

**롤백 테스트**:
- 매주 롤백 훈련 (스테이징)
- 롤백 시간 목표: 15분 이내

---

## 📚 문서화 전략

### 문서 우선순위

1. **High (릴리스 필수)**
   - API 문서 (OpenAPI Spec)
   - 사용자 가이드
   - 배포 가이드

2. **Medium (릴리스 후 1주)**
   - 아키텍처 다이어그램
   - 트러블슈팅 가이드
   - FAQ

3. **Low (향후)**
   - 개발자 온보딩
   - 코드 스타일 가이드
   - 기여 가이드

### 문서 템플릿

**API 문서 구조**:
```markdown
# Tool Name

## Description
도구 설명 (한 줄)

## Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|

## Response
```json
{ "example": "response" }
```

## Examples
### Request
```json
{ "example": "request" }
```

### Response
```json
{ "example": "response" }
```

## Error Codes
| Code | Message | Resolution |
|------|---------|------------|
```

---

## 🎓 학습 및 개선

### Retrospective (Sprint 종료 후)

**Keep (계속할 것)**:
- 매일 데모 가능한 진척
- 테스트 주도 개발 (TDD)
- 페어 프로그래밍 (복잡한 로직)

**Problem (문제점)**:
- 테스트 작성 시간 부족
- 문서 업데이트 지연
- 성능 테스트 미흡

**Try (시도할 것)**:
- 테스트 먼저 작성 (Red-Green-Refactor)
- 커밋 전 문서 업데이트 강제
- 성능 벤치마크 자동화

---

## ✅ 최종 체크리스트

**프로덕션 배포 전**:
- [ ] 모든 Sprint 완료 (3/3)
- [ ] 테스트 커버리지 80% 이상
- [ ] 성능 벤치마크 목표 달성
- [ ] 보안 체크리스트 통과
- [ ] 문서 작성 완료 (High priority)
- [ ] 스테이징 배포 성공
- [ ] Canary 배포 성공 (24시간)
- [ ] 롤백 계획 수립 및 테스트
- [ ] 모니터링 대시보드 구축
- [ ] 팀원 리뷰 및 승인

---

**작성자**: Claude (AI Developer)
**리뷰어**: 서민원
**승인일**: TBD
