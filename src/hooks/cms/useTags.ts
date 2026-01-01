/**
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQueryClient } from '@tanstack/react-query';
import { blogApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Tag, TagInsert, TagUpdate } from '@/types/cms.types';

/**
 * Hook to fetch all tags (sorted by usage_count DESC)
 */
export const useTags = () => {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await blogApi.getTags();
      if (response.error) {
        console.error('태그 목록 조회 실패:', response.error);
        return [];
      }
      // usage_count DESC, created_at DESC 정렬
      const tags = (response.data as Tag[]) || [];
      return tags.sort((a, b) => {
        const usageDiff = (b.usage_count || 0) - (a.usage_count || 0);
        if (usageDiff !== 0) return usageDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch a single tag by ID
 */
export const useTag = (id: string) => {
  return useQuery<Tag | null>({
    queryKey: ['tags', id],
    queryFn: async () => {
      const response = await callWorkersApi<Tag>(`/api/v1/blog/tags/${id}`);
      if (response.error) {
        console.error('태그 상세 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to fetch a single tag by slug
 */
export const useTagBySlug = (slug: string) => {
  return useQuery<Tag | null>({
    queryKey: ['tags', 'slug', slug],
    queryFn: async () => {
      const response = await callWorkersApi<Tag>(`/api/v1/blog/tags/slug/${slug}`);
      if (response.error) {
        console.error('태그 slug 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!slug,
  });
};

/**
 * Hook to fetch popular tags (by usage_count, with limit)
 */
export const usePopularTags = (limit: number = 10) => {
  return useQuery<Tag[]>({
    queryKey: ['tags', 'popular', limit],
    queryFn: async () => {
      const response = await callWorkersApi<Tag[]>(`/api/v1/blog/tags?limit=${limit}&sort=popular`);
      if (response.error) {
        console.error('인기 태그 조회 실패:', response.error);
        return [];
      }
      return (response.data || []).slice(0, limit);
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to create a new tag (Admin only)
 */
export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Tag, Error, TagInsert>({
    mutationFn: async (tag: TagInsert) => {
      const response = await callWorkersApi<Tag>('/api/v1/blog/tags', {
        method: 'POST',
        token: workersTokens?.accessToken,
        body: tag,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

/**
 * Hook to update a tag (Admin only)
 */
export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Tag, Error, { id: string; updates: TagUpdate }>({
    mutationFn: async ({ id, updates }: { id: string; updates: TagUpdate }) => {
      const response = await callWorkersApi<Tag>(`/api/v1/blog/tags/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body: updates,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as Tag;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'slug', data.slug] });
    },
  });
};

/**
 * Hook to delete a tag (Admin only)
 */
export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      const response = await callWorkersApi(`/api/v1/blog/tags/${id}`, {
        method: 'DELETE',
        token: workersTokens?.accessToken,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

/**
 * Hook to increment tag usage count (Internal use)
 * This should be called when a tag is associated with new content
 */
export const useIncrementTagUsage = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Tag, Error, string>({
    mutationFn: async (tagId: string) => {
      // Workers API로 태그 사용량 증가 호출
      const response = await callWorkersApi<Tag>(`/api/v1/blog/tags/${tagId}/increment`, {
        method: 'POST',
        token: workersTokens?.accessToken,
      });

      if (response.error) {
        // Fallback: 현재 태그 조회 후 수동 증가
        const tagResponse = await callWorkersApi<Tag>(`/api/v1/blog/tags/${tagId}`);
        if (tagResponse.error) {
          throw new Error(tagResponse.error);
        }

        const currentTag = tagResponse.data;
        const updateResponse = await callWorkersApi<Tag>(`/api/v1/blog/tags/${tagId}`, {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: { usage_count: (currentTag?.usage_count || 0) + 1 },
        });

        if (updateResponse.error) {
          throw new Error(updateResponse.error);
        }

        return updateResponse.data as Tag;
      }

      return response.data as Tag;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'popular'] });
    },
  });
};
