/**
 * Admin Notices List Page
 * Phase 11 Week 2: Notices System
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, Calendar, Pin } from 'lucide-react'
import { useNotices, useDeleteNotice } from '@/hooks/cms/useNotices'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/useToast'
import type { NoticeWithAuthor } from '@/types/cms/notice'
import { formatDistanceToNow } from 'date-fns'

export default function AdminNotices() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeWithAuthor | null>(null)

  const { toast } = useToast()
  const { data: notices, isLoading } = useNotices({
    filters: {
      status: statusFilter === 'all' ? undefined : statusFilter,
      type: typeFilter === 'all' ? undefined : (typeFilter as 'general' | 'maintenance' | 'update' | 'event'),
      include_expired: true,
    },
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const deleteMutation = useDeleteNotice()

  const handleDelete = async () => {
    if (!noticeToDelete) return
    try {
      await deleteMutation.mutateAsync(noticeToDelete.id)
      toast({ title: 'Success', description: 'Notice deleted successfully' })
      setDeleteDialogOpen(false)
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete notice', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notices</h1>
          <p className="text-muted-foreground mt-1">Manage system announcements</p>
        </div>
        <Button asChild>
          <Link to="/admin/notices/new">
            <Plus className="w-4 h-4 mr-2" />
            New Notice
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 p-4 bg-card rounded-lg border">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !notices?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notices found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map(notice => (
                <TableRow key={notice.id}>
                  <TableCell className="font-medium max-w-[300px]">
                    <div className="flex items-center gap-2">
                      {notice.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                      <span className="truncate">{notice.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="uppercase">{notice.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={notice.status === 'published' ? 'default' : 'secondary'}>
                      {notice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {notice.view_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/notices/${notice.id}/edit`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setNoticeToDelete(notice); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noticeToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
