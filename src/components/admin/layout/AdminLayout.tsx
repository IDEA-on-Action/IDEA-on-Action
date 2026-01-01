/**
 * AdminLayout Component (Updated)
 *
 * Main layout wrapper for all admin pages
 * - Combines AdminSidebar + AdminHeader + AdminBreadcrumb
 * - Protected route (useIsAdmin hook)
 * - Responsive layout (mobile drawer, desktop persistent)
 * - Loading state while checking auth
 * - Redirect to /login if not admin
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/auth/useIsAdmin';
import { useSidebarStore } from '@/stores/sidebarStore';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { cn } from '@/lib/utils';

// Loading Spinner
function AdminLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">관리자 권한 확인 중...</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { isOpen } = useSidebarStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth & Admin Check
  useEffect(() => {
    // Wait for both auth and admin checks to complete
    if (authLoading || isAdminLoading) {
      return;
    }

    // Redirect if not logged in
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Redirect if not admin
    if (isAdmin === false) {
      navigate('/forbidden', { replace: true });
    }
  }, [user, isAdmin, authLoading, isAdminLoading, navigate]);

  // Show loading while checking auth
  if (authLoading || isAdminLoading || !user || isAdmin === undefined) {
    return <AdminLoadingFallback />;
  }

  // Show nothing if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          'lg:ml-64', // Desktop: offset by sidebar width (expanded)
          !isOpen && 'lg:ml-16' // Desktop: offset by sidebar width (collapsed)
        )}
      >
        {/* Header */}
        <AdminHeader onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col mt-16 overflow-hidden">
          {/* Breadcrumb */}
          <AdminBreadcrumb />

          {/* Page Content */}
          <main
            id="admin-content"
            className="flex-1 overflow-auto p-6"
            aria-label="관리자 콘텐츠"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
