import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query';
import type { Proposal, ProposalFormValues } from '@/types/v2';

/**
 * Hook to fetch all proposals (Admin only)
 */
export const useProposals = () => {
  return useSupabaseQuery<Proposal[]>({
    queryKey: ['proposals'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('proposals')
            .select('*')
            .order('created_at', { ascending: false });
          return { data: result.data, error: result.error };
        },
        {
          table: 'proposals',
          operation: 'Proposal 목록 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'proposals',
    operation: 'Proposal 목록 조회',
    fallbackValue: [],
  });
};

/**
 * Hook to fetch user's own proposals
 */
export const useMyProposals = () => {
  return useSupabaseQuery<Proposal[]>({
    queryKey: ['proposals', 'me'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return { data: [], error: null };
          }

          const result = await supabase
            .from('proposals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          return { data: result.data, error: result.error };
        },
        {
          table: 'proposals',
          operation: '내 Proposal 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'proposals',
    operation: '내 Proposal 조회',
    fallbackValue: [],
  });
};

/**
 * Hook to fetch proposals by status (Admin only)
 */
export const useProposalsByStatus = (status?: Proposal['status']) => {
  return useSupabaseQuery<Proposal[]>({
    queryKey: ['proposals', 'status', status],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('proposals')
            .select('*')
            .order('created_at', { ascending: false });

          if (status) {
            query = query.eq('status', status);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'proposals',
          operation: 'Proposal 상태별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'proposals',
    operation: 'Proposal 상태별 조회',
    fallbackValue: [],
  });
};

/**
 * Hook to submit a new proposal
 */
export const useSubmitProposal = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Proposal, ProposalFormValues>({
    mutationFn: async (proposal: ProposalFormValues) => {
      const { data, error } = await supabase
        .from('proposals')
        .insert([{ ...proposal, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      return data as Proposal;
    },
    table: 'proposals',
    operation: 'Proposal 제출',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
};

/**
 * Hook to update proposal status (Admin only)
 */
export const useUpdateProposalStatus = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Proposal, { id: number; status: Proposal['status']; admin_notes?: string }>({
    mutationFn: async ({
      id,
      status,
      admin_notes
    }: {
      id: number;
      status: Proposal['status'];
      admin_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status, admin_notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Proposal;
    },
    table: 'proposals',
    operation: 'Proposal 상태 수정',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
};

/**
 * Hook to delete a proposal (Admin only)
 */
export const useDeleteProposal = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<number, number>({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    table: 'proposals',
    operation: 'Proposal 삭제',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
};
