/**
 * AutoSaveIndicator Component
 * CMS Phase 5: Version Control System
 *
 * Displays auto-save status with visual feedback
 */

import { Check, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutoSaveStatus } from '@/types/shared/version.types';
import { getAutoSaveStatusText, getVersionTimeAgo } from '@/types/shared/version.types';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  className,
}: AutoSaveIndicatorProps) {
  const statusText = getAutoSaveStatusText(status);
  const lastSavedText = lastSavedAt ? `Last saved ${getVersionTimeAgo(lastSavedAt)}` : null;

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'saved':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'offline':
        return <WifiOff className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'text-muted-foreground';
      case 'saved':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'offline':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  // Don't render anything if idle and no last saved time
  if (status === 'idle' && !lastSavedAt) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs',
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}
      <span>
        {statusText || lastSavedText}
      </span>
    </div>
  );
}
