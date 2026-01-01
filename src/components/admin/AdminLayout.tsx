/**
 * AdminLayout Component
 *
 * CMS 관리자 페이지용 공통 레이아웃
 * - 사이드바 네비게이션 (데스크탑: 고정, 모바일: Sheet)
 * - 권한 체크 (관리자가 아니면 403 페이지로 리다이렉트)
 * - 현재 페이지 하이라이트
 */

import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { Menu, Home, Map, Briefcase, Flask, Users, BookOpen, Tag, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import Header from '@/components/Header'
import { useAuth } from '@/hooks/auth/useAuth'
import { useIsAdmin } from '@/hooks/auth/useIsAdmin'
import { useUserRoles } from '@/hooks/auth/useRBAC'

interface AdminLayoutProps {
  children: ReactNode
}

interface MenuItem {
  label: string
  href: string
  icon: ReactNode
  requiredRole?: 'super_admin' // super_admin만 접근 가능
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: '대시보드',
    href: '/admin',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: '로드맵',
    href: '/admin/roadmap',
    icon: <Map className="h-5 w-5" />,
  },
  {
    label: '포트폴리오',
    href: '/admin/portfolio',
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    label: '실험실',
    href: '/admin/lab',
    icon: <Flask className="h-5 w-5" />,
  },
  {
    label: '팀원',
    href: '/admin/team',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: '블로그 카테고리',
    href: '/admin/blog/categories',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: '태그',
    href: '/admin/tags',
    icon: <Tag className="h-5 w-5" />,
  },
  {
    label: '관리자',
    href: '/admin/users',
    icon: <Shield className="h-5 w-5" />,
    requiredRole: 'super_admin',
  },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation()
  const { user } = useAuth()
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const { data: userRoles } = useUserRoles(user?.id)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 모바일 메뉴 닫기 (라우트 변경 시)
  // ⚠️ React Hooks 규칙: 훅은 조건문 이전에 호출되어야 함
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // 관리자가 아니면 403 페이지로 리다이렉트
  if (!isAdminLoading && !isAdmin) {
    return <Navigate to="/forbidden" replace />
  }

  // 로딩 중이면 스피너 표시
  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 사용자 역할 확인 (super_admin인지)
  const isSuperAdmin = userRoles?.some(
    ur => (ur.role as unknown as { name: string })?.name === 'super_admin'
  )

  // 권한에 따라 메뉴 필터링
  const visibleMenuItems = MENU_ITEMS.filter(item => {
    if (item.requiredRole === 'super_admin') {
      return isSuperAdmin
    }
    return true
  })

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.href

    return (
      <Link
        key={item.href}
        to={item.href}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Admin
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          콘텐츠 관리 시스템
        </p>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-2" aria-label="관리자 메뉴">
          {visibleMenuItems.map(renderMenuItem)}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r h-[calc(100vh-4rem)] sticky top-16">
          {sidebarContent}
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-gradient-primary hover:opacity-90"
                aria-label="관리자 메뉴 열기"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
