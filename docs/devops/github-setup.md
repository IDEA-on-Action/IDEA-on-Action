# GitHub 저장소 설정 가이드

> VIBE WORKING 프로젝트의 GitHub Repository 설정 방법

**업데이트**: 2025-10-12
**저장소**: https://github.com/IDEA-on-Action/IdeaonAction-Homepage

---

## 📋 개요

### 설정 목표
- 브랜치 보호 규칙 적용
- CI/CD 자동화
- 팀 협업 환경 구성
- Vercel 연동

---

## 🌳 브랜치 생성

### 1. staging 브랜치 생성

**현재 상태**: main, develop만 존재

**생성 방법**:
```bash
# 로컬에서
git checkout main
git pull origin main
git checkout -b staging
git push origin staging
```

**또는 GitHub에서**:
1. Repository → Branches
2. "New branch" 클릭
3. Branch name: `staging`
4. Source: `main`
5. "Create branch"

---

## 🛡️ 브랜치 보호 규칙 설정

### 1. main 브랜치 보호

**경로**: Repository → Settings → Branches → Add rule

**Branch name pattern**: `main`

**설정**:
```yaml
✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ❌ Require review from Code Owners (선택)

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Status checks (추가 필요):
      - CI: Lint & Type Check
      - CI: Build

✅ Require linear history

❌ Allow force pushes (절대 금지!)
❌ Allow deletions (절대 금지!)
```

**적용 방법**:
1. Settings → Branches
2. "Add rule" 클릭
3. Branch name pattern: `main`
4. 위 설정 체크
5. "Create" 클릭

---

### 2. staging 브랜치 보호

**Branch name pattern**: `staging`

**설정**:
```yaml
✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Status checks:
      - CI: Lint & Type Check
      - CI: Build

⚠️ Allow force pushes
   ✅ Specify who can force push
      - Repository administrators

❌ Allow deletions
```

---

### 3. develop 브랜치 보호

**Branch name pattern**: `develop`

**설정**:
```yaml
✅ Require status checks to pass before merging
   Status checks:
      - CI: Lint & Type Check
      - CI: Build

⚠️ Allow force pushes
   ✅ Specify who can force push
      - Repository administrators
```

---

## 🔐 GitHub Secrets 설정

### Vercel 연동용 Secrets

**경로**: Repository → Settings → Secrets and variables → Actions

**필요한 Secrets**:

#### 1. VERCEL_TOKEN
```
값: Vercel Personal Access Token
획득 방법:
  1. Vercel Dashboard → Settings → Tokens
  2. "Create Token" 클릭
  3. Token name: "GitHub Actions"
  4. Scope: "Full Access" (또는 해당 프로젝트만)
  5. "Create" 클릭
  6. Token 복사 (한 번만 표시됨!)
```

#### 2. VERCEL_ORG_ID
```
값: Vercel Organization ID
획득 방법:
  1. 로컬에서 `vercel link` 실행
  2. .vercel/project.json 파일 열기
  3. "orgId" 값 복사
```

#### 3. VERCEL_PROJECT_ID
```
값: Vercel Project ID
획득 방법:
  1. 로컬에서 `vercel link` 실행
  2. .vercel/project.json 파일 열기
  3. "projectId" 값 복사
```

**추가 방법**:
1. Repository → Settings
2. Secrets and variables → Actions
3. "New repository secret" 클릭
4. Name 입력 (예: `VERCEL_TOKEN`)
5. Value 입력
6. "Add secret" 클릭

---

## ⚙️ GitHub Actions 설정

### Workflow 파일 위치
```
.github/
└── workflows/
    ├── ci.yml                        # CI 파이프라인
    ├── deploy-production.yml         # Production 배포
    └── deploy-staging.yml            # Staging 배포
```

### Status Checks 활성화

**브랜치 보호 규칙에 추가**:
1. Settings → Branches → main (Edit)
2. "Require status checks to pass" 활성화
3. Status checks 검색:
   - `CI: Lint & Type Check`
   - `CI: Build`
4. 선택 후 Save

**주의**: Workflow가 최소 1회 실행되어야 검색 가능

---

## 👥 협업자 권한 설정

### 팀원 추가

**경로**: Repository → Settings → Collaborators and teams

**권한 레벨**:
- **Admin**: 저장소 설정 변경 가능
- **Write**: Push, PR Merge 가능
- **Read**: 읽기 전용

**추천 설정**:
```
대표자 (서민원): Admin
핵심 개발자: Write
외부 기여자: Read
```

**추가 방법**:
1. Settings → Collaborators
2. "Add people" 클릭
3. GitHub 사용자명 또는 이메일 입력
4. 권한 선택
5. "Add to this repository"

---

## 🔔 알림 설정

### GitHub Notifications

**경로**: 개인 Settings → Notifications

