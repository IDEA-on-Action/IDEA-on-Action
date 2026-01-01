/**
 * NoticeCard Component
 * Phase 11 Week 2: Notices System
 *
 * Displays a notice card in the list view
 */

import { Calendar, User, Eye, AlertCircle, AlertTriangle, Bell, Wrench, Pin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { NoticeWithAuthor } from '@/types/cms/notice'
import { isNoticeExpired } from '@/types/cms/notice'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface NoticeCardProps {
  notice: NoticeWithAuthor
  onClick?: () => void
}

export function NoticeCard({ notice, onClick }: NoticeCardProps) {
  const publishedDate = notice.published_at
    ? formatDistanceToNow(new Date(notice.published_at), { addSuffix: true })
    : 'Not published'

  const authorName = notice.author?.user_metadata?.full_name || notice.author?.email?.split('@')[0] || 'Unknown'

  const expired = isNoticeExpired(notice)

  // Get icon and color based on notice type
  const getTypeIcon = () => {
    switch (notice.type) {
      case 'info':
        return <Bell className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'urgent':
        return <AlertCircle className="w-5 h-5" />
      case 'maintenance':
        return <Wrench className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getTypeColor = () => {
    switch (notice.type) {
      case 'info':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'warning':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'urgent':
        return 'text-red-500 bg-red-50 dark:bg-red-950'
      case 'maintenance':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-950'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getTypeBadgeVariant = () => {
    switch (notice.type) {
      case 'urgent':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Card
      className={cn(
        'group hover-lift cursor-pointer transition-all',
        notice.is_pinned && 'border-primary',
        expired && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Header with Icon */}
      <CardHeader>
        <div className="flex items-start gap-4">
          {/* Type Icon */}
          <div className={cn('p-3 rounded-lg', getTypeColor())}>
            {getTypeIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Pinned Badge */}
              {notice.is_pinned && (
                <Badge variant="outline" className="gap-1">
                  <Pin className="w-3 h-3" />
                  Pinned
                </Badge>
              )}

              {/* Type Badge */}
              <Badge variant={getTypeBadgeVariant()} className="uppercase text-xs">
                {notice.type}
              </Badge>

              {/* Status Badge (if draft/archived) */}
              {notice.status !== 'published' && (
                <Badge variant="secondary">{notice.status}</Badge>
              )}

              {/* Expired Badge */}
              {expired && (
                <Badge variant="outline" className="text-muted-foreground">
                  Expired
                </Badge>
              )}
            </div>

            {/* Title */}
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {notice.title}
            </CardTitle>

            {/* Content Preview */}
            <CardDescription className="line-clamp-2 mt-2">
              {notice.content}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Footer */}
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {/* Author */}
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{authorName}</span>
          </div>

          {/* Published Date */}
          {notice.published_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{publishedDate}</span>
            </div>
          )}

          {/* View Count */}
          {notice.view_count > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{notice.view_count} views</span>
            </div>
          )}

          {/* Expiry Date */}
          {notice.expires_at && !expired && (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span>
                Expires {formatDistanceToNow(new Date(notice.expires_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
