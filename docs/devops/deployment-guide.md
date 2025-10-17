# 배포 가이드 (Deployment Guide)

> VIBE WORKING 프로젝트의 Vercel 배포 및 운영 가이드

**업데이트**: 2025-10-12
**배포 플랫폼**: Vercel

---

## 📋 개요

### 배포 환경
- **Production**: https://www.ideaonaction.ai/
- **Staging**: https://staging-ideaonaction.vercel.app
- **Development**: https://dev-ideaonaction.vercel.app

### 배포 방식
- **자동 배포**: GitHub Push 시 Vercel 자동 빌드 & 배포
- **CI/CD**: GitHub Actions 통합
- **Preview**: PR 생성 시 자동으로 Preview URL 생성

---

## 🚀 Vercel 프로젝트 설정

### 1. 프로젝트 연결

**초기 설정** (이미 완료됨):
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel link

# 프로젝트 정보
Project: ideaonaction-homepage
Org: your-org
```

### 2. Git Integration 설정

**Vercel Dashboard → Settings → Git**

```yaml
Production Branch: main
  - 자동 배포: ✅
  - 도메인: www.ideaonaction.ai

Preview Branches:
  - staging: ✅ (Custom Preview)
  - develop: ✅ (Custom Preview)
  - feature/*: ✅ (Auto Preview)
  - All other branches: ✅
```

### 3. Build & Development Settings

**Vercel Dashboard → Settings → General**

```yaml
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
Node Version: 18.x
```

---

## 🔐 환경 변수 설정

### Vercel Dashboard 설정

**Vercel Dashboard → Settings → Environment Variables**

#### Production (main 브랜치)
```bash
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[PRODUCTION_KEY]
VITE_ENV=production
```

#### Staging (staging 브랜치)
```bash
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[STAGING_KEY]
VITE_ENV=staging
```

#### Development (develop, feature/* 브랜치)
```bash
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[DEV_KEY]
VITE_ENV=development
```

### 환경 변수 추가 방법

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. "Add New" 클릭
4. Key/Value 입력
5. Environment 선택:
   - ✅ Production (main)
   - ✅ Preview (staging)
   - ✅ Preview (develop, feature/*)
6. Save

---

## 🔄 배포 프로세스

### 자동 배포 (Recommended)

#### Production 배포
```bash
# 1. staging에서 충분한 테스트 완료
# 2. GitHub에서 staging → main PR 생성
# 3. 리뷰 및 승인 (최소 1명)
# 4. Merge

# Vercel이 자동으로:
# - main 브랜치 감지
# - 빌드 시작
# - Production 배포
# - 도메인 업데이트 (www.ideaonaction.ai)
```

#### Staging 배포
```bash
# 1. develop → staging PR 생성
# 2. Merge

# Vercel이 자동으로:
# - staging 브랜치 감지
# - 빌드 시작
# - Staging Preview 배포
# - URL: staging-ideaonaction.vercel.app
```

#### Feature Preview 배포
```bash
# 1. feature 브랜치에서 작업
# 2. PR 생성 (to develop)

# Vercel이 자동으로:
# - PR 감지
# - Preview 빌드 시작
# - Preview URL 생성 (자동)
# - PR 코멘트에 URL 추가
```

---

### 수동 배포 (CLI)

#### Production 배포
```bash
# main 브랜치에서
git checkout main
git pull origin main

# Vercel 배포
vercel --prod

# 확인
vercel ls
```

#### Staging/Dev 배포
```bash
# staging 브랜치에서
git checkout staging
git pull origin staging

# Vercel Preview 배포
vercel

# URL 확인
vercel ls
```

---

## 📊 배포 상태 확인

### Vercel Dashboard

**Deployments 탭**:
- 최근 배포 목록
- 배포 상태 (Building, Ready, Error)
- 배포 시간 및 소요 시간
- 커밋 정보 및 브랜치

**Logs 확인**:
1. Deployment 클릭
2. "View Build Logs" 클릭
3. 빌드 로그 확인
4. 에러 발생 시 로그에서 원인 파악

### GitHub Actions

**GitHub → Actions 탭**:
- CI 워크플로우 상태
- Lint, Type Check, Build 결과
- 실패 시 로그 확인

---

## 🔙 롤백 (Rollback)

### Vercel Dashboard에서 롤백

**즉시 롤백** (1-Click):
1. Vercel Dashboard → Deployments
2. 이전 배포 선택 (Ready 상태)
3. "..." 메뉴 → "Promote to Production"
4. 확인

**효과**:
- 즉시 이전 버전으로 복구
- Git 히스토리 영향 없음
- 빌드 불필요 (기존 빌드 재사용)

### Git Revert로 롤백

**Git 히스토리 유지**:
```bash
# 1. main 브랜치에서
git checkout main
git pull origin main

# 2. 문제가 있는 커밋 찾기
git log --oneline

# 3. Revert 커밋 생성
git revert <commit-hash>

# 4. Push
git push origin main

# Vercel이 자동으로 배포
```

---

## 🛡️ 배포 안전 장치

### 1. Deployment Protection (Vercel Pro)

**Vercel Dashboard → Settings → Deployment Protection**

```yaml
Production:
  - Require approval: ✅ (선택)
  - Allowed users: [team-members]

Preview:
  - Password protection: ❌
  - Vercel Authentication: ❌
```

### 2. Branch Protection (GitHub)

**main 브랜치**:
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ❌ Allow force pushes

### 3. CI Checks (GitHub Actions)

**필수 체크**:
- ✅ ESLint
- ✅ TypeScript Type Check
- ✅ Build Success
- ✅ Bundle Size Check

---

## 📈 배포 모니터링

### Vercel Analytics (선택)

**실시간 모니터링**:
- Page Views
- Unique Visitors
- Top Pages
- Referrers
- Devices (Desktop/Mobile)

**활성화 방법**:
1. Vercel Dashboard → Analytics
2. "Enable Analytics"
3. 무료 플랜: 10,000 requests/month

### Build Performance

**Vercel Dashboard → Deployments**:
```
Build Time: ~5-7s (평균)
Output Size:
  - HTML: 1.23 kB
  - CSS: 70.13 kB
  - JS: 374.71 kB
  Total (gzip): 130.11 kB
```

---

## 🔧 트러블슈팅

### 문제 1: 빌드 실패

**증상**: Vercel 빌드 중 에러 발생

**해결 방법**:
```bash
# 1. 로컬에서 빌드 테스트
npm run build

# 2. 에러 발생 시 수정
npm run lint
npx tsc --noEmit

# 3. 재배포
git add .
git commit -m "fix: build error"
git push origin <branch>
```

### 문제 2: 환경 변수 누락

**증상**: 런타임에 환경 변수 undefined

**해결 방법**:
1. Vercel Dashboard → Settings → Environment Variables
2. 해당 환경에 변수 추가 확인
3. **중요**: `VITE_` prefix 확인
4. Redeploy (Vercel Dashboard → Deployments → Redeploy)

### 문제 3: 404 에러 (SPA Routing)

**증상**: 새로고침 시 404 에러

**해결 방법** (이미 적용됨):
- Vercel이 자동으로 SPA 라우팅 감지
- `index.html` fallback 자동 설정
- 추가 설정 불필요

### 문제 4: 배포 시간 지연

**원인**:
- 큰 번들 크기
- 많은 의존성
- Cold Start

**해결 방법**:
```bash
# 의존성 최적화
npm ci

# 번들 크기 분석
npm run build
npx vite-bundle-visualizer

# 불필요한 의존성 제거
npm prune
```

---

## 📝 배포 체크리스트

**배포 전 필수 확인**:
- [ ] Staging 환경 테스트 완료
- [ ] CI 모두 통과 (Lint, Type Check, Build)
- [ ] 번들 크기 확인 (150kB gzip 이하 권장)
- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 완료 (필요 시)
- [ ] PR 리뷰 완료 (main의 경우)

**배포 후 필수 확인**:
- [ ] 프로덕션 URL 정상 동작
- [ ] 주요 기능 Smoke Test
- [ ] 다크 모드 전환 테스트
- [ ] 모바일 반응형 확인
- [ ] Vercel Dashboard 에러 로그 확인

상세 체크리스트: [deployment-checklist.md](deployment-checklist.md)

---

## 🔗 Vercel CLI 명령어

### 기본 명령어
```bash
# 로그인
vercel login

# 프로젝트 정보
vercel ls

# 배포
vercel                  # Preview 배포
vercel --prod           # Production 배포

# 환경 변수 관리
vercel env ls           # 목록 확인
vercel env add          # 추가
vercel env rm           # 삭제

# 로그 확인
vercel logs <url>

# 프로젝트 정보
vercel inspect <url>
```

### 고급 명령어
```bash
# 특정 환경으로 배포
vercel --target=preview

# 빌드 캐시 무시
vercel --force

# Deployment Alias 설정
vercel alias <deployment-url> <custom-domain>
```

---

## 📚 관련 문서

- [브랜치 전략](branch-strategy.md) - Git 브랜치 관리
- [GitHub 설정](github-setup.md) - 저장소 설정 방법
- [배포 체크리스트](deployment-checklist.md) - 배포 전후 확인사항

### 외부 문서
- [Vercel 공식 문서](https://vercel.com/docs)
- [Vercel CLI 문서](https://vercel.com/docs/cli)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html#vercel)

---

**Last Updated**: 2025-10-12
**Vercel Project**: ideaonaction-homepage
