/**
 * NotificationItem Component
 *
 * 알림 아이템 컴포넌트
 * - 타입별 아이콘
 * - 읽음/읽지 않음 상태
 * - 클릭 시 읽음 처리 및 링크 이동
 */

import { useNotifications, type Notification } from '@/hooks/realtime/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { Package, MessageCircle, Bell, Megaphone } from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { i18n } = useTranslation()
  const { markAsRead } = useNotifications()

  const icons = {
    order: Package,
    comment: MessageCircle,
    system: Bell,
    announcement: Megaphone,
  }

  const Icon = icons[notification.type]
  const dateLocale = i18n.language === 'ko' ? ko : enUS

  const handleClick = () => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // 링크가 있으면 이동
    if (notification.link) {
      window.location.href = notification.link
    }

    onClick?.()
  }

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        notification.read
          ? 'bg-background hover:bg-muted'
          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      }`}
    >
      <div className="flex gap-3">
        {/* 아이콘 */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            notification.read ? 'bg-muted' : 'bg-primary/10'
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              notification.read ? 'text-muted-foreground' : 'text-primary'
            }`}
          />
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-1">{notification.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </p>
        </div>

        {/* 읽지 않음 표시 */}
        {!notification.read && (
          <div className="flex-shrink-0 mt-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
