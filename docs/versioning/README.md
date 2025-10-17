# 버전 관리 가이드

> VIBE WORKING 프로젝트 Semantic Versioning 가이드

**작성일**: 2025-10-17
**버전**: 1.0

---

## 📖 Semantic Versioning

**형식**: `Major.Minor.Patch`

**예시**: v1.3.0, v2.0.0, v2.1.5

---

## 🎯 버전 업 기준

### Major (x.0.0)
**언제?**
- Phase 완료 (대규모 기능 추가)
- Breaking Changes (API 변경, 기존 기능 수정)
- 사용자에게 큰 영향을 주는 변경

**예시**:
- Phase 8 완료 (서비스 페이지) → **v2.0.0**
- Phase 9 완료 (전자상거래) → **v3.0.0**

---

### Minor (0.x.0)
**언제?**
- Phase 내 주요 기능 추가
- 새로운 페이지/컴포넌트 추가
- 하위 호환성 유지

**예시**:
- 서비스 목록 페이지 완성 → **v1.5.0**
- 장바구니 시스템 추가 → **v2.1.0**
- 결제 게이트웨이 연동 → **v2.3.0**

---

### Patch (0.0.x)
**언제?**
- 버그 수정
- 문서 업데이트
- 성능 최적화
- UI 미세 조정

**예시**:
- 로딩 스피너 버그 수정 → **v1.5.1**
- README 오타 수정 → **v1.5.2**
- 다크 모드 색상 조정 → **v1.5.3**

---

## 📝 Conventional Commits

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류

| Type | 설명 | 버전 영향 | 예시 |
|------|------|---------|------|
| **feat** | 새로운 기능 추가 | Minor | `feat(services): add service list page` |
| **fix** | 버그 수정 | Patch | `fix(cart): resolve quantity update bug` |
| **docs** | 문서 변경 | Patch | `docs(readme): update installation guide` |
| **style** | 코드 포맷팅 | Patch | `style(header): adjust spacing` |
| **refactor** | 리팩토링 | Patch | `refactor(hooks): simplify useTheme logic` |
| **perf** | 성능 개선 | Patch | `perf(images): add lazy loading` |
| **test** | 테스트 추가/수정 | Patch | `test(services): add unit tests` |
| **build** | 빌드 시스템 변경 | Patch | `build(vite): update config` |
| **ci** | CI/CD 설정 변경 | Patch | `ci(github): add release workflow` |
| **chore** | 기타 작업 | 없음 | `chore(deps): update dependencies` |

### Breaking Changes

Major 버전 업을 위한 Breaking Change 표기:

```
feat(api)!: change authentication flow

BREAKING CHANGE: OAuth callback URL format changed
```

`!` 또는 `BREAKING CHANGE:` 키워드 사용

---

## 🚀 릴리스 프로세스

### 1. 로컬에서 Dry Run

변경 사항 미리보기:

```bash
npm run release:dry
```

**출력 예시**:
```
✔ bumping version in package.json from 1.3.0 to 1.4.0
✔ outputting changes to CHANGELOG.md
✔ committing package.json and CHANGELOG.md
✔ tagging release v1.4.0
```

---

### 2. 실제 릴리스 (로컬)

#### Patch 버전 (1.3.0 → 1.3.1)
```bash
npm run release:patch
```

버그 수정, 문서 업데이트 시 사용

#### Minor 버전 (1.3.0 → 1.4.0)
```bash
npm run release:minor
```

새로운 기능 추가 시 사용

#### Major 버전 (1.3.0 → 2.0.0)
```bash
npm run release:major
```

Phase 완료, Breaking Changes 시 사용

#### 자동 버전 결정
```bash
npm run release
```

커밋 메시지를 분석하여 자동으로 버전 결정:
- `feat:` → Minor
- `fix:` → Patch
- `BREAKING CHANGE:` → Major

---

### 3. GitHub Actions (수동 트리거)

**단계**:

1. **GitHub 저장소 접속**
   - https://github.com/IDEA-on-Action/IdeaonAction-Homepage

