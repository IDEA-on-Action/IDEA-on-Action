/**
 * Notifications Page
 *
 * 알림 센터 페이지
 * - 전체 알림 목록
 * - 필터 (전체/읽지 않음)
 * - 개별 삭제
 * - 모두 읽음
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trash2, Bell } from 'lucide-react'

export default function Notifications() {
  const { t } = useTranslation('common')
  const { notifications, markAllAsRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <>
      <Helmet>
        <title>{t('notifications.title')} | VIBE WORKING</title>
        <meta
          name="description"
          content={`${t('notifications.title')} - VIBE WORKING`}
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold">{t('notifications.title')}</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => markAllAsRead()}
                disabled={!hasUnread}
              >
                {t('notifications.markAllRead')}
              </Button>
            </div>
          </div>

          {/* 필터 탭 */}
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
            className="mb-6"
          >
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="all" className="flex-1 md:flex-none">
                {t('notifications.filter.all')} ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 md:flex-none">
                {t('notifications.filter.unread')} (
                {notifications.filter((n) => !n.read).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 알림 목록 */}
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Bell className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold">
                {t('notifications.empty')}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? '모든 알림을 읽었습니다'
                  : '새로운 알림이 오면 여기에 표시됩니다'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="glass-card p-0 overflow-hidden group"
                >
                  <div className="flex items-center">
                    <div className="flex-1">
                      <NotificationItem notification={notification} />
                    </div>
                    <div className="px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                        aria-label={t('notifications.delete')}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
