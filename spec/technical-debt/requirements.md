# 기술 부채 해소 요구사항 명세서

## 문서 정보
- **작성일**: 2025-11-25
- **버전**: 1.0.0
- **상태**: 초안
- **관련 이슈**: TD-Sprint-1

---

## 1. 개요

### 1.1 배경
IDEA on Action 프로젝트는 v2.16.0까지 빠른 기능 개발에 집중하면서 일부 기술 부채가 누적되었습니다. 현재 프로덕션 코드에는 7개의 `any` 타입과 6개의 미완성 TODO 주석이 존재하며, 이는 타입 안정성과 코드 완성도를 저해합니다.

### 1.2 목적
- 프로덕션 코드의 타입 안전성을 100%로 개선
- 미완성 기능(TODO 주석)을 모두 구현 완료
- 코드 품질 지표 개선 (린트 경고 감소)
- 유지보수성 향상

### 1.3 범위
- **포함**: 프로덕션 코드(`src/`)의 `any` 타입 및 TODO 주석
- **제외**: 테스트 코드, 스크립트 코드, 문서

---

## 2. 현황 분석

### 2.1 기술 부채 항목

#### 2.1.1 TODO 주석 (6개)

| 파일 | 라인 | 내용 | 우선순위 |
|------|------|------|----------|
| `PromptTemplateSelector.tsx` | 207 | `// TODO: 실제 인증된 사용자 ID 사용` | P0 |
| `PromptTemplateSelector.tsx` | 237 | `// TODO: useAuth 훅에서 현재 사용자 ID 가져오기` | P0 |
| `PromptTemplateShareModal.tsx` | 122 | `// TODO: 실제 usePromptTemplateShare 훅 연결` | P0 |
| `PromptTemplateShareModal.tsx` | 144 | `// TODO: 실제 usePromptTemplateShare 훅 연결` | P0 |
| `useRealtimeDashboard.ts` | 54 | `// TODO: order_items 조인 추가` | P1 |
| (검색 필요) | ? | 추가 TODO 항목 확인 필요 | ? |

#### 2.1.2 any 타입 (7개, 프로덕션 코드)

| 파일 | 라인 | 컨텍스트 | 타입 |
|------|------|----------|------|
| `useOrders.ts` | 170 | `const transformedOrder: any` | `Order` |
| `useOrders.ts` | 218 | `item: any` | `CartItem` |
| `AdminTeam.tsx` | 126 | `(row: any)` | `TeamMember` |
| `AdminTags.tsx` | 220 | `(tag: any)` | `Tag` |
| `AdminLab.tsx` | 249 | `(item: any)` | `LabItem` |
| `AdminLab.tsx` | 274 | `(item: any)` | `LabItem` |
| `AdminLab.tsx` | 293 | `(item: any)` | `LabItem` |

### 2.2 영향 범위

#### 2.2.1 타입 안정성
- **현재**: 프로덕션 코드에서 7개의 any 타입 사용
- **위험**: 런타임 에러 가능성, IDE 자동완성 미작동
- **영향받는 기능**:
  - 주문 관리 (useOrders)
  - 관리자 페이지 (Team, Tags, Lab)

#### 2.2.2 기능 완성도
- **현재**: 6개의 미완성 기능 (TODO)
- **위험**: 하드코딩된 값, 미구현 로직
- **영향받는 기능**:
  - 프롬프트 템플릿 공유 (인증 미연결)
  - 실시간 대시보드 (조인 누락)

#### 2.2.3 코드 품질
- **현재 린트 경고**: 40개
- **목표**: 35개 이하 (-12.5%)

---

## 3. 사용자 스토리

### US-TD-001: 개발자 - 타입 안전성
**As a** 개발자
**I want** 프로덕션 코드에서 any 타입을 모두 제거하고 싶다
**So that** IDE 자동완성과 타입 체크가 정상 작동하여 버그를 사전에 방지할 수 있다

