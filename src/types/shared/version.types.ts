/**
 * Version Control TypeScript Type Definitions
 * CMS Phase 5: Version Control System
 *
 * Provides type definitions for content versioning system.
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Content types that support versioning
 */
export type ContentVersionType = 'blog' | 'notice' | 'page';

/**
 * Auto-save status indicators
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

// =====================================================
// INTERFACES - Database Tables
// =====================================================

/**
 * Content version record
 * Table: public.content_versions
 */
export interface ContentVersion {
  id: string;
  content_type: ContentVersionType;
  content_id: string;
  version_number: number;
  content_snapshot: Record<string, unknown>;
  change_summary: string | null;
  is_auto_save: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Content version with creator information
 */
export interface ContentVersionWithCreator extends ContentVersion {
  creator_email?: string | null;
}

// =====================================================
// INSERT & UPDATE TYPES
// =====================================================

/**
 * Content version insert type
 */
export interface ContentVersionInsert {
  content_type: ContentVersionType;
  content_id: string;
  content_snapshot: Record<string, unknown>;
  change_summary?: string | null;
  is_auto_save?: boolean;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

/**
 * Parameters for fetching version history
 */
export interface VersionHistoryParams {
  content_type: ContentVersionType;
  content_id: string;
  limit?: number;
  offset?: number;
  include_auto_saves?: boolean;
}

/**
 * Paginated version history response
 */
export interface VersionHistoryResponse {
  versions: ContentVersionWithCreator[];
  total_count: number;
  has_more: boolean;
}

// =====================================================
// DIFF TYPES
// =====================================================

/**
 * Represents a change between two versions
 */
export interface VersionChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
  type: 'added' | 'removed' | 'modified';
}

/**
 * Diff result between two versions
 */
export interface VersionDiff {
  from_version: number;
  to_version: number;
  changes: VersionChange[];
  summary: string;
}

/**
 * Parameters for comparing versions
 */
export interface VersionCompareParams {
  content_type: ContentVersionType;
  content_id: string;
  from_version: number;
  to_version: number;
}

// =====================================================
// AUTO-SAVE TYPES
// =====================================================

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  interval_ms: number;
  debounce_ms: number;
  max_auto_saves: number;
}

/**
 * Auto-save state
 */
export interface AutoSaveState {
  status: AutoSaveStatus;
  last_saved_at: string | null;
  pending_changes: boolean;
  error_message?: string;
}

// =====================================================
// RESTORE TYPES
// =====================================================

/**
 * Parameters for restoring a version
 */
export interface RestoreVersionParams {
  content_type: ContentVersionType;
  content_id: string;
  version_number: number;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  restored_version: number;
  new_version_created: number;
  restored_content: Record<string, unknown>;
}

// =====================================================
// HOOK RETURN TYPES
// =====================================================

/**
 * Return type for useVersionHistory hook
 */
export interface UseVersionHistoryReturn {
  versions: ContentVersionWithCreator[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/**
 * Return type for useCreateVersion hook
 */
export interface UseCreateVersionReturn {
  createVersion: (params: ContentVersionInsert) => Promise<ContentVersion>;
  isCreating: boolean;
  error: Error | null;
}

/**
 * Return type for useRestoreVersion hook
 */
export interface UseRestoreVersionReturn {
  restoreVersion: (params: RestoreVersionParams) => Promise<RestoreResult>;
  isRestoring: boolean;
  error: Error | null;
}

/**
 * Return type for useVersionDiff hook
 */
export interface UseVersionDiffReturn {
  diff: VersionDiff | null;
  isLoading: boolean;
  error: Error | null;
  compare: (from: number, to: number) => void;
}

/**
 * Return type for useAutoSave hook
 */
export interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  save: (content: Record<string, unknown>) => void;
  cancel: () => void;
}

// =====================================================
// UI COMPONENT PROPS
// =====================================================

/**
 * Props for VersionHistory component
 */
export interface VersionHistoryProps {
  contentType: ContentVersionType;
  contentId: string;
  onRestore?: (version: ContentVersion) => void;
  onCompare?: (fromVersion: number, toVersion: number) => void;
  className?: string;
}

/**
 * Props for VersionItem component
 */
export interface VersionItemProps {
  version: ContentVersionWithCreator;
  isSelected?: boolean;
  isCurrent?: boolean;
  onSelect?: () => void;
  onRestore?: () => void;
  onCompare?: () => void;
}

/**
 * Props for VersionDiff component
 */
export interface VersionDiffProps {
  diff: VersionDiff;
  className?: string;
}

/**
 * Props for VersionRestoreDialog component
 */
export interface VersionRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ContentVersion | null;
  onConfirm: () => void;
  isRestoring: boolean;
}

/**
 * Props for AutoSaveIndicator component
 */
export interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  className?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Content snapshot for blog posts
 */
export interface BlogPostSnapshot {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  category_id?: string;
  tag_ids?: string[];
  status: 'draft' | 'published' | 'archived';
  meta_title?: string;
  meta_description?: string;
}

/**
 * Content snapshot for notices
 */
export interface NoticeSnapshot {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent' | 'maintenance';
  status: 'draft' | 'published' | 'archived';
  is_pinned: boolean;
  expires_at?: string;
}

/**
 * Generic content snapshot type
 */
export type ContentSnapshot = BlogPostSnapshot | NoticeSnapshot | Record<string, unknown>;

// =====================================================
// HELPER FUNCTIONS - Type Guards
// =====================================================

/**
 * Type guard to check if snapshot is a BlogPostSnapshot
 */
export function isBlogPostSnapshot(
  snapshot: ContentSnapshot
): snapshot is BlogPostSnapshot {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    'title' in snapshot &&
    'slug' in snapshot &&
    'content' in snapshot
  );
}

/**
 * Type guard to check if snapshot is a NoticeSnapshot
 */
export function isNoticeSnapshot(
  snapshot: ContentSnapshot
): snapshot is NoticeSnapshot {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    'title' in snapshot &&
    'content' in snapshot &&
    'type' in snapshot &&
    ('is_pinned' in snapshot || snapshot.type === 'info' || snapshot.type === 'warning')
  );
}

// =====================================================
// HELPER FUNCTIONS - Utilities
// =====================================================

/**
 * Format version number for display
 */
export function formatVersionNumber(version: number): string {
  return `v${version}`;
}

/**
 * Get relative time string for version timestamp
 */
export function getVersionTimeAgo(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return created.toLocaleDateString();
}

/**
 * Get auto-save status display text
 */
export function getAutoSaveStatusText(status: AutoSaveStatus): string {
  switch (status) {
    case 'idle':
      return '';
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    case 'offline':
      return 'Offline';
    default:
      return '';
  }
}
