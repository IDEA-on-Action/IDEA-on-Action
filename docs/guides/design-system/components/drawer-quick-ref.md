# Drawer Quick Reference

## 1분 빠른 시작

### 기본 사용법
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

function MyDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>제목</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">콘텐츠</div>
      </DrawerContent>
    </Drawer>
  )
}
```

## Sheet vs Drawer

| | Sheet | Drawer |
|---|---|---|
| **방향** | 좌/우측 | 하단 |
| **모바일** | ⚠️ 불편 | ✅ 최적화 |
| **제스처** | X만 | 드래그 |

## 반응형 패턴

```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'

const isMobile = useIsMobile()

if (isMobile) {
  return <Drawer>...</Drawer> // 모바일
}

return <Sheet>...</Sheet> // 데스크톱
```

## 스크롤 패턴

```tsx
<DrawerContent className="max-h-[90vh] flex flex-col">
  <DrawerHeader>{/* 고정 */}</DrawerHeader>
  <ScrollArea className="flex-1">{/* 스크롤 */}</ScrollArea>
  <DrawerFooter>{/* 고정 */}</DrawerFooter>
</DrawerContent>
```

## 핵심 Props

```tsx
<Drawer
  open={true}                    // 열림/닫힘
  onOpenChange={setOpen}          // 상태 변경
  shouldScaleBackground={true}    // 배경 스케일
>
  <DrawerContent className="max-h-[90vh]">
    {/* 콘텐츠 */}
  </DrawerContent>
</Drawer>
```

## useMediaQuery

```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

const isMobile = useIsMobile()    // max-width: 640px
const isTablet = useIsTablet()    // 641px ~ 1024px
const isDesktop = useIsDesktop()  // min-width: 1025px
```

## Best Practices

### ✅ DO
- `max-h-[90vh]` - 높이 제한
- `ScrollArea` - 스크롤 분리
- `DrawerTitle` - 접근성
- `useIsMobile` - 반응형

### ❌ DON'T
- `h-full` - 화면 넘침
- 전체 스크롤 - 헤더 사라짐
- 타이틀 생략 - 접근성
- 모바일 Sheet - 불편

## 전체 문서
[drawer.md](./drawer.md) 참고
