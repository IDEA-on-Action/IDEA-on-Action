# 대화 컨텍스트 관리 요구사항 명세서

> 사용자가 AI와의 대화를 저장하고 나중에 이어서 대화할 수 있는 기능

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Active
**관련 백로그**: BL-AI-002

---

## 1. 개요

### 1.1 목적
장기 대화 세션을 DB에 저장하여 브라우저를 닫아도 대화를 이어갈 수 있게 합니다.

### 1.2 범위
- 대화 세션 저장/불러오기
- 메시지 히스토리 관리
- 컨텍스트 요약 (토큰 절약)
- 대화 포크 및 내보내기

### 1.3 대상 사용자
- 깊이 있는 탐색적 대화가 필요한 사업 기획자
- 장기 프로젝트 컨설팅이 필요한 PM

---

## 2. 사용자 스토리

### US-CC-01: 대화 저장
> **As a** AI 채팅 사용자
> **I want to** 현재 대화를 저장
> **So that** 나중에 이어서 대화할 수 있습니다

**인수 조건**:
- [ ] "저장" 버튼 클릭 시 대화 세션이 DB에 저장됨
- [ ] 세션 제목을 자동 생성하거나 사용자가 입력 가능
- [ ] 모든 메시지가 순서대로 저장됨
- [ ] 저장 성공 시 확인 메시지 표시

### US-CC-02: 대화 불러오기
> **As a** AI 채팅 사용자
> **I want to** 저장된 대화 목록에서 선택하여 불러오기
> **So that** 이전 맥락을 기억한 상태로 대화를 계속할 수 있습니다

**인수 조건**:
- [ ] 세션 목록이 최근 활동 순으로 표시됨
- [ ] 세션 클릭 시 전체 메시지 히스토리가 로드됨
- [ ] 시스템 프롬프트가 복원됨
- [ ] 불러온 세션에서 새 메시지 전송 가능

### US-CC-03: 컨텍스트 요약
> **As a** 긴 대화를 하는 사용자
> **I want to** 오래된 메시지를 자동 요약
> **So that** 토큰 비용을 절약하면서 맥락을 유지합니다

**인수 조건**:
- [ ] 메시지가 10개 이상일 때 요약 제안 표시
- [ ] "요약하기" 버튼 클릭 시 Claude API로 요약 생성
- [ ] 요약된 내용이 summary 컬럼에 저장됨
- [ ] 요약 후 오래된 메시지는 API 전송 시 제외됨

### US-CC-04: 대화 포크
> **As a** 여러 시나리오를 탐색하는 사용자
> **I want to** 특정 시점에서 대화를 분기
> **So that** 다양한 방향으로 대화를 시도할 수 있습니다

**인수 조건**:
- [ ] 메시지 옆에 "여기서 분기" 버튼 표시
- [ ] 분기 시 새 세션이 생성되고 parent_session_id가 설정됨
- [ ] fork_index로 분기 순서 추적
- [ ] 원본 세션은 유지되고 분기된 세션만 활성화됨

### US-CC-05: 대화 내보내기
> **As a** 대화 내용을 문서화하려는 사용자
> **I want to** 대화를 Markdown으로 내보내기
> **So that** 보고서나 문서에 활용할 수 있습니다

**인수 조건**:
- [ ] "내보내기" 버튼 클릭 시 Markdown 파일 다운로드
- [ ] 파일명: `conversation-{session_id}-{date}.md`
- [ ] 메시지가 role별로 구분되어 포맷팅됨
- [ ] 메타데이터 (생성일시, 모델, 토큰 수) 포함

---

## 3. 기능 요구사항

### FR-CC-01: 세션 생성
**설명**: 새로운 대화 세션을 생성합니다.

**입력**:
- title (선택, 기본값: "새 대화 {날짜}")
- system_prompt (선택, template_id로 설정 가능)
- template_id (선택, 프롬프트 템플릿 ID)

**출력**:
- session_id
- 생성 타임스탬프

**규칙**:
- 인증된 사용자만 생성 가능
- user_id는 JWT에서 자동 추출
- 초기 상태는 'active'

### FR-CC-02: 세션 목록 조회
**설명**: 사용자의 대화 세션 목록을 조회합니다.

**입력**:
- status (선택, 'active' | 'archived')
- limit (기본 20)
- offset (기본 0)

**출력**:
- sessions[] (id, title, created_at, updated_at, message_count, total_tokens)
- total_count

**규칙**:
- updated_at 내림차순 정렬
- RLS로 본인 세션만 조회

### FR-CC-03: 메시지 저장
**설명**: 대화 메시지를 DB에 저장합니다.

**입력**:
- session_id
- role ('user' | 'assistant')
- content
- token_count (선택)
- model (선택)

**출력**:
- message_id
- 저장 타임스탬프

**규칙**:
- sequence는 자동 증가 (트리거)
- assistant 메시지는 token_count, model 필수

### FR-CC-04: 메시지 조회
**설명**: 세션의 전체 메시지를 조회합니다.

**입력**:
- session_id
- limit (선택, 기본 100)
- offset (선택, 기본 0)

**출력**:
- messages[] (id, role, content, sequence, created_at)

**규칙**:
- sequence 오름차순 정렬
- 삭제되지 않은 메시지만 조회