**추천 설정**:
```yaml
Watching:
  ✅ Pull requests
  ✅ Issues
  ✅ Releases

Participating:
  ✅ Pull request reviews
  ✅ Pull request pushes

@mentions:
  ✅ Comments
  ✅ Issues and pull requests
```

### Repository Watching

**Repository 페이지**:
1. "Watch" 버튼 클릭
2. "Custom" 선택
3. 알림 받을 이벤트 선택:
   - ✅ Pull requests
   - ✅ Releases
   - ❌ Issues (선택)

---

## 📋 PR Template 설정 (선택)

### Pull Request 템플릿

**파일**: `.github/PULL_REQUEST_TEMPLATE.md`

**내용**:
```markdown
## 📝 변경 사항

<!-- 이 PR에서 변경한 내용을 간단히 설명해주세요 -->

## 🔗 관련 이슈

<!-- 관련 이슈가 있다면 링크해주세요 -->
Closes #

## ✅ 체크리스트

- [ ] 로컬에서 빌드 성공 (`npm run build`)
- [ ] Lint 통과 (`npm run lint`)
- [ ] Type Check 통과 (`npx tsc --noEmit`)
- [ ] Vercel Preview URL 확인
- [ ] 다크 모드 테스트 (해당 시)
- [ ] 모바일 반응형 확인 (해당 시)

## 📸 스크린샷 (선택)

<!-- UI 변경이 있다면 스크린샷을 첨부해주세요 -->
```

---

## 🏷️ Labels 설정 (선택)

### 추천 Labels

**경로**: Repository → Issues → Labels

**추가할 Labels**:
```yaml
Type:
  - feat: 새로운 기능 (#0366d6)
  - fix: 버그 수정 (#d73a4a)
  - docs: 문서 (#0075ca)
  - style: 스타일 변경 (#cfd3d7)
  - refactor: 리팩토링 (#fbca04)
  - test: 테스트 (#28a745)
  - chore: 기타 (#fef2c0)

Priority:
  - priority: high (#d93f0b)
  - priority: medium (#fbca04)
  - priority: low (#0e8a16)

Status:
  - status: in progress (#1d76db)
  - status: blocked (#b60205)
  - status: needs review (#ededed)
```

---

## 🔍 브랜치 규칙 검증

### 테스트 방법

**main 브랜치 보호 테스트**:
```bash
# 1. 직접 Push 시도 (실패해야 정상)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: branch protection"
git push origin main
# ❌ Error: Protected branch

# 2. PR을 통한 Merge (성공해야 정상)
git checkout -b test/branch-protection
git push origin test/branch-protection
# GitHub에서 PR 생성 → Merge
# ✅ Success
```

**CI 체크 테스트**:
```bash
# 1. 빌드 실패하는 코드 작성
# 2. PR 생성
# 3. CI 실패 확인
# 4. Merge 불가 확인
```

---

## 📚 설정 완료 체크리스트

### 필수 설정
- [ ] staging 브랜치 생성
- [ ] main 브랜치 보호 규칙 설정
- [ ] staging 브랜치 보호 규칙 설정
- [ ] develop 브랜치 보호 규칙 설정
- [ ] GitHub Secrets 추가 (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] GitHub Actions Workflows 추가 (ci.yml, deploy-*.yml)
- [ ] Status Checks 활성화

### 선택 설정
- [ ] 협업자 추가 및 권한 설정
- [ ] 알림 설정
- [ ] PR Template 추가
- [ ] Labels 설정
- [ ] 브랜치 규칙 검증

---

## 🚨 트러블슈팅

### 문제 1: Status Check가 표시되지 않음

**원인**: Workflow가 한 번도 실행되지 않음

**해결**:
1. `.github/workflows/` 파일 Push
2. PR 생성하여 Workflow 실행
3. 실행 후 Settings → Branches에서 Status Check 검색

### 문제 2: Vercel 배포 실패

**원인**: GitHub Secrets 미설정 또는 잘못됨

**해결**:
1. Settings → Secrets 확인
2. VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID 재확인
3. Vercel Dashboard에서 Token 재생성
4. GitHub Actions 재실행

### 문제 3: Branch Protection 우회 가능

**원인**: 관리자는 기본적으로 규칙 무시 가능

**해결**:
1. Settings → Branches → Rule (Edit)
2. "Include administrators" 체크
3. Save

---

## 📖 관련 문서

- [브랜치 전략](branch-strategy.md) - Git 브랜치 관리
- [배포 가이드](deployment-guide.md) - Vercel 배포
- [배포 체크리스트](deployment-checklist.md) - 배포 전후 확인

### 외부 문서
- [GitHub Branch Protection 문서](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)

---

**Last Updated**: 2025-10-12
**Repository**: IdeaonAction-Homepage
