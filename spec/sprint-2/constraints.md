# Sprint 2 제약사항 (Constraints)
## Supabase Integration & Community

> **요구사항**: [requirements.md](./requirements.md)와 연계
> **목적**: 구현 시 반드시 준수해야 할 기술적/비즈니스적 제약사항 정의

**작성일**: 2025-11-14
**Sprint**: 2 / 3
**상태**: 📋 Draft

---

## 📖 목차

1. [기술적 제약사항](#기술적-제약사항)
2. [비즈니스 제약사항](#비즈니스-제약사항)
3. [외부 의존성](#외부-의존성)
4. [규제 및 정책](#규제-및-정책)
5. [품질 기준](#품질-기준)

---

## 🔧 기술적 제약사항

### TECH-1: 기존 기술 스택 유지

**제약**: Sprint 2는 기존 기술 스택을 **변경하지 않고** 확장만 수행

**기존 스택** (CLAUDE.md 기준):
- **빌드 도구**: Vite 5.4.19
- **프레임워크**: React 18.x
- **언어**: TypeScript 5.x (Strict Mode)
- **스타일링**: Tailwind CSS 3.4.x
- **UI 라이브러리**: shadcn/ui, Radix UI
- **상태 관리**: React Query (서버), Zustand (클라이언트)
- **라우팅**: React Router DOM
- **테스트**: Playwright (E2E), Vitest (Unit)

**적용 방법**:
- ✅ 새 라이브러리 추가 가능 (예: 댓글 위젯, 폼 라이브러리)
- ❌ 기존 라이브러리 제거 금지
- ❌ 프레임워크 변경 금지 (Next.js 전환 등)

---

### TECH-2: TypeScript Strict Mode

**제약**: 모든 코드는 TypeScript **Strict Mode** 준수

**필수 규칙**:
- `strictNullChecks`: true
- `noImplicitAny`: true
- `noUnusedLocals`: true
- `noUnusedParameters`: true

**적용 방법**:
- 모든 함수 파라미터와 리턴 타입 명시
- `any` 타입 사용 금지 (`unknown` 권장)
- Optional 체이닝 사용 (`user?.name`)
- Null 체크 필수

**예시**:
```typescript
// ❌ Bad
function getProject(id) {
  return fetch(`/api/projects/${id}`).then(res => res.json())
}

// ✅ Good
async function getProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) {
    throw new Error('Project not found')
  }
  return res.json() as Promise<Project>
}
```

---

### TECH-3: 데이터베이스 선택

**제약**: 데이터베이스는 **Supabase PostgreSQL** 사용 (변경 불가)

**이유**:
- 이미 Phase 1-14에서 Supabase 기반으로 구축됨
- RLS (Row Level Security) 정책이 설정되어 있음
- Vercel 배포 환경과 통합됨

**적용 방법**:
- 새 테이블 생성 시 마이그레이션 파일 작성 (`supabase/migrations/`)
- RLS 정책 필수 설정
- 인덱스 최적화 (자주 조회되는 컬럼)

---

### TECH-4: 댓글 시스템 선택

**제약**: 댓글 시스템은 **Giscus** (GitHub Discussions 기반) 사용

**이유**:
- CLAUDE.md 로드맵에 명시됨
- 자체 개발 대비 빠른 구축 가능
- GitHub 계정 기반 인증 (추가 회원가입 불필요)
- 오픈소스 (무료)

**적용 방법**:
- Giscus 설정: GitHub Discussions 활성화
- React 컴포넌트로 임베드 (`@giscus/react`)
- 다크 모드 테마 동기화

**제한사항**:
- GitHub 계정이 없는 사용자는 댓글 불가 (읽기만 가능)
- 댓글 데이터는 GitHub Discussions에 저장 (자체 DB 아님)

---

### TECH-5: 폼 라이브러리

**제약**: 폼 관리는 **React Hook Form + Zod** 사용 (기존 Admin 폼과 동일)

**이유**:
- Phase 8에서 이미 ServiceForm에 사용 중
- 일관된 폼 검증 방식 유지
- 타입 안전성 (Zod 스키마 → TypeScript 타입 자동 생성)

**적용 방법**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const workWithUsSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  brief: z.string().min(50, '최소 50자 이상 입력해주세요')
})

type WorkWithUsForm = z.infer<typeof workWithUsSchema>

const { register, handleSubmit, formState: { errors } } = useForm<WorkWithUsForm>({
  resolver: zodResolver(workWithUsSchema)
})
```

---

### TECH-6: API 통신

**제약**: Supabase 클라이언트 라이브러리 (`@supabase/supabase-js`) 직접 사용

**이유**:
- 기존 코드베이스와 일관성 유지
- RLS 정책 자동 적용
- Real-time 구독 기능 내장

**적용 방법**:
- `src/lib/supabase.ts`의 `supabase` 클라이언트 사용
- React Query 훅으로 래핑 (`useProjects`, `useRoadmap` 등 참고)
- 에러 핸들링: `handleSupabaseError` 유틸 함수 사용

---

### TECH-7: 빌드 크기 제한

**제약**: 번들 크기 증가는 **+50KB gzip 이하**로 제한

**현재 상태** (Phase 14 기준):
- Total: ~602 KB gzip
- Main bundle: 108.16 KB gzip

**목표** (Sprint 2 후):
- Total: <652 KB gzip
- Main bundle: <120 KB gzip

**적용 방법**:
- Code Splitting 적용 (React.lazy)
- 댓글 위젯은 별도 chunk로 분리
- Tree Shaking 최적화
- 번들 분석 (`npm run build` 후 크기 확인)

---

## 💼 비즈니스 제약사항

### BIZ-1: 일정

**제약**: Sprint 2는 **5 영업일 (1주)** 내 완료

**마감일**: 2025-11-21 (목요일) 17:00 KST

**일정 분배**:
- Day 1-2: Supabase 스키마 & 데이터 연동 (P0)
- Day 3: Giscus 댓글 통합 (P1)
- Day 4: Work with Us 폼 & Newsletter (P2, P3)
- Day 5: 테스트 & 문서화 & QA

**리스크**:
- 외부 의존성 (Giscus, Resend) 설정 지연 가능
- RLS 정책 디버깅 시간 소요 예상
- 댓글 위젯 스타일링 조정 시간 필요

**완화 방안**:
- Day 0 (오늘): 외부 서비스 사전 설정 (Giscus, Resend 계정)
- RLS 정책 템플릿 재사용 (Phase 10-11 참고)
- 스타일링은 기본 테마만 적용 (커스터마이징 최소화)

---

### BIZ-2: 예산

**제약**: 외부 서비스 비용은 **월 $0** (무료 티어만 사용)

**무료 티어 확인**:
- **Giscus**: 완전 무료 (GitHub Discussions 기반)
- **Resend**: 무료 티어 (월 3,000 이메일)
- **Beehiiv**: 무료 티어 (구독자 2,500명)
- **Supabase**: 무료 티어 (500MB DB, 1GB Bandwidth)

**적용 방법**:
- 이메일 발송량 모니터링 (월 3,000개 제한)
- 뉴스레터 구독자 수 추적 (2,500명 제한)
- 유료 전환 시점: 구독자 2,000명 도달 시 검토

---

### BIZ-3: 리소스

**제약**: 개발자 1명 (Full-time), AI 협업 (Claude Code)

**시간 분배**:
- 개발: 5일 × 8시간 = 40시간
- 테스트: 5시간
- 문서화: 3시간
- QA & 배포: 2시간

**우선순위 조정**:
- P0 (동적 콘텐츠): 필수 완료
- P1 (댓글): 필수 완료
- P2 (Work with Us): 일정 압박 시 간소화 (이메일 필드만)
- P3 (Newsletter): 일정 압박 시 Sprint 3으로 연기

---

## 🌐 외부 의존성

### EXT-1: Giscus (댓글 시스템)

**의존성**: GitHub Discussions API

**제약사항**:
- GitHub 계정 필수 (비회원 댓글 불가)
- GitHub Discussions가 활성화된 public 리포지토리 필요
- API Rate Limit: 5,000 requests/hour (인증됨)

**설정 요구사항**:
- GitHub 리포지토리: `IDEA-on-Action/idea-on-action`
- Discussions 카테고리: "Community", "Blog Comments"
- Giscus App 설치: https://github.com/apps/giscus

**리스크**:
- GitHub Discussions가 다운되면 댓글 기능 중단
- API Rate Limit 초과 시 일시적 차단

**완화 방안**:
- 에러 발생 시 "댓글을 불러올 수 없습니다" 메시지 표시
- Rate Limit 모니터링 (Giscus 자체 처리)

---

### EXT-2: Resend (이메일 발송)

**의존성**: Resend API

**제약사항**:
- 무료 티어: 월 3,000 이메일
- 발송 도메인 검증 필요 (ideaonaction.ai)
- API Key 보안 관리 (환경변수)

**설정 요구사항**:
- Resend 계정 생성: https://resend.com/
- 도메인 DNS 설정 (SPF, DKIM, DMARC)
- API Key 발급 → GitHub Secrets 등록

**리스크**:
- 도메인 검증 지연 (DNS 전파 24-48시간)
- 이메일 발송 실패 (스팸 필터링)

**완화 방안**:
- 도메인 검증은 Sprint 시작 전 완료 (Day 0)
- 이메일 발송 실패 시 관리자 대시보드에 로그 남기기
- 사용자에게는 성공 메시지 표시 (비동기 발송)

---

### EXT-3: Beehiiv (뉴스레터 플랫폼)

**의존성**: Beehiiv API 또는 위젯

**제약사항**:
- 무료 티어: 구독자 2,500명
- 주간 발송 제한: 무제한 (무료 티어)
- 임베드 위젯 또는 API 통합 선택

**설정 요구사항**:
- Beehiiv 계정: https://www.beehiiv.com/
- 위젯 코드 복사 또는 API Key 발급

**리스크**:
- 구독자 2,500명 초과 시 유료 전환 필요

**완화 방안**:
- 구독자 수 모니터링 (Admin 대시보드)
- 2,000명 도달 시 유료 플랜 검토

---

## 📜 규제 및 정책

### REG-1: 개인정보보호법 (한국)

**제약**: 이메일 주소 수집 시 **동의 절차** 필수

**적용 방법**:
- 뉴스레터 구독 폼에 체크박스 추가:
  - "개인정보 수집 및 이용에 동의합니다" (필수)
- 개인정보 처리방침 페이지 링크 제공
- 구독 취소 링크 이메일에 포함

**개인정보 항목**:
- 수집 항목: 이메일 주소
- 이용 목적: 뉴스레터 발송
- 보유 기간: 구독 취소 시까지
- 제3자 제공: 없음 (Resend는 '위탁'으로 명시)

---

### REG-2: GDPR (유럽)

**제약**: EU 방문자를 위한 **GDPR 준수**

**적용 방법**:
- 쿠키 동의 배너 (기존 구현 확인 필요)
- 개인정보 삭제 요청 기능 (이메일 문의 시 수동 처리)
- 데이터 이동권 (CSV 내보내기로 대응)

**리스크**:
- GDPR 미준수 시 최대 €20M 또는 매출 4% 벌금

**완화 방안**:
- 개인정보 처리방침에 GDPR 조항 추가
- 쿠키는 필수 쿠키만 사용 (분석 쿠키는 동의 후)

---

### REG-3: 스팸 방지법

**제약**: 이메일 마케팅 시 **수신 동의** 필수

**적용 방법**:
- Double Opt-in (이메일 인증) 권장 (Optional)
- 구독 취소 링크 모든 이메일에 포함
- 발신자 정보 명시: "IDEA on Action <newsletter@ideaonaction.ai>"

---

## 🎯 품질 기준

### QA-1: 성능

**제약**: Lighthouse Performance 점수 **90 이상** 유지

**측정 지표**:
- **FCP** (First Contentful Paint): <1.5초
- **LCP** (Largest Contentful Paint): <2.5초
- **CLS** (Cumulative Layout Shift): <0.1
- **TTI** (Time to Interactive): <3.5초

**적용 방법**:
- 이미지 최적화 (WebP, Lazy Loading)
- Code Splitting (댓글 위젯, 폼 라이브러리)
- CDN 캐싱 (Vercel Edge Network)

**리스크**:
- 댓글 위젯 로딩으로 LCP 증가 가능

**완화 방안**:
- 댓글 섹션은 스크롤 후 Lazy Load
- Giscus iframe은 viewport 진입 시 로드

---

### QA-2: 보안

**제약**: OWASP Top 10 취약점 **제로**

**필수 방어**:
1. **XSS**: 사용자 입력 이스케이프 (React 자동 처리)
2. **SQL Injection**: Supabase ORM 사용 (Raw Query 금지)
3. **CSRF**: SameSite 쿠키, CSRF 토큰
4. **Rate Limiting**: IP별 요청 제한 (Vercel Edge Functions)
5. **Sensitive Data Exposure**: 환경변수로 API Key 관리

**적용 방법**:
- 환경변수: `VITE_` 접두사 (클라이언트), Secret Key는 서버만
- HTTPS 강제 (Vercel 기본 설정)
- Supabase RLS 정책 강화

---

### QA-3: 접근성

**제약**: WCAG 2.1 AA 준수, Lighthouse Accessibility **95 이상**

**필수 항목**:
- 폼 필드에 `<label>` 연결
- 에러 메시지에 `aria-live="polite"`
- 키보드 네비게이션 (Tab, Enter, Esc)
- 색상 대비 (Contrast Ratio) 4.5:1 이상
- 스크린 리더 지원 (alt, aria-label)

**적용 방법**:
- shadcn/ui 컴포넌트 사용 (기본 접근성 내장)
- 테스트: `npx lighthouse <URL> --only-categories=accessibility`

---

### QA-4: 호환성

**제약**: 다음 브라우저에서 정상 동작

**지원 브라우저**:
- Chrome/Edge: 최신 2개 버전
- Firefox: 최신 2개 버전
- Safari: 최신 2개 버전 (iOS 포함)
- Samsung Internet: 최신 버전

**비지원**:
- IE 11 (단종됨)

**테스트 방법**:
- Playwright 크로스 브라우저 테스트
- BrowserStack (필요 시)

---

### QA-5: 반응형

**제약**: 다음 뷰포트에서 레이아웃 깨짐 없음

**테스트 뷰포트**:
- **Mobile**: 375px (iPhone SE)
- **Tablet**: 768px (iPad)
- **Desktop**: 1920px (Full HD)

**적용 방법**:
- Tailwind CSS 반응형 클래스 (`sm:`, `md:`, `lg:`)
- 터치 타겟 최소 44x44px
- 가로 스크롤 금지

---

## ✅ 제약사항 준수 체크리스트

Sprint 2 완료 시 다음 체크리스트를 **모두** 확인해야 합니다:

### 기술적 제약
- [ ] TECH-1: 기존 기술 스택 유지 (React, Vite, TypeScript)
- [ ] TECH-2: TypeScript Strict Mode 준수
- [ ] TECH-3: Supabase PostgreSQL 사용
- [ ] TECH-4: Giscus 댓글 시스템 사용
- [ ] TECH-5: React Hook Form + Zod 사용
- [ ] TECH-6: Supabase 클라이언트 라이브러리 사용
- [ ] TECH-7: 번들 크기 +50KB 이하

### 비즈니스 제약
- [ ] BIZ-1: 5 영업일 내 완료
- [ ] BIZ-2: 외부 서비스 무료 티어 사용
- [ ] BIZ-3: 개발자 1명 + AI 협업

### 외부 의존성
- [ ] EXT-1: Giscus 설정 완료
- [ ] EXT-2: Resend 도메인 검증 완료
- [ ] EXT-3: Beehiiv 계정 설정 완료

### 규제/정책
- [ ] REG-1: 개인정보 수집 동의 절차
- [ ] REG-2: GDPR 조항 추가
- [ ] REG-3: 이메일 수신 동의 & 구독 취소 링크

### 품질 기준
- [ ] QA-1: Lighthouse Performance 90+
- [ ] QA-2: OWASP Top 10 취약점 제로
- [ ] QA-3: Lighthouse Accessibility 95+
- [ ] QA-4: 주요 브라우저 호환성
- [ ] QA-5: 375px ~ 1920px 반응형

---

## 📝 제약사항 예외 처리

### 예외 승인 프로세스

만약 제약사항을 **위반**해야 하는 경우:

1. **사유 문서화**: 왜 제약사항을 지킬 수 없는지 명확히 기록
2. **대안 제시**: 제약사항을 우회하는 최선의 방법
3. **리스크 평가**: 위반으로 인한 영향 분석
4. **승인 요청**: 프로젝트 리더 (Sinclair Seo) 승인

### 예외 사례 (예시)

**상황**: Giscus 대신 자체 댓글 시스템 구축 고려
- **사유**: GitHub 계정 없는 사용자 배제
- **대안**: Supabase 기반 자체 댓글 시스템
- **리스크**: 개발 시간 +3일, 스팸 방지 필요
- **결정**: ❌ 거부 (일정 초과, Sprint 2 범위 벗어남)

---

**문서 변경 이력**:
- 2025-11-14: 초안 작성 (v1.0)
