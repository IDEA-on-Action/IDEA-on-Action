# Closed Beta 준비 실행 계획

> Minu 서비스 Closed Beta 런칭을 위한 종합 실행 계획

**버전**: 1.0.0
**작성일**: 2025-11-28
**방법론**: SSDD (Skillful Spec-Driven Development)
**상태**: ✅ Stage 1~3 완료, Stage 4 진행 중

---

## 개요

### 목표

Minu 서비스의 **안정적인 Closed Beta 런칭**을 위해 4가지 핵심 영역 개선:

1. **브랜치 전략**: Production 안정성 보장
2. **환경 분리**: 테스트/프로덕션 격리
3. **결제 시스템**: 구독 결제 완성
4. **초대 시스템**: Beta 사용자 관리

### 현재 상태 vs 목표 상태

| 영역 | 현재 상태 | 목표 상태 | 진행률 |
|------|----------|----------|--------|
| 브랜치 | main 직접 커밋 | PR 필수 + 리뷰 | 80% |
| 환경 | 단일 Supabase | 3개 분리 | 60% |
| 결제 | 클라이언트만 | 백엔드 API 완성 | 0% |
| 가입 | 누구나 가능 | 초대 토큰 필수 | 0% |

---

## SSDD 진행 현황

### Stage 1: Specify (명세) ✅ 완료

| 명세서 | 상태 |
|--------|------|
| 브랜치 전략 | ✅ 완료 |
| 환경 분리 | ✅ 완료 |
| 결제 API | ✅ 완료 |
| 초대 시스템 | ✅ 완료 |

### Stage 2: Plan (설계) ✅ 완료

| 아키텍처 | 상태 |
|----------|------|
| 브랜치 아키텍처 | ✅ 완료 |
| 환경 아키텍처 | ✅ 완료 |
| 결제 API 아키텍처 | ✅ 완료 |
| 초대 시스템 아키텍처 | ✅ 완료 |

### Stage 3: Tasks (작업 분해) ✅ 완료

| 스프린트 | 작업 수 | 기간 |
|----------|--------|------|
| Sprint 1: 인프라 | 12개 | 5일 |
| Sprint 2: 기능 | 23개 | 7일 |

### Stage 4: Implement (구현) 🚧 진행 중

#### Sprint 1 진행 현황

| TASK | 내용 | 상태 |
|------|------|------|
| INF-001 | main 브랜치 보호 규칙 | ⏳ GitHub 설정 필요 |
| INF-002 | staging 브랜치 보호 규칙 | ⏳ GitHub 설정 필요 |
| INF-003 | CODEOWNERS | ✅ 완료 |
| INF-004 | PR 템플릿 | ✅ 완료 |
| INF-005 | Supabase Staging | ⏳ 수동 생성 필요 |
| INF-006 | 환경 변수 분리 | ✅ 완료 |
| INF-007 | Vercel 설정 | ✅ 완료 |
| INF-008 | CI 워크플로우 | ✅ 완료 |
| INF-009 | Deploy 워크플로우 | ✅ 완료 |
| INF-010 | 마이그레이션 동기화 | ⏳ Staging 후 |
| INF-011 | 통합 테스트 | ⏳ 대기 |
| INF-012 | 문서 업데이트 | 🚧 진행 중 |

---

## 실행 일정

### Week 1: 인프라 (Sprint 1)

```
Day 1-2: 브랜치 전략 + 환경 분리 (병렬)
Day 3-4: CI/CD 워크플로우
Day 5: 통합 검증
```

### Week 2: 기능 (Sprint 2)

```
Day 1-5: 결제 API + 초대 시스템 (병렬)
Day 6-7: 통합 테스트 + 문서화
```

---

## 수동 설정 필요 항목

### 1. GitHub 브랜치 보호 규칙

**main 브랜치**:
- Settings → Branches → Add rule → "main"
- ✅ Require pull request (1 approval)
- ✅ Require status checks
- ❌ Allow force pushes

### 2. Supabase Staging 프로젝트

- https://supabase.com/dashboard
- New Project → "idea-on-action-staging"
- Region: Seoul

### 3. Vercel 환경 변수

- Settings → Environment Variables
- Preview 환경에 Staging 값 추가

---

## 관련 문서

- [Supabase Staging 설정 가이드](../../docs/guides/supabase-staging-setup.md)
- [환경 변수 관리](../../docs/guides/env-management.md)
- [브랜치 전략](../../docs/guides/deployment/branch-strategy.md)

---

**작성자**: Claude (SSDD Agent)
**최종 수정**: 2025-11-28
