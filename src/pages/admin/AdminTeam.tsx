/**
 * AdminTeam Page
 *
 * CMS 팀원 관리 페이지
 * - 팀원 목록 (테이블)
 * - 활성 상태 필터링
 * - 생성/수정/삭제 CRUD
 * - 공개/비공개 토글
 * - 우선순위 관리
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useToggleTeamMemberActive,
} from '@/hooks/useTeamMembers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Pencil, Trash2, Search, Github, Linkedin, Twitter, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TeamMember } from '@/types/cms.types'
import { FileUpload } from '@/components/ui/file-upload'

// Zod Schema for Team Member Form
const teamMemberSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  role: z.string().min(1, '역할을 입력하세요'),
  bio: z.string().optional(),
  avatar: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  email: z.string().email('유효한 이메일을 입력하세요').or(z.literal('')).optional(),
  skills: z.string().optional(), // comma-separated string
  github: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  linkedin: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  twitter: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  website: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  active: z.boolean().default(true),
  priority: z.number().min(0).default(0),
})

type TeamMemberFormData = z.infer<typeof teamMemberSchema>

export default function AdminTeam() {
  const { toast } = useToast()
  const { data: teamMembers, isLoading } = useTeamMembers()
  const createMutation = useCreateTeamMember()
  const updateMutation = useUpdateTeamMember()
  const deleteMutation = useDeleteTeamMember()
  const toggleActiveMutation = useToggleTeamMemberActive()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [editItem, setEditItem] = useState<TeamMember | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [avatarFiles, setAvatarFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: '',
      role: '',
      bio: '',
      avatar: '',
      email: '',
      skills: '',
      github: '',
      linkedin: '',
      twitter: '',
      website: '',
      active: true,
      priority: 0,
    },
  })

  // Filter team members
  const filteredItems = teamMembers?.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.role.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase())
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && item.active) ||
      (activeFilter === 'inactive' && !item.active)
    return matchesSearch && matchesActive
  })

  // Avatar upload handler
  const handleAvatarUpload = async (files: File[]) => {
    if (files.length === 0) return

    setAvatarFiles(files)

    // Simulate upload progress (실제로는 Supabase Storage API 사용)
    // For demonstration purposes, we'll just create a local URL
    const file = files[0]
    const localUrl = URL.createObjectURL(file)

    // Simulate async upload with progress
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          // 업로드 완료 후 폼 값 업데이트
          form.setValue('avatar', localUrl)
          toast({
            title: '아바타 업로드 완료',
            description: `${file.name}을(를) 업로드했습니다.`,
          })
          return 100
        }
        return prev + 10
      })
    }, 100)
  }

  // Open dialog for creating new item
  const handleCreate = () => {
    setEditItem(null)
    setAvatarFiles([])
    setUploadProgress(0)
    form.reset({
      name: '',
      role: '',
      bio: '',
      avatar: '',
      email: '',
      skills: '',
      github: '',
      linkedin: '',
      twitter: '',
      website: '',
      active: true,
      priority: 0,
    })
    setIsDialogOpen(true)
  }

  // Open dialog for editing item
  const handleEdit = (item: TeamMember) => {
    setEditItem(item)
    form.reset({
      name: item.name,
      role: item.role,
      bio: item.bio || '',
      avatar: item.avatar || '',
      email: item.email || '',
      skills: item.skills.join(', '),
      github: item.socialLinks.github || '',
      linkedin: item.socialLinks.linkedin || '',
      twitter: item.socialLinks.twitter || '',
      website: item.socialLinks.website || '',
      active: item.active,
      priority: item.priority,
    })
    setIsDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async (data: TeamMemberFormData) => {
    try {
      const payload = {
        name: data.name,
        role: data.role,
        bio: data.bio || null,
        avatar: data.avatar || null,
        email: data.email || null,
        skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        socialLinks: {
          github: data.github || undefined,
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          website: data.website || undefined,
        },
        active: data.active,
        priority: data.priority,
      }

      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, updates: payload })
        toast({
          title: '팀원 수정 완료',
          description: '팀원 정보가 수정되었습니다.',
        })
      } else {
        await createMutation.mutateAsync(payload)
        toast({
          title: '팀원 생성 완료',
          description: '새 팀원이 추가되었습니다.',
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: editItem ? '팀원 수정 실패' : '팀원 생성 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Delete team member
  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteMutation.mutateAsync(deleteId)
      toast({
        title: '팀원 삭제 완료',
        description: '팀원이 삭제되었습니다.',
      })
      setDeleteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '팀원 삭제 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Toggle active status
  const handleToggleActive = async (item: TeamMember) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: item.id,
        active: !item.active,
      })
      toast({
        title: '활성 상태 변경',
        description: item.active ? '비활성화되었습니다.' : '활성화되었습니다.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast({
        title: '상태 변경 실패',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Get social link icon
  const getSocialIcon = (platform: string, url?: string) => {
    if (!url) return null
    const icons = {
      github: <Github className="h-4 w-4" />,
      linkedin: <Linkedin className="h-4 w-4" />,
      twitter: <Twitter className="h-4 w-4" />,
      website: <Globe className="h-4 w-4" />,
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label={platform}
      >
        {icons[platform as keyof typeof icons]}
      </a>
    )
  }

  return (
    <>
      <Helmet>
        <title>팀원 관리 | IDEA on Action</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">팀원 관리</h1>
            <p className="text-muted-foreground">팀원 정보를 관리합니다</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            새 팀원 추가
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름, 역할, 이메일 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="inactive">비활성</SelectItem>
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
                  <TableHead>아바타</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>스킬</TableHead>
                  <TableHead>소셜</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">{item.name.charAt(0)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.email || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {item.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSocialIcon('github', item.socialLinks.github)}
                        {getSocialIcon('linkedin', item.socialLinks.linkedin)}
                        {getSocialIcon('twitter', item.socialLinks.twitter)}
                        {getSocialIcon('website', item.socialLinks.website)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={item.active} onCheckedChange={() => handleToggleActive(item)} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
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
              <p className="text-muted-foreground">등록된 팀원이 없습니다</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                첫 팀원 추가하기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? '팀원 수정' : '새 팀원 추가'}</DialogTitle>
            <DialogDescription>
              팀원 정보를 입력하세요. 모든 URL은 https://로 시작해야 합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 (필수)</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>역할 (필수)</FormLabel>
                    <FormControl>
                      <Input placeholder="Founder & CEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>소개</FormLabel>
                    <FormControl>
                      <Textarea placeholder="팀원 소개" className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Avatar & Email */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>아바타 이미지</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <FileUpload
                            accept="image/*"
                            maxSize={2 * 1024 * 1024} // 2MB
                            maxFiles={1}
                            onUpload={handleAvatarUpload}
                            preview={true}
                            value={avatarFiles}
                            uploadProgress={uploadProgress}
                          />
                          {field.value && !avatarFiles.length && (
                            <div className="text-xs text-muted-foreground">
                              현재 URL: {field.value.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Skills */}
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>스킬 (쉼표로 구분)</FormLabel>
                    <FormControl>
                      <Input placeholder="React, TypeScript, Node.js" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Social Links */}
              <div className="space-y-3">
                <FormLabel>소셜 링크</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="github"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">GitHub</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Twitter</FormLabel>
                        <FormControl>
                          <Input placeholder="https://twitter.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우선순위 (높을수록 먼저 표시)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active */}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>활성 여부</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        활성화 시 사용자에게 표시됩니다
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
            <AlertDialogTitle>팀원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 팀원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
