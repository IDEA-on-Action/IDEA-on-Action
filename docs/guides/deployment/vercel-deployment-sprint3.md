# Vercel 배포 가이드 - Sprint 3 완료

> Version 2.0 Sprint 3 완료 후 프로덕션 배포 가이드

**작성일**: 2025-11-14
**대상 환경**: Production (www.ideaonaction.ai)
**배포 방식**: GitHub Actions 자동 배포 (main 브랜치 푸시 시)

---

## 📋 배포 전 체크리스트

### 1. 코드 변경사항 확인

- [x] Task 3.5: Playwright E2E 테스트 작성 (55개)
- [x] Task 3.6: SEO 최적화 (sitemap, robots.txt, JSON-LD)
  - sitemap.xml 동적 생성 (15개 URL)
  - JSON-LD 구조화 데이터 (Organization, Person, Article)
  - robots.txt 검증

### 2. 빌드 검증

```bash
npm run build
# ✅ Build successful (21.97s)
# Total: 122 entries (3.3 MB precached)
```

### 3. 환경 변수 확인

**필수 환경 변수** (Vercel Dashboard → Settings → Environment Variables):

#### Supabase
```
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

#### OAuth Providers
```
# Google
VITE_GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_CLIENT_SECRET]

# GitHub
VITE_GITHUB_CLIENT_ID=[YOUR_CLIENT_ID]

# Kakao
VITE_KAKAO_CLIENT_ID=[YOUR_CLIENT_ID]
```

#### AI & Analytics
```
# OpenAI (AI Chatbot)
VITE_OPENAI_API_KEY=[YOUR_API_KEY]
VITE_OPENAI_MODEL=gpt-4o

# Google Analytics 4
VITE_GA4_MEASUREMENT_ID=G-GCEBTH0LX4
```

#### Payment Gateway (Test Mode)
```
VITE_KAKAO_PAY_CID=TC0ONETIME
VITE_KAKAO_PAY_ADMIN_KEY=[YOUR_ADMIN_KEY]
VITE_TOSS_CLIENT_KEY=[YOUR_CLIENT_KEY]
VITE_TOSS_SECRET_KEY=[YOUR_SECRET_KEY]
```

#### Email Service
```
RESEND_API_KEY=[YOUR_API_KEY]
RESEND_DOMAIN_KEY=[YOUR_DOMAIN_KEY]
```

---

## 🚀 배포 절차

### 방법 1: GitHub Actions 자동 배포 (권장)

1. **main 브랜치에 푸시**
   ```bash
   git add .
   git commit -m "feat: Version 2.0 Sprint 3 완료 - SEO 최적화 및 테스트"
   git push origin main
   ```

2. **GitHub Actions 워크플로우 확인**
   - 접속: https://github.com/IDEA-on-Action/idea-on-action/actions
   - 워크플로우: "Deploy to Production"
   - 상태 확인: ✅ 성공 / ❌ 실패

3. **배포 완료 확인**
   - 배포 URL: https://www.ideaonaction.ai/
   - 예상 소요 시간: 2-3분

### 방법 2: Vercel CLI 수동 배포

```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 로그인
vercel login

# 프로덕션 배포
vercel --prod

# 배포 URL 확인
# Production: https://www.ideaonaction.ai deployed to production
```

---

## ✅ 배포 후 검증

### 1. 기본 기능 확인

- [ ] 홈페이지 로딩 (https://www.ideaonaction.ai/)
- [ ] SEO 메타태그 확인 (개발자 도구 → Elements)
- [ ] JSON-LD 스키마 확인 (개발자 도구 → head → script[type="application/ld+json"])
- [ ] sitemap.xml 접근 (https://www.ideaonaction.ai/sitemap.xml)
- [ ] robots.txt 접근 (https://www.ideaonaction.ai/robots.txt)

### 2. 주요 페이지 테스트

| 페이지 | URL | 확인사항 |
|--------|-----|----------|
| Home | / | Hero, Services, Features 렌더링 |
| About | /about | Person JSON-LD, 회사 정보 |
| Roadmap | /roadmap | 로드맵 데이터 로딩 |
| Portfolio | /portfolio | 프로젝트 목록 |
| Lab | /lab | 바운티 목록 |
| Blog | /blog | 블로그 목록 |
| Services | /services | 서비스 목록 |
| Status | /status | 메트릭 표시 |

### 3. SEO 검증

**Google Search Console 확인**:
```
1. Google Search Console 접속
   https://search.google.com/search-console

2. sitemap 제출
   - URL: https://www.ideaonaction.ai/sitemap.xml
   - 상태: "제출됨" 확인

3. 색인 생성 요청
   - URL 검사 도구 사용
   - 주요 페이지 색인 요청
```

**JSON-LD 검증**:
```
1. Google Rich Results Test
   https://search.google.com/test/rich-results

2. Schema.org Validator
   https://validator.schema.org/

3. 확인 페이지:
   - Home: Organization + WebSite 스키마
   - About: Person 스키마
   - BlogPost: Article 스키마
