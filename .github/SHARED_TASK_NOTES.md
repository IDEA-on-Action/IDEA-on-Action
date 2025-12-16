# Continuous Claude 공유 작업 노트

> 반복 간 진행 상황 전달을 위한 공유 메모

**마지막 업데이트**: 2025-12-17
**현재 버전**: v2.37.8

---

## 현재 목표

v2.38.0 준비 - Newsletter 고도화 및 컨텐츠 버전 관리

---

## 완료된 작업

### v2.37.8 (2025-12-17)

- [x] receive-service-event 하이브리드 인증 구현
  - JWT Bearer 토큰 인증 (mcp-auth 발급)
  - HMAC-SHA256 서명 검증 (기존 웹훅 방식)
  - jwt-verify.ts 유틸리티 생성
- [x] BaseEvent 스키마 지원 추가
  - @idea-on-action/events 패키지 형식 지원
  - Legacy 웹훅 형식과 호환
  - normalizePayload() 함수로 두 스키마 정규화
- [x] 토큰 갱신 엔드포인트 확인
  - POST /functions/v1/mcp-auth/refresh
  - Access Token: 15분, Refresh Token: 7일
  - Token Rotation 보안 정책 적용

### v2.37.7 (2025-12-17)

- [x] 토스페이먼츠 라이브 결제 키 환경변수 설정
- [x] Supabase Secrets 업데이트 (TOSS_PAYMENTS_SECRET_KEY, TOSS_SECRET_KEY)

### v2.37.6 (2025-12-15)

- [x] MCP Auth 서비스 토큰 시스템 설정
  - Supabase Secrets 설정: WEBHOOK_SECRET_MINU_FIND, MCP_JWT_SECRET
  - service_tokens, mcp_audit_log 테이블 생성
  - mcp-auth Edge Function CORS 버그 수정 및 재배포
  - 서비스 토큰 발급 스크립트 생성 (scripts/generate-service-token.cjs)
  - .env.example, .env.local 환경 변수 문서화

### v2.37.5 (2025-12-15)

- [x] Minu 서비스 Inbound 이벤트 시스템 구현
  - receive-service-event: minu-portal 추가, 9개 이벤트 타입 라우팅
  - mcp-router: 8개 라우팅 규칙 추가
  - inbound-events.types.ts: 타입 정의 생성
  - usage-tracker.ts: 사용량 집계 헬퍼 생성
- [x] Edge Functions 배포 완료 (receive-service-event, mcp-router)

### v2.37.1 (2025-12-15)

- [x] Continuous Claude 워크플로우 설정
- [x] 컨텍스트 파일 생성
- [x] Fast Refresh 경고 해결
- [x] 버전 동기화 및 릴리스

---

## 진행 중인 작업

(없음)

---

## 실패한 시도

(없음)

---

## 다음 우선순위

1. Newsletter 자동 발송 스케줄링 (Edge Function)
2. 컨텐츠 버전 관리 시스템 (content_versions 테이블)
3. 구독자 세그멘테이션

---

## 메모

- project-todo.md 참조하여 우선순위 높은 항목 처리
- 린트 에러 0개, 빌드 성공 유지 필수
- 테스트 커버리지 확대 지속
- Minu Find 서비스 토큰 발급 완료 - Vercel 환경 변수 설정 필요
