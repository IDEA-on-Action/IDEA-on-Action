/**
 * NotificationDropdown Component
 *
 * 알림 드롭다운
 * - 최근 5개 알림 표시
 * - 모두 읽음 버튼
 * - 모든 알림 보기 링크
 */

import { useNotifications } from '@/hooks/realtime/useNotifications'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface NotificationDropdownProps {
  onClose: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { notifications, markAllAsRead } = useNotifications()
  const recentNotifications = notifications.slice(0, 5)
  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 bg-background border rounded-lg shadow-lg z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{t('notifications.title')}</h3>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      <ScrollArea className="h-96">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('notifications.empty')}
          </div>
        ) : (
          <div className="p-2">
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 푸터 */}
      {notifications.length > 0 && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              navigate('/notifications')
              onClose()
            }}
          >
            {t('notifications.viewAll')}
          </Button>
        </div>
      )}
    </div>
  )
}
