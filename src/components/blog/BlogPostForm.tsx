/**
 * BlogPostForm Component
 * Phase 11 Week 1: Blog System + CMS Phase 5: Version Control
 *
 * Form for creating/editing blog posts
 * - React Hook Form + Zod validation
 * - Markdown editor with preview
 * - Featured image upload
 * - Category/Tag selection
 * - Auto slug generation
 * - Version control with auto-save
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, Upload, X, Save } from 'lucide-react'
import { useCategories, useTags, useCreateBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts'
import { generateSlug, calculateReadingTime } from '@/types/blog'
import { devError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox'
import { RichTextEditor } from '@/components/admin/editor/RichTextEditor'
import { useToast } from '@/hooks/useToast'
import { storageApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import type { BlogPostWithRelations } from '@/types/blog'
import { VersionHistory, AutoSaveIndicator, VersionCompareDialog } from '@/components/admin/version'
import { useAutoSave, useCreateVersion, useLatestVersion, useWarnOnUnsavedChanges } from '@/hooks/useVersionControl'
import type { BlogPostSnapshot } from '@/types/version.types'

// Validation Schema
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  excerpt: z.string().max(500, 'Excerpt is too long').optional(),
  content: z.string().min(1, 'Content is required'),
  featured_image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']),
  published_at: z.string().optional(),
  meta_title: z.string().max(60, 'Meta title is too long').optional(),
  meta_description: z.string().max(160, 'Meta description is too long').optional(),
})

type BlogPostFormData = z.infer<typeof blogPostSchema>

interface BlogPostFormProps {
  post?: BlogPostWithRelations
  mode: 'create' | 'edit'
}

export function BlogPostForm({ post, mode }: BlogPostFormProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(post?.featured_image || null)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{ from: number; to: number } | null>(null)

  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: tags, isLoading: tagsLoading } = useTags()
  const createMutation = useCreateBlogPost()
  const updateMutation = useUpdateBlogPost()
  const createVersion = useCreateVersion()

  // Get latest version number for current badge
  const { data: latestVersion } = useLatestVersion('blog', post?.id || '', false)

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      featured_image: post?.featured_image || '',
      category_id: post?.category_id || undefined,
      tag_ids: post?.tags?.map(t => t.id) || [],
      status: post?.status || 'draft',
      published_at: post?.published_at || undefined,
      meta_title: post?.meta_title || '',
      meta_description: post?.meta_description || '',
    },
  })

  const watchTitle = form.watch('title')

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control })

  // Convert form data to snapshot for versioning
  const currentSnapshot = useMemo((): BlogPostSnapshot => ({
    title: watchedValues.title || '',
    slug: watchedValues.slug || '',
    excerpt: watchedValues.excerpt,
    content: watchedValues.content || '',
    featured_image: watchedValues.featured_image,
    category_id: watchedValues.category_id,
    tag_ids: watchedValues.tag_ids,
    status: watchedValues.status || 'draft',
    meta_title: watchedValues.meta_title,
    meta_description: watchedValues.meta_description,
  }), [watchedValues])

  // Auto-save hook (only for edit mode)
  const autoSave = useAutoSave({
    content_type: 'blog',
    content_id: post?.id || '',
    config: {
      enabled: mode === 'edit' && !!post?.id,
      interval_ms: 30000, // 30 seconds
      debounce_ms: 2000, // 2 seconds
      max_auto_saves: 5,
    },
  })

  // Trigger auto-save when content changes
  useEffect(() => {
    if (mode === 'edit' && post?.id && form.formState.isDirty) {
      autoSave.save(currentSnapshot as Record<string, unknown>)
    }
  }, [currentSnapshot, mode, post?.id, form.formState.isDirty, autoSave])

  // Warn before leaving with unsaved changes
  useWarnOnUnsavedChanges(form.formState.isDirty && mode === 'edit')

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && watchTitle && !form.formState.dirtyFields.slug) {
      form.setValue('slug', generateSlug(watchTitle))
    }
  }, [watchTitle, mode, form])

  // Handle version restore
  const handleVersionRestore = useCallback((content: Record<string, unknown>) => {
    const snapshot = content as BlogPostSnapshot
    form.reset({
      title: snapshot.title,
      slug: snapshot.slug,
      excerpt: snapshot.excerpt || '',
      content: snapshot.content,
      featured_image: snapshot.featured_image || '',
      category_id: snapshot.category_id,
      tag_ids: snapshot.tag_ids || [],
      status: snapshot.status,
      meta_title: snapshot.meta_title || '',
      meta_description: snapshot.meta_description || '',
    })
    if (snapshot.featured_image) {
      setPreviewImage(snapshot.featured_image)
    }
    toast({
      title: 'Version Restored',
      description: 'The form has been updated with the restored version.',
    })
  }, [form, toast])

  // Handle version compare
  const handleVersionCompare = useCallback((from: number, to: number) => {
    setCompareVersions({ from, to })
    setCompareDialogOpen(true)
  }, [])

  // Save version manually
  const handleSaveVersion = async () => {
    if (!post?.id) return

    try {
      await createVersion.mutateAsync({
        content_type: 'blog',
        content_id: post.id,
        content_snapshot: currentSnapshot as Record<string, unknown>,
        change_summary: 'Manual save',
        is_auto_save: false,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save version',
        variant: 'destructive',
      })
    }
  }

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Only JPG, PNG, and WEBP images are allowed',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    try {
      // Upload to R2 Storage via Workers API
      const fileName = `blog-images/${Date.now()}-${file.name}`
      const { data, error } = await storageApi.upload(fileName, file)

      if (error) throw new Error(error)

      // Get public URL from response
      const imageUrl = data?.url || ''
      form.setValue('featured_image', imageUrl, { shouldValidate: true })
      setPreviewImage(imageUrl)

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      })
    } catch (error) {
      devError(error, { operation: '이미지 업로드', service: 'Blog' })
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Remove featured image
  const handleRemoveImage = () => {
    form.setValue('featured_image', '')
    setPreviewImage(null)
  }

  // Submit handler
  const onSubmit = async (data: BlogPostFormData) => {
    try {
      const submitData = {
        ...data,
        author_id: user?.id || '',
        read_time: calculateReadingTime(data.content),
      }

      if (mode === 'create') {
        await createMutation.mutateAsync(submitData)
        toast({
          title: 'Success',
          description: 'Blog post created successfully',
        })
        navigate('/admin/blog')
      } else if (post) {
        await updateMutation.mutateAsync({ id: post.id, data: submitData })
        toast({
          title: 'Success',
          description: 'Blog post updated successfully',
        })
        navigate('/admin/blog')
      }
    } catch (error) {
      devError(error, { operation: '블로그 포스트 제출', service: 'Blog' })
      toast({
        title: 'Error',
        description: `Failed to ${mode} blog post`,
        variant: 'destructive',
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Version Control Header - Only in Edit Mode */}
        {mode === 'edit' && post?.id && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-4">
              <AutoSaveIndicator
                status={autoSave.status}
                lastSavedAt={autoSave.lastSavedAt}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveVersion}
                disabled={createVersion.isPending || !form.formState.isDirty}
              >
                {createVersion.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Version
              </Button>
              <VersionHistory
                contentType="blog"
                contentId={post.id}
                currentVersionNumber={latestVersion?.version_number}
                onRestore={handleVersionRestore}
                onCompare={handleVersionCompare}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter post title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug *</FormLabel>
              <FormControl>
                <Input placeholder="post-slug" {...field} />
              </FormControl>
              <FormDescription>
                URL-friendly version of the title (lowercase, hyphens only)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Excerpt */}
        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief summary of the post..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Short description shown in post previews
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content - RichTextEditor with WYSIWYG and Markdown modes */}
        <FormField
          control={form.control}
          name="content"
          render={({ field, fieldState: { error } }) => (
            <FormItem>
              <FormLabel>Content * (WYSIWYG / Markdown)</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  defaultMode="wysiwyg"
                  outputFormat="markdown"
                  config={{
                    placeholder: 'Write your blog post content...',
                    minHeight: 400,
                    maxHeight: 800,
                    enableImages: true,
                    enableCodeBlocks: true,
                    enableLinks: true,
                  }}
                  error={!!error}
                  errorMessage={error?.message}
                />
              </FormControl>
              <FormDescription>
                Switch between WYSIWYG and Markdown modes using the toolbar toggle
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Featured Image */}
        <FormField
          control={form.control}
          name="featured_image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image</FormLabel>
              <div className="space-y-4">
                {previewImage ? (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Featured"
                      className="w-full max-w-md rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                )}
              </div>
              <FormDescription>
                JPG, PNG, or WEBP. Max 5MB.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={categoriesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories?.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tags */}
        <FormField
          control={form.control}
          name="tag_ids"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-4">
                {tagsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  tags?.map(tag => (
                    <FormField
                      key={tag.id}
                      control={form.control}
                      name="tag_ids"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(tag.id)}
                              onCheckedChange={(checked) => {
                                const updatedTags = checked
                                  ? [...(field.value || []), tag.id]
                                  : field.value?.filter(id => id !== tag.id) || []
                                field.onChange(updatedTags)
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {tag.name}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* SEO Fields */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">SEO Settings</h3>

          <FormField
            control={form.control}
            name="meta_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Title</FormLabel>
                <FormControl>
                  <Input placeholder="SEO title..." {...field} />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/60 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meta_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="SEO description..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/160 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create Post' : 'Update Post'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/blog')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Version Compare Dialog */}
      {mode === 'edit' && post?.id && compareVersions && (
        <VersionCompareDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
          contentType="blog"
          contentId={post.id}
          fromVersion={compareVersions.from}
          toVersion={compareVersions.to}
        />
      )}
    </Form>
  )
}
