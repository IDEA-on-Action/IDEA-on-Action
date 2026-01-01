/**
 * TagForm Component
 * Tag create/edit form with React Hook Form + Zod validation
 *
 * Features:
 * - 2 Accordion sections (Basic Information, Details)
 * - 5 form fields (name, slug, category, description, is_active)
 * - Zod validation
 * - Auto-slug generation
 * - Read-only usage_count display (edit mode only)
 * - FormModal wrapper (size="sm")
 *
 * CMS Phase 2 - AdminTags TagForm
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

// Types
import type { CMSTag, TagCategory } from '@/types/cms/cms.types';
import { generateSlug } from '@/lib/cms-utils';

// =====================================================
// ZOD SCHEMA
// =====================================================

const tagSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, numbers, and hyphens only'),
  category: z.enum(['general', 'technical', 'business']),

  // Details
  description: z.string().max(500).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

type TagFormValues = z.infer<typeof tagSchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface TagFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: CMSTag | null;
  onSuccess?: () => void;
  onSubmit: (values: Partial<CMSTag>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TagForm({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
  onSubmit,
  isSubmitting = false,
  error = null,
}: TagFormProps) {
  // Form setup
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      slug: '',
      category: 'general',
      description: '',
      is_active: true,
    },
  });

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      form.reset({
        name: editingItem.name || '',
        slug: editingItem.slug || '',
        category: editingItem.category || 'general',
        description: editingItem.description || '',
        is_active: editingItem.is_active !== undefined ? editingItem.is_active : true,
      });
    } else if (isOpen && !editingItem) {
      form.reset({
        name: '',
        slug: '',
        category: 'general',
        description: '',
        is_active: true,
      });
    }
  }, [isOpen, editingItem, form]);

  // Slug auto-generation
  const handleTitleBlur = () => {
    const name = form.getValues('name');
    const currentSlug = form.getValues('slug');

    if (name && (!currentSlug || editingItem === null)) {
      form.setValue('slug', generateSlug(name));
    }
  };

  // Form submission
  const handleSubmit = async (values: TagFormValues) => {
    try {
      // Remove empty description (convert to undefined)
      const payload: Partial<CMSTag> = {
        name: values.name,
        slug: values.slug,
        category: values.category,
        description: values.description || undefined,
        is_active: values.is_active,
      };

      // Add usage_count: 0 for new tags (not in editingItem)
      if (!editingItem) {
        payload.usage_count = 0;
      }

      await onSubmit(payload);
      toast.success(editingItem ? 'Tag updated successfully' : 'Tag created successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`Failed to save tag: ${(err as Error).message}`);
    }
  };

  // Character count helper
  const getCharCount = (field: keyof TagFormValues) => {
    const value = form.watch(field);
    return typeof value === 'string' ? value.length : 0;
  };

  // Usage badge helper (for edit mode)
  const getUsageBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="secondary">미사용</Badge>;
    }
    if (count >= 10) {
      return <Badge variant="default" className="bg-green-600">{count}</Badge>;
    }
    return <Badge variant="outline">{count}</Badge>;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Tag' : 'New Tag'}
      description="Fill in the tag details below"
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel={editingItem ? 'Update' : 'Create'}
      loading={isSubmitting}
      error={error || undefined}
      size="sm"
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Accordion type="single" collapsible defaultValue="basic" className="w-full">
          {/* ========================================= */}
          {/* SECTION 1: BASIC INFORMATION */}
          {/* ========================================= */}
          <AccordionItem value="basic">
            <AccordionTrigger>Basic Information</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Tag name (e.g., React Query)"
                  {...form.register('name')}
                  onBlur={handleTitleBlur}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    placeholder="tag-slug"
                    {...form.register('slug')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const name = form.getValues('name');
                      if (name) form.setValue('slug', generateSlug(name));
                    }}
                  >
                    Generate
                  </Button>
                </div>
                {form.formState.errors.slug && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(value) =>
                    form.setValue('category', value as TagCategory)
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 2: DETAILS */}
          {/* ========================================= */}
          <AccordionItem value="details">
            <AccordionTrigger>Details</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Description */}
              <div>
                <Label htmlFor="description">Description ({getCharCount('description')}/500)</Label>
                <Textarea
                  id="description"
                  placeholder="Optional tag description"
                  rows={4}
                  maxLength={500}
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* Usage Count (read-only, edit mode only) */}
              {editingItem && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Usage Count</p>
                      <p className="text-sm text-muted-foreground">
                        This tag is used in {editingItem.usage_count} items (auto-managed)
                      </p>
                    </div>
                    {getUsageBadge(editingItem.usage_count)}
                  </div>
                </div>
              )}

              {/* Active */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">
                    {form.watch('is_active') ? 'Active' : 'Inactive'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {form.watch('is_active')
                      ? 'This tag is visible to the public'
                      : 'This tag is hidden from public pages'}
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={form.watch('is_active')}
                  onCheckedChange={(checked) => form.setValue('is_active', checked)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </FormModal>
  );
}
