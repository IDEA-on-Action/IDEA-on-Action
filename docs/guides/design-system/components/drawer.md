# Drawer Component Guide

## 개요
Drawer는 화면 하단에서 슬라이드되는 모달 컴포넌트로, **모바일 친화적인 UX**를 제공합니다.

## 라이브러리
- **vaul**: Drawer primitive 컴포넌트
- **@radix-ui/react-dialog**: 접근성 기반 Dialog 컴포넌트

## Sheet vs Drawer 비교

| 특징 | Sheet | Drawer |
|------|-------|--------|
| **슬라이드 방향** | 좌/우측 | 하단 |
| **모바일 UX** | ⚠️ 불편 (좁은 화면) | ✅ 최적화 |
| **제스처** | X 버튼만 | 드래그 (Swipe Down) |
| **사용 사례** | 데스크톱 사이드바 | 모바일 액션 시트 |
| **접근성** | Radix Dialog | Vaul + Radix |

### Sheet의 모바일 문제점
```tsx
// ❌ 모바일에서 Sheet는 화면을 좌우로 덮음
<Sheet>
  <SheetContent side="right" className="w-full">
    {/* 좁은 화면에서 콘텐츠가 답답함 */}
  </SheetContent>
</Sheet>
```

### Drawer의 모바일 장점
```tsx
// ✅ Drawer는 하단에서 올라와 자연스러운 제스처
<Drawer>
  <DrawerContent className="max-h-[90vh]">
    {/* 드래그로 닫기 가능, 화면 활용 최적화 */}
  </DrawerContent>
</Drawer>
```

## 컴포넌트 구조

### 기본 구조
```tsx
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

function MyDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>제목</DrawerTitle>
          <DrawerDescription>설명</DrawerDescription>
        </DrawerHeader>

        {/* 콘텐츠 */}
        <div className="p-4">
          <p>내용...</p>
        </div>

        <DrawerFooter>
          <button>확인</button>
          <DrawerClose asChild>
            <button>취소</button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

### 주요 Props

#### Drawer (Root)
- `open`: boolean - 열림/닫힘 상태
- `onOpenChange`: (open: boolean) => void - 상태 변경 핸들러
- `shouldScaleBackground`: boolean - 배경 스케일 애니메이션 (기본: true)

#### DrawerContent
- `className`: string - 스타일 클래스 (max-h 설정 권장)
- 기본값: `max-h-[90vh]` (화면의 90% 높이)

## 사용 예시

### 1. 기본 Drawer
```tsx
import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

function BasicDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Drawer 열기</button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>기본 Drawer</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <p>하단에서 슬라이드되는 Drawer입니다.</p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
```

### 2. 반응형 Cart Drawer (Sheet + Drawer)
```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

function ResponsiveCartDrawer() {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const CartContent = () => (
    <div className="p-4">
      {/* 공통 장바구니 콘텐츠 */}
    </div>
  )

  // 모바일: Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[90vh]">
          <CartContent />
        </DrawerContent>
      </Drawer>
    )
  }

  // 데스크톱: Sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right">
        <CartContent />
      </SheetContent>
    </Sheet>
  )
}
```

### 3. 스크롤 가능한 Drawer
```tsx
import { ScrollArea } from '@/components/ui/scroll-area'

function ScrollableDrawer() {
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>긴 콘텐츠</DrawerTitle>
        </DrawerHeader>

        {/* ScrollArea로 내부 콘텐츠만 스크롤 */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i}>항목 {i + 1}</p>
            ))}
          </div>
        </ScrollArea>

        <DrawerFooter>
          <button>확인</button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

### 4. 폼이 있는 Drawer
```tsx
function FormDrawer() {
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 폼 제출 로직
    setOpen(false)
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>정보 입력</DrawerTitle>
          <DrawerDescription>아래 정보를 입력하세요</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <input type="text" placeholder="이름" className="w-full" />
          <input type="email" placeholder="이메일" className="w-full" />

          <DrawerFooter>
            <button type="submit">저장</button>
            <DrawerClose asChild>
              <button type="button">취소</button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
```

## 모바일 UX 최적화

### 1. 드래그 제스처
Drawer는 자동으로 드래그 제스처를 지원합니다:
- **Swipe Down**: Drawer 닫기
- **Drag Handle**: 상단에 자동 추가되는 핸들바

### 2. 높이 제한
```tsx
// ✅ 권장: max-h로 높이 제한
<DrawerContent className="max-h-[90vh]">

// ❌ 비권장: 높이 제한 없음 (화면 넘침)
<DrawerContent className="h-full">
```

