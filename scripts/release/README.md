# 릴리스 자동화 스크립트

버전 관리 및 릴리스 자동화를 위한 스크립트입니다.

## 📦 auto-release.ts

완전 자동화된 릴리스 워크플로우를 제공합니다.

### 기본 사용법

```bash
# Patch 릴리스 (2.34.0 → 2.34.1)
npm run release:auto -- --type patch

# Minor 릴리스 (2.34.0 → 2.35.0)
npm run release:auto -- --type minor

# Major 릴리스 (2.34.0 → 3.0.0)
npm run release:auto -- --type major
```

### Dry Run 모드

실제 변경 없이 미리 확인:

```bash
npm run release:auto -- --type patch --dry-run
```

### 고급 옵션

```bash
# 테스트 생략
npm run release:auto -- --type patch --skip-tests

# Git 태그만 생략
npm run release:auto -- --type patch --skip-git-tag

# GitHub Release만 생략
npm run release:auto -- --type patch --skip-github-release

# 모든 옵션 조합
npm run release:auto -- --type minor --dry-run --skip-tests
```

## 🔄 릴리스 프로세스

### 1. 사전 확인

- Git 작업 디렉토리가 깨끗한지 확인
- 모든 변경사항이 커밋되어 있는지 확인
- 현재 브랜치가 `main`인지 확인

### 2. 자동 실행 단계

1. **Git 상태 확인**
   - 커밋되지 않은 변경사항 검사
   - Dirty working directory 방지

2. **테스트 실행** (--skip-tests로 생략 가능)
   - 린트 체크
   - 유닛 테스트 (옵션)

3. **버전 범프**
   - package.json 버전 업데이트
   - Semantic Versioning 규칙 적용

4. **CHANGELOG 업데이트**
   - Git 커밋 히스토리 파싱
   - Conventional Commits 형식 인식
   - 버전별 변경사항 그룹화

5. **Git 커밋 및 태그**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: v2.35.0 버전 릴리스"
   git tag -a v2.35.0 -m "Release v2.35.0"
   ```

6. **GitHub Release 생성**
   - 릴리스 노트 자동 생성
   - gh CLI를 통한 Release 생성
   - 커밋 타입별 그룹화 (Features, Bug Fixes 등)

### 3. 사후 작업

릴리스 스크립트 완료 후:

```bash
# 한 번에 푸시 (권장)
git push --follow-tags

# 또는 별도로
git push origin main
git push origin v2.35.0
```

## 🎯 버전 관리 전략

### Semantic Versioning

- **Major (X.0.0)**: Breaking Changes
  - API 변경으로 하위 호환성 깨짐
  - 사용자 승인 필요

- **Minor (0.X.0)**: 새로운 기능
  - 하위 호환성 유지
  - 새로운 API 추가

- **Patch (0.0.X)**: 버그 수정
  - 하위 호환성 유지
  - 버그 수정, Hotfix

### 릴리스 주기

- **Patch**: 필요 시 (버그 수정)
- **Minor**: 스프린트 종료 시 (기능 추가)
- **Major**: 분기별 또는 필요 시 (큰 변경)

## 📝 릴리스 노트 형식

자동 생성되는 릴리스 노트 예시:

```markdown
# Release 2.35.0

릴리스 날짜: 2025-12-09

## 새로운 기능

- feat: 템플릿 에디터 구현
- feat(api): OpenAPI 타입 자동 생성

## 버그 수정

- fix: 로그인 오류 해결
- fix(ui): 다크 모드 스타일 수정

## 기타 변경사항

- chore: 의존성 업데이트
- docs: README 개선
```

## 🔧 설정

### GitHub CLI 설정

```bash
# gh CLI 설치 (Windows)
winget install GitHub.cli

# 또는 (macOS)
brew install gh

# 인증
gh auth login
```

### Git 설정

```bash
# 사용자 정보 설정
git config user.name "Your Name"
git config user.email "your.email@example.com"

# GPG 서명 (선택)
git config commit.gpgsign true
```

## 🚨 트러블슈팅

### Git 작업 디렉토리가 깨끗하지 않음

```bash
# 상태 확인
git status

# 변경사항 커밋
git add .
git commit -m "chore: 릴리스 전 정리"

# 또는 stash
git stash
```

### gh CLI 인증 오류

```bash
# 토큰 확인
gh auth status

# 재인증
gh auth logout
gh auth login
```

### 태그 충돌

```bash
# 기존 태그 삭제
git tag -d v2.35.0
git push origin :refs/tags/v2.35.0

# 다시 릴리스
npm run release:auto -- --type minor
```

### package.json 버전 불일치

```bash
# 현재 버전 확인
node -p "require('./package.json').version"

# Git 태그 확인
git describe --tags --abbrev=0

# 수동 동기화
git tag -a v2.34.0 -m "Sync version"
```

## 🔄 기존 릴리스 도구와 비교

| 도구 | 자동화 수준 | 장점 | 단점 |
|------|-------------|------|------|
| `standard-version` | 중간 | 검증됨, 안정적 | 커스터마이징 어려움 |
| `semantic-release` | 높음 | CI/CD 통합 | 설정 복잡 |
| **auto-release.ts** | 중간-높음 | 프로젝트 맞춤형, 단순함 | 기능 제한적 |

### 기존 도구 유지

standard-version은 계속 사용 가능:

```bash
# standard-version 사용
npm run release:patch

# auto-release 사용
npm run release:auto -- --type patch
```

## 📚 관련 문서

- [CLAUDE.md](../../CLAUDE.md#버전-관리): 버전 관리 원칙
- [docs/guides/methodology.md](../../docs/guides/methodology.md): 개발 방법론
- [scripts/docs/README.md](../docs/README.md): 문서 자동화

## 🎓 Best Practices

1. **릴리스 전 체크리스트**
   - [ ] 모든 테스트 통과
   - [ ] 문서 업데이트
   - [ ] 변경사항 검토
   - [ ] 브랜치 정리 (feature 브랜치 병합)

2. **커밋 메시지 규칙**
   - Conventional Commits 형식 준수
   - 명확한 제목 (50자 이내)
   - 상세한 본문 (필요 시)

3. **버전 선택**
   - 의문스러우면 작은 버전 선택 (patch)
   - Breaking Changes는 명확히 표시
   - Major 버전은 신중히 결정

4. **릴리스 후**
   - 배포 상태 모니터링
   - 사용자 피드백 확인
   - Hotfix 준비
