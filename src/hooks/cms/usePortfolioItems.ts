/**
 * usePortfolioItems Hook
 *
 * Cloudflare Workers API에서 포트폴리오 데이터를 조회하는 React Query 훅
 * - 전체 목록 조회
 * - 타입별 필터링
 * - 피처드/공개 필터링
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type { PortfolioItem } from '@/types/shared/v2';

// =====================================================
// API 응답 → 프론트엔드 타입 변환
// DB 필드명과 프론트엔드 타입 필드명 매핑
// =====================================================
interface ApiPortfolioItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  short_description?: string;
  client_name?: string;
  category?: string;
  technologies?: string;
  featured_image?: string;
  images?: string;
  project_url?: string;
  github_url?: string;
  status?: string;
  is_featured?: number;
  display_order?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * API 응답을 프론트엔드 PortfolioItem 타입으로 변환
 */
const transformApiResponse = (item: ApiPortfolioItem): PortfolioItem => {
  // technologies와 images는 JSON 문자열일 수 있음
  let techStack: string[] = [];
  let imageArray: string[] = [];

  try {
    techStack = item.technologies ? JSON.parse(item.technologies) : [];
  } catch {
    techStack = [];
  }

  try {
    imageArray = item.images ? JSON.parse(item.images) : [];
  } catch {
    imageArray = [];
  }

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.short_description || '',
    description: item.description,
    client_name: item.client_name,
    project_type: (item.category as PortfolioItem['project_type']) || 'mvp',
    thumbnail: item.featured_image,
    images: imageArray,
    tech_stack: techStack,
    project_url: item.project_url,
    github_url: item.github_url,
    featured: item.is_featured === 1,
    published: item.status === 'published',
    created_at: item.created_at,
    updated_at: item.updated_at,
    testimonial: { author: '', role: '', content: '', avatar: '' },
  };
};

/**
 * API 응답 배열을 변환
 */
const transformApiResponseArray = (items: ApiPortfolioItem[]): PortfolioItem[] => {
  return items.map(transformApiResponse);
};

// =====================================================
// QUERY KEYS
// =====================================================
const QUERY_KEYS = {
  all: ['portfolio_items'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  slug: (slug: string) => [...QUERY_KEYS.all, 'slug', slug] as const,
  type: (type: string | undefined) => [...QUERY_KEYS.all, 'type', type] as const,
  featured: () => [...QUERY_KEYS.all, 'featured'] as const,
  published: () => [...QUERY_KEYS.all, 'published'] as const,
};

// =====================================================
// 1. FETCH PORTFOLIO ITEMS - Workers API
// =====================================================
/**
 * Hook to fetch all portfolio items
 */
export const usePortfolioItems = () => {
  return useQuery<PortfolioItem[]>({
    queryKey: QUERY_KEYS.lists(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    queryFn: async () => {
      const response = await portfolioApi.list();

      if (response.error) {
        console.error('[usePortfolioItems] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: ApiPortfolioItem[] } | null;
      return transformApiResponseArray(result?.data || []);
    },
  });
};

// =====================================================
// 2. FETCH PORTFOLIO ITEM BY ID - Workers API
// =====================================================
/**
 * Hook to fetch a single portfolio item by ID
 */
export const usePortfolioItem = (id: string) => {
  return useQuery<PortfolioItem | null>({
    queryKey: QUERY_KEYS.detail(id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      const response = await portfolioApi.getById(id);

      if (response.error) {
        console.error('[usePortfolioItem] API 오류:', response.error);
        return null;
      }

      const result = response.data as { data: ApiPortfolioItem } | null;
      return result?.data ? transformApiResponse(result.data) : null;
    },
    enabled: !!id,
  });
};

// =====================================================
// 3. FETCH PORTFOLIO ITEM BY SLUG - Workers API
// =====================================================
/**
 * Hook to fetch a single portfolio item by slug
 */
export const usePortfolioItemBySlug = (slug: string) => {
  return useQuery<PortfolioItem | null>({
    queryKey: QUERY_KEYS.slug(slug),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!slug) return null;

      const response = await portfolioApi.getBySlug(slug);

      if (response.error) {
        console.error('[usePortfolioItemBySlug] API 오류:', response.error);
        return null;
      }

      const result = response.data as { data: ApiPortfolioItem } | null;
      return result?.data ? transformApiResponse(result.data) : null;
    },
    enabled: !!slug,
  });
};

// =====================================================
// 4. FETCH PORTFOLIO ITEMS BY TYPE - Workers API
// =====================================================
/**
 * Hook to fetch portfolio items by project type
 */
export const usePortfolioItemsByType = (projectType?: PortfolioItem['project_type']) => {
  return useQuery<PortfolioItem[]>({
    queryKey: QUERY_KEYS.type(projectType),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (projectType) {
        const response = await portfolioApi.getByType(projectType);

        if (response.error) {
          console.error('[usePortfolioItemsByType] API 오류:', response.error);
          return [];
        }

        const result = response.data as { data: ApiPortfolioItem[] } | null;
        return transformApiResponseArray(result?.data || []);
      }

      // projectType이 없으면 전체 조회
      const response = await portfolioApi.list();

      if (response.error) {
        console.error('[usePortfolioItemsByType] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: ApiPortfolioItem[] } | null;
      return transformApiResponseArray(result?.data || []);
    },
  });
};

// =====================================================
// 5. FETCH FEATURED PORTFOLIO ITEMS - Workers API
// =====================================================
/**
 * Hook to fetch featured portfolio items
 */
export const useFeaturedPortfolioItems = () => {
  return useQuery<PortfolioItem[]>({
    queryKey: QUERY_KEYS.featured(),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await portfolioApi.getFeatured();

      if (response.error) {
        console.error('[useFeaturedPortfolioItems] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: ApiPortfolioItem[] } | null;
      return transformApiResponseArray(result?.data || []);
    },
  });
};

// =====================================================
// 6. FETCH PUBLISHED PORTFOLIO ITEMS - Workers API
// =====================================================
/**
 * Hook to fetch published portfolio items
 */
export const usePublishedPortfolioItems = () => {
  return useQuery<PortfolioItem[]>({
    queryKey: QUERY_KEYS.published(),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // published=true가 기본값이므로 list() 호출
      const response = await portfolioApi.list();

      if (response.error) {
        console.error('[usePublishedPortfolioItems] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: ApiPortfolioItem[] } | null;
      return transformApiResponseArray(result?.data || []);
    },
  });
};

// =====================================================
// CRUD MUTATIONS (Admin only) - Workers API
// =====================================================

/**
 * Hook to create a new portfolio item (Admin only)
 */
export const useCreatePortfolioItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at'>) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      const response = await portfolioApi.create(token, item as Record<string, unknown>);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data as { data: PortfolioItem } | null;
      return result?.data as PortfolioItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

/**
 * Hook to update a portfolio item (Admin only)
 */
export const useUpdatePortfolioItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PortfolioItem> }) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      const response = await portfolioApi.update(token, id, updates as Record<string, unknown>);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data as { data: PortfolioItem } | null;
      return result?.data as PortfolioItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      if (data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.slug(data.slug) });
      }
    },
  });
};

/**
 * Hook to delete a portfolio item (Admin only)
 */
export const useDeletePortfolioItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      const response = await portfolioApi.delete(token, id);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};
