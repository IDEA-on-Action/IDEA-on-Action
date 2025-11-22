/**
 * useVersionControl Hook
 * CMS Phase 5: Version Control System
 *
 * Provides React Query hooks for version control operations:
 * - useVersionHistory - Fetch version history
 * - useCreateVersion - Create new version
 * - useRestoreVersion - Restore to previous version
 * - useVersionDiff - Compare two versions
 * - useAutoSave - Auto-save functionality
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  ContentVersion,
  ContentVersionWithCreator,
  ContentVersionInsert,
  ContentVersionType,
  VersionHistoryParams,
  VersionDiff,
  VersionChange,
  AutoSaveStatus,
  AutoSaveConfig,
  RestoreResult,
} from '@/types/version.types';

// =====================================================
// QUERY KEYS
// =====================================================

const VERSION_KEYS = {
  all: ['content_versions'] as const,
  history: (type: ContentVersionType, id: string) =>
    [...VERSION_KEYS.all, 'history', type, id] as const,
  version: (type: ContentVersionType, id: string, version: number) =>
    [...VERSION_KEYS.all, 'version', type, id, version] as const,
  latest: (type: ContentVersionType, id: string) =>
    [...VERSION_KEYS.all, 'latest', type, id] as const,
  count: (type: ContentVersionType, id: string) =>
    [...VERSION_KEYS.all, 'count', type, id] as const,
};

// =====================================================
// DEFAULT CONFIG
// =====================================================

const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  interval_ms: 30000, // 30 seconds
  debounce_ms: 2000, // 2 seconds debounce
  max_auto_saves: 5,
};

const DEFAULT_PAGE_SIZE = 20;

// =====================================================
// 1. useVersionHistory - Fetch paginated version history
// =====================================================

export function useVersionHistory(params: VersionHistoryParams) {
  const { content_type, content_id, limit = DEFAULT_PAGE_SIZE, include_auto_saves = false } = params;

  return useInfiniteQuery({
    queryKey: VERSION_KEYS.history(content_type, content_id),
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_version_history', {
        p_content_type: content_type,
        p_content_id: content_id,
        p_limit: limit,
        p_offset: pageParam,
        p_include_auto_saves: include_auto_saves,
      });

      if (error) {
        console.error('[useVersionHistory] Error:', error);
        throw error;
      }

      return {
        versions: (data || []) as ContentVersionWithCreator[],
        nextOffset: data && data.length === limit ? pageParam + limit : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!content_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// 2. useVersionCount - Get total version count
// =====================================================

export function useVersionCount(
  content_type: ContentVersionType,
  content_id: string,
  include_auto_saves = false
) {
  return useQuery({
    queryKey: VERSION_KEYS.count(content_type, content_id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_content_versions', {
        p_content_type: content_type,
        p_content_id: content_id,
        p_include_auto_saves: include_auto_saves,
      });

      if (error) {
        console.error('[useVersionCount] Error:', error);
        throw error;
      }

      return data as number;
    },
    enabled: !!content_id,
    staleTime: 1000 * 60 * 5,
  });
}

// =====================================================
// 3. useVersion - Fetch a specific version
// =====================================================

export function useVersion(
  content_type: ContentVersionType,
  content_id: string,
  version_number: number
) {
  return useQuery({
    queryKey: VERSION_KEYS.version(content_type, content_id, version_number),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_content_version', {
        p_content_type: content_type,
        p_content_id: content_id,
        p_version_number: version_number,
      });

      if (error) {
        console.error('[useVersion] Error:', error);
        throw error;
      }

      return data as ContentVersion | null;
    },
    enabled: !!content_id && version_number > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes (versions are immutable)
  });
}

// =====================================================
// 4. useLatestVersion - Fetch the latest version
// =====================================================

export function useLatestVersion(
  content_type: ContentVersionType,
  content_id: string,
  include_auto_saves = false
) {
  return useQuery({
    queryKey: VERSION_KEYS.latest(content_type, content_id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_latest_content_version', {
        p_content_type: content_type,
        p_content_id: content_id,
        p_include_auto_saves: include_auto_saves,
      });

      if (error) {
        console.error('[useLatestVersion] Error:', error);
        throw error;
      }

      return data as ContentVersion | null;
    },
    enabled: !!content_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// =====================================================
// 5. useCreateVersion - Create a new version
// =====================================================

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ContentVersionInsert) => {
      const { data, error } = await supabase.rpc('create_content_version', {
        p_content_type: params.content_type,
        p_content_id: params.content_id,
        p_content_snapshot: params.content_snapshot,
        p_change_summary: params.change_summary || null,
        p_is_auto_save: params.is_auto_save || false,
      });

      if (error) {
        console.error('[useCreateVersion] Error:', error);
        throw error;
      }

      return data as ContentVersion;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.history(variables.content_type, variables.content_id),
      });
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.latest(variables.content_type, variables.content_id),
      });
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.count(variables.content_type, variables.content_id),
      });

      // Only show toast for manual saves
      if (!variables.is_auto_save) {
        toast.success(`Version ${data.version_number} created`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });
}

// =====================================================
// 6. useRestoreVersion - Restore to a previous version
// =====================================================

interface UseRestoreVersionOptions {
  onRestoreSuccess?: (content: Record<string, unknown>) => void;
}

export function useRestoreVersion(options: UseRestoreVersionOptions = {}) {
  const queryClient = useQueryClient();
  const createVersion = useCreateVersion();

  return useMutation({
    mutationFn: async ({
      content_type,
      content_id,
      version_number,
    }: {
      content_type: ContentVersionType;
      content_id: string;
      version_number: number;
    }): Promise<RestoreResult> => {
      // Fetch the version to restore
      const { data: versionData, error: fetchError } = await supabase.rpc(
        'get_content_version',
        {
          p_content_type: content_type,
          p_content_id: content_id,
          p_version_number: version_number,
        }
      );

      if (fetchError) throw fetchError;
      if (!versionData) throw new Error('Version not found');

      const version = versionData as ContentVersion;

      // Create a new version with the restored content
      const newVersion = await createVersion.mutateAsync({
        content_type,
        content_id,
        content_snapshot: version.content_snapshot,
        change_summary: `Restored from version ${version_number}`,
        is_auto_save: false,
      });

      return {
        success: true,
        restored_version: version_number,
        new_version_created: newVersion.version_number,
        restored_content: version.content_snapshot,
      };
    },
    onSuccess: (data, variables) => {
      toast.success(`Restored to version ${data.restored_version}`);

      // Call the callback with restored content
      if (options.onRestoreSuccess) {
        options.onRestoreSuccess(data.restored_content);
      }

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.history(variables.content_type, variables.content_id),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore version: ${error.message}`);
    },
  });
}

// =====================================================
// 7. useVersionDiff - Compare two versions
// =====================================================

export function useVersionDiff(
  content_type: ContentVersionType,
  content_id: string,
  from_version: number,
  to_version: number
) {
  return useQuery({
    queryKey: ['version_diff', content_type, content_id, from_version, to_version],
    queryFn: async (): Promise<VersionDiff> => {
      // Fetch both versions
      const [fromResult, toResult] = await Promise.all([
        supabase.rpc('get_content_version', {
          p_content_type: content_type,
          p_content_id: content_id,
          p_version_number: from_version,
        }),
        supabase.rpc('get_content_version', {
          p_content_type: content_type,
          p_content_id: content_id,
          p_version_number: to_version,
        }),
      ]);

      if (fromResult.error) throw fromResult.error;
      if (toResult.error) throw toResult.error;

      const fromVersion = fromResult.data as ContentVersion;
      const toVersion = toResult.data as ContentVersion;

      if (!fromVersion || !toVersion) {
        throw new Error('One or both versions not found');
      }

      // Calculate diff
      const changes = calculateDiff(
        fromVersion.content_snapshot,
        toVersion.content_snapshot
      );

      return {
        from_version,
        to_version,
        changes,
        summary: `${changes.length} change${changes.length !== 1 ? 's' : ''} detected`,
      };
    },
    enabled: !!content_id && from_version > 0 && to_version > 0 && from_version !== to_version,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// =====================================================
// 8. useAutoSave - Auto-save functionality
// =====================================================

interface UseAutoSaveOptions {
  content_type: ContentVersionType;
  content_id: string;
  config?: Partial<AutoSaveConfig>;
  onSaved?: (version: ContentVersion) => void;
}

export function useAutoSave(options: UseAutoSaveOptions) {
  const { content_type, content_id, config: userConfig, onSaved } = options;
  const config = { ...DEFAULT_AUTO_SAVE_CONFIG, ...userConfig };

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<Record<string, unknown> | null>(null);

  const createVersion = useCreateVersion();
  const lastContentRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced content for comparison
  const debouncedContent = useDebounce(pendingContent, config.debounce_ms);

  // Check if online
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update status when offline
  useEffect(() => {
    if (!isOnline) {
      setStatus('offline');
    } else if (status === 'offline') {
      setStatus('idle');
    }
  }, [isOnline, status]);

  // Save function
  const performSave = useCallback(
    async (content: Record<string, unknown>) => {
      if (!config.enabled || !isOnline || !content_id) return;

      const contentString = JSON.stringify(content);
      if (contentString === lastContentRef.current) return;

      setStatus('saving');

      try {
        const version = await createVersion.mutateAsync({
          content_type,
          content_id,
          content_snapshot: content,
          is_auto_save: true,
        });

        lastContentRef.current = contentString;
        setLastSavedAt(new Date().toISOString());
        setStatus('saved');

        // Cleanup old auto-saves
        await supabase.rpc('cleanup_old_auto_saves', {
          p_content_type: content_type,
          p_content_id: content_id,
          p_keep_count: config.max_auto_saves,
        });

        if (onSaved) {
          onSaved(version);
        }

        // Reset status after a short delay
        setTimeout(() => {
          if (status === 'saved') {
            setStatus('idle');
          }
        }, 2000);
      } catch (error) {
        console.error('[useAutoSave] Save failed:', error);
        setStatus('error');
      }
    },
    [config.enabled, config.max_auto_saves, content_id, content_type, createVersion, isOnline, onSaved, status]
  );

  // Auto-save when debounced content changes
  useEffect(() => {
    if (debouncedContent && config.enabled && isOnline) {
      performSave(debouncedContent);
    }
  }, [debouncedContent, performSave, config.enabled, isOnline]);

  // Manual save function
  const save = useCallback(
    (content: Record<string, unknown>) => {
      setPendingContent(content);
    },
    []
  );

  // Cancel pending save
  const cancel = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setPendingContent(null);
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSavedAt,
    save,
    cancel,
    isOnline,
    isSaving: status === 'saving',
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate diff between two content snapshots
 */
function calculateDiff(
  oldContent: Record<string, unknown>,
  newContent: Record<string, unknown>
): VersionChange[] {
  const changes: VersionChange[] = [];
  const allKeys = new Set([...Object.keys(oldContent), ...Object.keys(newContent)]);

  for (const key of allKeys) {
    const oldValue = oldContent[key];
    const newValue = newContent[key];

    if (!(key in oldContent)) {
      changes.push({
        field: key,
        old_value: undefined,
        new_value: newValue,
        type: 'added',
      });
    } else if (!(key in newContent)) {
      changes.push({
        field: key,
        old_value: oldValue,
        new_value: undefined,
        type: 'removed',
      });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        old_value: oldValue,
        new_value: newValue,
        type: 'modified',
      });
    }
  }

  return changes;
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Hook to track if content has unsaved changes
 */
export function useUnsavedChanges(
  currentContent: Record<string, unknown> | null,
  savedContent: Record<string, unknown> | null
): boolean {
  if (!currentContent || !savedContent) return false;
  return JSON.stringify(currentContent) !== JSON.stringify(savedContent);
}

/**
 * Hook to warn before leaving with unsaved changes
 */
export function useWarnOnUnsavedChanges(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
