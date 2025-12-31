/**
 * CRUD Hook Types
 *
 * Type definitions for the generic CRUD hook system.
 */

/**
 * Base entity with required fields
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * CRUD hook options
 */
export interface UseCRUDOptions<T extends BaseEntity> {
  /** API endpoint base (e.g., 'portfolio_items' -> /api/v1/portfolio-items) */
  table: string;

  /** Query key for React Query cache */
  queryKey: string;

  /** Columns to select (default: '*') */
  select?: string;

  /** Default ordering */
  orderBy?: { column: string; ascending: boolean };

  /** Global filters applied to all queries */
  filters?: Record<string, unknown>;

  /** Enable/disable queries globally */
  enabled?: boolean;
}

/**
 * List query parameters
 */
export interface ListParams {
  /** Page number (1-indexed) */
  page?: number;

  /** Items per page */
  perPage?: number;

  /** Filters to apply */
  filters?: Record<string, unknown>;

  /** Search term */
  search?: string;

  /** Columns to search in (requires search) */
  searchColumns?: string[];

  /** Custom ordering (overrides default) */
  orderBy?: { column: string; ascending: boolean };
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Create operation variables
 */
export type CreateVariables<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Update operation variables
 */
export interface UpdateVariables<T extends BaseEntity> {
  id: string;
  values: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
}

/**
 * Bulk update operation variables
 */
export interface BulkUpdateVariables<T extends BaseEntity> {
  ids: string[];
  data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export operation parameters
 */
export interface ExportParams {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, unknown>;
}

/**
 * Import operation result
 */
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Context type for optimistic updates with single item
 */
export interface SingleItemContext<T> {
  previous?: T;
}

/**
 * Context type for optimistic updates with multiple items
 */
export interface MultiItemContext<T> {
  previous: Array<{ id: string; data?: T }>;
}
