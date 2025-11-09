/**
 * useNotifications Hook
 *
 * 알림 관리 훅
 * - 알림 목록 조회
 * - 실시간 알림 구독 (Supabase Realtime)
 * - 읽음/삭제 처리
 */

import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { handleSupabaseError, devError, devLog } from '@/lib/errors'

export interface Notification {
  id: string
  user_id: string
  type: 'order' | 'comment' | 'system' | 'announcement'
  title: string
  message: string
  link?: string | null
  read: boolean
  created_at: string
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
  createNotification: (
    userId: string,
    notification: Omit<Notification, 'id' | 'user_id' | 'read' | 'created_at'>
  ) => Promise<Notification | null>
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 알림 목록 조회
  const {
    data: notifications = [],
    isLoading,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return handleSupabaseError(error, {
          table: 'notifications',
          operation: '알림 조회',
          fallbackValue: [],
        }) || []
      }
      return data as Notification[]
    },
    enabled: !!user,
    staleTime: 30000, // 30초
  })

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter((n) => !n.read).length

  // 실시간 구독 (Supabase Realtime)
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          devLog('New notification:', payload.new)
          // 쿼리 무효화하여 자동 리페치
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  // 알림 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // 모두 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // 알림 삭제
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // 알림 생성 (관리자/시스템용)
  const createNotification = async (
    userId: string,
    notification: Omit<Notification, 'id' | 'user_id' | 'read' | 'created_at'>
  ): Promise<Notification | null> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
        })
        .select()
        .single()

      if (error) throw error
      return data as Notification
    } catch (error) {
      devError(error, { operation: '알림 생성' })
      return null
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    createNotification,
  }
}
