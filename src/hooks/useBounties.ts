/**
 * useBounties Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bountiesApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import type { Bounty } from '@/types/v2';

/**
 * Hook to fetch all bounties
 */
export const useBounties = () => {
  return useQuery<Bounty[]>({
    queryKey: ['bounties'],
    queryFn: async () => {
      const result = await bountiesApi.list();
      if (result.error) {
        console.error('Bounties 조회 오류:', result.error);
        return [];
      }
      return (result.data as Bounty[]) || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook to fetch bounties by status
 */
export const useBountiesByStatus = (status?: Bounty['status']) => {
  return useQuery<Bounty[]>({
    queryKey: ['bounties', 'status', status],
    queryFn: async () => {
      const result = await bountiesApi.list({ status: status || undefined });
      if (result.error) {
        console.error('Bounties 상태별 조회 오류:', result.error);
        return [];
      }
      return (result.data as Bounty[]) || [];
    },
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Hook to fetch a single bounty by ID
 */
export const useBounty = (id: number) => {
  return useQuery<Bounty | null>({
    queryKey: ['bounties', id],
    queryFn: async () => {
      const result = await bountiesApi.getById(id);
      if (result.error) {
        console.error('Bounty 상세 조회 오류:', result.error);
        return null;
      }
      return (result.data as Bounty) || null;
    },
    enabled: !!id,
  });
};

/**
 * Hook to apply to a bounty
 */
export const useApplyToBounty = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<unknown, Error, number>({
    mutationFn: async (bountyId) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await bountiesApi.apply(workersTokens.accessToken, bountyId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};

/**
 * Hook to create a new bounty (Admin only)
 */
export const useCreateBounty = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Bounty, Error, Omit<Bounty, 'id' | 'created_at' | 'updated_at' | 'applicants'>>({
    mutationFn: async (bounty) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await bountiesApi.create(workersTokens.accessToken, { ...bounty, applicants: [] });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Bounty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};

/**
 * Hook to update a bounty (Admin only)
 */
export const useUpdateBounty = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Bounty, Error, { id: number; updates: Partial<Bounty> }>({
    mutationFn: async ({ id, updates }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await bountiesApi.update(workersTokens.accessToken, id, updates);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Bounty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};

/**
 * Hook to delete a bounty (Admin only)
 */
export const useDeleteBounty = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<number, Error, number>({
    mutationFn: async (id) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await bountiesApi.delete(workersTokens.accessToken, id);
      if (result.error) {
        throw new Error(result.error);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};

/**
 * Hook to assign a bounty (Admin only)
 */
export const useAssignBounty = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Bounty, Error, { bountyId: number; userId: string }>({
    mutationFn: async ({ bountyId, userId }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await bountiesApi.assign(workersTokens.accessToken, bountyId, userId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Bounty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};
