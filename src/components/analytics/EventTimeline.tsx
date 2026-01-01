/**
 * Phase 14: 이벤트 타임라인 컴포넌트
 * 최근 이벤트 발생 내역 표시
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAnalyticsEvents } from '@/hooks/analytics/useAnalyticsEvents'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ShoppingCart,
  Eye,
  CreditCard,
  UserPlus,
  Search,
  FileText,
  Bell,
  MessageSquare,
  type LucideIcon,
  Share2,
  Download,
  AlertCircle,
} from 'lucide-react'

interface EventTimelineProps {
  startDate: Date
  endDate: Date
  limit?: number
}

export function EventTimeline({ startDate, endDate, limit = 50 }: EventTimelineProps) {
  const { data: events, isLoading } = useAnalyticsEvents(
    {
      startDate,
      endDate,
    },
    limit
  )

  // 이벤트 타입별 아이콘 및 색상 매핑
  const getEventStyle = (eventName: string) => {
    const styles: Record<string, { icon: LucideIcon; color: string; label: string }> = {
      sign_up: { icon: UserPlus, color: 'bg-green-100 text-green-600', label: '회원가입' },
      login: { icon: UserPlus, color: 'bg-blue-100 text-blue-600', label: '로그인' },
      view_service: { icon: Eye, color: 'bg-purple-100 text-purple-600', label: '서비스 조회' },
      view_blog_post: { icon: FileText, color: 'bg-indigo-100 text-indigo-600', label: '블로그 조회' },
      add_to_cart: { icon: ShoppingCart, color: 'bg-orange-100 text-orange-600', label: '장바구니 추가' },
      remove_from_cart: { icon: ShoppingCart, color: 'bg-red-100 text-red-600', label: '장바구니 제거' },
      begin_checkout: { icon: CreditCard, color: 'bg-yellow-100 text-yellow-600', label: '결제 시작' },
      purchase: { icon: CreditCard, color: 'bg-green-100 text-green-600', label: '구매 완료' },
      search: { icon: Search, color: 'bg-blue-100 text-blue-600', label: '검색' },
      notification_interaction: { icon: Bell, color: 'bg-pink-100 text-pink-600', label: '알림 상호작용' },
      chatbot_interaction: { icon: MessageSquare, color: 'bg-teal-100 text-teal-600', label: '챗봇 사용' },
      share: { icon: Share2, color: 'bg-cyan-100 text-cyan-600', label: '공유' },
      file_download: { icon: Download, color: 'bg-gray-100 text-gray-600', label: '파일 다운로드' },
      exception: { icon: AlertCircle, color: 'bg-red-100 text-red-600', label: '에러 발생' },
    }

    return styles[eventName] || { icon: Eye, color: 'bg-gray-100 text-gray-600', label: eventName }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이벤트 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이벤트 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            선택한 기간에 이벤트가 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 타임라인</CardTitle>
        <p className="text-sm text-muted-foreground">
          최근 {events.length}개 이벤트 표시
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.map((event) => {
            const style = getEventStyle(event.event_name)
            const EventIcon = style.icon

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                {/* 아이콘 */}
                <div className={`p-2 rounded-full ${style.color}`}>
                  <EventIcon className="h-4 w-4" />
                </div>

                {/* 이벤트 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {style.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>

                  {/* 이벤트 파라미터 */}
                  {Object.keys(event.event_params).length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {event.event_params.service_name && (
                        <span>서비스: {event.event_params.service_name}</span>
                      )}
                      {event.event_params.search_term && (
                        <span>검색어: "{event.event_params.search_term}"</span>
                      )}
                      {event.event_params.post_title && (
                        <span>게시물: {event.event_params.post_title}</span>
                      )}
                      {event.event_params.value && (
                        <span> · ₩{event.event_params.value.toLocaleString()}</span>
                      )}
                    </div>
                  )}

                  {/* 페이지 URL */}
                  {event.page_url && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {event.page_url}
                    </div>
                  )}
                </div>

                {/* 세션 ID (디버깅용) */}
                <div className="text-xs text-muted-foreground font-mono">
                  {event.session_id.slice(0, 8)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