**시나리오**:
1. `useOrders.ts`에서 주문 데이터를 변환할 때
2. `AdminTeam.tsx`에서 팀원 데이터를 렌더링할 때
3. `AdminTags.tsx`에서 태그 목록을 표시할 때
4. `AdminLab.tsx`에서 실험실 아이템을 관리할 때

**기대 결과**:
- 모든 변수에 명시적 타입 선언
- IDE에서 프로퍼티 자동완성 작동
- 타입 불일치 시 컴파일 에러 발생

### US-TD-002: 개발자 - 기능 완성
**As a** 개발자
**I want** TODO 주석으로 남겨진 미완성 기능을 모두 구현하고 싶다
**So that** 코드베이스가 완전하고 프로덕션 준비 상태가 된다

**시나리오**:
1. 프롬프트 템플릿 선택기에서 인증된 사용자 ID를 사용할 때
2. 프롬프트 템플릿을 다른 사용자와 공유할 때
3. 실시간 대시보드에서 주문 상세를 조회할 때

**기대 결과**:
- 하드코딩 제거, 실제 인증 시스템 연동
- 공유 기능 정상 작동
- 주문 상세 정보 완전히 로드

### US-TD-003: 유지보수자 - 코드 품질
**As a** 유지보수 담당자
**I want** 린트 경고를 줄이고 싶다
**So that** 코드 리뷰와 유지보수가 용이해진다

**시나리오**:
1. `npm run lint` 실행 시
2. CI/CD 파이프라인에서 코드 검사 시

**기대 결과**:
- 린트 경고 40개 → 35개 이하
- 심각한 경고(error level) 0개 유지

---

## 4. 기능 요구사항

### FR-TD-001: any 타입 제거
**우선순위**: P0
**설명**: 프로덕션 코드에서 모든 any 타입을 명시적 타입으로 교체한다.

**세부 요구사항**:
- **FR-TD-001-1**: `useOrders.ts`의 `transformedOrder` 변수에 `Order` 타입 적용
- **FR-TD-001-2**: `useOrders.ts`의 `item` 파라미터에 `CartItem` 타입 적용
- **FR-TD-001-3**: `AdminTeam.tsx`의 `row` 파라미터에 `TeamMember` 타입 적용
- **FR-TD-001-4**: `AdminTags.tsx`의 `tag` 파라미터에 `Tag` 타입 적용
- **FR-TD-001-5**: `AdminLab.tsx`의 `item` 파라미터에 `LabItem` 타입 적용

### FR-TD-002: TODO 주석 해소
**우선순위**: P0
**설명**: 모든 TODO 주석에 대응하는 기능을 구현한다.

**세부 요구사항**:
- **FR-TD-002-1**: `PromptTemplateSelector`에서 `useAuth` 훅 통합하여 현재 사용자 ID 사용
- **FR-TD-002-2**: `PromptTemplateShareModal`에 `usePromptTemplateShare` 훅 구현 및 연결
- **FR-TD-002-3**: `useRealtimeDashboard`에 `order_items` 테이블 조인 추가

### FR-TD-003: 린트 경고 감소
**우선순위**: P1
**설명**: 린트 경고를 40개에서 35개 이하로 줄인다.

**세부 요구사항**:
- **FR-TD-003-1**: any 타입 제거로 인한 경고 감소 (예상 5개)
- **FR-TD-003-2**: 사용하지 않는 import 제거
- **FR-TD-003-3**: 사용하지 않는 변수 제거

---

## 5. 비기능 요구사항

### NFR-TD-001: 호환성
- 기존 테스트 케이스 100% 통과
- 기존 기능 동작 유지 (Breaking Changes 없음)

### NFR-TD-002: 성능
- 빌드 시간 증가 없음 (현재 ~20s 유지)
- 번들 크기 증가 없음

### NFR-TD-003: 유지보수성
- 모든 타입은 `types/` 디렉토리에 정의
- 타입 재사용 최대화 (중복 타입 정의 금지)

---

## 6. 제약사항

