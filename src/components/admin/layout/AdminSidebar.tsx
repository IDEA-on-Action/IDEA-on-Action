/**
 * AdminSidebar Component
 *
 * Collapsible sidebar navigation for admin pages with RBAC integration
 * - Desktop: persistent sidebar (256px expanded, 64px collapsed)
 * - Mobile: drawer overlay (Sheet component)
 * - Permission-based menu filtering (shows only authorized items)
 * - Loading skeleton while permissions are being fetched
 * - Menu sections with icons
 * - Active route highlighting
 * - User info at bottom
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useUserPermissions } from '@/hooks/auth/useRBAC';
import { useSidebarStore } from '@/stores/sidebarStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Briefcase,
  FlaskConical,
  Users,
  Map,
  FileText,
  FolderTree,
  Tag,
  Image,
  History,
  Settings,
  Home,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Mail,
  Bell,
  Package,
  ShoppingCart,
  Shield,
  Activity,
  DollarSign,
  Plug,
  MessageSquare,
  Database,
} from 'lucide-react';
import logoSymbol from '@/assets/logo-symbol.webp';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface AdminMenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string; // Permission required to view this menu item (e.g., 'blog:read', 'portfolio:manage')
  badge?: number;
  children?: AdminMenuItem[];
}

// Menu structure with RBAC permissions
const MENU_SECTIONS: { title: string; items: AdminMenuItem[] }[] = [
  {
    title: 'Dashboard',
    items: [
      { label: '대시보드', path: '/admin', icon: BarChart3 }, // No permission required - all admins can view
    ],
  },
  {
    title: 'Services',
    items: [
      { label: '서비스 관리', path: '/admin/services', icon: Package, permission: 'service:read' },
      { label: '주문 관리', path: '/admin/orders', icon: ShoppingCart, permission: 'order:read' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      { label: '공지사항', path: '/admin/notices', icon: Bell, permission: 'notice:read' },
      { label: 'Portfolio', path: '/admin/portfolio', icon: Briefcase, permission: 'service:read' },
      { label: 'Lab', path: '/admin/lab', icon: FlaskConical, permission: 'service:read' },
      { label: 'Team', path: '/admin/team', icon: Users, permission: 'user:read' },
      { label: 'Roadmap', path: '/admin/roadmap', icon: Map, permission: 'service:read' },
    ],
  },
  {
    title: 'Blog',
    items: [
      { label: 'Posts', path: '/admin/blog', icon: FileText, permission: 'blog:read' },
      { label: 'Categories', path: '/admin/blog/categories', icon: FolderTree, permission: 'blog:manage' },
      { label: 'Tags', path: '/admin/tags', icon: Tag, permission: 'blog:manage' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: '분석', path: '/admin/analytics', icon: Activity, permission: 'system:read' },
      { label: '매출', path: '/admin/revenue', icon: DollarSign, permission: 'order:read' },
      { label: '실시간', path: '/admin/realtime', icon: BarChart3, permission: 'system:read' },
      { label: 'D1 모니터링', path: '/admin/d1', icon: Database, permission: 'system:manage' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: '사용자 관리', path: '/admin/users', icon: Users, permission: 'user:manage' },
      { label: '역할 관리', path: '/admin/roles', icon: Shield, permission: 'user:manage' },
      { label: 'Media Library', path: '/admin/media', icon: Image, permission: 'system:read' },
      { label: 'Newsletter', path: '/admin/newsletter', icon: Mail, permission: 'system:read' },
      { label: '연동 관리', path: '/admin/integrations', icon: Plug, permission: 'system:manage' },
      { label: '프롬프트 템플릿', path: '/admin/prompt-templates', icon: MessageSquare, permission: 'system:manage' },
      { label: 'Activity Logs', path: '/admin/audit-logs', icon: History, permission: 'system:manage' },
    ],
  },
];

interface AdminSidebarProps {
  /** Mobile only: show as drawer */
  isMobileOpen?: boolean;
  /** Mobile only: close drawer callback */
  onMobileClose?: () => void;
}

