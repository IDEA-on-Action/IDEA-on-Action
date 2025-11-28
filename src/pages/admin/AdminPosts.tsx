/**
 * Admin Posts Page
 *
 * 관리자 블로그 게시물 관리 페이지
 * - 게시물 목록 (전체)
 * - 게시물 생성/수정/삭제
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  MoreHorizontal,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

import { usePosts, useDeletePost, getPostStatusLabel } from '@/hooks/usePosts'
import type { Post } from '@/types/database'

export default function AdminPosts() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  const { data: posts, isLoading } = usePosts({ status: 'all', search: search || undefined })
  const deletePost = useDeletePost()

  const handleDelete = async () => {
    if (!deletePostId) return

    try {
      await deletePost.mutateAsync(deletePostId)
      toast({
        title: '게시물 삭제',
        description: '게시물이 삭제되었습니다.',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '게시물 삭제에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDeletePostId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">블로그 관리</h1>
          <p className="text-muted-foreground">게시물을 관리합니다.</p>
        </div>
        <Button asChild>
          <Link to="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            새 게시물
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="게시물 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          총 {posts?.length || 0}개 게시물
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : posts?.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">제목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts?.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  onEdit={() => navigate(`/admin/posts/${post.id}/edit`)}
                  onDelete={() => setDeletePostId(post.id)}
                  onView={() => window.open(`/blog/${post.slug}`, '_blank')}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시물을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 게시물이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===================================================================
// Components
// ===================================================================

interface PostRowProps {
  post: Post
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}

function PostRow({ post, onEdit, onDelete, onView }: PostRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium line-clamp-1">{post.title}</div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {post.excerpt || post.slug}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
          {getPostStatusLabel(post.status)}
        </Badge>
      </TableCell>
      <TableCell>
        {format(new Date(post.created_at), 'yyyy.MM.dd', { locale: ko })}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              수정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">제목</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>작성일</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">게시물이 없습니다</h3>
      <p className="text-muted-foreground mb-4">
        첫 번째 블로그 게시물을 작성해보세요.
      </p>
      <Button asChild>
        <Link to="/admin/posts/new">
          <Plus className="mr-2 h-4 w-4" />
          새 게시물 작성
        </Link>
      </Button>
    </div>
  )
}
