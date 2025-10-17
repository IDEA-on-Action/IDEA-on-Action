# 브랜치 전략 (Branch Strategy)

> VIBE WORKING 프로젝트의 Git 브랜치 관리 전략

**업데이트**: 2025-10-12
**전략**: GitHub Flow 기반 3-Tier 배포

---

## 📋 개요

### 목표
- 안정적인 프로덕션 배포
- 체계적인 QA 테스트 환경
- 빠른 기능 개발 및 통합
- 명확한 배포 프로세스

### 핵심 원칙
1. **main 브랜치는 항상 배포 가능한 상태**
2. **모든 변경은 PR을 통해서만**
3. **Staging에서 충분한 테스트 후 Production 배포**
4. **자동화된 CI/CD 파이프라인**

---

## 🌳 브랜치 구조

```
main (프로덕션)
  ↑
staging (스테이징/QA)
  ↑
develop (개발 통합)
  ↑
feature/* (기능 개발)
hotfix/* (긴급 수정)
```

---

## 📂 브랜치별 역할

### 1. main (프로덕션)

**역할**: 프로덕션 배포용 브랜치

**특징**:
- 항상 안정적인 상태 유지
- 직접 커밋 금지 (PR만 허용)
- Vercel Production 자동 배포
- 브랜치 보호 규칙 적용

**배포**:
- **도메인**: https://www.ideaonaction.ai/
- **자동 배포**: Vercel Production
- **환경 변수**: Production 키 사용

**보호 규칙**:
```yaml
- Require pull request reviews (최소 1명)
- Require status checks to pass (CI 통과 필수)
- Require linear history
- Do not allow force push
- Do not allow deletions
```

**Merge 조건**:
- staging 브랜치에서 충분한 테스트 완료
- 모든 CI 체크 통과
- 최소 1명 이상의 승인

---

### 2. staging (스테이징/QA)

**역할**: QA 테스트 및 검증 환경

**특징**:
- 프로덕션 배포 전 최종 검증
- develop 브랜치의 변경사항 통합
- Vercel Preview 배포 (Custom)
- PR 리뷰 권장

**배포**:
- **도메인**: https://staging-ideaonaction.vercel.app
- **자동 배포**: Vercel Preview (Staging)
- **환경 변수**: Staging 키 사용

**보호 규칙**:
```yaml
- Require status checks to pass
- Allow force push (관리자만)
```

**테스트 체크리스트**:
- [ ] 모든 기능 동작 확인
- [ ] 다크 모드 전환 테스트
- [ ] 모바일 반응형 확인
- [ ] 결제/주문 플로우 테스트 (Phase 5 이후)
- [ ] 성능 테스트 (번들 크기, 로딩 속도)

---

### 3. develop (개발 통합)

**역할**: 개발 브랜치들의 통합 지점

**특징**:
- 기본 개발 브랜치
- Feature 브랜치들이 여기로 Merge
- Vercel Preview 배포 (Custom)
- 불안정할 수 있음

**배포**:
- **도메인**: https://dev-ideaonaction.vercel.app
- **자동 배포**: Vercel Preview (Development)
- **환경 변수**: Development 키 사용

**보호 규칙**:
```yaml
- Require status checks to pass
- Allow force push (관리자만)
```

**역할**:
- Feature 브랜치들의 통합
- 개발 중인 기능들의 테스트
- Staging 배포 전 사전 검증

---

### 4. feature/* (기능 개발)

**역할**: 새로운 기능 개발용 브랜치

**명명 규칙**:
```bash
feature/phase-4-services          # Phase 4 서비스 페이지
feature/phase-5-cart              # Phase 5 장바구니
feature/dark-mode-improvements    # 다크 모드 개선
feature/payment-integration       # 결제 연동
```

**생성 방법**:
```bash
# develop에서 분기
git checkout develop
git pull origin develop
git checkout -b feature/new-feature
```

**배포**:
- **도메인**: Vercel 자동 생성 (feature-*-*.vercel.app)
- **자동 배포**: Vercel Preview (Auto)
- **PR 생성 시 자동 생성**

**워크플로우**:
1. develop에서 feature 브랜치 생성
2. 기능 개발 및 커밋
3. Vercel Preview URL에서 확인
4. develop으로 PR 생성
5. 코드 리뷰 후 Merge

**Merge 조건**:
- CI 통과 (Lint, Type Check, Build)
- 코드 리뷰 완료 (선택)
- 충돌 해결 완료

---

### 5. hotfix/* (긴급 수정)

**역할**: 프로덕션 긴급 버그 수정

**명명 규칙**:
```bash
hotfix/fix-payment-error          # 결제 오류 수정
hotfix/fix-auth-redirect          # 인증 리다이렉트 수정
hotfix/security-patch             # 보안 패치
```

**생성 방법**:
```bash
# main에서 분기 (긴급!)
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug
```

**워크플로우**:
1. main에서 hotfix 브랜치 생성
2. 긴급 수정 및 테스트
3. main으로 PR (빠른 리뷰)
4. Production 배포
5. **중요**: develop에도 Merge (동기화)

**Merge 대상**:
- **main**: 즉시 배포
- **develop**: 동기화 (수정사항 반영)

---

## 🚀 배포 워크플로우

### 일반 기능 개발 (Feature → Production)

