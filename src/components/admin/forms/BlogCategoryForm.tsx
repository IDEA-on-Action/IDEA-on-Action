/**
 * BlogCategoryForm Component
 * Blog Category create/edit form with React Hook Form + Zod validation
 *
 * Features:
 * - 2 Accordion sections (Basic Information, Styling)
 * - 5 form fields (name, slug, description, color, icon)
 * - Zod validation
 * - Auto-slug generation
 * - ColorPicker integration
 * - Hex color validation
 *
 * CMS Phase 2 - AdminBlogCategories BlogCategoryForm
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal';
import { ColorPicker } from '@/components/admin/ui/ColorPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Types
import type { BlogCategory } from '@/types/cms/cms.types';
import { generateSlug } from '@/lib/cms-utils';

// =====================================================
// ZOD SCHEMA
// =====================================================

const blogCategorySchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, numbers, and hyphens only'),
  description: z.string().max(500).optional().or(z.literal('')),

  // Styling
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #3b82f6)')
    .default('#3b82f6'),
  icon: z.string().min(1, 'Icon name required').max(50).default('folder'),
});

type BlogCategoryFormValues = z.infer<typeof blogCategorySchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface BlogCategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: BlogCategory | null;
  onSuccess?: () => void;
  onSubmit: (values: Partial<BlogCategory>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function BlogCategoryForm({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
  onSubmit,
  isSubmitting = false,
  error = null,
}: BlogCategoryFormProps) {
  // Form setup
  const form = useForm<BlogCategoryFormValues>({
    resolver: zodResolver(blogCategorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      color: '#3b82f6',
      icon: 'folder',
    },
  });

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      form.reset({
        name: editingItem.name || '',
        slug: editingItem.slug || '',
        description: editingItem.description || '',
        color: editingItem.color || '#3b82f6',
        icon: editingItem.icon || 'folder',
      });
    } else if (isOpen && !editingItem) {
      form.reset({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6',
        icon: 'folder',
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
  const handleSubmit = async (values: BlogCategoryFormValues) => {
    try {
      await onSubmit(values);
      toast.success(
        editingItem ? 'Blog category updated successfully' : 'Blog category created successfully'
      );
      onSuccess?.();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`Failed to save blog category: ${(err as Error).message}`);
    }
  };

  // Character count helper
  const getCharCount = (field: keyof BlogCategoryFormValues) => {
    const value = form.watch(field);
    return typeof value === 'string' ? value.length : 0;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Blog Category' : 'New Blog Category'}
      description="Fill in the blog category details below"
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel={editingItem ? 'Update' : 'Create'}
      loading={isSubmitting}
      error={error || undefined}
      size="md"
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
                  placeholder="Technology"
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
                  <Input id="slug" placeholder="technology" {...form.register('slug')} />
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
                <p className="text-xs text-muted-foreground mt-1">
                  URL-friendly identifier (lowercase, hyphens only)
                </p>
                {form.formState.errors.slug && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">
                  Description ({getCharCount('description')}/500)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this category"
                  rows={3}
                  maxLength={500}
                  {...form.register('description')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Helps users understand the category
                </p>
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 2: STYLING */}
          {/* ========================================= */}
          <AccordionItem value="styling">
            <AccordionTrigger>Styling</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Color */}
              <div>
                <Label htmlFor="color">Color *</Label>
                <ColorPicker
                  value={form.watch('color')}
                  onChange={(color) => form.setValue('color', color)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Hex color code for category badge (e.g., #3b82f6, #f59e0b)
                </p>
                {form.formState.errors.color && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.color.message}
                  </p>
                )}
              </div>

              {/* Icon */}
              <div>
                <Label htmlFor="icon">Icon *</Label>
                <Input
                  id="icon"
                  placeholder="folder"
                  {...form.register('icon')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lucide icon name (e.g., "BookOpen", "Code", "Palette", "Briefcase")
                </p>
                {form.formState.errors.icon && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.icon.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </FormModal>
  );
}
