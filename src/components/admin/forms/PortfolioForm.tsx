/**
 * PortfolioForm Component
 * Comprehensive portfolio create/edit form with React Hook Form + Zod validation
 */

import React, { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Supabase Storage Hook
import { useFileUpload } from '@/hooks/media/useFileUpload';

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { MultiSelect } from '@/components/admin/ui/MultiSelect';
import { DateRangePicker } from '@/components/admin/ui/DateRangePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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

// Types
import { PortfolioItem } from '@/types/cms/cms.types';
import { generateSlug } from '@/lib/cms-utils';

// =====================================================
// ZOD SCHEMA
// =====================================================

const portfolioSchema = z.object({
  // Basic Info
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, numbers, and hyphens only'),
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(500),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000).optional(),
  clientName: z.string().max(100).optional().or(z.literal('')),

  // Project Type & Status
  projectType: z.enum(['mvp', 'fullstack', 'design', 'operations']),

  // Media
  thumbnail: z.string().url('Invalid URL').optional().or(z.literal('')),
  images: z.array(z.string().url()).max(10, 'Max 10 images'),

  // Tech Stack
  techStack: z.array(z.string()).min(1, 'At least one technology required').max(20),

  // Links
  projectUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Timeline
  duration: z.string().max(50).optional().or(z.literal('')),
  teamSize: z.number().int().positive().max(100).optional().or(z.literal(null)),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),

  // Content
  challenges: z.string().max(2000).optional().or(z.literal('')),
  solutions: z.string().max(2000).optional().or(z.literal('')),
  outcomes: z.string().max(2000).optional().or(z.literal('')),

  // Testimonial (JSONB)
  testimonial: z.object({
    author: z.string().optional(),
    role: z.string().optional(),
    company: z.string().optional(),
    content: z.string().optional(),
    avatar: z.string().url().optional().or(z.literal('')),
  }).optional(),

  // Visibility
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
});

