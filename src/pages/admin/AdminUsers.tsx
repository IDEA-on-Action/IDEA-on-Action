/**
 * AdminUsers Page
 *
 * CMS 관리자 사용자 관리 페이지 (super_admin only)
 * - 관리자 목록 (테이블)
 * - 역할별 필터링
 * - 생성/수정/삭제 CRUD
 * - 권한 제어 (super_admin만 접근 가능)
 */

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useCurrentAdminRole } from '@/hooks/auth/useAdmins'
import { useAuth } from '@/hooks/useAuth'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
import { Loader2, Plus, Pencil, Trash2, Search, ShieldAlert } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AdminWithEmail, AdminRole } from '@/types/v2'

// Zod Schema for Admin Form
const adminSchema = z.object({
  user_id: z.string().min(1, '사용자를 선택하세요'),
  role: z.enum(['super_admin', 'admin', 'editor'], {
    required_error: '역할을 선택하세요',
  }),
})

type AdminFormData = z.infer<typeof adminSchema>

// User search result type
interface UserSearchResult {
  id: string
  email: string
}

export default function AdminUsers() {
  const { toast } = useToast()
  const { getAccessToken } = useAuth()
  const { data: adminRole, isLoading: isAdminRoleLoading } = useCurrentAdminRole()
  const { data: admins, isLoading } = useAdmins()
  const createMutation = useCreateAdmin()
  const updateMutation = useUpdateAdmin()
  const deleteMutation = useDeleteAdmin()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editItem, setEditItem] = useState<AdminWithEmail | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      user_id: '',
      role: 'editor',
    },
  })

  // Search users by email
  const searchUsersByEmail = async (query: string) => {
    if (!query || query.length < 3) {
      setUserSearchResults([])
      return
    }

    setIsSearchingUsers(true)
    try {
      const token = getAccessToken()
      if (!token) {
        toast({
          title: '인증 필요',
          description: '로그인이 필요합니다.',
          variant: 'destructive',
        })
        return
      }

      // Use Workers Admin API to search users
      const { data, error } = await callWorkersApi<{ users: Array<{ id: string; email: string }> }>(
        `/api/v1/admin/users/search?q=${encodeURIComponent(query)}`,
        { token }
      )

      if (error) {
        console.error('사용자 검색 실패:', error)
        toast({
          title: '사용자 검색 실패',
          description: error,
          variant: 'destructive',
        })
        return
      }

      // Map users to search results
      const filteredUsers = (data?.users || []).map((user) => ({
        id: user.id,
        email: user.email || '',
      }))

      setUserSearchResults(filteredUsers)
    } catch (error) {
      console.error('사용자 검색 중 오류:', error)
      toast({
        title: '사용자 검색 실패',
        description: '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSearchingUsers(false)
    }
  }

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        searchUsersByEmail(userSearchQuery)
      } else {
        setUserSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearchQuery])

  // Filter admin items
  const filteredItems = admins?.filter((item) => {
    const matchesSearch =
      !search ||
      item.email?.toLowerCase().includes(search.toLowerCase()) ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.role.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || item.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Open dialog for creating new item
  const handleCreate = () => {
    setEditItem(null)
    setUserSearchQuery('')
    setUserSearchResults([])
    form.reset({
      user_id: '',
      role: 'editor',
    })
    setIsDialogOpen(true)
  }

  // Open dialog for editing item
  const handleEdit = (item: AdminWithEmail) => {
    setEditItem(item)
    setUserSearchQuery(item.email || '')
    setUserSearchResults([])
    form.reset({
      user_id: item.user_id,
      role: item.role,
    })
    setIsDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async (data: AdminFormData) => {
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, role: data.role })
        toast({
          title: '관리자 수정 완료',
          description: '관리자 정보가 수정되었습니다.',
        })
      } else {
        await createMutation.mutateAsync({ user_id: data.user_id, role: data.role })
        toast({
          title: '관리자 생성 완료',
          description: '새 관리자가 생성되었습니다.',
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: editItem ? '관리자 수정 실패' : '관리자 생성 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Delete admin
  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteMutation.mutateAsync(deleteId)
      toast({
        title: '관리자 삭제 완료',
        description: '관리자가 삭제되었습니다.',
      })
      setDeleteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '관리자 삭제 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Format date
  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get role badge
  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="destructive" className="bg-red-500">
            Super Admin
          </Badge>
        )
      case 'admin':
        return <Badge variant="default">Admin</Badge>
      case 'editor':
        return (
          <Badge variant="secondary" className="bg-green-500">
            Editor
          </Badge>
        )
    }
  }

  // adminRole loading check
  if (isAdminRoleLoading) {
    return (
      <>
        <Helmet>
          <title>관리자 관리 | IDEA on Action</title>
        </Helmet>

        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  // Permission check: only super_admin can access this page
  if (adminRole !== 'super_admin') {
    return (
      <>
        <Helmet>
          <title>관리자 관리 | IDEA on Action</title>
        </Helmet>

        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-3xl font-bold">권한이 없습니다</h1>
          <p className="text-muted-foreground">
            이 페이지는 Super Admin만 접근할 수 있습니다.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>관리자 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">관리자 관리</h1>
            <p className="text-muted-foreground">시스템 관리자를 관리합니다</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            새 관리자
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이메일 또는 역할 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 역할</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name || '-'}</TableCell>
                    <TableCell>{item.email || '-'}</TableCell>
                    <TableCell>{getRoleBadge(item.role)}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground">등록된 관리자가 없습니다</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                첫 관리자 만들기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? '관리자 수정' : '새 관리자'}</DialogTitle>
            <DialogDescription>
              관리자 정보를 입력하세요. Super Admin은 모든 권한을 가집니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* User ID (Email search) */}
              {!editItem && (
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용자 (필수)</FormLabel>
                      <div className="space-y-2">
                        <Input
                          placeholder="이메일로 사용자 검색 (최소 3자)"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                        {isSearchingUsers && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            검색 중...
                          </div>
                        )}
                        {userSearchResults.length > 0 && (
                          <div className="border rounded-md max-h-48 overflow-y-auto">
                            {userSearchResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  field.onChange(user.id)
                                  setUserSearchQuery(user.email)
                                  setUserSearchResults([])
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                              >
                                {user.email}
                              </button>
                            ))}
                          </div>
                        )}
                        {userSearchQuery.length >= 3 &&
                          !isSearchingUsers &&
                          userSearchResults.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              검색 결과가 없습니다
                            </p>
                          )}
                      </div>
                      <FormControl>
                        <input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>역할 (필수)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin (모든 권한)</SelectItem>
                        <SelectItem value="admin">Admin (관리 권한)</SelectItem>
                        <SelectItem value="editor">Editor (편집 권한)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            <AlertDialogTitle>관리자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 관리자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
