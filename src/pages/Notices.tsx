/**
 * Notices Page
 * Phase 11 Week 2: Notices System
 *
 * Displays all published notices
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Filter, X, Bell } from 'lucide-react'
import { useNotices } from '@/hooks/useNotices'
import { NoticeCard } from '@/components/notices/NoticeCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NoticeFilters } from '@/types/cms/notice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import type { NoticeWithAuthor } from '@/types/cms/notice'
import { useIncrementNoticeViewCount } from '@/hooks/useNotices'
import { formatDistanceToNow } from 'date-fns'

export default function Notices() {
  const [filters, setFilters] = useState<NoticeFilters>({ status: 'published' })
  const [selectedNotice, setSelectedNotice] = useState<NoticeWithAuthor | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: notices, isLoading, error } = useNotices({
    filters,
    sortBy: 'published_at',
    sortOrder: 'desc',
  })

  const incrementViewCount = useIncrementNoticeViewCount()

  const handleNoticeClick = (notice: NoticeWithAuthor) => {
    setSelectedNotice(notice)
    setDialogOpen(true)
    incrementViewCount.mutate(notice.id)
  }

  const handleTypeChange = (type: string) => {
    setFilters(prev => ({
      ...prev,
      type: type === 'all' ? undefined : (type as NoticeFilters['type']),
    }))
  }

  const clearFilters = () => {
    setFilters({ status: 'published' })
  }

  const hasActiveFilters = filters.type

  return (
    <>
      <Helmet>
        <title>Notices | VIBE WORKING</title>
        <meta
          name="description"
          content="Important announcements and updates from VIBE WORKING. Stay informed about system maintenance, new features, and more."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Announcements</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-primary">Notices</span> & Updates
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Stay informed about important announcements and system updates
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-4 border-y bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={filters.type || 'all'}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {notices?.length || 0} notice{notices?.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </section>

        {/* Notices List */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading notices...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive">Failed to load notices.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error.message}
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && notices?.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notices at the moment.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Notices List */}
            {!isLoading && !error && notices && notices.length > 0 && (
              <div className="space-y-4">
                {notices.map(notice => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    onClick={() => handleNoticeClick(notice)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Notice Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedNotice && (
            <>
              <DialogHeader>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {selectedNotice.is_pinned && (
                    <Badge variant="outline" className="gap-1">
                      <Bell className="w-3 h-3" />
                      Pinned
                    </Badge>
                  )}
                  <Badge variant="secondary" className="uppercase">
                    {selectedNotice.type}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedNotice.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-3 text-sm pt-2">
                  {selectedNotice.published_at && (
                    <span>
                      Published {formatDistanceToNow(new Date(selectedNotice.published_at), { addSuffix: true })}
                    </span>
                  )}
                  {selectedNotice.expires_at && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Expires {formatDistanceToNow(new Date(selectedNotice.expires_at), { addSuffix: true })}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={selectedNotice.content} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
