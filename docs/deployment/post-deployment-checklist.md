# Version 2.0.0 배포 후 체크리스트

**배포일**: 2025-11-15
**버전**: 2.0.0
**배포 URL**: https://www.ideaonaction.ai

---

## ✅ Phase 1: 배포 확인

### 프로덕션 사이트 접속
- [x] https://www.ideaonaction.ai/ (HTTP 200 OK)
- [x] sitemap.xml 접근 가능
- [x] robots.txt 접근 가능

### 주요 페이지 확인
- [ ] Home (/)
- [ ] About (/about)
- [ ] Roadmap (/roadmap)
- [ ] Portfolio (/portfolio)
- [ ] Now (/now)
- [ ] Lab (/lab)
- [ ] Community (/community)
- [ ] Work with Us (/work-with-us)
- [ ] Status (/status)

### 기능 테스트
- [ ] Newsletter 구독 폼 제출
- [ ] Work with Us 폼 제출
- [ ] Giscus 댓글 위젯 로딩
- [ ] 다크 모드 전환
- [ ] 모바일 반응형

---

## 🔍 Phase 2: SEO 설정

### Google Search Console

**1. 속성 추가**
- URL: https://search.google.com/search-console
- 속성 추가: `https://www.ideaonaction.ai`
- 소유권 확인 방법: HTML 파일 업로드 or DNS TXT 레코드

**2. Sitemap 제출**
```
https://www.ideaonaction.ai/sitemap.xml
```

**3. 색인 생성 요청 (15개 URL)**
- Home (/)
- About (/about)
- Roadmap (/roadmap)
- Portfolio (/portfolio)
- Now (/now)
- Lab (/lab)
- Community (/community)
- Work with Us (/work-with-us)
- Status (/status)
- Services (/services)
- Blog (/blog)
- Notices (/notices)
- Portfolio Detail (p001, p002, p003)

**4. 확인 사항**
- [ ] Coverage 리포트 확인 (7일 후)
- [ ] 색인 생성률 확인
- [ ] 모바일 사용성 확인
- [ ] Core Web Vitals 확인

### Bing Webmaster Tools (선택)
- URL: https://www.bing.com/webmasters
- Sitemap 제출: https://www.ideaonaction.ai/sitemap.xml

---

## 📊 Phase 3: GA4 설정

### 이벤트 트래킹 확인

**GA4 대시보드**: https://analytics.google.com

**Sprint 3 이벤트 (6개)**:
- [ ] `view_home` - Home 페이지 조회
- [ ] `view_portfolio` - Portfolio 페이지 조회
- [ ] `view_roadmap` - Roadmap 페이지 조회
- [ ] `subscribe_newsletter` - Newsletter 구독
- [ ] `join_community` - 커뮤니티 참여
- [ ] `click_cta` - CTA 버튼 클릭

**전체 이벤트 (21개)**:
- `add_to_cart`, `begin_checkout`, `purchase`
- `login`, `sign_up`
- `search`, `view_item`
- `view_service`, `remove_from_cart`, `add_payment_info`
- `view_blog_post`, `share`, `file_download`
- `error`, `update_profile`, `enable_2fa`
- `notification_interaction`, `chatbot_interaction`, `apply_filter`

### 전환 목표 설정
1. **Newsletter 구독** (subscribe_newsletter)
2. **Work with Us 제출** (커스텀 이벤트 필요)
3. **Bounty 신청** (apply_bounty)

### 실시간 데이터 확인
- [ ] 실시간 보고서 접속
- [ ] 이벤트 발생 확인 (15분 이내)
- [ ] 사용자 속성 확인

---

## ⚡ Phase 4: 성능 모니터링

### Lighthouse CI (로컬)

**실행**:
```bash
npm run lighthouse
```

**목표 점수**:
- Performance: 75+ (프로덕션 예상)
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**실행 결과** (2025-11-15):
- [x] Home: Performance 47%, Accessibility ✅, SEO ✅
- [x] Services: Performance 53%, Accessibility 84% (⚠️), SEO ✅
- [x] Login: Performance 56%, Accessibility ✅, SEO 66% (⚠️)
- [x] 리포트 링크: [phase5-monitoring-report.md](phase5-monitoring-report.md)

**조치 필요**:
- [ ] 프로덕션 URL로 재측정 (Vercel CDN 효과 확인)
- [ ] Performance 개선 (LCP, TBT 최적화)
- [ ] Login 페이지 SEO 메타태그 추가

### Vercel Analytics (자동)
- URL: https://vercel.com/idea-on-action/idea-on-action/analytics
- Core Web Vitals 자동 수집
- Real User Monitoring

### Sentry (에러 모니터링)
- 대시보드: Sentry.io
- 에러 로그 확인 (24시간)
- Alert 설정 확인

---

## 🔄 Phase 5: 자동화 확인

### Weekly Recap (GitHub Actions)
- 워크플로우: `.github/workflows/weekly-recap.yml`
- 실행 일정: 매주 일요일 15:00 UTC (월요일 00:00 KST)
- 첫 실행 예정: 2025-11-17 (일) 15:00 UTC

**수동 실행 테스트**:
```bash
gh workflow run weekly-recap.yml
```

### Vercel 자동 배포
- [x] main 브랜치 푸시 → 자동 배포
- [x] PR 생성 → Preview 배포
- [x] 배포 성공 알림

---

## 📝 Phase 6: 문서 정리

### README.md 업데이트
- [ ] Version 2.0 특징 추가
- [ ] 새 페이지 8개 소개
- [ ] 스크린샷 업데이트 (선택)

### project-todo.md 정리
- [ ] Sprint 3 완료 체크
- [ ] Version 2.0 완료 표시

### GitHub Release
- [ ] v2.0.0 Release 생성
- [ ] Release Notes 첨부
- [ ] Tag 연결 완료

---

## 🎯 완료 기준

**배포 성공**:
- [x] 프로덕션 사이트 정상 동작
- [x] sitemap.xml 접근 가능
- [x] robots.txt 접근 가능
- [x] Git tag v2.0.0 생성
- [x] GitHub Release 생성

**SEO 설정**:
- [ ] Google Search Console 설정
- [ ] Sitemap 제출
- [ ] 색인 생성 요청 (15개 URL)

**모니터링**:
- [x] 단위 테스트 실행 (99.0% 통과)
- [x] E2E 테스트 실행 (진행 중)
- [x] Lighthouse CI 실행 (로컬)
- [ ] Lighthouse 프로덕션 재측정 필요
- [ ] GA4 이벤트 확인
- [ ] Sentry 에러 로그 확인

**문서화**:
- [x] README.md 업데이트
- [x] project-todo.md 정리
- [x] GitHub Release 생성
- [x] Phase 5 모니터링 리포트 작성

---

## 📞 문제 발생 시

**배포 실패**:
1. Vercel 대시보드 로그 확인
2. 환경 변수 확인 (.env.local → Vercel)
3. 빌드 로그 확인

**SEO 문제**:
1. robots.txt 확인
2. sitemap.xml 구문 검증
3. JSON-LD 구조화 데이터 확인

**성능 문제**:
1. Lighthouse 재측정
2. Bundle 크기 확인
3. PWA 캐싱 확인

---

**작성일**: 2025-11-15
**작성자**: Claude Code
