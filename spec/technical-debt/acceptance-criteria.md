# 기술 부채 해소 인수 기준

## 문서 정보
- **작성일**: 2025-11-25
- **버전**: 1.0.0
- **상태**: 초안
- **관련 문서**: [requirements.md](requirements.md)

---

## 1. 개요

이 문서는 기술 부채 해소 프로젝트의 **검증 가능한 완료 조건**을 정의합니다. 모든 인수 기준은 자동화된 테스트 또는 명령어로 검증 가능해야 합니다.

---

## 2. 인수 기준 (Acceptance Criteria)

### AC-TD-001: any 타입 제거 ✅

**목표**: 프로덕션 코드에서 any 타입을 모두 제거한다.

#### 검증 방법
```bash
# 프로덕션 코드에서 any 타입 검색 (테스트 제외)
grep -r ": any" src/ --exclude-dir=__tests__ --exclude-dir=tests | wc -l
# 기대 결과: 0
```

#### 세부 조건
- [ ] **AC-TD-001-1**: `useOrders.ts` 170라인 - `transformedOrder` 변수에 `Order` 타입 적용
  ```typescript
  // Before
  const transformedOrder: any = { ... }

  // After
  const transformedOrder: Order = { ... }
  ```
  - **검증**: TypeScript 컴파일 에러 없음
  - **검증 명령**: `npx tsc --noEmit`

- [ ] **AC-TD-001-2**: `useOrders.ts` 218라인 - `item` 파라미터에 `CartItem` 타입 적용
  ```typescript
  // Before
  items.map((item: any) => ({ ... }))

  // After
  items.map((item: CartItem) => ({ ... }))
  ```
  - **검증**: IDE에서 `item.` 입력 시 자동완성 작동
  - **검증 명령**: `npx tsc --noEmit`

- [ ] **AC-TD-001-3**: `AdminTeam.tsx` 126라인 - `row` 파라미터에 `TeamMember` 타입 적용
  ```typescript
  // Before
  members.map((row: any) => ( ... ))

  // After
  members.map((row: TeamMember) => ( ... ))
  ```
  - **검증**: `row.name`, `row.email` 등 프로퍼티 접근 시 타입 체크
  - **검증 명령**: `npx tsc --noEmit`

- [ ] **AC-TD-001-4**: `AdminTags.tsx` 220라인 - `tag` 파라미터에 `Tag` 타입 적용
  ```typescript
  // Before
  tags.map((tag: any) => ( ... ))

  // After
  tags.map((tag: Tag) => ( ... ))
  ```
  - **검증**: `tag.id`, `tag.name` 등 프로퍼티 접근 시 타입 체크
  - **검증 명령**: `npx tsc --noEmit`

- [ ] **AC-TD-001-5**: `AdminLab.tsx` 249/274/293라인 - `item` 파라미터에 `LabItem` 타입 적용
  ```typescript
  // Before
  labItems.map((item: any) => ( ... ))

  // After
  labItems.map((item: LabItem) => ( ... ))
  ```
  - **검증**: `item.title`, `item.status` 등 프로퍼티 접근 시 타입 체크
  - **검증 명령**: `npx tsc --noEmit`

#### 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| any 타입 개수 | 7개 | 0개 | `grep -r ": any" src/ --exclude-dir=__tests__` |
| TypeScript 에러 | 0개 | 0개 | `npx tsc --noEmit` |
| IDE 자동완성 | 일부 미작동 | 100% 작동 | 수동 테스트 |

---

### AC-TD-002: TODO 주석 해소 ✅

**목표**: 모든 TODO 주석에 해당하는 기능을 구현한다.

#### 검증 방법
```bash
# 프로덕션 코드에서 TODO 주석 검색
grep -r "TODO" src/ --exclude-dir=__tests__ | wc -l
# 기대 결과: 0
```

#### 세부 조건
- [ ] **AC-TD-002-1**: `PromptTemplateSelector.tsx` 207/237라인 - 인증된 사용자 ID 사용
  ```typescript
  // Before
  const currentUserId = "00000000-0000-0000-0000-000000000000"; // TODO: 실제 인증된 사용자 ID 사용

  // After
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  ```
  - **검증**: 로그인 후 실제 사용자 ID가 사용됨
  - **검증 방법**: E2E 테스트 `prompt-templates.spec.ts` 통과
  - **검증 명령**: `npm run test:e2e prompt-templates`

- [ ] **AC-TD-002-2**: `PromptTemplateShareModal.tsx` 122라인 - `usePromptTemplateShare` 훅 구현
  ```typescript
  // Before
  const handleShare = async () => {
    // TODO: 실제 usePromptTemplateShare 훅 연결
    console.log("공유:", selectedUsers);
  };

  // After
  const { shareTemplate, isSharing } = usePromptTemplateShare();
  const handleShare = async () => {
    await shareTemplate(templateId, selectedUsers, permission);
  };
  ```
  - **검증**: 공유 버튼 클릭 시 DB에 레코드 생성
  - **검증 방법**: E2E 테스트 신규 작성
  - **검증 명령**: `npm run test:e2e prompt-template-share`

