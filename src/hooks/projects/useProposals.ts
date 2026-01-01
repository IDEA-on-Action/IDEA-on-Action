/**
 * useProposals Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Proposal, ProposalFormValues } from '@/types/shared/v2';

/**
 * Hook to fetch all proposals (Admin only)
 */
export const useProposals = () => {
  const { workersTokens } = useAuth();

  return useQuery<Proposal[]>({
    queryKey: ['proposals'],
    queryFn: async () => {
      if (!workersTokens?.accessToken) {
        return [];
      }
      const result = await proposalsApi.list(workersTokens.accessToken);
      if (result.error) {
        console.error('Proposals 조회 오류:', result.error);
        return [];
      }
      return (result.data as Proposal[]) || [];
    },
    enabled: !!workersTokens?.accessToken,
  });
};

/**
 * Hook to fetch user's own proposals
 */
export const useMyProposals = () => {
  const { workersTokens } = useAuth();

  return useQuery<Proposal[]>({
    queryKey: ['proposals', 'me'],
    queryFn: async () => {
      if (!workersTokens?.accessToken) {
        return [];
      }
      const result = await proposalsApi.getMyProposals(workersTokens.accessToken);
      if (result.error) {
        console.error('내 Proposals 조회 오류:', result.error);
        return [];
      }
      return (result.data as Proposal[]) || [];
    },
    enabled: !!workersTokens?.accessToken,
  });
};

/**
 * Hook to fetch proposals by status (Admin only)
 */
export const useProposalsByStatus = (status?: Proposal['status']) => {
  const { workersTokens } = useAuth();

  return useQuery<Proposal[]>({
    queryKey: ['proposals', 'status', status],
    queryFn: async () => {
      if (!workersTokens?.accessToken) {
        return [];
      }
      const result = await proposalsApi.list(workersTokens.accessToken, { status: status || undefined });
      if (result.error) {
        console.error('Proposals 상태별 조회 오류:', result.error);
        return [];
      }
      return (result.data as Proposal[]) || [];
    },
    enabled: !!workersTokens?.accessToken,
  });
};

/**
 * Hook to submit a new proposal
 */
export const useSubmitProposal = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Proposal, Error, ProposalFormValues>({
    mutationFn: async (proposal) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await proposalsApi.submit(workersTokens.accessToken, { ...proposal, status: 'pending' });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Proposal;
    },
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
  const { workersTokens } = useAuth();

  return useMutation<Proposal, Error, { id: number; status: Proposal['status']; admin_notes?: string }>({
    mutationFn: async ({ id, status, admin_notes }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await proposalsApi.updateStatus(workersTokens.accessToken, id, status, admin_notes);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Proposal;
    },
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
  const { workersTokens } = useAuth();

  return useMutation<number, Error, number>({
    mutationFn: async (id) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await proposalsApi.delete(workersTokens.accessToken, id);
      if (result.error) {
        throw new Error(result.error);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
};
