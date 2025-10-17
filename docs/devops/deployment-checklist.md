# 배포 체크리스트

> VIBE WORKING 프로젝트 배포 전후 확인사항

**업데이트**: 2025-10-12

---

## 📋 Production 배포 체크리스트

### 🔍 배포 전 (Pre-Deployment)

#### 1. 코드 품질
- [ ] ESLint 통과 (`npm run lint`)
- [ ] TypeScript 에러 없음 (`npx tsc --noEmit`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 빌드 경고 확인 및 해결

#### 2. Staging 테스트
- [ ] Staging 환경 배포 완료
- [ ] QA 테스트 완료
- [ ] 주요 사용자 플로우 테스트
  - [ ] 회원가입/로그인
  - [ ] 서비스 페이지 탐색
  - [ ] 장바구니 추가/수정/삭제 (Phase 5 이후)
  - [ ] 주문 생성 (Phase 5 이후)
  - [ ] 결제 플로우 (Phase 5 이후)

#### 3. UI/UX
- [ ] 다크 모드 전환 테스트
  - [ ] Light → Dark 전환
  - [ ] Dark → Light 전환
  - [ ] System 테마 자동 감지
- [ ] 반응형 테스트
  - [ ] Desktop (1920x1080, 1366x768)
  - [ ] Tablet (iPad, 768x1024)
  - [ ] Mobile (iPhone, 375x667)
- [ ] 브라우저 호환성
  - [ ] Chrome
  - [ ] Safari
  - [ ] Firefox
  - [ ] Edge

#### 4. 성능
- [ ] 번들 크기 확인
  - [ ] Total (gzip): 150kB 이하 권장
  - [ ] CSS: 20kB 이하 권장
  - [ ] JS: 130kB 이하 권장
- [ ] Lighthouse 점수 확인
  - [ ] Performance: 90+ 목표
  - [ ] Accessibility: 90+ 목표
  - [ ] Best Practices: 90+ 목표
  - [ ] SEO: 90+ 목표
- [ ] 이미지 최적화
  - [ ] WebP 형식 사용
  - [ ] Lazy Loading 적용
  - [ ] 적절한 이미지 크기

#### 5. 데이터베이스
- [ ] 마이그레이션 스크립트 준비 (필요 시)
- [ ] 백업 완료
- [ ] Staging 환경에서 마이그레이션 테스트

#### 6. 환경 변수
- [ ] Production 환경 변수 확인
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] VITE_ENV=production
- [ ] API 키 유효성 확인
- [ ] 외부 서비스 연동 확인
  - [ ] Supabase
  - [ ] Vercel
  - [ ] OAuth Providers (Google, GitHub, Kakao)

#### 7. 보안
- [ ] API 키 노출 확인 (소스 코드)
- [ ] CORS 설정 확인
- [ ] Rate Limiting 설정 (필요 시)
- [ ] 민감 정보 로그 제거

#### 8. 문서
- [ ] CHANGELOG.md 업데이트
- [ ] 버전 번호 업데이트 (package.json)
- [ ] 주요 변경사항 문서화

#### 9. 팀 커뮤니케이션
- [ ] 배포 일정 공지
- [ ] 주요 변경사항 공유
- [ ] 롤백 계획 확인

---

### 🚀 배포 중 (During Deployment)

#### 1. GitHub
- [ ] staging → main PR 생성
- [ ] PR 설명 작성 (주요 변경사항)
- [ ] CI 통과 확인
  - [ ] Lint & Type Check
  - [ ] Build
- [ ] 코드 리뷰 완료 (최소 1명)
- [ ] PR Merge

#### 2. Vercel
- [ ] Vercel 빌드 시작 확인
- [ ] 빌드 로그 모니터링
- [ ] 빌드 성공 확인
- [ ] Deployment URL 확인

#### 3. 배포 시간
- [ ] 예상 시간: 5-10분
- [ ] 다운타임: 없음 (Vercel zero-downtime)

---

### ✅ 배포 후 (Post-Deployment)

#### 1. 기본 동작 확인
- [ ] Production URL 접속 (www.ideaonaction.ai)
- [ ] 페이지 로딩 정상
- [ ] 콘솔 에러 없음 (F12)
- [ ] 네트워크 에러 없음

#### 2. Smoke Test
- [ ] 메인 페이지 로딩
- [ ] 헤더 네비게이션 동작
- [ ] 푸터 링크 동작
- [ ] 다크 모드 토글 동작
- [ ] 로그인/로그아웃 동작
- [ ] 주요 페이지 탐색
  - [ ] /
  - [ ] /services
  - [ ] /cart
  - [ ] /checkout

#### 3. 기능 테스트
- [ ] 인증 플로우
  - [ ] Google OAuth
  - [ ] GitHub OAuth
  - [ ] Kakao OAuth
