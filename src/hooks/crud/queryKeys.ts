/**
 * CRUD Query Key Factory
 *
 * Create type-safe query keys for React Query cache management.
 */

import type { ListParams } from './types';

/**
 * Create query keys for CRUD operations
 *
 * @param baseKey - Base query key (usually table name)
 * @returns Query key factory functions
 *
 * @example
 * const portfolioKeys = createCRUDKeys('portfolio');
 * // portfolioKeys.all => ['portfolio']
 * // portfolioKeys.lists() => ['portfolio', 'list']
 * // portfolioKeys.list({ page: 1 }) => ['portfolio', 'list', { page: 1 }]
 * // portfolioKeys.details() => ['portfolio', 'detail']
 * // portfolioKeys.detail('123') => ['portfolio', 'detail', '123']
 */
export function createCRUDKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [baseKey, 'list'] as const,
    list: (params?: ListParams) =>
      params ? ([baseKey, 'list', params] as const) : ([baseKey, 'list'] as const),
    details: () => [baseKey, 'detail'] as const,
    detail: (id: string) => [baseKey, 'detail', id] as const,
  };
}