type PortfolioFormValues = z.infer<typeof portfolioSchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: PortfolioItem | null;
  onSuccess?: () => void;
  onSubmit: (values: Partial<PortfolioItem>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

// =====================================================
// TECH STACK OPTIONS
// =====================================================

const techStackOptions = [
  { label: 'React', value: 'react' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Node.js', value: 'nodejs' },
  { label: 'Python', value: 'python' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MongoDB', value: 'mongodb' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'Redis', value: 'redis' },
  { label: 'AWS', value: 'aws' },
  { label: 'Docker', value: 'docker' },
  { label: 'Kubernetes', value: 'kubernetes' },
  { label: 'Next.js', value: 'nextjs' },
  { label: 'Vue.js', value: 'vuejs' },
  { label: 'Angular', value: 'angular' },
  { label: 'Tailwind CSS', value: 'tailwindcss' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'REST API', value: 'restapi' },
  { label: 'Supabase', value: 'supabase' },
  { label: 'Firebase', value: 'firebase' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PortfolioForm({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
  onSubmit,
  isSubmitting = false,
  error = null,
}: PortfolioFormProps) {
  // Supabase Storage upload hook for portfolio images
  const { uploadFile, uploading: uploadingImage, deleteFile } = useFileUpload({
    bucket: 'cms-images',
    maxSize: 10, // 10MB max for portfolio images
    accept: ['image/*'],
    optimizeImages: true,
    onComplete: (file, url) => {
      console.log('[PortfolioForm] Image uploaded:', file.name, url);
    },
    onError: (file, error) => {
      console.error('[PortfolioForm] Image upload failed:', file.name, error);
    },
  });

  // Form setup
  const form = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: '',
      slug: '',
      summary: '',
      description: '',
      clientName: '',
      projectType: 'mvp',
      thumbnail: '',
      images: [],
      techStack: [],
      projectUrl: '',
      githubUrl: '',
      duration: '',
      teamSize: null,
      startDate: '',
      endDate: '',
      challenges: '',
      solutions: '',
      outcomes: '',
      testimonial: {
        author: '',
        role: '',
        company: '',
        content: '',
        avatar: '',
      },
      featured: false,
      published: false,
    },
  });

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      form.reset({
        title: editingItem.title || '',
        slug: editingItem.slug || '',
        summary: editingItem.summary || '',
        description: editingItem.description || '',
        clientName: editingItem.clientName || '',
        projectType: editingItem.projectType || 'mvp',
        thumbnail: editingItem.thumbnail || '',
        images: editingItem.images || [],
        techStack: editingItem.techStack || [],
        projectUrl: editingItem.projectUrl || '',
        githubUrl: editingItem.githubUrl || '',
        duration: editingItem.duration || '',
        teamSize: editingItem.teamSize || null,
        startDate: editingItem.startDate || '',
        endDate: editingItem.endDate || '',
        challenges: editingItem.challenges || '',
        solutions: editingItem.solutions || '',
        outcomes: editingItem.outcomes || '',
        testimonial: editingItem.testimonial || {
          author: '',
          role: '',
          company: '',
          content: '',
          avatar: '',
        },
        featured: editingItem.featured || false,
        published: editingItem.published || false,
      });
    } else if (isOpen && !editingItem) {
      form.reset();
    }
  }, [isOpen, editingItem, form]);

  // Slug auto-generation
  const handleTitleBlur = () => {
    const title = form.getValues('title');
    const currentSlug = form.getValues('slug');

    if (title && (!currentSlug || editingItem === null)) {
      form.setValue('slug', generateSlug(title));
    }
  };

  // Form submission
  const handleSubmit = async (values: PortfolioFormValues) => {
    try {
      await onSubmit(values);
      toast.success(editingItem ? 'Project updated successfully' : 'Project created successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`Failed to save project: ${(err as Error).message}`);
    }
  };

  // Image upload handler - integrated with Supabase Storage
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    try {
      const result = await uploadFile(file);
      return result.url;
    } catch (error) {
      console.error('[PortfolioForm] Upload error:', error);
      throw error;
    }
  }, [uploadFile]);

  // Handle single image delete (thumbnail)
  const handleThumbnailDelete = useCallback(async (url: string) => {
    try {
      await deleteFile(url);
      form.setValue('thumbnail', '');
    } catch (error) {
      console.error('[PortfolioForm] Thumbnail delete error:', error);
      // Even if delete fails, clear the form value
      form.setValue('thumbnail', '');
    }
  }, [deleteFile, form]);

  // Handle gallery image delete
  const handleGalleryImageDelete = useCallback(async (urlToDelete: string) => {
    try {
      await deleteFile(urlToDelete);
    } catch (error) {
      console.error('[PortfolioForm] Gallery image delete error:', error);
    }
    // Update the images array regardless of delete success
    const currentImages = form.getValues('images') || [];
    form.setValue('images', currentImages.filter(url => url !== urlToDelete));
  }, [deleteFile, form]);

  // Character count helper
  const getCharCount = (field: keyof PortfolioFormValues) => {
    const value = form.watch(field);
    return typeof value === 'string' ? value.length : 0;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Project' : 'New Project'}
      description="Fill in the project details below"
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel={editingItem ? 'Update' : 'Create'}
      loading={isSubmitting}
      error={error || undefined}
      size="xl"
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Accordion type="single" collapsible defaultValue="basic" className="w-full">
          {/* ========================================= */}
          {/* SECTION 1: BASIC INFORMATION */}
          {/* ========================================= */}
          <AccordionItem value="basic">
            <AccordionTrigger>Basic Information</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Project title"
                  {...form.register('title')}
                  onBlur={handleTitleBlur}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    placeholder="project-slug"
                    {...form.register('slug')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const title = form.getValues('title');
                      if (title) form.setValue('slug', generateSlug(title));
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

              {/* Project Type */}
              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={form.watch('projectType')}
                  onValueChange={(value) =>
                    form.setValue('projectType', value as 'mvp' | 'fullstack' | 'design' | 'operations')
                  }
                >
                  <SelectTrigger id="projectType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mvp">MVP Development</SelectItem>
                    <SelectItem value="fullstack">Full Stack</SelectItem>
                    <SelectItem value="design">Design System</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.projectType && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.projectType.message}
                  </p>
                )}
              </div>

              {/* Client Name */}
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Client or company name"
                  {...form.register('clientName')}
                />
              </div>

              {/* Summary */}
              <div>
                <Label htmlFor="summary">Summary * ({getCharCount('summary')}/500)</Label>
                <Textarea
                  id="summary"
                  placeholder="Brief project summary (max 500 characters)"
                  rows={3}
                  maxLength={500}
                  {...form.register('summary')}
                />
                {form.formState.errors.summary && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.summary.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description ({getCharCount('description')}/5000)</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed project description (supports Markdown)"
                  rows={6}
                  maxLength={5000}
                  {...form.register('description')}
                />
                <p className="text-xs text-muted-foreground mt-1">Supports Markdown formatting</p>
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 2: MEDIA & GALLERY */}
          {/* ========================================= */}
          <AccordionItem value="media">
            <AccordionTrigger>Media & Gallery</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Thumbnail */}
              <div>
                <Label>Thumbnail Image</Label>
                <ImageUpload
                  value={form.watch('thumbnail') || ''}
                  onChange={(url) => {
                    const newUrl = typeof url === 'string' ? url : '';
                    const currentUrl = form.getValues('thumbnail');
                    // If URL is being cleared and we had a previous URL, delete from storage
                    if (!newUrl && currentUrl) {
                      handleThumbnailDelete(currentUrl);
                    } else {
                      form.setValue('thumbnail', newUrl);
                    }
                  }}
                  onUpload={handleImageUpload}
                  multiple={false}
                  showAltText={false}
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading image...
                  </p>
                )}
                {form.formState.errors.thumbnail && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.thumbnail.message}
                  </p>
                )}
              </div>

              {/* Gallery Images */}
              <div>
                <Label>Gallery Images (Max 10)</Label>
                <ImageUpload
                  value={form.watch('images') || []}
                  onChange={(urls) => {
                    const newUrls = Array.isArray(urls) ? urls : urls ? [urls] : [];
                    const currentUrls = form.getValues('images') || [];

                    // Find which images were removed
                    const removedUrls = currentUrls.filter(url => !newUrls.includes(url));

                    // Delete removed images from storage
                    removedUrls.forEach(url => {
                      handleGalleryImageDelete(url);
                    });

                    // If not all removed, just update form value (removals handled above)
                    if (removedUrls.length === 0) {
                      form.setValue('images', newUrls);
                    }
                  }}
                  onUpload={handleImageUpload}
                  multiple={true}
                  showAltText={false}
                  disabled={uploadingImage}
                />
                {form.formState.errors.images && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.images.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 3: TECH STACK & LINKS */}
          {/* ========================================= */}
          <AccordionItem value="tech">
            <AccordionTrigger>Tech Stack & Links</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Tech Stack */}
              <div>
                <Label htmlFor="techStack">Tech Stack * (Max 20)</Label>
                <MultiSelect
                  options={techStackOptions}
                  value={form.watch('techStack') || []}
                  onChange={(value) => form.setValue('techStack', value)}
                  placeholder="Select technologies"
                  maxCount={20}
                  onCreate={async (value) => {
                    // Add custom tech stack item
                    const current = form.getValues('techStack') || [];
                    form.setValue('techStack', [...current, value]);
                  }}
                />
                {form.formState.errors.techStack && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.techStack.message}
                  </p>
                )}
              </div>

              {/* Project URL */}
              <div>
                <Label htmlFor="projectUrl">Live URL</Label>
                <Input
                  id="projectUrl"
                  type="url"
                  placeholder="https://example.com"
                  {...form.register('projectUrl')}
                />
                {form.formState.errors.projectUrl && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.projectUrl.message}
                  </p>
                )}
              </div>

              {/* GitHub URL */}
              <div>
                <Label htmlFor="githubUrl">GitHub URL</Label>
                <Input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/username/repo"
                  {...form.register('githubUrl')}
                />
                {form.formState.errors.githubUrl && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.githubUrl.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 4: TIMELINE */}
          {/* ========================================= */}
          <AccordionItem value="timeline">
            <AccordionTrigger>Timeline & Team</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 3 months"
                  {...form.register('duration')}
                />
              </div>

              {/* Team Size */}
              <div>
                <Label htmlFor="teamSize">Team Size</Label>
                <Input
                  id="teamSize"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Number of team members"
                  {...form.register('teamSize', {
                    setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
                  })}
                />
                {form.formState.errors.teamSize && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.teamSize.message}
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                />
              </div>

              {/* End Date */}
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register('endDate')}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 5: PROJECT DETAILS */}
          {/* ========================================= */}
          <AccordionItem value="details">
            <AccordionTrigger>Project Details</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Challenges */}
              <div>
                <Label htmlFor="challenges">Challenges ({getCharCount('challenges')}/2000)</Label>
                <Textarea
                  id="challenges"
                  placeholder="What challenges did the project face?"
                  rows={4}
                  maxLength={2000}
                  {...form.register('challenges')}
                />
              </div>

              {/* Solutions */}
              <div>
                <Label htmlFor="solutions">Solutions ({getCharCount('solutions')}/2000)</Label>
                <Textarea
                  id="solutions"
                  placeholder="How were the challenges solved?"
                  rows={4}
                  maxLength={2000}
                  {...form.register('solutions')}
                />
              </div>

              {/* Outcomes */}
              <div>
                <Label htmlFor="outcomes">Outcomes ({getCharCount('outcomes')}/2000)</Label>
                <Textarea
                  id="outcomes"
                  placeholder="What were the results?"
                  rows={4}
                  maxLength={2000}
                  {...form.register('outcomes')}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 6: TESTIMONIAL & VISIBILITY */}
          {/* ========================================= */}
          <AccordionItem value="visibility">
            <AccordionTrigger>Testimonial & Visibility</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Testimonial Author */}
              <div>
                <Label htmlFor="testimonial.author">Testimonial Author</Label>
                <Input
                  id="testimonial.author"
                  placeholder="Client or team member name"
                  {...form.register('testimonial.author')}
                />
              </div>

              {/* Testimonial Role */}
              <div>
                <Label htmlFor="testimonial.role">Testimonial Role</Label>
                <Input
                  id="testimonial.role"
                  placeholder="Job title"
                  {...form.register('testimonial.role')}
                />
              </div>

              {/* Testimonial Company */}
              <div>
                <Label htmlFor="testimonial.company">Testimonial Company</Label>
                <Input
                  id="testimonial.company"
                  placeholder="Company name"
                  {...form.register('testimonial.company')}
                />
              </div>

              {/* Testimonial Content */}
              <div>
                <Label htmlFor="testimonial.content">Testimonial Content</Label>
                <Textarea
                  id="testimonial.content"
                  placeholder="What did they say about the project?"
                  rows={3}
                  {...form.register('testimonial.content')}
                />
              </div>

              {/* Testimonial Avatar */}
              <div>
                <Label htmlFor="testimonial.avatar">Testimonial Avatar URL</Label>
                <Input
                  id="testimonial.avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  {...form.register('testimonial.avatar')}
                />
              </div>

              {/* Featured */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={form.watch('featured')}
                  onCheckedChange={(checked) => form.setValue('featured', checked as boolean)}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured Project ⭐
                </Label>
              </div>

              {/* Published */}
              <div className="flex items-center justify-between">
                <Label htmlFor="published" className="cursor-pointer">
                  {form.watch('published') ? 'Published' : 'Draft'}
                </Label>
                <Switch
                  id="published"
                  checked={form.watch('published')}
                  onCheckedChange={(checked) => form.setValue('published', checked)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </FormModal>
  );
}
