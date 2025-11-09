import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query';
import type { Bounty } from '@/types/v2';

/**
 * Hook to fetch all bounties
 */
export const useBounties = () => {
  return useSupabaseQuery<Bounty[]>({
    queryKey: ['bounties'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('bounties')
            .select('*')
            .order('created_at', { ascending: false });
          return { data: result.data, error: result.error };
        },
        {
          table: 'bounties',
          operation: 'Bounty 목록 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'bounties',
    operation: 'Bounty 목록 조회',
    fallbackValue: [],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook to fetch bounties by status
 */
export const useBountiesByStatus = (status?: Bounty['status']) => {
  return useSupabaseQuery<Bounty[]>({
    queryKey: ['bounties', 'status', status],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('bounties')
            .select('*')
            .order('created_at', { ascending: false });

          if (status) {
            query = query.eq('status', status);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'bounties',
          operation: 'Bounty 상태별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'bounties',
    operation: 'Bounty 상태별 조회',
    fallbackValue: [],
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Hook to fetch a single bounty by ID
 */
export const useBounty = (id: number) => {
  return useSupabaseQuery<Bounty>({
    queryKey: ['bounties', id],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('bounties')
            .select('*')
            .eq('id', id)
            .single();
          return { data: result.data, error: result.error };
        },
        {
          table: 'bounties',
          operation: 'Bounty 상세 조회',
          fallbackValue: null,
        }
      );
    },
    table: 'bounties',
    operation: 'Bounty 상세 조회',
    fallbackValue: null,
    enabled: !!id,
  });
};

/**
 * Hook to apply to a bounty
 */
export const useApplyToBounty = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<unknown, number>({
    mutationFn: async (bountyId: number) => {
      const { data, error } = await supabase.rpc('apply_to_bounty', {
        bounty_id: bountyId,
      });

      if (error) throw error;
      return data;
    },
    table: 'bounties',
    operation: 'Bounty 지원',
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

  return useSupabaseMutation<Bounty, Omit<Bounty, 'id' | 'created_at' | 'updated_at' | 'applicants'>>({
    mutationFn: async (bounty: Omit<Bounty, 'id' | 'created_at' | 'updated_at' | 'applicants'>) => {
      const { data, error } = await supabase
        .from('bounties')
        .insert([{ ...bounty, applicants: [] }])
        .select()
        .single();

      if (error) throw error;
      return data as Bounty;
    },
    table: 'bounties',
    operation: 'Bounty 생성',
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

  return useSupabaseMutation<Bounty, { id: number; updates: Partial<Bounty> }>({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Bounty> }) => {
      const { data, error } = await supabase
        .from('bounties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Bounty;
    },
    table: 'bounties',
    operation: 'Bounty 수정',
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

  return useSupabaseMutation<number, number>({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('bounties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    table: 'bounties',
    operation: 'Bounty 삭제',
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

  return useSupabaseMutation<Bounty, { bountyId: number; userId: string }>({
    mutationFn: async ({ bountyId, userId }: { bountyId: number; userId: string }) => {
      const { data, error } = await supabase
        .from('bounties')
        .update({
          assignee_id: userId,
          status: 'assigned',
        })
        .eq('id', bountyId)
        .select()
        .single();

      if (error) throw error;
      return data as Bounty;
    },
    table: 'bounties',
    operation: 'Bounty 할당',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
    },
  });
};