```

### 4. 성능 측정

**Lighthouse 프로덕션 측정**:
```bash
# Chrome DevTools → Lighthouse
# URL: https://www.ideaonaction.ai/

# 또는 CLI
npx lighthouse https://www.ideaonaction.ai/ --view
```

**예상 성능** (Vercel CDN):
- Performance: 75-85점 (로컬 44점 → +31-41점 향상 예상)
- Accessibility: 95+점
- Best Practices: 90+점
- SEO: 90+점

### 5. 기능 테스트

**인증 & 관리자**:
- [ ] Google/GitHub OAuth 로그인
- [ ] 관리자 페이지 접근 (/admin)
- [ ] 서비스 CRUD 동작

**커뮤니티**:
- [ ] Giscus 댓글 시스템
- [ ] Newsletter 구독 폼

**결제 (테스트 모드)**:
- [ ] Kakao Pay 결제 플로우
- [ ] Toss Payments 결제 플로우

---

## 🔄 롤백 계획

### 긴급 롤백 필요 시

1. **Vercel Dashboard 롤백**
   ```
   1. Vercel Dashboard 접속
      https://vercel.com/ideaonaction/idea-on-action

   2. Deployments 탭 이동

   3. 이전 배포 선택 → "Promote to Production" 클릭
   ```

2. **Git 롤백**
   ```bash
   # 이전 커밋으로 롤백
   git log --oneline -10  # 커밋 해시 확인
   git reset --hard <commit-hash>
   git push --force origin main

   # 또는 revert (커밋 히스토리 유지)
   git revert HEAD
   git push origin main
   ```

### 롤백 트리거 조건

- [ ] 빌드 실패 (500 에러)
- [ ] 주요 기능 완전 동작 불가
- [ ] SEO 메타태그 누락으로 검색 노출 차단
- [ ] OAuth 인증 완전 실패
- [ ] 보안 취약점 발견

---

## 📊 Sprint 3 완료 통계

### 코드 변경
- **파일 수정**: 5개
  - src/lib/json-ld.ts (신규)
  - src/pages/Index.tsx (JSON-LD 추가)
  - src/pages/About.tsx (JSON-LD 추가)
  - src/pages/BlogPost.tsx (JSON-LD 추가)
  - public/sitemap.xml (재생성)

### 테스트
- **E2E 테스트**: 55개 작성 (목표 20개의 275%)
  - journey-1-visitor.spec.ts (9개)
  - journey-2-collaborator.spec.ts (10개)
  - journey-3-fan.spec.ts (11개)
  - work-with-us.spec.ts (14개)
  - newsletter.spec.ts (11개, 기존)

- **Vitest 단위 테스트**: 35개 (기존 133개 → 168개 총)

### SEO 개선
- **sitemap.xml**: 15개 URL (12개 정적 + 3개 동적)
- **JSON-LD**: 5개 스키마 유틸리티
- **robots.txt**: 검증 완료

### 빌드 통계
- **빌드 시간**: 21.97초
- **번들 크기**: 3.3 MB (precached)
- **Main bundle**: 357.66 KB → 108.97 KB gzip
- **PWA**: 122 entries cached

---

## 📝 배포 후 작업

### 즉시
- [ ] Google Search Console에 sitemap 제출
- [ ] 주요 페이지 색인 요청
- [ ] GA4 데이터 수집 확인

### 24시간 이내
- [ ] Lighthouse 프로덕션 성능 측정
- [ ] Sentry 에러 모니터링 확인
- [ ] 실사용자 피드백 수집

### 1주일 이내
- [ ] Google Search Console 색인 상태 확인
- [ ] GA4 이벤트 트래킹 데이터 분석
- [ ] 성능 개선 이슈 트래킹 (Performance 75+ 목표)

---

## 🚨 알려진 이슈

### Performance (로컬 측정 기준)
- **Home**: 44점 (목표 75점)
- **Services**: 51점 (목표 75점)
- **Login**: 53점 (목표 75점)

**원인**: vendor-react.js (1.2MB) 번들 크기
**해결 방안**:
1. Vercel CDN을 통한 자동 최적화 (예상 +31-41점)
2. React Query data 사전 로딩
3. 이미지 최적화 (next/image 패턴 적용)
4. Code splitting 추가 개선

**프로덕션 재측정 필요**: 배포 후 실제 성능 확인

---

## 📞 문제 발생 시

**배포 실패**:
- GitHub Actions 로그 확인
- Vercel Dashboard 로그 확인
- 환경 변수 누락 여부 체크

**런타임 에러**:
- Sentry Dashboard 확인 (https://sentry.io/)
- Vercel Runtime Logs 확인
- Browser Console 에러 확인

**성능 이슈**:
- Lighthouse 상세 리포트 확인
- Vercel Analytics 확인
- Bundle Analyzer 실행

---

**Last Updated**: 2025-11-14
**Status**: ✅ Ready to Deploy
**Approver**: Sinclair Seo

---
