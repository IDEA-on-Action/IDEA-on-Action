/**
 * useNotifications Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 알림 관리 훅
 * - 알림 목록 조회
 * - 실시간 알림 구독 (Workers WebSocket)
 * - 읽음/삭제 처리
 */

import { useEffect } from 'react'
import { callWorkersApi, realtimeApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devError, devLog } from '@/lib/errors'

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
  const { user, workersTokens } = useAuth()
  const queryClient = useQueryClient()

  // 알림 목록 조회
  const {
    data: notifications = [],
    isLoading,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<Notification[]>(
        `/api/v1/notifications?user_id=${user.id}&limit=50&order_by=created_at:desc`,
        { token }
      )

      if (error) {
        devError(new Error(error), {
          table: 'notifications',
          operation: '알림 조회',
        })
        return []
      }
      return data || []
    },
    enabled: !!user,
    staleTime: 30000, // 30초
  })

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter((n) => !n.read).length

  // 실시간 구독 (Workers WebSocket)
  useEffect(() => {
    if (!user) return

    const ws = realtimeApi.connect(`notifications-${user.id}`, user.id)

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        devLog('New notification:', payload)
        // 쿼리 무효화하여 자동 리페치
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
      } catch (e) {
        console.error('Notification message parse error:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('Notification WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [user, queryClient])

  // 알림 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const token = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        `/api/v1/notifications/${notificationId}`,
        {
          method: 'PATCH',
          token,
          body: { read: true },
        }
      )

      if (error) throw new Error(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // 모두 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return

      const token = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        `/api/v1/notifications/mark-all-read`,
        {
          method: 'POST',
          token,
          body: { user_id: user.id },
        }
      )

      if (error) throw new Error(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // 알림 삭제
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const token = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        `/api/v1/notifications/${notificationId}`,
        {
          method: 'DELETE',
          token,
        }
      )

      if (error) throw new Error(error)
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
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<Notification>(
        '/api/v1/notifications',
        {
          method: 'POST',
          token,
          body: {
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
          },
        }
      )

      if (error) throw new Error(error)
      return data
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
