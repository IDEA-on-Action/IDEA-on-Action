/**
 * PostForm Component
 *
 * 블로그 게시물 생성/수정 폼
 * - React Hook Form + Zod 검증
 * - 마크다운 미리보기
 * - 태그/카테고리 입력
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff, Save, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import type { Post } from '@/types/database'

// ===================================================================
// Schema
// ===================================================================

const postSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200, '제목은 200자 이하여야 합니다'),
  slug: z.string().optional(),
  content: z.string().min(1, '내용을 입력하세요'),
  excerpt: z.string().max(500, '요약은 500자 이하여야 합니다').optional(),
  featured_image_url: z.string().url('유효한 URL을 입력하세요').optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
})

export type PostFormData = z.infer<typeof postSchema>

// ===================================================================
// Props
// ===================================================================

interface PostFormProps {
  initialData?: Post
  onSubmit: (data: PostFormData, status: 'draft' | 'published') => void
  isLoading?: boolean
}

// ===================================================================
// Component
// ===================================================================

export function PostForm({ initialData, onSubmit, isLoading }: PostFormProps) {
  const [tagInput, setTagInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [previewMode, setPreviewMode] = useState(false)

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      featured_image_url: initialData?.featured_image_url || '',
      tags: initialData?.tags || [],
      categories: initialData?.categories || [],
    },
  })

  const handleSaveDraft = () => {
    form.handleSubmit((data) => onSubmit(data, 'draft'))()
  }

  const handlePublish = () => {
    form.handleSubmit((data) => onSubmit(data, 'published'))()
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.getValues('tags').includes(tag)) {
      form.setValue('tags', [...form.getValues('tags'), tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      'tags',
      form.getValues('tags').filter((t) => t !== tagToRemove)
    )
  }

  const addCategory = () => {
    const category = categoryInput.trim()
    if (category && !form.getValues('categories').includes(category)) {
      form.setValue('categories', [...form.getValues('categories'), category])
      setCategoryInput('')
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    form.setValue(
      'categories',
      form.getValues('categories').filter((c) => c !== categoryToRemove)
    )
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* 헤더 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  편집
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  미리보기
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              임시저장
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              발행
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 제목 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="게시물 제목"
                      className="text-2xl font-bold h-auto py-3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 컨텐츠 */}
            {previewMode ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">미리보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <MarkdownPreview content={form.watch('content')} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="마크다운으로 내용을 작성하세요..."
                        className="min-h-[400px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      마크다운 형식을 지원합니다. (# 제목, **굵게**, *기울임*, - 목록)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">요약</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="게시물 요약 (선택)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 대표 이미지 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">대표 이미지</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="featured_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="이미지 URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('featured_image_url') && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={form.watch('featured_image_url')}
                      alt="미리보기"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 태그 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">태그</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="태그 입력"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.watch('tags').map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 카테고리 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">카테고리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="카테고리 입력"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCategory()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addCategory}>
                    추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.watch('categories').map((category) => (
                    <Badge
                      key={category}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeCategory(category)}
                    >
                      {category} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slug */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">URL 슬러그</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="자동 생성됨" {...field} />
                      </FormControl>
                      <FormDescription>
                        비워두면 제목 기반으로 자동 생성됩니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  )
}

// ===================================================================
// Markdown Preview
// ===================================================================

function MarkdownPreview({ content }: { content: string }) {
  // 기본적인 마크다운 변환
  const html = content
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />')

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${html}</p>` }}
    />
  )
}