### 6.1 기술적 제약
- **타입스크립트 Strict Mode**: 유지 (엄격한 타입 체크)
- **기존 타입 시스템**: `types/` 디렉토리의 타입 우선 사용
- **훅 규칙**: React Hooks 규칙 준수

### 6.2 일정 제약
- **단일 스프린트**: 1일 이내 완료
- **작업 시간**: 총 8시간 30분 예상

### 6.3 범위 제약
- **프로덕션 코드만**: 테스트 코드의 any 타입은 허용
- **린트 경고**: 완전 제거가 아닌 감소가 목표

---

## 7. 가정 및 의존성

### 7.1 가정
- 기존 타입 정의(`types/`)가 충분히 상세함
- `useAuth` 훅이 이미 구현되어 있음
- Supabase DB 스키마에 `order_items` 테이블 존재

### 7.2 의존성
- **선행 완료**: 없음 (독립적 작업)
- **병렬 가능**: 모든 TASK가 독립적

---

## 8. 성공 지표

### 8.1 정량적 지표
| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| any 타입 (프로덕션) | 7개 | 0개 | `grep -r "any" src/ --exclude-dir=__tests__` |
| TODO 주석 | 6개 | 0개 | `grep -r "TODO" src/` |
| 린트 경고 | 40개 | ≤35개 | `npm run lint` |
| 빌드 성공 | ✅ | ✅ | `npm run build` |
| 테스트 통과 | 292개 | 292개 | `npm run test` |

### 8.2 정성적 지표
- [ ] 코드 리뷰 승인 (1명 이상)
- [ ] IDE 자동완성 정상 작동
- [ ] 타입 에러 0개

---

## 9. 리스크 및 대응

### 9.1 리스크
| ID | 리스크 | 발생 확률 | 영향도 | 대응 방안 |
|----|--------|-----------|--------|-----------|
| R-TD-001 | 타입 변경으로 인한 Breaking Changes | 중 | 고 | 점진적 변경, 테스트 우선 |
| R-TD-002 | `order_items` 조인 성능 저하 | 낮 | 중 | 인덱스 확인, 쿼리 최적화 |
| R-TD-003 | `usePromptTemplateShare` 훅 구현 복잡도 | 중 | 중 | 기존 공유 훅 패턴 참고 |

### 9.2 대응 계획
- **R-TD-001**: 단위 테스트 먼저 작성, 타입 변경 후 테스트 재실행
- **R-TD-002**: DB 쿼리 프로파일링, 필요 시 인덱스 추가
- **R-TD-003**: `useServiceShare` 등 기존 공유 로직 재사용

---

## 10. 인수 기준 (Acceptance Criteria)

### AC-TD-001: any 타입 제거
- [ ] `src/` 디렉토리에서 any 타입 0개 (테스트 제외)
- [ ] 모든 변수에 명시적 타입 선언
- [ ] IDE에서 타입 자동완성 작동 확인

### AC-TD-002: TODO 주석 해소
- [ ] `src/` 디렉토리에서 TODO 주석 0개
- [ ] `PromptTemplateSelector`에서 실제 사용자 ID 사용
- [ ] `PromptTemplateShareModal` 공유 기능 작동
- [ ] `useRealtimeDashboard`에서 order_items 데이터 조회

### AC-TD-003: 린트 경고 감소
- [ ] `npm run lint` 경고 35개 이하
- [ ] 린트 에러 0개 유지

### AC-TD-004: 빌드 성공
- [ ] `npm run build` 성공
- [ ] 빌드 시간 20초 이내
- [ ] 번들 크기 증가 없음

### AC-TD-005: 테스트 통과
- [ ] `npm run test` 292개 테스트 통과
- [ ] 기존 기능 동작 유지

---

## 11. 문서 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2025-11-25 | Claude | 초안 작성 |

---

**참고 문서**:
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 개발 문서
- [project-todo.md](../../project-todo.md) - 할 일 목록
- [docs/guides/typescript-guidelines.md](../../docs/guides/typescript-guidelines.md) - 타입스크립트 가이드
