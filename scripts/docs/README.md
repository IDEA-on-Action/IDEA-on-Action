# 문서 자동화 스크립트

Sprint 4 작업의 일환으로 API 문서 및 변경 로그 자동 생성 시스템입니다.

## 📁 스크립트 목록

### 1. generate-api-types.ts

OpenAPI 스펙(YAML)에서 TypeScript 타입을 자동 생성합니다.

**입력**: `docs/api/openapi.yaml`
**출력**: `src/types/api-generated.ts`

```bash
npm run docs:generate-types
```

**기능**:
- OpenAPI 스키마를 TypeScript 인터페이스로 변환
- JSDoc 주석 자동 생성
- API 응답 타입 유틸리티 제공 (ApiSuccessResponse, ApiErrorResponse)

**주의사항**:
- 현재 간단한 YAML 파서를 사용합니다 (의존성 최소화)
- 복잡한 OpenAPI 스키마는 `js-yaml` 라이브러리 사용 권장
- 생성된 파일은 수동 편집하지 마세요

### 2. generate-changelog.ts

Git 커밋 히스토리를 파싱하여 CHANGELOG.md를 생성합니다.

**입력**: Git 커밋 히스토리, Git 태그
**출력**: `CHANGELOG.md`

```bash
npm run docs:generate-changelog
```

**기능**:
- Conventional Commits 형식 인식 (feat, fix, chore 등)
- 버전별 자동 그룹핑 (Git 태그 기반)
- Breaking Changes 자동 감지 (! 플래그)
- Keep a Changelog 형식 준수

**지원하는 커밋 타입**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `chore`: 기타 작업
- `docs`: 문서
- `refactor`: 리팩토링
- `test`: 테스트
- `perf`: 성능 개선
- `ci`, `build`, `style`, `revert`

**커밋 메시지 형식**:
```
type(scope): subject
type(scope)!: subject  # Breaking change
```

## 🚀 릴리스 자동화

### auto-release.ts

버전 범프, Git 태그, GitHub Release까지 자동화합니다.

**위치**: `scripts/release/auto-release.ts`

```bash
# Patch 버전 (2.34.0 → 2.34.1)
npm run release:auto -- --type patch

# Minor 버전 (2.34.0 → 2.35.0)
npm run release:auto -- --type minor

# Major 버전 (2.34.0 → 3.0.0)
npm run release:auto -- --type major

# Dry Run (테스트)
npm run release:auto -- --type patch --dry-run
```

**옵션**:
- `--type, -t <type>`: 버전 범프 타입 (major|minor|patch)
- `--dry-run, -d`: 실제 변경 없이 시뮬레이션
- `--skip-tests`: 테스트 생략
- `--skip-git-tag`: Git 태그 생성 생략
- `--skip-github-release`: GitHub Release 생성 생략

**실행 과정**:
1. Git 상태 확인 (작업 디렉토리가 깨끗한지)
2. 린트 실행
3. package.json 버전 범프
4. CHANGELOG.md 업데이트
5. Git 커밋 및 태그 생성
6. GitHub Release 생성 (gh CLI 필요)

**사후 작업**:
```bash
# 한 번에 푸시
git push --follow-tags

# 또는 별도로
git push origin main
git push origin v2.35.0
```

## 📋 NPM 스크립트 요약

| 명령어 | 설명 | 스크립트 |
|--------|------|----------|
| `npm run docs:generate-types` | API 타입 생성 | `generate-api-types.ts` |
| `npm run docs:generate-changelog` | Changelog 생성 | `generate-changelog.ts` |
| `npm run release:auto` | 자동 릴리스 | `auto-release.ts` |

## 🔧 개발 가이드

### 타입 생성 스크립트 개선

더 복잡한 OpenAPI 스펙을 지원하려면:

1. `js-yaml` 의존성 추가:
```bash
npm install --save-dev js-yaml @types/js-yaml
```

2. `generate-api-types.ts` 수정:
```typescript
import yaml from 'js-yaml';

function parseYAML(content: string): OpenAPIDoc {
  return yaml.load(content) as OpenAPIDoc;
}
```

### Changelog 커스터마이징

`generate-changelog.ts`의 `getTypeTitle()` 함수를 수정하여 섹션 제목을 변경할 수 있습니다:

```typescript
function getTypeTitle(type: CommitType | 'other'): string {
  const titles: Record<CommitType | 'other', string> = {
    feat: '✨ 새로운 기능',
    fix: '🐛 버그 수정',
    // ...
  };
  return titles[type] || '기타';
}
```

### 릴리스 스크립트 확장

`auto-release.ts`에 추가 기능 구현:

- 자동 빌드 및 배포
- Slack 알림
- npm 패키지 게시
- Docker 이미지 빌드

## 🛠️ 트러블슈팅

### Git 태그가 없을 때

```bash
# 첫 릴리스 태그 생성
git tag -a v2.34.0 -m "Initial release"
git push origin v2.34.0
```

### gh CLI 인증 오류

```bash
# GitHub CLI 설치 및 로그인
gh auth login
```

### 린트 에러

```bash
# 린트만 실행
npm run lint

# 자동 수정
npm run lint -- --fix
```

## 📚 참고 자료

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [GitHub CLI](https://cli.github.com/)
