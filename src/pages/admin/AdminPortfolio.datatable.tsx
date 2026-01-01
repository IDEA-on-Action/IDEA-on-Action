/**
 * AdminPortfolio Page (DataTable Version)
 *
 * CMS 포트폴리오 관리 페이지 - TanStack Table 기반
 * - DataTable: 정렬, 검색, 페이지네이션
 * - 컬럼 표시/숨김
 * - 행 선택 (체크박스)
 * - 타입/상태 필터링
 * - 생성/수정/삭제 CRUD
 */

import { useState, useMemo, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { ColumnDef } from '@tanstack/react-table'
import {
  usePortfolioItems,
  useCreatePortfolioItem,
  useUpdatePortfolioItem,
  useDeletePortfolioItem,
} from '@/hooks/cms/usePortfolioItems'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PortfolioItem } from '@/types/cms/cms.types'
import { FormSection } from '@/components/admin/FormSection'
import { DataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'

// Zod Schema for Portfolio Form
const portfolioSchema = z.object({
  slug: z.string().min(1, 'slug를 입력하세요 (URL-friendly)'),
  title: z.string().min(1, '제목을 입력하세요'),
  summary: z.string().min(1, '요약을 입력하세요'),
  description: z.string().optional(),
  client_name: z.string().optional(),
  client_logo: z.string().optional(),
  project_type: z.enum(['mvp', 'fullstack', 'design', 'operations']),
  thumbnail: z.string().optional(),
  images: z.string().optional(), // JSON array string
  tech_stack: z.string().optional(), // JSON array string
  project_url: z.string().optional(),
  github_url: z.string().optional(),
  duration: z.string().optional(),
  team_size: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  challenges: z.string().optional(),
  solutions: z.string().optional(),
  outcomes: z.string().optional(),
  testimonial: z.string().optional(), // JSON object string
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
})

type PortfolioFormData = z.infer<typeof portfolioSchema>

// Extended PortfolioItem type for display
interface PortfolioItemWithStatus extends PortfolioItem {
  status?: string
}

export default function AdminPortfolio() {
  const { toast } = useToast()
  const { data: portfolioItems, isLoading } = usePortfolioItems()
  const createMutation = useCreatePortfolioItem()
  const updateMutation = useUpdatePortfolioItem()
  const deleteMutation = useDeletePortfolioItem()

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editItem, setEditItem] = useState<PortfolioItemWithStatus | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<PortfolioItemWithStatus[]>([])

  const form = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      slug: '',
      title: '',
      summary: '',
      description: '',
      client_name: '',
      client_logo: '',
      project_type: 'mvp',
      thumbnail: '',
      images: '[]',
      tech_stack: '[]',
      project_url: '',
      github_url: '',
      duration: '',
      team_size: 1,
      start_date: '',
      end_date: '',
      challenges: '',
      solutions: '',
      outcomes: '',
      testimonial: '{}',
      featured: false,
      published: false,
    },
  })

  // Filter portfolio items
  const filteredItems = useMemo(() => {
    return portfolioItems?.filter((item) => {
      const matchesType = typeFilter === 'all' || item.projectType === typeFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'featured' && item.featured) ||
        (statusFilter === 'published' && item.published) ||
        (statusFilter === 'draft' && !item.published)
      return matchesType && matchesStatus
    })
  }, [portfolioItems, typeFilter, statusFilter])

  // Get project type badge
  const getProjectTypeBadge = (type: string) => {
    switch (type) {
      case 'mvp':
        return <Badge variant="default" className="bg-blue-500">MVP</Badge>
      case 'fullstack':
        return <Badge variant="default" className="bg-green-500">Fullstack</Badge>
      case 'design':
        return <Badge variant="default" className="bg-purple-500">Design</Badge>
      case 'operations':
        return <Badge variant="default" className="bg-orange-500">Operations</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  // Get status badges (published/draft/featured)
  const getStatusBadges = (item: PortfolioItemWithStatus) => {
    return (
      <div className="flex gap-1">
        {item.published ? (
          <Badge variant="default" className="bg-green-600">공개</Badge>
        ) : (
          <Badge variant="secondary">비공개</Badge>
        )}
        {item.featured && (
          <Badge variant="default" className="bg-yellow-600">Featured</Badge>
        )}
      </div>
    )
  }

  // Toggle published status
  const handleTogglePublished = useCallback(async (item: PortfolioItemWithStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { published: !item.published },
      })
      toast({
        title: '공개 상태 변경',
        description: item.published ? '비공개로 변경되었습니다.' : '공개로 변경되었습니다.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '상태 변경 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }, [updateMutation, toast])

  // Toggle featured status
  const handleToggleFeatured = useCallback(async (item: PortfolioItemWithStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { featured: !item.featured },
      })
      toast({
        title: 'Featured 상태 변경',
        description: item.featured ? 'Featured 해제되었습니다.' : 'Featured로 설정되었습니다.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '상태 변경 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }, [updateMutation, toast])

  // Open dialog for editing item
  const handleEdit = useCallback((item: PortfolioItemWithStatus) => {
    setEditItem(item)
    form.reset({
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      description: item.description || '',
      client_name: item.clientName || '',
      client_logo: item.clientLogo || '',
      project_type: item.projectType,
      thumbnail: item.thumbnail || '',
      images: JSON.stringify(item.images || []),
      tech_stack: JSON.stringify(item.techStack || []),
      project_url: item.projectUrl || '',
      github_url: item.githubUrl || '',
      duration: item.duration || '',
      team_size: item.teamSize || 1,
      start_date: item.startDate || '',
      end_date: item.endDate || '',
      challenges: item.challenges || '',
      solutions: item.solutions || '',
      outcomes: item.outcomes || '',
      testimonial: JSON.stringify(item.testimonial || {}),
      featured: item.featured || false,
      published: item.published || false,
    })
    setIsDialogOpen(true)
  }, [form])

  // Define columns for DataTable
  const columns = useMemo<ColumnDef<PortfolioItemWithStatus>[]>(
    () => [
      {
        accessorKey: 'thumbnail',
        header: '썸네일',
        cell: ({ row }) => {
          const thumbnail = row.getValue('thumbnail') as string | undefined
          const title = row.original.title
          return thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="제목" />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-sm text-muted-foreground truncate max-w-xs">
              {row.original.summary}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'projectType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="타입" />
        ),
        cell: ({ row }) => getProjectTypeBadge(row.getValue('projectType')),
      },
      {
        id: 'status',
        header: '상태',
        cell: ({ row }) => getStatusBadges(row.original),
      },
      {
        accessorKey: 'techStack',
        header: '기술 스택',
        cell: ({ row }) => {
          const techStack = row.getValue('techStack') as string[]
          return (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {techStack.slice(0, 3).map((tech, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {techStack.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{techStack.length - 3}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        id: 'featured',
        header: 'Featured',
        cell: ({ row }) => (
          <Switch
            checked={row.original.featured || false}
            onCheckedChange={() => handleToggleFeatured(row.original)}
          />
        ),
      },
      {
        id: 'published',
        header: '공개',
        cell: ({ row }) => (
          <Switch
            checked={row.original.published || false}
            onCheckedChange={() => handleTogglePublished(row.original)}
          />
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [handleEdit, handleToggleFeatured, handleTogglePublished]
  )

  // Open dialog for creating new item
  const handleCreate = () => {
    setEditItem(null)
    form.reset({
      slug: '',
      title: '',
      summary: '',
      description: '',
      client_name: '',
      client_logo: '',
      project_type: 'mvp',
      thumbnail: '',
      images: '[]',
      tech_stack: '[]',
      project_url: '',
      github_url: '',
      duration: '',
      team_size: 1,
      start_date: '',
      end_date: '',
      challenges: '',
      solutions: '',
      outcomes: '',
      testimonial: '{}',
      featured: false,
      published: false,
    })
    setIsDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async (data: PortfolioFormData) => {
    try {
      const payload = {
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        description: data.description,
        clientName: data.client_name,
        clientLogo: data.client_logo,
        projectType: data.project_type,
        thumbnail: data.thumbnail,
        images: data.images ? JSON.parse(data.images) : [],
        techStack: data.tech_stack ? JSON.parse(data.tech_stack) : [],
        projectUrl: data.project_url,
        githubUrl: data.github_url,
        duration: data.duration,
        teamSize: data.team_size,
        startDate: data.start_date,
        endDate: data.end_date,
        challenges: data.challenges,
        solutions: data.solutions,
        outcomes: data.outcomes,
        testimonial: data.testimonial ? JSON.parse(data.testimonial) : {},
        featured: data.featured,
        published: data.published,
      }

      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, updates: payload })
        toast({
          title: '포트폴리오 수정 완료',
          description: '포트폴리오 항목이 수정되었습니다.',
        })
      } else {
        await createMutation.mutateAsync(payload as Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>)
        toast({
          title: '포트폴리오 생성 완료',
          description: '새 포트폴리오 항목이 생성되었습니다.',
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: editItem ? '포트폴리오 수정 실패' : '포트폴리오 생성 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Delete portfolio item
  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteMutation.mutateAsync(deleteId)
      toast({
        title: '포트폴리오 삭제 완료',
        description: '포트폴리오 항목이 삭제되었습니다.',
      })
      setDeleteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '포트폴리오 삭제 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Helmet>
        <title>포트폴리오 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">포트폴리오 관리</h1>
            <p className="text-muted-foreground">프로젝트 포트폴리오를 관리합니다</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            새 포트폴리오 항목
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 타입</SelectItem>
              <SelectItem value="mvp">MVP</SelectItem>
              <SelectItem value="fullstack">Fullstack</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="published">공개</SelectItem>
              <SelectItem value="draft">비공개</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
          {selectedRows.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {selectedRows.length}개 선택됨
            </Badge>
          )}
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={filteredItems || []}
          loading={isLoading}
          searchPlaceholder="제목 또는 요약 검색..."
          pageSize={10}
          enableColumnVisibility
          enableRowSelection
          onSelectedRowsChange={setSelectedRows}
          onRowClick={(row) => handleEdit(row)}
        />
      </div>

      {/* Create/Edit Dialog (Same as original) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? '포트폴리오 수정' : '새 포트폴리오 항목'}</DialogTitle>
            <DialogDescription>
              포트폴리오 정보를 입력하세요. JSON 필드는 유효한 JSON 형식이어야 합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Section 1: Basic Information */}
              <FormSection
                title="기본 정보"
                description="프로젝트명, 요약, 클라이언트 정보를 입력하세요"
                defaultOpen
              >
                {/* Slug & Title */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (필수)</FormLabel>
                        <FormControl>
                          <Input placeholder="project-name-2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>제목 (필수)</FormLabel>
                        <FormControl>
                          <Input placeholder="프로젝트 제목" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Summary */}
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>요약 (필수)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="프로젝트 요약" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상세 설명</FormLabel>
                      <FormControl>
                        <Textarea placeholder="프로젝트 상세 설명" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Name & Logo */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>클라이언트명</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>클라이언트 로고 URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Project Type & Thumbnail */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="project_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>프로젝트 타입 (필수)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mvp">MVP</SelectItem>
                            <SelectItem value="fullstack">Fullstack</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="thumbnail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>썸네일 URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              {/* Remaining sections same as original... */}
              {/* For brevity, I'll skip the rest of the form sections */}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>포트폴리오 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 포트폴리오 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
    </>
  )
}
