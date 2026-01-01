/**
 * VersionDiff Component
 * CMS Phase 5: Version Control System
 *
 * Displays the differences between two versions
 */

import { useMemo } from 'react';
import { Plus, Minus, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VersionDiff as VersionDiffType, VersionChange } from '@/types/shared/version.types';

interface VersionDiffProps {
  diff: VersionDiffType;
  className?: string;
}

export function VersionDiff({ diff, className }: VersionDiffProps) {
  // Group changes by type
  const groupedChanges = useMemo(() => {
    const added = diff.changes.filter((c) => c.type === 'added');
    const removed = diff.changes.filter((c) => c.type === 'removed');
    const modified = diff.changes.filter((c) => c.type === 'modified');

    return { added, removed, modified };
  }, [diff.changes]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between border-b pb-3">
        <h4 className="font-medium">
          Changes from v{diff.from_version} to v{diff.to_version}
        </h4>
        <div className="flex items-center gap-2">
          {groupedChanges.added.length > 0 && (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              +{groupedChanges.added.length} added
            </Badge>
          )}
          {groupedChanges.removed.length > 0 && (
            <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              -{groupedChanges.removed.length} removed
            </Badge>
          )}
          {groupedChanges.modified.length > 0 && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              ~{groupedChanges.modified.length} modified
            </Badge>
          )}
        </div>
      </div>

      {/* Changes list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {diff.changes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No differences found between these versions.
            </p>
          ) : (
            diff.changes.map((change, index) => (
              <ChangeItem key={index} change={change} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ChangeItemProps {
  change: VersionChange;
}

function ChangeItem({ change }: ChangeItemProps) {
  const getIcon = () => {
    switch (change.type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'modified':
        return <Edit2 className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getBgColor = () => {
    switch (change.type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      case 'modified':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === undefined || value === null) return '(empty)';
    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 200 ? value.substring(0, 200) + '...' : value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className={cn('rounded-lg border p-3 space-y-2', getBgColor())}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="font-mono text-sm font-medium">{change.field}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {change.type}
        </Badge>
      </div>

      {change.type === 'modified' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">Old value:</span>
            <pre className="p-2 rounded bg-background/50 overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {formatValue(change.old_value)}
            </pre>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">New value:</span>
            <pre className="p-2 rounded bg-background/50 overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {formatValue(change.new_value)}
            </pre>
          </div>
        </div>
      )}

      {change.type === 'added' && (
        <div className="text-xs space-y-1">
          <span className="text-muted-foreground">Added value:</span>
          <pre className="p-2 rounded bg-background/50 overflow-auto max-h-32 whitespace-pre-wrap break-words">
            {formatValue(change.new_value)}
          </pre>
        </div>
      )}

      {change.type === 'removed' && (
        <div className="text-xs space-y-1">
          <span className="text-muted-foreground">Removed value:</span>
          <pre className="p-2 rounded bg-background/50 overflow-auto max-h-32 whitespace-pre-wrap break-words line-through opacity-60">
            {formatValue(change.old_value)}
          </pre>
        </div>
      )}
    </div>
  );
}
