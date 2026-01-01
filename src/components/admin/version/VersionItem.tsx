/**
 * VersionItem Component
 * CMS Phase 5: Version Control System
 *
 * Displays a single version entry in the history list
 */

import { Clock, RotateCcw, GitCompare, Save, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ContentVersionWithCreator } from '@/types/shared/version.types';
import { formatVersionNumber, getVersionTimeAgo } from '@/types/shared/version.types';

interface VersionItemProps {
  version: ContentVersionWithCreator;
  isSelected?: boolean;
  isCurrent?: boolean;
  onSelect?: () => void;
  onRestore?: () => void;
  onCompare?: () => void;
}

export function VersionItem({
  version,
  isSelected = false,
  isCurrent = false,
  onSelect,
  onRestore,
  onCompare,
}: VersionItemProps) {
  const formattedVersion = formatVersionNumber(version.version_number);
  const timeAgo = getVersionTimeAgo(version.created_at);
  const creatorName = version.creator_email?.split('@')[0] || 'Unknown';

  return (
    <div
      className={cn(
        'group flex items-start justify-between p-3 rounded-lg border transition-colors cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50',
        isCurrent && 'border-green-500/50 bg-green-500/5'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Version Icon */}
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            version.is_auto_save
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-primary/10 text-primary'
          )}
        >
          {version.is_auto_save ? (
            <Zap className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </div>

        {/* Version Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{formattedVersion}</span>
            {isCurrent && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Current
              </Badge>
            )}
            {version.is_auto_save && (
              <Badge variant="secondary" className="text-xs">
                Auto-save
              </Badge>
            )}
          </div>

          {version.change_summary && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {version.change_summary}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
            <span>by {creatorName}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onCompare && !isCurrent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompare();
                  }}
                >
                  <GitCompare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Compare with current</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {onRestore && !isCurrent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore this version</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