export function AdminSidebar({ isMobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isOpen, toggle } = useSidebarStore();
  const { data: permissions = [], isLoading: isLoadingPermissions } = useUserPermissions(user?.id);

  const isActiveRoute = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Check if user has permission to view a menu item
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true; // No permission required
    return permissions.some(p => p.permission_name === permission);
  };

  // Filter menu items based on permissions
  const filterMenuItems = (items: AdminMenuItem[]): AdminMenuItem[] => {
    return items.filter(item => hasPermission(item.permission));
  };

  // Filter sections that have at least one visible item
  const visibleSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: filterMenuItems(section.items),
  })).filter(section => section.items.length > 0);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={cn(
        'p-6 border-b border-border flex items-center gap-3',
        !isOpen && 'justify-center'
      )}>
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoSymbol}
            alt="IDEA on Action Logo"
            className="h-10 w-10 flex-shrink-0"
          />
          {isOpen && (
            <div>
              <h1 className="font-bold text-lg">IDEA on Action</h1>
              <p className="text-xs text-muted-foreground">관리자 패널</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {isLoadingPermissions ? (
            // Loading skeleton while permissions are being fetched
            <div className="space-y-6">
              {[1, 2, 3].map((section) => (
                <div key={section}>
                  {isOpen && (
                    <Skeleton className="h-4 w-32 mb-2 ml-3" />
                  )}
                  <div className="space-y-1">
                    {[1, 2, 3].map((item) => (
                      <Skeleton
                        key={item}
                        className={cn(
                          'h-10 w-full',
                          !isOpen && 'w-10'
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Render filtered menu sections
            visibleSections.map((section) => (
              <div key={section.title}>
                {isOpen && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onMobileClose}
                      >
                        <Button
                          variant={isActive ? 'default' : 'ghost'}
                          className={cn(
                            'w-full',
                            isOpen ? 'justify-start' : 'justify-center',
                            !isOpen && 'px-2'
                          )}
                          size={isOpen ? 'default' : 'icon'}
                          aria-label={item.label}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className={cn('h-4 w-4', isOpen && 'mr-2')} />
                          {isOpen && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              {item.badge && (
                                <Badge variant="secondary" className="ml-auto">
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>
      </ScrollArea>

      {/* User Section + Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {/* User Info */}
        {user && (
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg bg-muted/50',
            !isOpen && 'justify-center'
          )}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.email?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  Admin
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <Link to="/">
          <Button
            variant="outline"
            className={cn(
              'w-full',
              isOpen ? 'justify-start' : 'justify-center',
              !isOpen && 'px-2'
            )}
            size={isOpen ? 'default' : 'icon'}
            aria-label="사이트로 돌아가기"
          >
            <Home className={cn('h-4 w-4', isOpen && 'mr-2')} />
            {isOpen && <span>사이트로 돌아가기</span>}
          </Button>
        </Link>

        <Button
          variant="ghost"
          className={cn(
            'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            isOpen ? 'justify-start' : 'justify-center',
            !isOpen && 'px-2'
          )}
          size={isOpen ? 'default' : 'icon'}
          onClick={handleSignOut}
          aria-label="로그아웃"
        >
          <LogOut className={cn('h-4 w-4', isOpen && 'mr-2')} />
          {isOpen && <span>로그아웃</span>}
        </Button>
      </div>

      {/* Desktop: Toggle Button */}
      <div className="hidden lg:block p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full"
          onClick={toggle}
          aria-label={isOpen ? '사이드바 접기' : '사이드바 펼치기'}
        >
          {isOpen ? (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>접기</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  // Mobile: Drawer (Sheet)
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Persistent Sidebar
  return (
    <aside
      className={cn(
        'hidden lg:block fixed top-0 left-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
        isOpen ? 'w-64' : 'w-16'
      )}
      aria-label="관리자 네비게이션"
    >
      <SidebarContent />
    </aside>
  );
}
