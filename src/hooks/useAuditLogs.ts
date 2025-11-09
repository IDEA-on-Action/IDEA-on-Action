/**
 * useAuditLogs Hook - Phase 10 Week 3
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { AuditLogWithUser, AuditLogFilters } from '@/types/rbac'

const QUERY_KEYS = {
  all: ['audit_logs'] as const,
  list: (filters?: AuditLogFilters) => [...QUERY_KEYS.all, 'list', filters] as const,
}

export function useAuditLogs(filters: AuditLogFilters = {}, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, email)
        `)

      if (filters.user_id) query = query.eq('user_id', filters.user_id)
      if (filters.action) query = query.eq('action', filters.action)
      if (filters.resource) query = query.eq('resource', filters.resource)
      if (filters.start_date) query = query.gte('created_at', filters.start_date)
      if (filters.end_date) query = query.lte('created_at', filters.end_date)

      query = query.order('created_at', { ascending: false }).limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data as AuditLogWithUser[]
    },
  })
}

export function useLogAction() {
  return useMutation({
    mutationFn: async ({
      action,
      resource,
      resourceId,
      details,
    }: {
      action: string
      resource: string
      resourceId?: string
      details?: Record<string, unknown>
    }) => {
      const { error } = await supabase.rpc('log_action', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId || null,
        p_details: details || null,
      })

      if (error) throw error
    },
  })
}
