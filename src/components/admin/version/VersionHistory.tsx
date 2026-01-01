/**
 * VersionHistory Component
 * CMS Phase 5: Version Control System
 *
 * Displays paginated version history with actions
 */

import { useState } from 'react';
import { History, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { VersionItem } from './VersionItem';
import { VersionRestoreDialog } from './VersionRestoreDialog';
import { useVersionHistory, useRestoreVersion, useVersionCount } from '@/hooks/content/useVersionControl';
import type { ContentVersionType, ContentVersion, ContentVersionWithCreator } from '@/types/version.types';

interface VersionHistoryProps {
  contentType: ContentVersionType;
  contentId: string;
  currentVersionNumber?: number;
  onRestore?: (content: Record<string, unknown>) => void;
  onCompare?: (fromVersion: number, toVersion: number) => void;
  className?: string;
}

export function VersionHistory({
  contentType,
  contentId,
  currentVersionNumber,
  onRestore,
  onCompare,
  className,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContentVersionWithCreator | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<ContentVersion | null>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useVersionHistory({
    content_type: contentType,
    content_id: contentId,
    include_auto_saves: false,
  });

  const { data: versionCount } = useVersionCount(contentType, contentId);

  const restoreVersion = useRestoreVersion({
    onRestoreSuccess: (content) => {
      setRestoreDialogOpen(false);
      setVersionToRestore(null);
      if (onRestore) {
        onRestore(content);
      }
    },
  });

  // Flatten paginated data
  const versions = data?.pages.flatMap((page) => page.versions) || [];

  const handleRestoreClick = (version: ContentVersionWithCreator) => {
    setVersionToRestore(version);
    setRestoreDialogOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!versionToRestore) return;

    await restoreVersion.mutateAsync({
      content_type: contentType,
      content_id: contentId,
      version_number: versionToRestore.version_number,
    });
  };

  const handleCompare = (version: ContentVersionWithCreator) => {
    if (onCompare && currentVersionNumber) {
      onCompare(version.version_number, currentVersionNumber);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={cn('gap-2', className)}>
            <History className="h-4 w-4" />
            <span>History</span>
            {versionCount !== undefined && versionCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {versionCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>
              Browse and restore previous versions of this content.
              {versionCount !== undefined && ` ${versionCount} versions available.`}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
            <div className="space-y-2">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                ))
              ) : versions.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No version history yet</p>
                  <p className="text-xs mt-1">Versions will appear here after you save changes</p>
                </div>
              ) : (
                // Version list
                <>
                  {versions.map((version) => (
                    <VersionItem
                      key={version.id}
                      version={version}
                      isSelected={selectedVersion?.id === version.id}
                      isCurrent={version.version_number === currentVersionNumber}
                      onSelect={() => setSelectedVersion(version)}
                      onRestore={
                        version.version_number !== currentVersionNumber
                          ? () => handleRestoreClick(version)
                          : undefined
                      }
                      onCompare={
                        version.version_number !== currentVersionNumber && onCompare
                          ? () => handleCompare(version)
                          : undefined
                      }
                    />
                  ))}

                  {/* Load more button */}
                  {hasNextPage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Load more
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Restore Confirmation Dialog */}
      <VersionRestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        version={versionToRestore}
        onConfirm={handleConfirmRestore}
        isRestoring={restoreVersion.isPending}
      />
    </>
  );
}
