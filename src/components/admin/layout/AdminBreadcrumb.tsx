/**
 * AdminBreadcrumb Component
 *
 * Auto-generate breadcrumb navigation from current route
 * - Clickable links (React Router)
 * - Current page (non-clickable, bold)
 * - Max 4 levels, truncate with "..."
 * - ChevronRight separator
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Route to label mapping
const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/portfolio': 'Portfolio',
  '/admin/portfolio/new': 'New Project',
  '/admin/portfolio/edit': 'Edit Project',
  '/admin/lab': 'Lab',
  '/admin/lab/new': 'New Experiment',
  '/admin/lab/edit': 'Edit Experiment',
  '/admin/team': 'Team',
  '/admin/team/new': 'New Member',
  '/admin/team/edit': 'Edit Member',
  '/admin/roadmap': 'Roadmap',
  '/admin/roadmap/new': 'New Item',
  '/admin/roadmap/edit': 'Edit Item',
  '/admin/blog': 'Posts',
  '/admin/blog/new': 'New Post',
  '/admin/blog/edit': 'Edit Post',
  '/admin/blog/categories': 'Categories',
  '/admin/blog/categories/new': 'New Category',
  '/admin/blog/categories/edit': 'Edit Category',
  '/admin/tags': 'Tags',
  '/admin/tags/new': 'New Tag',
  '/admin/tags/edit': 'Edit Tag',
  '/admin/media': 'Media Library',
  '/admin/audit-logs': 'Activity Logs',
  '/admin/settings': 'Settings',
  '/admin/users': 'Users',
  '/admin/users/new': 'New User',
  '/admin/users/edit': 'Edit User',
  '/admin/analytics': 'Analytics',
  '/admin/revenue': 'Revenue',
  '/admin/realtime': 'Realtime',
  '/admin/services': 'Services',
  '/admin/services/new': 'New Service',
  '/admin/services/edit': 'Edit Service',
  '/admin/notices': 'Notices',
  '/admin/notices/new': 'New Notice',
  '/admin/notices/edit': 'Edit Notice',
  '/admin/roles': 'Roles',
  '/admin/orders': 'Orders',
};

const MAX_BREADCRUMB_LEVELS = 4;

/**
 * Generate breadcrumb items from current pathname
 */
function generateBreadcrumbs(pathname: string): { path: string; label: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { path: string; label: string }[] = [];

  // Build cumulative paths
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = BREADCRUMB_MAP[currentPath] || segment;
    breadcrumbs.push({ path: currentPath, label });
  }

  // Truncate if exceeds max levels
  if (breadcrumbs.length > MAX_BREADCRUMB_LEVELS) {
    const first = breadcrumbs[0];
    const last = breadcrumbs.slice(-2); // Keep last 2 items
    return [
      first,
      { path: '', label: '...' }, // Ellipsis
      ...last,
    ];
  }

  return breadcrumbs;
}

export function AdminBreadcrumb() {
  const location = useLocation();
  const breadcrumbs = generateBreadcrumbs(location.pathname);

  // Hide breadcrumb on root admin page
  if (location.pathname === '/admin') {
    return null;
  }

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto px-6 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home Icon */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin" className="flex items-center">
                  <Home className="h-4 w-4" aria-label="Dashboard" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {breadcrumbs.length > 0 && <BreadcrumbSeparator><ChevronRight /></BreadcrumbSeparator>}

            {/* Breadcrumb Items */}
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isEllipsis = crumb.label === '...';

              return (
                <div key={crumb.path || index} className="flex items-center">
                  <BreadcrumbItem>
                    {isLast ? (
                      // Last item: non-clickable, bold
                      <BreadcrumbPage className="font-medium">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : isEllipsis ? (
                      // Ellipsis: non-clickable
                      <span className="text-muted-foreground">{crumb.label}</span>
                    ) : (
                      // Clickable link
                      <BreadcrumbLink asChild>
                        <Link
                          to={crumb.path}
                          className={cn(
                            'text-muted-foreground hover:text-foreground transition-colors'
                          )}
                        >
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>

                  {!isLast && (
                    <BreadcrumbSeparator>
                      <ChevronRight />
                    </BreadcrumbSeparator>
                  )}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