```
1️⃣ Feature 브랜치 생성
   git checkout -b feature/new-feature develop

2️⃣ 개발 & 커밋
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature

3️⃣ Vercel Preview 자동 생성
   - PR 생성 시 자동으로 Preview URL 생성
   - 팀원들이 Preview URL에서 확인

4️⃣ PR to develop
   - GitHub에서 PR 생성
   - CI 자동 실행 (Lint, Type Check, Build)
   - 코드 리뷰 (선택)
   - develop에 Merge

5️⃣ develop → staging PR
   - 정기적으로 develop을 staging에 Merge
   - Staging 환경 자동 배포
   - QA 테스트 시작

6️⃣ staging → main PR
   - QA 완료 후 main으로 PR
   - 최종 승인 (1명 이상)
   - Production 배포

7️⃣ 배포 완료
   - Vercel Production 자동 배포
   - 프로덕션 URL에서 확인
   - Smoke Test 실행
```

---

### 긴급 수정 (Hotfix → Production)

```
1️⃣ Hotfix 브랜치 생성
   git checkout -b hotfix/fix-bug main

2️⃣ 긴급 수정 & 테스트
   git add .
   git commit -m "fix: critical bug"
   git push origin hotfix/fix-bug

3️⃣ PR to main (긴급!)
   - 빠른 리뷰 및 승인
   - CI 통과 확인
   - main에 Merge

4️⃣ Production 배포
   - Vercel 자동 배포
   - 즉시 프로덕션 반영

5️⃣ develop 동기화
   git checkout develop
   git merge main
   git push origin develop

   또는

   main → develop PR 생성
```

---

## 🔄 릴리스 프로세스

### 정기 릴리스 (주 1회 권장)

```
월요일: Feature 개발
  ↓
화요일-수요일: develop 통합
  ↓
목요일: develop → staging (QA 시작)
  ↓
금요일: staging → main (배포)
```

### 배포 타이밍
- **정기 배포**: 매주 금요일 오후
- **긴급 배포**: 필요 시 언제든지
- **Major 업데이트**: Phase 완료 시

---

## 📊 배포 환경별 설정

| 환경 | 브랜치 | Vercel | 도메인 | 환경 변수 | 용도 |
|------|--------|--------|--------|-----------|------|
| **Production** | main | Production | ideaonaction.ai | `VITE_ENV=production` | 실제 서비스 |
| **Staging** | staging | Preview | staging-*.vercel.app | `VITE_ENV=staging` | QA 테스트 |
| **Development** | develop | Preview | dev-*.vercel.app | `VITE_ENV=development` | 개발 통합 |
| **Feature** | feature/* | Preview | feature-*-*.vercel.app | `VITE_ENV=development` | 기능 개발 |

---

## 🛡️ 브랜치 보호 규칙

### main 브랜치
```yaml
보호 설정:
  ✅ Require pull request reviews (최소 1명)
  ✅ Require status checks to pass
     - CI: Lint & Type Check
     - CI: Build
  ✅ Require linear history
  ❌ Allow force pushes (절대 금지)
  ❌ Allow deletions (절대 금지)
```

### staging 브랜치
```yaml
보호 설정:
  ✅ Require status checks to pass
  ⚠️ Allow force pushes (관리자만)
  ❌ Allow deletions
```

### develop 브랜치
```yaml
보호 설정:
  ✅ Require status checks to pass
  ⚠️ Allow force pushes (관리자만)
```

---

## 🔧 Git 명령어 참고

### 브랜치 생성
```bash
# Feature 브랜치
git checkout -b feature/my-feature develop

# Hotfix 브랜치
git checkout -b hotfix/fix-bug main
```

### 브랜치 업데이트
```bash
# develop 최신 상태로 업데이트
git checkout develop
git pull origin develop

# 현재 브랜치에 develop 변경사항 반영
git checkout feature/my-feature
git merge develop
```

### PR 생성 전
```bash
# 커밋 정리
git rebase -i develop

# Push
git push origin feature/my-feature
```

### 브랜치 삭제
```bash
# 로컬 브랜치 삭제
git branch -d feature/my-feature

# 원격 브랜치 삭제
git push origin --delete feature/my-feature
```

---

## 📝 커밋 메시지 규칙

### 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 타입
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포맷팅)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/도구 변경

### 예시
```bash
feat(design): add dark mode toggle button

- Add ThemeToggle component
- Integrate useTheme hook
- Update Header with theme toggle

Closes #123
```

---

## 🚨 트러블슈팅

### 문제: Merge 충돌 발생
```bash
# develop 최신 변경사항 가져오기
git checkout develop
git pull origin develop

# feature 브랜치로 돌아가서 merge
git checkout feature/my-feature
git merge develop

# 충돌 해결 후
git add .
git commit -m "merge: resolve conflicts with develop"
git push origin feature/my-feature
```

### 문제: Vercel 배포 실패
1. GitHub Actions CI 로그 확인
2. Vercel Dashboard 로그 확인
3. 로컬에서 빌드 테스트: `npm run build`
4. 환경 변수 확인

### 문제: PR이 Merge되지 않음
1. CI 통과 확인
2. 브랜치 보호 규칙 확인
3. 충돌 해결 확인
4. 리뷰 승인 확인 (main의 경우)

---

## 📚 관련 문서

- [배포 가이드](deployment-guide.md) - 배포 절차 상세
- [GitHub 설정](github-setup.md) - 저장소 설정 방법
- [배포 체크리스트](deployment-checklist.md) - 배포 전 확인사항
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 전체 개요

---

**Last Updated**: 2025-10-12
**Strategy Version**: 1.0
