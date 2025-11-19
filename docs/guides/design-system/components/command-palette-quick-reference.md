# Command Palette Quick Reference

## 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `⌘K` (macOS) | Command Palette 열기/닫기 |
| `Ctrl+K` (Windows/Linux) | Command Palette 열기/닫기 |
| `↑` / `↓` | 항목 탐색 |
| `Enter` | 선택한 항목 실행 |
| `Esc` | Command Palette 닫기 |

## 검색 가능한 항목 (23개)

### 페이지 (8개)
- 홈 (`/`)
- 회사소개 (`/about`)
- 서비스 (`/services`)
- 로드맵 (`/roadmap`)
- 포트폴리오 (`/portfolio`)
- 실험실 (`/lab`)
- 블로그 (`/blog`)
- 협업하기 (`/work-with-us`)

### 서비스 상세 (4개)
- MVP 개발 (`/services/mvp`)
- 풀스택 개발 (`/services/fullstack`)
- 디자인 시스템 (`/services/design`)
- 운영 관리 (`/services/operations`)

### 사용자 액션 - 로그인 시 (5개)
- 프로필 (`/profile`)
- 주문 내역 (`/orders`)
- 알림 (`/notifications`)
- 관리자 대시보드 (`/admin`)
- 로그아웃

### 사용자 액션 - 로그아웃 시 (1개)
- 로그인 (`/login`)

### 설정 (2개)
- 테마 전환 (라이트/다크 모드)
- 검색 페이지 (`/search`)

### 리소스 (4개)
- 이용약관 (`/terms`)
- 개인정보처리방침 (`/privacy`)
- 환불정책 (`/refund-policy`)
- 시스템 상태 (`/status`)

## 코드 예시

### 기본 사용
```typescript
// App.tsx에 이미 통합되어 있음
import { CommandPalette } from "./components/CommandPalette";

// ...
<CommandPalette />
```

### 커스텀 항목 추가 (향후)
```typescript
<CommandGroup heading="커스텀 액션">
  <CommandItem onSelect={() => handleSelect(() => customAction())}>
    <CustomIcon className="mr-2 h-4 w-4" />
    <span>커스텀 액션</span>
  </CommandItem>
</CommandGroup>
```

## 기술 스택

- **cmdk**: Command palette 기본 기능
- **@radix-ui/react-dialog**: 모달 UI
- **lucide-react**: 아이콘
- **react-router-dom**: 페이지 네비게이션
- **next-themes**: 테마 전환

## 파일 위치

- **UI 컴포넌트**: `src/components/ui/command.tsx`
- **메인 컴포넌트**: `src/components/CommandPalette.tsx`
- **문서**: `docs/guides/design-system/components/command-palette.md`

## 접근성 (WCAG 2.1)

- ✅ 키보드 네비게이션
- ✅ ARIA 속성 자동 제공
- ✅ 포커스 관리
- ✅ Esc 키 지원

## 성능

- **번들 크기**: ~13 kB (gzip)
- **로딩 방식**: Eager load (초기 번들 포함)
- **렌더링**: Dialog 열릴 때만 렌더링

## 트러블슈팅

### Command Palette가 열리지 않음
- 키보드 단축키 충돌 확인 (브라우저 확장 프로그램)
- 개발자 도구 콘솔에서 에러 확인

### 검색이 동작하지 않음
- CommandInput의 placeholder 텍스트 확인
- CommandEmpty 컴포넌트 표시 확인

### 항목 선택 후 페이지가 이동하지 않음
- react-router-dom의 useNavigate 훅 확인
- handleSelect 함수 로직 확인

## 향후 개선 사항

1. **최근 검색 기록** (P0)
2. **추천 항목** (P0)
3. **서비스 콘텐츠 검색** (P1)
4. **관리자 전용 액션** (P1)
5. **다국어 지원** (P2)

## 참고 링크

- [cmdk 문서](https://cmdk.paco.me/)
- [shadcn/ui Command](https://ui.shadcn.com/docs/components/command)
- [전체 문서](./command-palette.md)
