# 사이트 재구조화 성공 기준

> 각 요구사항의 검증 방법과 성공 기준

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft

---

## 1. 메뉴 구조 검증

### AC-001: 메뉴 5개로 단순화
- [ ] Header.tsx에 5개 메뉴만 표시됨
- [ ] 메뉴 순서: 홈, 서비스, 프로젝트, 이야기, 함께하기
- [ ] 모바일 햄버거 메뉴에도 동일하게 적용
- [ ] 모든 메뉴 클릭 시 해당 페이지로 이동

### AC-002: 기존 URL 리디렉션
- [ ] `/about` → `/` (홈) 301 리디렉션
- [ ] `/roadmap` → `/projects?tab=roadmap` 301 리디렉션
- [ ] `/portfolio` → `/projects` 301 리디렉션
- [ ] `/lab` → `/projects?tab=lab` 301 리디렉션
- [ ] `/work-with-us` → `/connect` 301 리디렉션
- [ ] `/blog` → `/stories/blog` 301 리디렉션
- [ ] `/notices` → `/stories/notices` 301 리디렉션
- [ ] `/community` → `/connect/community` 301 리디렉션

---

## 2. 홈 페이지 검증 (`/`)

### AC-010: 3초 정체성 전달
- [ ] Hero 섹션에 슬로건 "생각을 멈추지 않고, 행동으로 옮깁니다" 표시
- [ ] 주요 CTA 버튼 1개 이상 존재 (서비스 보기 또는 문의하기)
- [ ] 스크롤 없이 핵심 메시지 확인 가능 (Above the fold)

### AC-011: 서비스 요약 섹션
- [ ] Development Services 4개 카드 표시
- [ ] Minu Platform 4개 카드 표시
- [ ] 각 카드에 서비스명, 한줄 설명, 가격 범위 표시
- [ ] 카드 클릭 시 상세 페이지로 이동

### AC-012: 진행중 프로젝트 섹션
- [ ] 최대 3개 프로젝트 표시
- [ ] 각 프로젝트에 진척률 Progress Bar 표시
- [ ] 상태 배지 (진행중/검증/출시) 표시
- [ ] "더 보기" 링크 → `/projects` 이동

### AC-013: 최근 소식 섹션
- [ ] 최대 3개 소식 표시 (블로그/Changelog 통합)
- [ ] 각 소식에 제목, 날짜, 카테고리 표시
- [ ] "더 보기" 링크 → `/stories` 이동

### AC-014: 뉴스레터 CTA
- [ ] 이메일 입력 폼 표시
- [ ] 구독 버튼 동작 확인
- [ ] 성공/실패 토스트 메시지 표시

---

## 3. 서비스 페이지 검증 (`/services`)

### AC-020: 서비스 목록
- [ ] 2개 카테고리 탭 표시 (Development / Minu)
- [ ] Development 탭: MVP, 풀스택, 디자인, 운영 4개 서비스
- [ ] Minu 탭: Find, Frame, Build, Keep 4개 서비스
- [ ] 각 서비스 카드에 가격 정보 명시

### AC-021: 서비스 상세 페이지
- [ ] `/services/mvp` 접근 가능
- [ ] `/services/fullstack` 접근 가능
- [ ] `/services/design` 접근 가능
- [ ] `/services/operations` 접근 가능
- [ ] `/services/minu/find` 접근 가능
- [ ] `/services/minu/frame` 접근 가능
- [ ] `/services/minu/build` 접근 가능
- [ ] `/services/minu/keep` 접근 가능

### AC-022: 가격 표시 (토스페이먼츠 요건)
- [ ] 모든 서비스에 가격 또는 가격 범위 표시
- [ ] 부가세 포함/별도 명시
- [ ] 구매/구독 CTA 버튼 존재

---

## 4. 프로젝트 페이지 검증 (`/projects`)

### AC-030: 통합 프로젝트 목록
- [ ] 4개 탭 표시: 진행중 / 출시됨 / 실험중 / 로드맵
- [ ] 기본 탭: 진행중
- [ ] 탭 전환 시 URL 쿼리 파라미터 변경 (`?tab=`)

### AC-031: 프로젝트 카드
- [ ] 프로젝트명 표시
- [ ] 한줄 설명 표시
- [ ] 진척률 Progress Bar (0-100%)
- [ ] 상태 배지 (진행중/검증/출시/대기)
- [ ] 기술 스택 태그
- [ ] GitHub 연동 정보 (커밋 수, 기여자 수)

### AC-032: 로드맵 탭
- [ ] 분기별 필터 (Q1, Q2, Q3, Q4)
- [ ] 각 분기 테마, 설명, 진행률 표시
- [ ] 마일스톤 목록 표시

