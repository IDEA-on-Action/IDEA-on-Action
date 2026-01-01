/**
 * VersionRestoreDialog Component
 * CMS Phase 5: Version Control System
 *
 * Confirmation dialog for restoring a version
 */

import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ContentVersion } from '@/types/shared/version.types';
import { formatVersionNumber, getVersionTimeAgo } from '@/types/shared/version.types';

interface VersionRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ContentVersion | null;
  onConfirm: () => void;
  isRestoring: boolean;
}

export function VersionRestoreDialog({
  open,
  onOpenChange,
  version,
  onConfirm,
  isRestoring,
}: VersionRestoreDialogProps) {
  if (!version) return null;

  const formattedVersion = formatVersionNumber(version.version_number);
  const timeAgo = getVersionTimeAgo(version.created_at);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restore {formattedVersion}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to restore the content to {formattedVersion}, saved {timeAgo}.
            </p>

            {version.change_summary && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="font-medium">Version note: </span>
                {version.change_summary}
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 p-3 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">This action will:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Replace the current content with this version</li>
                  <li>Create a new version entry with the restored content</li>
                  <li>Any unsaved changes will be lost</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRestoring}
            className="bg-primary"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Version
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
