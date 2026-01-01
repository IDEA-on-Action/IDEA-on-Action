/**
 * VersionCompareDialog Component
 * CMS Phase 5: Version Control System
 *
 * Dialog for comparing two versions
 */

import { GitCompare, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VersionDiff } from './VersionDiff';
import { useVersionDiff } from '@/hooks/content/useVersionControl';
import type { ContentVersionType } from '@/types/shared/version.types';

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentVersionType;
  contentId: string;
  fromVersion: number;
  toVersion: number;
}

export function VersionCompareDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  fromVersion,
  toVersion,
}: VersionCompareDialogProps) {
  const { data: diff, isLoading, error } = useVersionDiff(
    contentType,
    contentId,
    fromVersion,
    toVersion
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Versions
          </DialogTitle>
          <DialogDescription>
            Viewing differences between version {fromVersion} and version {toVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Failed to load version comparison</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : diff ? (
            <VersionDiff diff={diff} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No comparison data available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