### AC-033: 실험실 탭
- [ ] 바운티 목록 표시
- [ ] 각 바운티 보상금, 난이도, 마감일 표시
- [ ] 지원하기 버튼 동작

---

## 5. 이야기 페이지 검증 (`/stories`)

### AC-040: 이야기 허브
- [ ] 4개 섹션 네비게이션: 블로그 / 뉴스레터 / Changelog / 공지사항
- [ ] 각 섹션 최근 게시물 3개 미리보기

### AC-041: 블로그 (`/stories/blog`)
- [ ] WordPress 연동 포스트 목록 표시
- [ ] 카테고리/태그 필터 동작
- [ ] 검색 기능 동작
- [ ] 포스트 상세 페이지 접근 가능

### AC-042: 뉴스레터 아카이브 (`/stories/newsletter`)
- [ ] 발송된 뉴스레터 목록 표시
- [ ] 각 뉴스레터 제목, 발송일, 미리보기 표시
- [ ] 상세 보기 클릭 시 전체 내용 표시

### AC-043: Changelog (`/stories/changelog`)
- [ ] 릴리즈 노트 목록 표시
- [ ] 버전, 날짜, 변경사항 요약 표시
- [ ] 프로젝트별 필터 가능

### AC-044: 공지사항 (`/stories/notices`)
- [ ] 기존 공지사항 기능 유지
- [ ] 목록/상세 페이지 동작

---

## 6. 함께하기 페이지 검증 (`/connect`)

### AC-050: 함께하기 허브
- [ ] 3개 섹션 표시: 프로젝트 문의 / 채용 / 커뮤니티
- [ ] 각 섹션 설명 및 CTA

### AC-051: 프로젝트 문의 (`/connect/inquiry`)
- [ ] 기존 WorkWithUs 폼 이전
- [ ] 폼 제출 동작 확인
- [ ] 성공 메시지 표시

### AC-052: 채용 (`/connect/careers`)
- [ ] 바운티 목록 연동 (실험실 데이터)
- [ ] 채용 공고 표시 (있는 경우)
- [ ] 지원하기 기능 동작

### AC-053: 커뮤니티 (`/connect/community`)
- [ ] 기존 커뮤니티 페이지 이전
- [ ] 기능 동일하게 동작

---

## 7. 실시간 동기화 검증

### AC-060: GitHub 연동
- [ ] 프로젝트에 GitHub 정보 표시 (커밋 수)
- [ ] 24시간 내 데이터 갱신

### AC-061: 진척률 자동 계산
- [ ] 마일스톤 기반 진척률 계산 동작
- [ ] Progress Bar에 실시간 반영

### AC-062: 릴리즈 알림
- [ ] GitHub Release 시 Changelog 자동 업데이트
- [ ] 관리자 알림 (선택적)

---

## 8. 성능 검증

### AC-070: Lighthouse 점수
- [ ] Performance: 90+
- [ ] Accessibility: 90+
- [ ] Best Practices: 90+
- [ ] SEO: 90+

### AC-071: Core Web Vitals
- [ ] LCP: 2.5s 이하
- [ ] FID: 100ms 이하
- [ ] CLS: 0.1 이하

### AC-072: 번들 크기
- [ ] 초기 번들 400KB gzip 이하
- [ ] 이전 대비 10% 이상 증가하지 않음

---

## 9. 접근성 검증

### AC-080: WCAG 2.1 AA
- [ ] 색상 대비 4.5:1 이상
- [ ] 모든 이미지에 alt 텍스트
- [ ] 폼 요소 레이블 연결
- [ ] 키보드 네비게이션 가능
- [ ] 포커스 표시 명확

### AC-081: 스크린 리더
- [ ] 주요 랜드마크 (header, main, nav, footer) 존재
- [ ] 제목 계층 구조 올바름 (h1 → h2 → h3)
- [ ] ARIA 레이블 적절히 사용

---

## 10. SEO 검증

### AC-090: 메타 태그
- [ ] 각 페이지 title 태그 고유
- [ ] 각 페이지 meta description 존재
- [ ] Open Graph 태그 설정

### AC-091: 구조화된 데이터
- [ ] Organization JSON-LD
- [ ] Service JSON-LD
- [ ] Article JSON-LD (블로그)

### AC-092: sitemap.xml
- [ ] 새로운 URL 구조 반영
- [ ] 리디렉션 URL 제외

---

## 검증 방법

1. **수동 테스트**: 각 AC 항목 체크리스트 확인
2. **E2E 테스트**: Playwright 자동화 테스트
3. **Lighthouse**: Chrome DevTools 또는 CI
4. **접근성 도구**: axe-core, WAVE
5. **SEO 도구**: Google Search Console, ahrefs

---

## 관련 문서

- [requirements.md](./requirements.md) - 요구사항
- [constraints.md](./constraints.md) - 제약사항
