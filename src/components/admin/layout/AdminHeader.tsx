/**
 * AdminHeader Component
 *
 * Fixed top header for admin pages
 * - Breadcrumb navigation (Home > Content > Portfolio > Edit)
 * - Global search input (Command+K shortcut)
 * - Notifications bell (NotificationBell component)
 * - Theme toggle
 * - Language switcher
 * - User dropdown (Profile, Subscriptions, Settings, Logout)
 * - Mobile: hamburger menu button
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search as SearchIcon, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { NotificationBell } from '@/components/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/auth/useAuth';
import { useSidebarStore } from '@/stores/sidebarStore';
import { cn } from '@/lib/utils';

interface AdminHeaderProps {
  /** Mobile only: toggle sidebar drawer */
  onMobileMenuToggle?: () => void;
}

export function AdminHeader({ onMobileMenuToggle }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isOpen } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border transition-all duration-300',
        'lg:left-64', // Desktop: offset by sidebar width (expanded)
        !isOpen && 'lg:left-16' // Desktop: offset by sidebar width (collapsed)
      )}
      aria-label="관리자 헤더"
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop: Global Search */}
          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative w-64 lg:w-96">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="검색... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
                aria-label="관리자 검색"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 px-1.5 items-center gap-1 rounded border border-border bg-muted text-xs text-muted-foreground">
                <span>⌘</span>K
              </kbd>
            </div>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile: Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => navigate('/admin/search')}
            aria-label="검색"
          >
            <SearchIcon className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                  aria-label="사용자 메뉴 열기"
                >
                  <Avatar>
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {user.email?.[0]?.toUpperCase() || <UserIcon className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* User Info */}
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>

                <DropdownMenuSeparator />

                {/* Menu Items */}
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  aria-label="프로필 페이지로 이동"
                >
                  프로필
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/profile/subscriptions')}
                  aria-label="구독 관리 페이지로 이동"
                >
                  구독 관리
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/admin/settings')}
                  aria-label="관리자 설정으로 이동"
                >
                  설정
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                  aria-label="로그아웃"
                >
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