### FR-CC-05: 컨텍스트 요약
**설명**: 오래된 메시지를 요약하여 토큰을 절약합니다.

**입력**:
- session_id
- summarize_before_sequence (선택, 기본: 최근 10개 제외)

**출력**:
- summary_text
- 요약된 메시지 개수

**규칙**:
- Claude API로 요약 생성
- summary 컬럼에 저장
- 요약된 메시지는 is_summarized = true로 표시

### FR-CC-06: 대화 포크
**설명**: 특정 시점에서 대화를 분기합니다.

**입력**:
- parent_session_id
- fork_from_sequence (분기 시작 메시지)
- new_title (선택)

**출력**:
- new_session_id
- 복사된 메시지 개수

**규칙**:
- fork_from_sequence까지 메시지 복사
- parent_session_id, fork_index 설정
- fork_index는 parent의 분기 횟수 + 1

### FR-CC-07: Markdown 내보내기
**설명**: 대화를 Markdown 파일로 내보냅니다.

**입력**:
- session_id

**출력**:
- markdown_content (string)

**규칙**:
- 메타데이터 헤더 포함
- 메시지 role별로 포맷팅
  - user: `**User**: ...`
  - assistant: `**Assistant**: ...`
- 생성일시, 모델, 토큰 수 포함

### FR-CC-08: 세션 아카이브
**설명**: 세션을 아카이브 상태로 변경합니다.

**입력**:
- session_id

**출력**:
- 성공 여부

**규칙**:
- status를 'archived'로 변경
- 삭제하지 않음 (soft delete 대신 archive)
- 아카이브된 세션도 조회 가능 (필터로 구분)

### FR-CC-09: 프롬프트 템플릿 연결
**설명**: 세션 생성 시 프롬프트 템플릿을 적용합니다.

**입력**:
- template_id

**출력**:
- 적용된 system_prompt

**규칙**:
- template_id가 있으면 템플릿의 system_prompt 사용
- 없으면 기본 프롬프트 또는 빈 값

### FR-CC-10: 토큰 사용량 추적
**설명**: 세션별 토큰 사용량을 추적합니다.

**입력**:
- session_id
- token_count (메시지 저장 시)

**출력**:
- 누적 total_tokens

**규칙**:
- 메시지 저장 시 세션의 total_tokens 자동 증가
- DB 트리거로 구현

---

## 4. 비기능 요구사항

### NFR-CC-01: 성능
- 세션 목록 조회 500ms 이내
- 메시지 100개 로딩 1초 이내
- 페이지네이션으로 대량 메시지 처리

### NFR-CC-02: 확장성
- Tool Use 설정 저장 가능 (미래 대비)
- RAG 설정 저장 가능 (미래 대비)
- metadata JSONB 컬럼으로 유연성 확보

### NFR-CC-03: 보안
- RLS로 본인 대화만 접근
- 세션 공유 기능은 Phase 2에서 구현

### NFR-CC-04: 사용성
- 세션 제목 자동 생성 (첫 메시지 기반)
- 로딩 상태 표시
- 에러 메시지 명확하게 표시

### NFR-CC-05: 데이터 무결성
- 메시지 sequence 중복 방지
- 세션 삭제 시 메시지도 삭제 (CASCADE)
- 트랜잭션으로 일관성 보장

---

## 5. 데이터 모델 (개요)

### 5.1 conversation_sessions 테이블
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- title (text)
- system_prompt (text)
- template_id (uuid, FK → prompt_templates)
- status ('active' | 'archived')
- total_tokens (integer)
- parent_session_id (uuid, 자기 참조)
- fork_index (integer)
- summary (text, 요약본)
- metadata (jsonb, Tool Use/RAG 설정)
- created_at, updated_at

### 5.2 conversation_messages 테이블
- id (uuid, PK)
- session_id (uuid, FK → conversation_sessions)
- role ('user' | 'assistant' | 'system')
- content (text)
- sequence (integer, 메시지 순서)
- token_count (integer)
- model (text)
- is_summarized (boolean)
- metadata (jsonb, Tool Use 결과 등)
- created_at

---

## 6. 우선순위

| 우선순위 | 기능 | 이유 |
|---------|------|------|
| P0 | 세션 CRUD | 핵심 기능 |
| P0 | 메시지 저장/조회 | 핵심 기능 |
| P1 | 컨텍스트 요약 | 비용 절감 |
| P1 | 내보내기 | 실용성 |
| P2 | 포크 | 고급 기능 |

---

## 7. 제약사항

### 7.1 기술적 제약
- Supabase RLS 정책 필수
- Edge Function에서 세션 로딩 시 100개 메시지 제한
- 요약 기능은 Claude API 호출 (추가 비용)

### 7.2 비즈니스 제약
- 무료 사용자는 세션 10개 제한 (미래)
- 유료 사용자는 무제한

### 7.3 보안 제약
- 세션 공유는 Phase 2에서 구현
- 민감 정보 필터링 필요 (미래)

---

## 8. 참고 자료

- **관련 문서**:
  - [Claude API Integration Spec](../requirements.md)
  - [Prompt Templates Spec](../prompt-templates/requirements.md)

- **외부 참고**:
  - [Claude API Documentation](https://docs.anthropic.com/)
  - [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-25 | 초기 작성 | Claude |