- [ ] **AC-TD-002-3**: `PromptTemplateShareModal.tsx` 144라인 - 사용자 검색 기능 구현
  ```typescript
  // Before
  const handleSearch = (query: string) => {
    // TODO: 실제 usePromptTemplateShare 훅 연결
    console.log("검색:", query);
  };

  // After
  const { searchUsers, searchResults } = usePromptTemplateShare();
  const handleSearch = async (query: string) => {
    await searchUsers(query);
  };
  ```
  - **검증**: 검색어 입력 시 사용자 목록 반환
  - **검증 방법**: Unit 테스트
  - **검증 명령**: `npm run test usePromptTemplateShare`

- [ ] **AC-TD-002-4**: `useRealtimeDashboard.ts` 54라인 - order_items 조인 추가
  ```typescript
  // Before
  .select(`
    *,
    users(email, full_name)
    // TODO: order_items 조인 추가
  `)

  // After
  .select(`
    *,
    users(email, full_name),
    order_items(
      id,
      product_id,
      quantity,
      price,
      products(name, image_url)
    )
  `)
  ```
  - **검증**: 대시보드에서 주문 상세 정보 표시
  - **검증 방법**: E2E 테스트 `realtime-dashboard.spec.ts` 통과
  - **검증 명령**: `npm run test:e2e realtime-dashboard`

#### 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| TODO 주석 개수 | 6개 | 0개 | `grep -r "TODO" src/` |
| 기능 구현률 | 0% | 100% | E2E 테스트 통과 |

---

### AC-TD-003: 린트 경고 감소 ✅

**목표**: 린트 경고를 40개에서 35개 이하로 줄인다.

#### 검증 방법
```bash
# ESLint 실행 및 경고 카운트
npm run lint 2>&1 | grep -E "warning|error" | wc -l
# 기대 결과: ≤35
```

#### 세부 조건
- [ ] **AC-TD-003-1**: any 타입 제거로 인한 경고 감소
  - **기대 감소**: 최소 5개
  - **관련 규칙**: `@typescript-eslint/no-explicit-any`

- [ ] **AC-TD-003-2**: 사용하지 않는 import 제거
  - **검증 명령**: `npx eslint src/ --rule 'no-unused-vars: error'`
  - **관련 파일**: TODO 해소 후 불필요한 import 제거

- [ ] **AC-TD-003-3**: 사용하지 않는 변수 제거
  - **검증 명령**: `npx eslint src/ --rule 'no-unused-vars: error'`
  - **관련 파일**: 리팩토링 중 생긴 미사용 변수 제거

#### 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 린트 경고 | 40개 | ≤35개 | `npm run lint` |
| 린트 에러 | 0개 | 0개 | `npm run lint` |
| 경고 감소율 | - | ≥12.5% | (40-35)/40 = 0.125 |

---

### AC-TD-004: 빌드 성공 ✅

**목표**: 타입 변경 후에도 빌드가 성공적으로 완료된다.

#### 검증 방법
```bash
# 프로덕션 빌드
npm run build
# 기대 결과: exit code 0
```

#### 세부 조건
- [ ] **AC-TD-004-1**: 빌드 성공
  - **검증 명령**: `npm run build`
  - **기대 결과**: `Build completed successfully` 메시지 출력

- [ ] **AC-TD-004-2**: 빌드 시간 유지
  - **현재**: ~20초
  - **목표**: ≤25초 (25% 버퍼)
  - **측정 방법**: `time npm run build`

- [ ] **AC-TD-004-3**: 번들 크기 유지
  - **현재**: ~338 kB gzip
  - **목표**: ≤350 kB gzip (4% 버퍼)
  - **측정 방법**: 빌드 로그에서 `dist/assets/index-*.js` 크기 확인

#### 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 빌드 성공 | ✅ | ✅ | `npm run build` exit code |
| 빌드 시간 | ~20s | ≤25s | `time npm run build` |
| 번들 크기 | ~338 kB | ≤350 kB | 빌드 로그 |

---

### AC-TD-005: 테스트 통과 ✅

**목표**: 모든 기존 테스트가 통과한다.

#### 검증 방법
```bash
# 전체 테스트 실행
npm run test
# 기대 결과: 292개 테스트 통과
```

#### 세부 조건
- [ ] **AC-TD-005-1**: E2E 테스트 통과
  - **테스트 개수**: 172개
  - **검증 명령**: `npm run test:e2e`
  - **기대 결과**: 100% 통과

- [ ] **AC-TD-005-2**: Unit 테스트 통과
  - **테스트 개수**: 92개
  - **검증 명령**: `npm run test:unit`
  - **기대 결과**: 100% 통과

- [ ] **AC-TD-005-3**: Visual 테스트 통과
  - **테스트 개수**: 28개
  - **검증 명령**: `npm run test:visual`
  - **기대 결과**: 100% 통과

#### 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 전체 테스트 | 292개 | 292개 통과 | `npm run test` |
| E2E 테스트 | 172개 | 172개 통과 | `npm run test:e2e` |
| Unit 테스트 | 92개 | 92개 통과 | `npm run test:unit` |
| Visual 테스트 | 28개 | 28개 통과 | `npm run test:visual` |

