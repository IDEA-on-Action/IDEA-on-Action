/**
 * AdminPromptTemplates - Prompt Template Management Page
 *
 * Features:
 * - DataTable with 7 columns (name, category, service, public, usage count, updated, actions)
 * - Search functionality (name, description)
 * - Filters (category, service, public status)
 * - CRUD operations (create/edit/delete)
 * - Statistics cards (total, system/user, public/private, by category)
 * - usePromptTemplates hook integration
 * - Responsive design
 *
 * v2.21.0 - SSDD 프롬프트 템플릿 Admin 페이지
 */

import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Plus, Search, Filter } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/admin/ui/DataTable'
import { usePromptTemplates, useDeletePromptTemplate } from '@/hooks/usePromptTemplates'
import { useDebounce } from '@/hooks/useDebounce'
import { PromptTemplateForm } from '@/components/admin/PromptTemplateForm'
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
import type {
  PromptTemplate,
  PromptTemplateCategory,
  MinuServiceId,
  PromptTemplateFilters
} from '@/types/ai/prompt-template.types'
import {
  PROMPT_TEMPLATE_CATEGORY_LABELS,
  MINU_SERVICE_LABELS
} from '@/types/ai/prompt-template.types'

// =====================================================
// COMPONENT
// =====================================================

export default function AdminPromptTemplates() {
  // ========================================
  // State Management
  // ========================================

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [publicFilter, setPublicFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PromptTemplate | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 300)

  // ========================================
  // Query Hooks
  // ========================================

  // Build filters
  const filters: PromptTemplateFilters = useMemo(() => {
    const result: PromptTemplateFilters = {}

    if (categoryFilter !== 'all') {
      result.category = categoryFilter as PromptTemplateCategory
    }
    if (serviceFilter !== 'all') {
      result.service_id = serviceFilter === 'none' ? null : (serviceFilter as MinuServiceId)
    }
    if (publicFilter !== 'all') {
      result.is_public = publicFilter === 'public'
    }
    if (debouncedSearch) {
      result.search = debouncedSearch
    }

    return result
  }, [categoryFilter, serviceFilter, publicFilter, debouncedSearch])

  const { data, isLoading, error } = usePromptTemplates(filters)
  const deleteMutation = useDeletePromptTemplate()

  // ========================================
  // Statistics
  // ========================================

  const stats = useMemo(() => {
    if (!data?.templates) {
      return {
        total: 0,
        system: 0,
        user: 0,
        public: 0,
        private: 0,
        byCategory: {} as Record<string, number>,
      }
    }

    const templates = data.templates
    const total = templates.length
    const system = templates.filter((t) => t.is_system).length
    const user = total - system
    const publicCount = templates.filter((t) => t.is_public).length
    const privateCount = total - publicCount

    // By category
    const byCategory: Record<string, number> = {}
    templates.forEach((t) => {
      const label = PROMPT_TEMPLATE_CATEGORY_LABELS[t.category]
      byCategory[label] = (byCategory[label] || 0) + 1
    })

    return { total, system, user, public: publicCount, private: privateCount, byCategory }
  }, [data?.templates])

  // ========================================
  // Event Handlers
  // ========================================

  const handleCreate = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleEdit = (item: PromptTemplate) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const item = data?.templates.find((t) => t.id === id)
    if (!item) return

    // Confirm deletion
    const confirmed = confirm(
      `템플릿 "${item.name}"을(를) 삭제하시겠습니까?\n사용 횟수: ${item.usage_count}회`
    )
    if (!confirmed) return

    await deleteMutation.mutateAsync(id)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingItem(null)
  }

  // ========================================
  // Table Columns
  // ========================================

  const columns: ColumnDef<PromptTemplate>[] = [
    {
      accessorKey: 'name',
      header: '템플릿명',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground max-w-[300px] truncate">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: '카테고리',
      cell: ({ row }) => (
        <Badge variant="outline">
          {PROMPT_TEMPLATE_CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
    },
    {
      accessorKey: 'service_id',
      header: '서비스',
      cell: ({ row }) => {
        const serviceId = row.original.service_id
        if (!serviceId) return <span className="text-muted-foreground">-</span>
        return <Badge variant="secondary">{MINU_SERVICE_LABELS[serviceId]}</Badge>
      },
    },
    {
      accessorKey: 'is_public',
      header: '공개',
      cell: ({ row }) => (
        <Badge variant={row.original.is_public ? 'default' : 'secondary'}>
          {row.original.is_public ? '공개' : '비공개'}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_system',
      header: '타입',
      cell: ({ row }) => (
        <Badge variant={row.original.is_system ? 'destructive' : 'outline'}>
          {row.original.is_system ? '시스템' : '사용자'}
        </Badge>
      ),
    },
    {
      accessorKey: 'usage_count',
      header: '사용 횟수',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary">{row.original.usage_count}회</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: '수정일',
      cell: ({ row }) => {
        const date = new Date(row.original.updated_at)
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString('ko-KR')}
          </div>
        )
      },
    },
  ]

  // ========================================
  // Render
  // ========================================

  return (
    <>
      <Helmet>
        <title>프롬프트 템플릿 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">프롬프트 템플릿 관리</h1>
            <p className="text-muted-foreground mt-1">
              Claude Skills에서 사용하는 프롬프트 템플릿을 생성하고 관리합니다
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            신규 템플릿
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 템플릿</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats.total}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>시스템 / 사용자</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span className="text-2xl">
                    {stats.system} / {stats.user}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>공개 / 비공개</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span className="text-2xl">
                    {stats.public} / {stats.private}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>카테고리별</CardDescription>
              <CardContent className="pt-2 px-0">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="text-xs space-y-1">
                    {Object.entries(stats.byCategory).map(([label, count]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="템플릿명, 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-[180px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {Object.entries(PROMPT_TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[200px]">
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="서비스" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 서비스</SelectItem>
                <SelectItem value="none">서비스 없음</SelectItem>
                {Object.entries(MINU_SERVICE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[150px]">
            <Select value={publicFilter} onValueChange={setPublicFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="공개 여부" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="public">공개</SelectItem>
                <SelectItem value="private">비공개</SelectItem>
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
            ) : !data?.templates || data.templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== 'all' || serviceFilter !== 'all'
                    ? '검색 조건에 맞는 템플릿이 없습니다'
                    : '등록된 템플릿이 없습니다'}
                </p>
                {!searchTerm && categoryFilter === 'all' && serviceFilter === 'all' && (
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    첫 템플릿 만들기
                  </Button>
                )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={data.templates}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>

        {/* Form Modal */}
        <PromptTemplateForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          editingItem={editingItem}
        />
      </div>
    </>
  )
}
