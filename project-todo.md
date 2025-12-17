# IDEA on Action 프로젝트 TODO

> 프로젝트 작업 목록 및 진행 상황 관리

**마지막 업데이트**: 2025-12-17
**현재 Phase**: v2.37.10 완료
**다음 단계**: v2.38.0 계획
**프로젝트 버전**: 2.37.10
**프로덕션**: https://www.ideaonaction.ai

---

## ✅ 완료: v2.37.10 Minu 서비스 연동 개선 (2025-12-17)

**목표**: Minu 서비스 연동 기능 점검 및 개선
**완료일**: 2025-12-17

### 작업 개요

| 작업 | 상태 | 설명 |
|------|------|------|
| 공유 상수 파일 | ✅ | `constants.ts` - JWT, 서비스 ID, Scope 통합 |
| 에러 코드 통일 | ✅ | `error-codes.ts` - 에러 코드/메시지/상태 코드 |
| 스키마 검증 | ✅ | `schemas.ts` - Zod BaseEvent/Legacy 스키마 |
| CORS 헤더 수정 | ✅ | `x-signature`, `x-service-id`, `x-timestamp` 추가 |
| Edge Function 리팩토링 | ✅ | mcp-auth, receive-service-event, jwt-verify |
| 단위 테스트 | ✅ | 81개 테스트 (constants, error-codes, schemas, security) |
| Edge Function 배포 | ✅ | mcp-auth (147.5kB), receive-service-event (209.9kB) |

---

## ✅ 완료: v2.37.9 Preview 도메인 환경 (2025-12-17)

**목표**: Preview 배포 환경 구축 및 단건결제 테스트 설정
**완료일**: 2025-12-17

### 작업 개요

| 작업 | 상태 | 설명 |
|------|------|------|
| CORS 설정 | ✅ | `preview.ideaonaction.ai` 도메인 추가 |
| Git 브랜치 설정 | ✅ | main(Production), staging(Preview), test/* |
| Vercel 환경 설정 | ✅ | 테스트키/라이브키 분리 |
| 외부 서비스 설정 | ✅ | Supabase, Google OAuth 설정 |
| Edge Functions | ✅ | 27개 함수 재배포 |

---

## ✅ 완료: v2.37.6~v2.37.8 MCP Auth 시스템 (2025-12-15~17)

**목표**: Minu 서비스 인증 토큰 시스템 및 이벤트 처리
**완료일**: 2025-12-17

### 작업 개요

| 작업 | 상태 | 설명 |
|------|------|------|
| 하이브리드 인증 | ✅ | JWT + HMAC-SHA256 지원 |
| BaseEvent 스키마 | ✅ | @idea-on-action/events 패키지 형식 |
| service_tokens 테이블 | ✅ | 서비스 토큰 저장 |
| mcp_audit_log 테이블 | ✅ | MCP API 호출 감사 로그 |
| Inbound 이벤트 | ✅ | 9개 이벤트 타입 라우팅 |

---

## ✅ 완료: v2.37.0~v2.37.5 문서 정리 및 시스템 개선 (2025-12-14~15)

**목표**: 문서 구조 개선, WordPress 연동, Continuous Claude 도입
**완료일**: 2025-12-15

### 작업 개요

| 작업 | 상태 | 설명 |
|------|------|------|
| Continuous Claude | ✅ | 자율 개발 루프 시스템 |
| WordPress 연동 | ✅ | Blog.tsx WordPress API 연동 |
| 문서 정리 | ✅ | CLAUDE.md 경량화 |
| 빌링키 디버깅 | ✅ | 토스페이먼츠 결제 안정화 |

---

## ✅ 완료: v2.35.0~v2.36.0 병렬 작업 Sprint (2025-12-09)

**목표**: RAG 검색, Minu Sandbox, 테스트 확장, 문서 자동화
**완료일**: 2025-12-09

### 품질 지표

| 지표 | 값 | 상태 |
|------|-----|------|
| 유닛 테스트 | 1880개+ | ✅ |
| E2E 테스트 | 5429개 | ✅ |
| 총 테스트 | 7309개+ | ✅ |
| 린트 경고 | 0개 | ✅ |
| 번들 크기 | ~1627 KB | ✅ |

---

## 📋 진행 중: v2.38.0 계획

### 우선순위 작업

| 우선순위 | 작업 | 상태 |
|----------|------|------|
| P0 | 토스페이먼츠 카드사 심사 완료 | 대기 |
| P0 | 단건결제 테스트 검증 | 계획 |
| P1 | Minu Find 기능 확장 | 계획 |
| P2 | AI 채팅 위젯 개선 | 백로그 |

---

## 📁 아카이브

### 이전 버전 완료 내역

v2.34.0 이전 버전의 상세 작업 내역은 아카이브로 이동되었습니다.

- **[2025년 11월 Changelog](docs/archive/changelog-2025-november.md)** - v2.0.0 ~ v2.23.0
- **[완료된 TODO 아카이브](docs/archive/completed-todos-v1.8.0-v2.0.0.md)** - Phase 1-14

### 버전 요약

| 버전 범위 | 기간 | 주요 성과 |
|----------|------|---------|
| v2.35.0~v2.37.9 | 2025-12-09~17 | MCP Auth, Preview 환경, 테스트 7309개+ |
| v2.24.0~v2.34.0 | 2025-12-01~09 | Claude Skills, Central Hub, 번들 최적화 |
| v2.0.0~v2.23.0 | 2025-11-09~30 | CMS, Minu 브랜드, 토스페이먼츠 |

---

## 📚 관련 문서

- [CLAUDE.md](CLAUDE.md) - 프로젝트 메인 문서
- [Changelog](docs/project/changelog.md) - 변경 로그
- [Roadmap](docs/project/roadmap.md) - 프로젝트 로드맵
- [Constitution](constitution.md) - 프로젝트 헌법

---

**최종 업데이트**: 2025-12-17 KST
**정리 버전**: v2.37.9
