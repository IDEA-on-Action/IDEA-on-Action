# Continuous Claude 공유 작업 노트

> 반복 간 진행 상황 전달을 위한 공유 메모

**마지막 업데이트**: 2025-12-15
**현재 버전**: v2.37.5

---

## 현재 목표

v2.38.0 준비 - Newsletter 고도화 및 컨텐츠 버전 관리

---

## 완료된 작업

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
4. Supabase Secret 설정: WEBHOOK_SECRET_MINU_PORTAL (운영팀에서 설정 필요)

---

## 메모

- project-todo.md 참조하여 우선순위 높은 항목 처리
- 린트 에러 0개, 빌드 성공 유지 필수
- 테스트 커버리지 확대 지속
- Minu Portal webhook secret은 Supabase Dashboard에서 직접 설정 필요