---

## 3. 검증 체크리스트

### 3.1 자동화 검증

#### Phase 1: 정적 분석
```bash
# 1. TypeScript 컴파일 체크
npx tsc --noEmit
# 기대: No errors

# 2. ESLint 검사
npm run lint
# 기대: ≤35 warnings, 0 errors

# 3. any 타입 검색
grep -r ": any" src/ --exclude-dir=__tests__ | wc -l
# 기대: 0

# 4. TODO 주석 검색
grep -r "TODO" src/ --exclude-dir=__tests__ | wc -l
# 기대: 0
```

#### Phase 2: 빌드
```bash
# 5. 프로덕션 빌드
time npm run build
# 기대: 성공, ≤25초

# 6. 번들 크기 확인
ls -lh dist/assets/index-*.js
# 기대: ≤350 kB gzip
```

#### Phase 3: 테스트
```bash
# 7. Unit 테스트
npm run test:unit
# 기대: 92/92 passed

# 8. E2E 테스트
npm run test:e2e
# 기대: 172/172 passed

# 9. Visual 테스트
npm run test:visual
# 기대: 28/28 passed
```

### 3.2 수동 검증

#### IDE 테스트
- [ ] `useOrders.ts` 파일 열기 → `transformedOrder.` 입력 시 자동완성 작동
- [ ] `AdminTeam.tsx` 파일 열기 → `row.` 입력 시 자동완성 작동
- [ ] `AdminLab.tsx` 파일 열기 → `item.` 입력 시 자동완성 작동

#### 기능 테스트
- [ ] 로그인 후 프롬프트 템플릿 선택 → 실제 사용자 ID 표시
- [ ] 프롬프트 템플릿 공유 버튼 클릭 → 공유 모달 열림 → 사용자 검색 작동
- [ ] 실시간 대시보드 접속 → 주문 상세 정보 표시

---

## 4. 롤백 기준

다음 조건 중 하나라도 충족되면 변경사항을 롤백합니다.

### 4.1 심각한 이슈 (Critical)
- [ ] 빌드 실패 (`npm run build` exit code ≠ 0)
- [ ] 테스트 통과율 < 95% (277/292)
- [ ] 프로덕션 크래시 발생

### 4.2 중요한 이슈 (High)
- [ ] 린트 에러 발생 (warning은 허용)
- [ ] TypeScript 컴파일 에러 발생
- [ ] 기존 기능 동작 중단 (Breaking Changes)

### 4.3 경미한 이슈 (Medium)
- [ ] 빌드 시간 30초 초과 (+50%)
- [ ] 번들 크기 370 kB 초과 (+10%)
- [ ] 테스트 통과율 95~99% (277~289/292)

**롤백 절차**:
```bash
# 1. 커밋 되돌리기
git revert HEAD

# 2. 검증
npm run build && npm run test

# 3. 푸시
git push
```

---

## 5. 완료 보고서 템플릿

```markdown
# 기술 부채 해소 완료 보고서

## 실행 일시
- **시작**: YYYY-MM-DD HH:MM
- **완료**: YYYY-MM-DD HH:MM
- **소요 시간**: X시간 Y분

## 검증 결과

### AC-TD-001: any 타입 제거
- [x] any 타입 개수: 7개 → 0개
- [x] TypeScript 컴파일: 성공
- [x] IDE 자동완성: 정상 작동

### AC-TD-002: TODO 주석 해소
- [x] TODO 주석 개수: 6개 → 0개
- [x] 인증 연동: 완료
- [x] 공유 기능: 완료
- [x] order_items 조인: 완료

### AC-TD-003: 린트 경고 감소
- [x] 린트 경고: 40개 → 35개
- [x] 린트 에러: 0개

### AC-TD-004: 빌드 성공
- [x] 빌드 성공: ✅
- [x] 빌드 시간: 20.5초 (목표 ≤25초)
- [x] 번들 크기: 340 kB (목표 ≤350 kB)

### AC-TD-005: 테스트 통과
- [x] 전체 테스트: 292/292 통과 (100%)
- [x] E2E: 172/172
- [x] Unit: 92/92
- [x] Visual: 28/28

## 커밋 해시
- `abcdef1` - TD-001: PromptTemplateSelector useAuth 통합
- `abcdef2` - TD-002: PromptTemplateSelector usePromptTemplates 연결
- ...

## 이슈 사항
없음

## 다음 단계
- [ ] CLAUDE.md 업데이트
- [ ] project-todo.md 체크
- [ ] changelog.md 기록
```

---

## 6. 문서 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2025-11-25 | Claude | 초안 작성 |

---

**참고 문서**:
- [requirements.md](requirements.md) - 요구사항 명세서
- [../../tasks/technical-debt/sprint-1.md](../../tasks/technical-debt/sprint-1.md) - 작업 목록
- [../../docs/guides/testing-guidelines.md](../../docs/guides/testing-guidelines.md) - 테스트 가이드
