/**
 * AdminBlogCategories - Blog Categories Management Page
 *
 * Features:
 * - DataTable with 7 columns (color, name, slug, icon, post count, description, created_at)
 * - Search functionality (name, description)
 * - Filter by post count (0, 1-10, 10+)
 * - CRUD operations (create/edit/delete)
 * - Statistics cards (total, with posts, empty, total posts)
 * - useCRUD hook integration
 * - Color preview badges
 * - Responsive design
 *
 * CMS Phase 2 - AdminBlogCategories
 */

import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Plus, Search, Filter } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/admin/ui/DataTable'
import { useCRUD } from '@/hooks/useCRUD'
import { useDebounce } from '@/hooks/useDebounce'
import { BlogCategoryForm } from '@/components/admin/forms/BlogCategoryForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/cms-utils'
import type { BlogCategory } from '@/types/cms/cms.types'

// =====================================================
// COMPONENT
// =====================================================

export default function AdminBlogCategories() {
  // ========================================
  // State Management
  // ========================================

  const [searchTerm, setSearchTerm] = useState('')
  const [postCountFilter, setPostCountFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BlogCategory | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 300)

  // ========================================
  // CRUD Hook
  // ========================================

  const crud = useCRUD<BlogCategory>({
    table: 'blog_categories',
    queryKey: 'cms-blog-categories',
    orderBy: { column: 'created_at', ascending: false },
  })

  const {
    data: rawData,
    isLoading,
    error,
  } = crud.useList({
    search: debouncedSearch,
    searchColumns: ['name', 'description'],
  })

  // ========================================
  // Data Filtering
  // ========================================

  const filteredData = useMemo(() => {
    if (!rawData?.data) return []

    return rawData.data.filter((item) => {
      // Post count filter
      const postCount = item.postCount ?? 0
      if (postCountFilter === 'zero' && postCount !== 0) return false
      if (postCountFilter === '1-10' && (postCount < 1 || postCount > 10))
        return false
      if (postCountFilter === '10+' && postCount <= 10) return false

      return true
    })
  }, [rawData?.data, postCountFilter])

  // ========================================
  // Statistics
  // ========================================

  const stats = useMemo(() => {
    if (!rawData?.data)
      return {
        total: 0,
        withPosts: 0,
        empty: 0,
        totalPosts: 0,
      }

    const total = rawData.data.length
    const withPosts = rawData.data.filter((item) => (item.postCount ?? 0) > 0).length
    const empty = total - withPosts
    const totalPosts = rawData.data.reduce((sum, item) => sum + (item.postCount ?? 0), 0)

    return { total, withPosts, empty, totalPosts }
  }, [rawData?.data])

  // ========================================
  // Mutations
  // ========================================

  const createMutation = crud.useCreate({
    onSuccess: () => {
      toast.success('카테고리 생성 완료')
      setIsFormOpen(false)
      setEditingItem(null)
    },
    onError: (err) => {
      toast.error(`카테고리 생성 실패: ${err.message}`)
    },
  })

  const updateMutation = crud.useUpdate({
    onSuccess: () => {
      toast.success('카테고리 수정 완료')
      setIsFormOpen(false)
      setEditingItem(null)
    },
    onError: (err) => {
      toast.error(`카테고리 수정 실패: ${err.message}`)
    },
  })

  const deleteMutation = crud.useDelete({
    onSuccess: () => {
      toast.success('카테고리 삭제 완료')
    },
    onError: (err) => {
      toast.error(`카테고리 삭제 실패: ${err.message}`)
    },
  })

  // ========================================
  // Event Handlers
  // ========================================

  const handleCreate = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleEdit = (item: BlogCategory) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const item = rawData?.data.find((cat) => cat.id === id)
    if (!item) return

    // Warn if category has posts
    if (item.postCount > 0) {
      const confirmed = confirm(
        `이 카테고리에 ${item.postCount}개의 포스트가 있습니다. 삭제하시겠습니까?`
      )
      if (!confirmed) return
    }

    await deleteMutation.mutateAsync(id)
  }

  const handleSubmit = async (values: Partial<BlogCategory>) => {
    if (editingItem?.id) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  // ========================================
  // Table Columns
  // ========================================

  const columns: ColumnDef<BlogCategory>[] = [
    {
      accessorKey: 'color',
      header: '색상',
      cell: ({ row }) => {
        const color = row.original.color || '#3b82f6'
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: color }}
            />
            <code className="text-xs text-muted-foreground">{color}</code>
          </div>
        )
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.slug}</code>
      ),
    },
    {
      accessorKey: 'icon',
      header: '아이콘',
      cell: ({ row }) => <Badge variant="outline">{row.original.icon || 'folder'}</Badge>,
    },
    {
      accessorKey: 'postCount',
      header: '포스트 수',
      cell: ({ row }) => {
        const count = row.original.postCount || 0
        return <Badge variant={count > 0 ? 'default' : 'secondary'}>{count}개</Badge>
      },
    },
    {
      accessorKey: 'description',
      header: '설명',
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate text-sm text-muted-foreground">
          {row.original.description || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '생성일',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatRelativeTime(row.original.createdAt)}
        </div>
      ),
    },
  ]

  // ========================================
  // Render
  // ========================================

  return (
    <>
      <Helmet>
        <title>블로그 카테고리 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">블로그 카테고리 관리</h1>
            <p className="text-muted-foreground mt-1">
              블로그 카테고리를 생성하고 관리합니다
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            새 카테고리
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 카테고리</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats.total}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>포스트가 있는 카테고리</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats.withPosts}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>빈 카테고리</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats.empty}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 포스트 수</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats.totalPosts}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="카테고리 이름, 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-[200px]">
            <Select value={postCountFilter} onValueChange={setPostCountFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="포스트 수 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="zero">0개</SelectItem>
                <SelectItem value="1-10">1-10개</SelectItem>
                <SelectItem value="10+">10+개</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                데이터를 불러오는 중 오류가 발생했습니다: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* DataTable */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm || postCountFilter !== 'all'
                    ? '검색 조건에 맞는 카테고리가 없습니다'
                    : '등록된 카테고리가 없습니다'}
                </p>
                {!searchTerm && postCountFilter === 'all' && (
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    첫 카테고리 만들기
                  </Button>
                )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredData}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>

        {/* Form Modal */}
        <BlogCategoryForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingItem(null)
          }}
          editingItem={editingItem}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error?.message || updateMutation.error?.message || null}
        />
      </div>
    </>
  )
}