2. **Actions 탭 이동**
   - 상단 메뉴에서 "Actions" 클릭

3. **Release 워크플로우 선택**
   - 좌측 목록에서 "Release" 클릭

4. **워크플로우 실행**
   - "Run workflow" 버튼 클릭
   - Branch: `staging` 선택
   - Version Type: `major`, `minor`, `patch` 중 선택
   - "Run workflow" 버튼 클릭

**자동 실행 항목**:
- ✅ CHANGELOG.md 생성/업데이트
- ✅ CLAUDE.md 버전 업데이트
- ✅ Git tag 생성 (v1.4.0)
- ✅ GitHub Release 생성
- ✅ 빌드 검증

---

## 📊 버전-로드맵 매핑

### 현재 버전

**v1.3.0** (Phase 7 완료 + 문서 개선)

### Phase 8: 서비스 페이지 구현

| 버전 | 마일스톤 | 예상 완료일 |
|------|---------|-----------|
| v1.4.0 | 데이터 레이어 구축 | 2025-10-20 |
| v1.5.0 | 서비스 목록 페이지 | 2025-10-25 |
| v1.6.0 | 서비스 상세 페이지 | 2025-10-30 |
| **v2.0.0** | **Phase 8 완료** | 2025-11-01 |

### Phase 9: 전자상거래 기능

| 버전 | 마일스톤 | 예상 완료일 |
|------|---------|-----------|
| v2.1.0 | 장바구니 시스템 | 2025-11-10 |
| v2.2.0 | 주문 관리 | 2025-11-15 |
| v2.3.0 | 카카오페이 연동 | 2025-11-20 |
| v2.4.0 | 토스페이먼츠 연동 | 2025-11-25 |
| **v3.0.0** | **Phase 9 완료** | 2025-11-30 |

**전체 매핑**: [version-roadmap-mapping.md](./version-roadmap-mapping.md)

---

## 🛠️ 도구 및 설정

### standard-version

자동 버전 관리 도구

**설치**:
```bash
npm install --save-dev standard-version
```

**설정 파일**: `.versionrc.json`

### 커밋 메시지 검증 (선택)

`commitlint` 설치로 커밋 메시지 자동 검증:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

---

## 📋 체크리스트

### 릴리스 전

- [ ] 모든 기능 완성 및 테스트 완료
- [ ] 빌드 에러 0개 (`npm run build`)
- [ ] 문서 업데이트 (필요 시)
- [ ] Conventional Commits 형식 준수

### 릴리스 후

- [ ] GitHub Release 노트 확인
- [ ] CHANGELOG.md 생성 확인
- [ ] CLAUDE.md 버전 업데이트 확인
- [ ] 프로덕션 배포 확인 (Vercel)

---

## 🤔 FAQ

### Q1. 여러 기능을 한 번에 릴리스할 수 있나요?
**A**: 네, `npm run release`를 실행하면 마지막 릴리스 이후의 모든 커밋을 분석하여 CHANGELOG에 자동 추가됩니다.

### Q2. 릴리스를 취소하고 싶어요
**A**: Git tag를 삭제하고 커밋을 되돌리세요:
```bash
git tag -d v1.4.0
git reset --hard HEAD~1
```

### Q3. CHANGELOG.md가 생성되지 않아요
**A**: 커밋 메시지가 Conventional Commits 형식을 따르지 않을 수 있습니다. `feat:`, `fix:` 등의 타입을 확인하세요.

### Q4. Major 버전을 강제로 올리고 싶어요
**A**: `npm run release:major`를 사용하거나, 커밋 메시지에 `BREAKING CHANGE:`를 포함하세요.

---

## 📚 참고 자료

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [standard-version GitHub](https://github.com/conventional-changelog/standard-version)
- [Keep a Changelog](https://keepachangelog.com/)

---

**관련 문서**:
- [version-roadmap-mapping.md](./version-roadmap-mapping.md) - 버전-로드맵 매핑
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
- [CHANGELOG.md](../../CHANGELOG.md) - 변경 로그