- [ ] 서비스 페이지 (Phase 4 이후)
  - [ ] 서비스 목록 표시
  - [ ] 서비스 상세 페이지
  - [ ] 갤러리 이미지 로딩
- [ ] 장바구니 기능 (Phase 5 이후)
  - [ ] 상품 추가
  - [ ] 수량 변경
  - [ ] 상품 삭제
- [ ] 주문 기능 (Phase 5 이후)
  - [ ] 주문 생성
  - [ ] 주문 내역 조회

#### 4. 성능 모니터링
- [ ] Vercel Analytics 확인
  - [ ] Page Views
  - [ ] Response Time
  - [ ] Error Rate
- [ ] Vercel Functions 로그 확인 (있는 경우)
- [ ] Supabase 로그 확인

#### 5. 에러 모니터링
- [ ] Vercel Dashboard 에러 로그 확인
- [ ] Supabase Dashboard 에러 로그 확인
- [ ] 브라우저 콘솔 에러 확인

#### 6. SEO
- [ ] 메타 태그 확인
  - [ ] `<title>`
  - [ ] `<meta name="description">`
  - [ ] Open Graph 태그
- [ ] robots.txt 확인
- [ ] sitemap.xml 확인 (있는 경우)

#### 7. 모니터링 설정
- [ ] Vercel Analytics 활성화
- [ ] 알림 설정 (에러 발생 시)
- [ ] 성능 임계값 설정

---

### 🔙 롤백 체크리스트 (필요 시)

#### 롤백 트리거
- [ ] 심각한 버그 발견
- [ ] 주요 기능 동작 불가
- [ ] 성능 심각한 저하
- [ ] 보안 취약점 발견

#### 롤백 방법 1: Vercel Dashboard (빠름)
1. [ ] Vercel Dashboard → Deployments
2. [ ] 이전 배포 선택 (Ready 상태)
3. [ ] "..." → "Promote to Production"
4. [ ] 확인

#### 롤백 방법 2: Git Revert (권장)
1. [ ] main 브랜치에서 `git revert <commit-hash>`
2. [ ] Push to main
3. [ ] Vercel 자동 배포

#### 롤백 후
- [ ] 프로덕션 URL 확인
- [ ] 주요 기능 동작 확인
- [ ] 팀원들에게 롤백 알림
- [ ] 버그 수정 후 재배포 계획 수립

---

## 📋 Staging 배포 체크리스트

### 배포 전
- [ ] develop 브랜치 최신 상태
- [ ] CI 통과 확인
- [ ] 로컬 빌드 성공

### 배포 중
- [ ] develop → staging PR
- [ ] Merge
- [ ] Vercel 배포 확인

### 배포 후
- [ ] Staging URL 접속
- [ ] 기본 동작 확인
- [ ] QA 팀에 알림

---

## 📋 Hotfix 배포 체크리스트

### 긴급 배포 시
- [ ] main에서 hotfix 브랜치 생성
- [ ] 긴급 수정
- [ ] 빠른 테스트
- [ ] main으로 PR (Fast Track)
- [ ] 최소 리뷰 (1명, 빠르게)
- [ ] Merge & 배포
- [ ] develop에도 Merge (동기화)
- [ ] Production Smoke Test

---

## 📊 배포 후 24시간 모니터링

### 1시간 후
- [ ] 에러 로그 확인
- [ ] 트래픽 확인
- [ ] 성능 지표 확인

### 6시간 후
- [ ] 누적 에러 확인
- [ ] 사용자 피드백 확인
- [ ] 주요 지표 비교 (이전 대비)

### 24시간 후
- [ ] 전체 지표 리뷰
- [ ] 이슈 리스트 작성
- [ ] 개선 사항 도출

---

## 🚨 긴급 연락망

### 배포 관련
- **DevOps 담당**: 서민원 (010-4904-2671)
- **백엔드 담당**: TBD
- **프론트엔드 담당**: TBD

### 외부 서비스
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/dashboard/support

---

## 📝 배포 기록

### 템플릿
```markdown
## [버전] - YYYY-MM-DD HH:MM

**배포자**: 이름
**브랜치**: staging → main
**커밋**: abc1234

### 주요 변경사항
-

### 테스트 결과
- Staging: ✅
- Build: ✅
- CI: ✅

### 배포 시간
- 시작: HH:MM
- 완료: HH:MM
- 소요: X분

### 배포 후 확인
- Smoke Test: ✅
- 에러 로그: 없음
- 성능: 정상
```

---

## 📚 관련 문서

- [브랜치 전략](branch-strategy.md)
- [배포 가이드](deployment-guide.md)
- [GitHub 설정](github-setup.md)
- [CHANGELOG.md](../../project/changelog.md)

---

**Last Updated**: 2025-10-12
**Version**: 1.0
