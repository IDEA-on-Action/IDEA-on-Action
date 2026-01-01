/**
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQueryClient } from '@tanstack/react-query';
import { blogApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { BlogCategory, BlogCategoryInsert, BlogCategoryUpdate } from '@/types/cms/cms.types';

/**
 * Hook to fetch all blog categories (sorted by name)
 */
export const useBlogCategories = () => {
  return useQuery<BlogCategory[]>({
    queryKey: ['blog_categories'],
    queryFn: async () => {
      const response = await blogApi.getCategories();
      if (response.error) {
        console.error('블로그 카테고리 목록 조회 실패:', response.error);
        return [];
      }
      // name 기준 정렬
      const categories = (response.data as BlogCategory[]) || [];
      return categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (카테고리는 상대적으로 정적)
  });
};

/**
 * Hook to fetch a single blog category by ID
 */
export const useBlogCategory = (id: string) => {
  return useQuery<BlogCategory | null>({
    queryKey: ['blog_categories', id],
    queryFn: async () => {
      const response = await callWorkersApi<BlogCategory>(`/api/v1/blog/categories/${id}`);
      if (response.error) {
        console.error('블로그 카테고리 상세 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to fetch a single blog category by slug
 */
export const useBlogCategoryBySlug = (slug: string) => {
  return useQuery<BlogCategory | null>({
    queryKey: ['blog_categories', 'slug', slug],
    queryFn: async () => {
      const response = await callWorkersApi<BlogCategory>(`/api/v1/blog/categories/slug/${slug}`);
      if (response.error) {
        console.error('블로그 카테고리 slug 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to create a new blog category (Admin only)
 */
export const useCreateBlogCategory = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<BlogCategory, Error, BlogCategoryInsert>({
    mutationFn: async (category: BlogCategoryInsert) => {
      // Validate hex color code (optional)
      if (category.color && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
        throw new Error('Invalid hex color code. Expected format: #RRGGBB');
      }

      const response = await callWorkersApi<BlogCategory>('/api/v1/blog/categories', {
        method: 'POST',
        token: workersTokens?.accessToken,
        body: category,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as BlogCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
    },
  });
};

/**
 * Hook to update a blog category (Admin only)
 */
export const useUpdateBlogCategory = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<BlogCategory, Error, { id: string; updates: BlogCategoryUpdate }>({
    mutationFn: async ({ id, updates }: { id: string; updates: BlogCategoryUpdate }) => {
      // Validate hex color code (optional)
      if (updates.color && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
        throw new Error('Invalid hex color code. Expected format: #RRGGBB');
      }

      const response = await callWorkersApi<BlogCategory>(`/api/v1/blog/categories/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body: updates,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as BlogCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
      queryClient.invalidateQueries({ queryKey: ['blog_categories', data.id] });
      queryClient.invalidateQueries({ queryKey: ['blog_categories', 'slug', data.slug] });
    },
  });
};

/**
 * Hook to delete a blog category (Admin only)
 */
export const useDeleteBlogCategory = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      const response = await callWorkersApi(`/api/v1/blog/categories/${id}`, {
        method: 'DELETE',
        token: workersTokens?.accessToken,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
    },
  });
};

/**
 * Hook to update category post count (Internal use)
 * This is used after blog posts are created/deleted to keep the cache in sync
 */
export const useUpdateCategoryPostCount = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<BlogCategory, Error, { id: string; count: number }>({
    mutationFn: async ({ id, count }: { id: string; count: number }) => {
      const response = await callWorkersApi<BlogCategory>(`/api/v1/blog/categories/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body: { post_count: count },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as BlogCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
      queryClient.invalidateQueries({ queryKey: ['blog_categories', data.id] });
    },
  });
};
