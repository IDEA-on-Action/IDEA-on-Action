import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export interface GiscusCommentsProps {
  /** The GitHub repository in the format "owner/repo" */
  repo?: string;
  /** The repository ID (from Giscus settings) */
  repoId?: string;
  /** The category name for discussions */
  category?: string;
  /** The category ID (from Giscus settings) */
  categoryId?: string;
  /** Mapping between parent page and discussion */
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  /** Enable reactions */
  reactionsEnabled?: boolean;
  /** Language */
  lang?: string;
}

// Lazy load the actual Giscus component
const GiscusCommentsCore = lazy(() => import('./GiscusCommentsCore'));

/**
 * Giscus Comments Component (Lazy Loaded)
 *
 * GitHub Discussions-based comment system using Giscus.
 * This component is lazy loaded to reduce initial bundle size.
 *
 * Setup Instructions:
 * 1. Install Giscus app on your repository: https://github.com/apps/giscus
 * 2. Enable Discussions in your repository settings
 * 3. Get your repository ID and category ID from: https://giscus.app/
 * 4. Update the props below with your repository information
 *
 * Example:
 * <GiscusComments
 *   repo="IDEA-on-Action/idea-on-action"
 *   repoId="YOUR_REPO_ID"
 *   category="General"
 *   categoryId="YOUR_CATEGORY_ID"
 * />
 */
export const GiscusComments = (props: GiscusCommentsProps) => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      }
    >
      <GiscusCommentsCore {...props} />
    </Suspense>
  );
};
