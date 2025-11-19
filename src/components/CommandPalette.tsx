import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Home,
  Briefcase,
  FileText,
  Folder,
  Settings,
  LogOut,
  Moon,
  Sun,
  Search,
  User,
  ShoppingCart,
  Bell,
  LayoutDashboard,
  Code,
  Sparkles,
  Users,
  BookOpen,
  Lightbulb,
  Map,
  Info,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from 'next-themes'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    callback()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="검색어를 입력하세요..." />
      <CommandList>
        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>

        {/* Pages */}
        <CommandGroup heading="페이지">
          <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4" />
            <span>홈</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/about'))}>
            <Info className="mr-2 h-4 w-4" />
            <span>회사소개</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/services'))}>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>서비스</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/roadmap'))}>
            <Map className="mr-2 h-4 w-4" />
            <span>로드맵</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/portfolio'))}>
            <Folder className="mr-2 h-4 w-4" />
            <span>포트폴리오</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/lab'))}>
            <Lightbulb className="mr-2 h-4 w-4" />
            <span>실험실</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/blog'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>블로그</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/work-with-us'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>협업하기</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Services */}
        <CommandGroup heading="서비스 상세">
          <CommandItem onSelect={() => handleSelect(() => navigate('/services/mvp'))}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>MVP 개발</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/services/fullstack'))}>
            <Code className="mr-2 h-4 w-4" />
            <span>풀스택 개발</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/services/design'))}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>디자인 시스템</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/services/operations'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>운영 관리</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* User Actions */}
        {user ? (
          <CommandGroup heading="사용자">
            <CommandItem onSelect={() => handleSelect(() => navigate('/profile'))}>
              <User className="mr-2 h-4 w-4" />
              <span>프로필</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/orders'))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>주문 내역</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/notifications'))}>
              <Bell className="mr-2 h-4 w-4" />
              <span>알림</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/admin'))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>관리자 대시보드</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  signOut()
                })
              }
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </CommandItem>
          </CommandGroup>
        ) : (
          <CommandGroup heading="사용자">
            <CommandItem onSelect={() => handleSelect(() => navigate('/login'))}>
              <User className="mr-2 h-4 w-4" />
              <span>로그인</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="설정">
          <CommandItem
            onSelect={() =>
              handleSelect(() => setTheme(theme === 'dark' ? 'light' : 'dark'))
            }
          >
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>테마 전환</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/search'))}>
            <Search className="mr-2 h-4 w-4" />
            <span>검색 페이지</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Resources */}
        <CommandGroup heading="리소스">
          <CommandItem onSelect={() => handleSelect(() => navigate('/terms'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>이용약관</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/privacy'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>개인정보처리방침</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/refund-policy'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>환불정책</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/status'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>시스템 상태</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
