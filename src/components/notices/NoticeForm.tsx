/**
 * NoticeForm Component - Phase 11 Week 2 + CMS Phase 5: Version Control
 *
 * Form for creating/editing notices with version control support
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save } from 'lucide-react'
import { useCreateNotice, useUpdateNotice } from '@/hooks/useNotices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/auth/useAuth'
import type { NoticeWithAuthor } from '@/types/cms/notice'
import { VersionHistory, AutoSaveIndicator, VersionCompareDialog } from '@/components/admin/version'
import { useAutoSave, useCreateVersion, useLatestVersion, useWarnOnUnsavedChanges } from '@/hooks/useVersionControl'
import type { NoticeSnapshot } from '@/types/version.types'

const noticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['info', 'warning', 'urgent', 'maintenance']),
  status: z.enum(['draft', 'published', 'archived']),
  is_pinned: z.boolean(),
  expires_at: z.string().optional(),
})

type NoticeFormData = z.infer<typeof noticeSchema>

interface NoticeFormProps {
  notice?: NoticeWithAuthor
  mode: 'create' | 'edit'
}

export function NoticeForm({ notice, mode }: NoticeFormProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{ from: number; to: number } | null>(null)

  const createMutation = useCreateNotice()
  const updateMutation = useUpdateNotice()
  const createVersion = useCreateVersion()

  // Get latest version number for current badge
  const { data: latestVersion } = useLatestVersion('notice', notice?.id || '', false)

  const form = useForm<NoticeFormData>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: notice?.title || '',
      content: notice?.content || '',
      type: notice?.type || 'info',
      status: notice?.status || 'draft',
      is_pinned: notice?.is_pinned || false,
      expires_at: notice?.expires_at || '',
    },
  })

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control })

  // Convert form data to snapshot for versioning
  const currentSnapshot = useMemo((): NoticeSnapshot => ({
    title: watchedValues.title || '',
    content: watchedValues.content || '',
    type: watchedValues.type || 'info',
    status: watchedValues.status || 'draft',
    is_pinned: watchedValues.is_pinned || false,
    expires_at: watchedValues.expires_at,
  }), [watchedValues])

  // Auto-save hook (only for edit mode)
  const autoSave = useAutoSave({
    content_type: 'notice',
    content_id: notice?.id || '',
    config: {
      enabled: mode === 'edit' && !!notice?.id,
      interval_ms: 30000,
      debounce_ms: 2000,
      max_auto_saves: 5,
    },
  })

  // Trigger auto-save when content changes
  useEffect(() => {
    if (mode === 'edit' && notice?.id && form.formState.isDirty) {
      autoSave.save(currentSnapshot as Record<string, unknown>)
    }
  }, [currentSnapshot, mode, notice?.id, form.formState.isDirty, autoSave])

  // Warn before leaving with unsaved changes
  useWarnOnUnsavedChanges(form.formState.isDirty && mode === 'edit')

  // Handle version restore
  const handleVersionRestore = useCallback((content: Record<string, unknown>) => {
    const snapshot = content as NoticeSnapshot
    form.reset({
      title: snapshot.title,
      content: snapshot.content,
      type: snapshot.type,
      status: snapshot.status,
      is_pinned: snapshot.is_pinned,
      expires_at: snapshot.expires_at || '',
    })
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
    if (!notice?.id) return

    try {
      await createVersion.mutateAsync({
        content_type: 'notice',
        content_id: notice.id,
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

  const onSubmit = async (data: NoticeFormData) => {
    try {
      const submitData = {
        ...data,
        author_id: user?.id || '',
        published_at: data.status === 'published' ? new Date().toISOString() : null,
        expires_at: data.expires_at || null,
      }

      if (mode === 'create') {
        await createMutation.mutateAsync(submitData)
      } else if (notice) {
        await updateMutation.mutateAsync({ id: notice.id, data: submitData })
      }

      toast({ title: 'Success', description: `Notice ${mode}d successfully` })
      navigate('/admin/notices')
    } catch {
      toast({ title: 'Error', description: `Failed to ${mode} notice`, variant: 'destructive' })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Version Control Header - Only in Edit Mode */}
        {mode === 'edit' && notice?.id && (
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
                contentType="notice"
                contentId={notice.id}
                currentVersionNumber={latestVersion?.version_number}
                onRestore={handleVersionRestore}
                onCompare={handleVersionCompare}
              />
            </div>
          </div>
        )}

        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title *</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="content" render={({ field }) => (
          <FormItem>
            <FormLabel>Content * (Markdown)</FormLabel>
            <FormControl><Textarea rows={10} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="expires_at" render={({ field }) => (
            <FormItem>
              <FormLabel>Expires At</FormLabel>
              <FormControl><Input type="datetime-local" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="is_pinned" render={({ field }) => (
          <FormItem className="flex items-center space-x-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal cursor-pointer">Pin this notice to the top</FormLabel>
          </FormItem>
        )} />

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create Notice' : 'Update Notice'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/notices')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Version Compare Dialog */}
      {mode === 'edit' && notice?.id && compareVersions && (
        <VersionCompareDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
          contentType="notice"
          contentId={notice.id}
          fromVersion={compareVersions.from}
          toVersion={compareVersions.to}
        />
      )}
    </Form>
  )
}
