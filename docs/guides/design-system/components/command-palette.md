# Command Palette (⌘K)

Command Palette는 키보드 중심의 빠른 네비게이션과 액션 실행을 제공하는 전역 검색 컴포넌트입니다.

## 주요 기능

### 1. 키보드 단축키
- **⌘K** (macOS) / **Ctrl+K** (Windows/Linux): Command Palette 열기/닫기
- **↑/↓**: 항목 탐색
- **Enter**: 선택한 항목 실행
- **Esc**: Command Palette 닫기

### 2. 검색 가능한 항목

#### 페이지 네비게이션
- 홈
- 회사소개
- 서비스
- 로드맵
- 포트폴리오
- 실험실
- 블로그
- 협업하기

#### 서비스 상세
- MVP 개발
- 풀스택 개발
- 디자인 시스템
- 운영 관리

#### 사용자 액션 (로그인 시)
- 프로필
- 주문 내역
- 알림
- 관리자 대시보드
- 로그아웃

#### 사용자 액션 (로그아웃 시)
- 로그인

#### 설정
- 테마 전환 (라이트/다크 모드)
- 검색 페이지

#### 리소스
- 이용약관
- 개인정보처리방침
- 환불정책
- 시스템 상태

## 사용 방법

### 1. 키보드 단축키로 열기
```
⌘K (macOS) 또는 Ctrl+K (Windows/Linux)
```

### 2. 검색어 입력
Command Palette가 열리면 검색어를 입력하여 원하는 항목을 필터링할 수 있습니다.

### 3. 항목 선택
- 키보드 화살표 (↑/↓)로 항목 탐색
- Enter 키로 선택
- 마우스 클릭으로 선택

## 기술 스택

- **cmdk**: Command palette 기본 기능
- **@radix-ui/react-dialog**: 모달 UI
- **lucide-react**: 아이콘
- **react-router-dom**: 페이지 네비게이션
- **next-themes**: 테마 전환

## 구현 세부사항

### 컴포넌트 구조
```
CommandPalette
├── CommandDialog (모달 래퍼)
│   ├── CommandInput (검색 입력)
│   └── CommandList (항목 리스트)
│       ├── CommandEmpty (검색 결과 없음)
│       ├── CommandGroup (페이지)
│       ├── CommandGroup (서비스 상세)
│       ├── CommandGroup (사용자)
│       ├── CommandGroup (설정)
│       └── CommandGroup (리소스)
```

### 주요 함수
- `handleSelect`: 항목 선택 시 Command Palette를 닫고 콜백 실행
- `useEffect`: ⌘K/Ctrl+K 키보드 이벤트 리스너 등록

### 상태 관리
- `open`: Command Palette 열기/닫기 상태
- `user`: 현재 로그인한 사용자 (useAuth 훅)
- `theme`: 현재 테마 (useTheme 훅)

## 접근성 (Accessibility)

- **키보드 네비게이션**: 모든 항목을 키보드로 탐색 가능
- **ARIA 속성**: cmdk가 자동으로 ARIA 속성 제공
- **포커스 관리**: Dialog 열릴 때 자동으로 검색 입력에 포커스
- **Esc 키**: Dialog 닫기

## 향후 개선 사항

1. **최근 검색 기록**: localStorage에 최근 검색한 항목 저장
2. **추천 항목**: 사용자의 최근 방문 페이지 기반 추천
3. **서비스 콘텐츠 검색**: 블로그 포스트, 포트폴리오 프로젝트 검색
4. **관리자 전용 액션**: CRUD 작업 빠른 실행
5. **다국어 지원**: i18n 통합

## 참고 자료

- [cmdk 공식 문서](https://cmdk.paco.me/)
- [shadcn/ui Command](https://ui.shadcn.com/docs/components/command)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
