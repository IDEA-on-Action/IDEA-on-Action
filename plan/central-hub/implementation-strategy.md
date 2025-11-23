# Central Hub 구현 전략

> 단계별 구현 순서와 우선순위

**작성일**: 2025-11-23
**버전**: 1.0.0
**관련 명세**: [requirements.md](../../spec/central-hub/requirements.md)
**관련 설계**: [architecture.md](architecture.md)

---

## 1. 구현 단계 개요

```
Phase 1 ──────────── Phase 2 ──────────── Phase 3
웹훅 수신 인프라      MCP 통합 확대         실시간 대시보드
(✅ 완료)             (다음 단계)           (향후)

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ DB 테이블    │    │ MCP 클라이언트│    │ 상태 대시보드 │
│ Edge Function│ →  │ 권한 캐싱    │ →  │ 알림 시스템  │
│ React 훅    │    │ 4개 서비스   │    │ 통계 차트   │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 2. Phase 1: 웹훅 수신 인프라 (✅ 완료)

**목표**: 외부 Minu 서비스로부터 이벤트를 수신하는 기반 구축

### 구현 순서

| 순서 | 작업 | 이유 | 상태 |
|------|------|------|------|
| 1 | DB 테이블 생성 | 데이터 저장소 먼저 | ✅ 완료 |
| 2 | Edge Function 생성 | 수신 엔드포인트 | ✅ 완료 |
| 3 | TypeScript 타입 | 타입 안정성 | ✅ 완료 |
| 4 | React 훅 | 프론트엔드 연동 | ✅ 완료 |

### 산출물

```
supabase/migrations/
├── 20251123100000_create_service_events.sql
├── 20251123100001_create_service_issues.sql
└── 20251123100002_create_service_health.sql

supabase/functions/
└── receive-service-event/index.ts

src/types/
└── central-hub.types.ts

src/hooks/
├── useServiceEvents.ts
├── useServiceIssues.ts
└── useServiceHealth.ts
```

### 검증 완료

- [x] Edge Function 배포 성공
- [x] HMAC 서명 검증 동작
- [x] DB 저장 확인
- [x] RLS 정책 확인

---

## 3. Phase 2: MCP 통합 확대 (다음 단계)

**목표**: 모든 Minu 서비스 페이지에서 일관된 권한 관리

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | MCPProtected HOC 생성 | 2시간 | - |
| 2 | useMCPPermission 훅 | 1시간 | 1 |
| 3 | MinuFramePage 적용 | 1시간 | 1, 2 |
| 4 | MinuBuildPage 적용 | 1시간 | 1, 2 |
| 5 | MinuKeepPage 적용 | 1시간 | 1, 2 |
| 6 | 권한 캐싱 구현 | 1시간 | 1, 2 |
| 7 | E2E 테스트 | 2시간 | 3, 4, 5, 6 |

### 예상 산출물

```
src/components/mcp/
├── MCPProtected.tsx        # 권한 확인 HOC
├── MCPPermissionContext.tsx # 권한 컨텍스트
└── MCPFallback.tsx          # 접근 거부 UI

src/hooks/
├── useMCPClient.ts          # MCP 클라이언트 훅
└── useMCPPermission.ts      # 권한 확인 훅

src/pages/services/
├── MinuFramePage.tsx        # MCP 적용
├── MinuBuildPage.tsx        # MCP 적용
└── MinuKeepPage.tsx         # MCP 적용
```

### 성공 기준

- [ ] 모든 Minu 페이지에서 구독 확인
- [ ] 권한 없을 시 적절한 Fallback UI
- [ ] 권한 정보 5분 캐싱
- [ ] E2E 테스트 통과

---

## 4. Phase 3: 실시간 대시보드 (향후)

**목표**: 관리자가 모든 서비스 상태를 한눈에 파악

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | 상태 대시보드 UI | 3시간 | Phase 1 |
| 2 | Realtime 구독 연동 | 2시간 | 1 |
| 3 | 이슈 관리 UI | 3시간 | Phase 1 |
| 4 | 알림 시스템 연동 | 2시간 | 3 |
| 5 | 통계 차트 | 2시간 | 1 |
| 6 | E2E 테스트 | 2시간 | 1-5 |

### 예상 산출물

```
src/pages/admin/
└── ServiceDashboard.tsx     # 메인 대시보드

src/components/admin/dashboard/
├── ServiceHealthCard.tsx    # 서비스별 헬스 카드
├── EventTimeline.tsx        # 이벤트 타임라인
├── IssueList.tsx            # 이슈 목록
├── IssueDetail.tsx          # 이슈 상세
└── ServiceStats.tsx         # 통계 차트
```

---

## 5. 기술 결정 사항

### 5.1 웹훅 인증 방식

**결정**: HMAC-SHA256 + Timestamp 검증

**이유**:
- 업계 표준 (GitHub, Stripe 등)
- 리플레이 공격 방지
- 서비스별 개별 시크릿으로 격리

### 5.2 실시간 통신 방식

**결정**: Supabase Realtime (PostgreSQL Changes)

**이유**:
- 기존 인프라 활용
- 별도 WebSocket 서버 불필요
- RLS 정책 자동 적용

### 5.3 권한 캐싱 전략

**결정**: React Query + 5분 TTL

**이유**:
- 기존 패턴과 일관성
- 불필요한 API 호출 감소
- 자동 캐시 무효화

---

## 6. 리스크 및 대응

### 6.1 기술적 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Edge Function 콜드 스타트 | 첫 요청 지연 | 웜업 전략 |
| Realtime 연결 끊김 | UI 동기화 실패 | 재연결 로직 |
| DB 과부하 | 응답 지연 | 인덱스 최적화 |

### 6.2 비즈니스 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Minu 서비스 미완성 | 연동 불가 | 목 서버로 테스트 |
| 웹훅 포맷 변경 | 호환성 깨짐 | 버전 관리 |
| 구독 시스템 변경 | 권한 로직 수정 | 추상화 레이어 |

---

## 7. 테스트 전략

### 7.1 단위 테스트

- HMAC 서명 검증 함수
- 페이로드 파싱 함수
- 권한 확인 로직

### 7.2 통합 테스트

- Edge Function → DB 저장
- Realtime 이벤트 전파
- MCP 권한 확인 플로우

### 7.3 E2E 테스트

- 웹훅 수신 전체 플로우
- 대시보드 UI 동작
- 권한별 접근 제어

---

## 8. 배포 전략

### 8.1 Phase별 배포

| Phase | 환경 | 검증 기간 |
|-------|------|----------|
| Phase 1 | Production | 1주 |
| Phase 2 | Staging → Production | 3일 |
| Phase 3 | Staging → Production | 3일 |

### 8.2 롤백 계획

- Edge Function: 이전 버전으로 재배포
- DB 마이그레이션: 롤백 SQL 준비
- 프론트엔드: Vercel 이전 배포로 롤백

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 (Phase 1 완료 반영) | Claude |