### 3. 스크롤 영역 분리
```tsx
// ✅ 권장: 헤더/푸터 고정, 콘텐츠만 스크롤
<DrawerContent className="flex flex-col">
  <DrawerHeader>{/* 고정 헤더 */}</DrawerHeader>
  <ScrollArea className="flex-1">{/* 스크롤 콘텐츠 */}</ScrollArea>
  <DrawerFooter>{/* 고정 푸터 */}</DrawerFooter>
</DrawerContent>

// ❌ 비권장: 전체 스크롤 (헤더/푸터도 사라짐)
<ScrollArea>
  <DrawerContent>...</DrawerContent>
</ScrollArea>
```

### 4. 배경 스케일 효과
```tsx
// 배경 스케일 애니메이션 비활성화
<Drawer shouldScaleBackground={false}>
  <DrawerContent>...</DrawerContent>
</Drawer>
```

## 접근성

### 1. ARIA 속성 (자동 처리)
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby`: DrawerTitle ID
- `aria-describedby`: DrawerDescription ID

### 2. 키보드 네비게이션
- **Escape**: Drawer 닫기
- **Tab**: 포커스 이동 (Drawer 내부로 제한)

### 3. 포커스 트랩
Drawer가 열리면 포커스가 자동으로 내부로 이동하고, 닫히면 이전 요소로 복원됩니다.

## useMediaQuery Hook

### 사용법
```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

function ResponsiveComponent() {
  const isMobile = useIsMobile()      // max-width: 640px
  const isTablet = useIsTablet()      // 641px ~ 1024px
  const isDesktop = useIsDesktop()    // min-width: 1025px

  return (
    <div>
      {isMobile && <p>모바일</p>}
      {isTablet && <p>태블릿</p>}
      {isDesktop && <p>데스크톱</p>}
    </div>
  )
}
```

### 커스텀 미디어 쿼리
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery'

function CustomBreakpoint() {
  const isXL = useMediaQuery('(min-width: 1280px)')
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  return (
    <div>
      {isXL && <p>XL 화면</p>}
      {isDarkMode && <p>다크 모드</p>}
    </div>
  )
}
```

## 실제 사용 사례: CartDrawer

### 구현 전략
1. **공통 콘텐츠 컴포넌트**: CartContent를 별도로 분리
2. **조건부 렌더링**: useIsMobile로 Sheet/Drawer 분기
3. **스타일 일관성**: 동일한 padding, spacing 유지

### 코드 예시
```tsx
// src/components/cart/CartDrawer.tsx
export function CartDrawer() {
  const isMobile = useIsMobile()
  const { isOpen, closeCart } = useCartStore()

  // 공통 콘텐츠
  const CartContent = () => (
    <ScrollArea className="flex-1 px-6">
      {/* 장바구니 항목 리스트 */}
    </ScrollArea>
  )

  // 모바일: Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={closeCart}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader>...</DrawerHeader>
          <CartContent />
          <DrawerFooter>...</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  // 데스크톱: Sheet
  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="right">
        <SheetHeader>...</SheetHeader>
        <CartContent />
      </SheetContent>
    </Sheet>
  )
}
```

## 마이그레이션 가이드

### Sheet → Drawer
```tsx
// Before (Sheet만 사용)
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>제목</SheetTitle>
    </SheetHeader>
    <div>콘텐츠</div>
  </SheetContent>
</Sheet>

// After (반응형: Sheet + Drawer)
const isMobile = useIsMobile()

if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>제목</DrawerTitle>
        </DrawerHeader>
        <div>콘텐츠</div>
      </DrawerContent>
    </Drawer>
  )
}

return (
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>제목</SheetTitle>
      </SheetHeader>
      <div>콘텐츠</div>
    </SheetContent>
  </Sheet>
)
```

## Best Practices

### ✅ 권장 사항
1. **모바일 우선**: 모바일에서는 Drawer 사용
2. **높이 제한**: `max-h-[90vh]` 설정
3. **스크롤 분리**: ScrollArea로 콘텐츠만 스크롤
4. **공통 컴포넌트**: Sheet/Drawer에서 재사용
5. **제스처 활용**: Swipe Down 지원

### ❌ 피해야 할 사항
1. **모바일에서 Sheet**: 화면이 좁아 불편
2. **높이 제한 없음**: 화면 넘침
3. **전체 스크롤**: 헤더/푸터가 사라짐
4. **코드 중복**: Sheet/Drawer 콘텐츠 별도 작성
5. **접근성 무시**: DrawerTitle, DrawerDescription 생략

## 참고 자료
- [vaul GitHub](https://github.com/emilkowalski/vaul)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/drawer)
- [useMediaQuery Hook](../../../hooks/useMediaQuery.ts)
