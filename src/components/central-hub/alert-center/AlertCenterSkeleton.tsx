/**
 * AlertCenter 로딩 스켈레톤 컴포넌트
 *
 * @module components/central-hub/alert-center/AlertCenterSkeleton
 */

import { Skeleton } from '@/components/ui/skeleton';

/**
 * 로딩 스켈레톤
 */
export function AlertCenterSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2 pl-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
