/**
 * TeamForm Component
 * Comprehensive team member create/edit form with React Hook Form + Zod validation
 *
 * Features:
 * - 3 Accordion sections: Basic Info, Skills & Social, Avatar
 * - MultiSelect for skills
 * - Social links input (GitHub, LinkedIn, Twitter, Website)
 * - ImageUpload for avatar
 * - Display order & active toggle
 * - Zod validation
 *
 * CMS Phase 2 - Agent 3
 */

import React, { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Supabase Storage Hook
import { useFileUpload } from '@/hooks/useFileUpload';

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { MultiSelect } from '@/components/admin/ui/MultiSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Types
import type { CMSTeamMember } from '@/types/cms/cms-team.types';

// =====================================================
// ZOD SCHEMA
// =====================================================

const teamSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.string().min(2, 'Role must be at least 2 characters').max(100),
  bio: z.string().max(2000).optional().or(z.literal('')),
  display_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),

  // Skills
  skills: z.array(z.string()).max(20, 'Maximum 20 skills allowed'),

  // Social Links
  social_links: z.object({
    github: z.string().url('Invalid URL').optional().or(z.literal('')),
    linkedin: z.string().url('Invalid URL').optional().or(z.literal('')),
    twitter: z.string().url('Invalid URL').optional().or(z.literal('')),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
  }),

  // Avatar
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface TeamFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: CMSTeamMember | null;
  onSuccess?: () => void;
  onSubmit: (values: Partial<CMSTeamMember>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

// =====================================================
// SKILL OPTIONS
// =====================================================

const skillOptions = [
  { label: 'React', value: 'React' },
  { label: 'TypeScript', value: 'TypeScript' },
  { label: 'JavaScript', value: 'JavaScript' },
  { label: 'Node.js', value: 'Node.js' },
  { label: 'Python', value: 'Python' },
  { label: 'Go', value: 'Go' },
  { label: 'Rust', value: 'Rust' },
  { label: 'PostgreSQL', value: 'PostgreSQL' },
  { label: 'MongoDB', value: 'MongoDB' },
  { label: 'Redis', value: 'Redis' },
  { label: 'AWS', value: 'AWS' },
  { label: 'Docker', value: 'Docker' },
  { label: 'Kubernetes', value: 'Kubernetes' },
  { label: 'Next.js', value: 'Next.js' },
  { label: 'Vue.js', value: 'Vue.js' },
  { label: 'Svelte', value: 'Svelte' },
  { label: 'Tailwind CSS', value: 'Tailwind CSS' },
  { label: 'GraphQL', value: 'GraphQL' },
  { label: 'REST API', value: 'REST API' },
  { label: 'Supabase', value: 'Supabase' },
  { label: 'Firebase', value: 'Firebase' },
  { label: 'Figma', value: 'Figma' },
  { label: 'Adobe XD', value: 'Adobe XD' },
  { label: 'UI/UX Design', value: 'UI/UX Design' },
  { label: 'Product Management', value: 'Product Management' },
  { label: 'Community Management', value: 'Community Management' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TeamForm({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
  onSubmit,
  isSubmitting = false,
  error = null,
}: TeamFormProps) {
  // Supabase Storage upload hook for avatar images
  const { uploadFile, uploading: uploadingImage, deleteFile } = useFileUpload({
    bucket: 'cms-images',
    maxSize: 5, // 5MB max
    accept: ['image/*'],
    optimizeImages: true,
    onComplete: (file, url) => {
      console.log('[TeamForm] Image uploaded:', file.name, url);
    },
    onError: (file, error) => {
      console.error('[TeamForm] Image upload failed:', file.name, error);
    },
  });

  // Form setup
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      role: '',
      bio: '',
      display_order: 0,
      is_active: true,
      skills: [],
      social_links: {
        github: '',
        linkedin: '',
        twitter: '',
        website: '',
      },
      avatar_url: '',
    },
  });

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      form.reset({
        name: editingItem.name || '',
        role: editingItem.role || '',
        bio: editingItem.bio || '',
        display_order: editingItem.display_order || 0,
        is_active: editingItem.is_active ?? true,
        skills: editingItem.skills || [],
        social_links: {
          github: editingItem.social_links?.github || '',
          linkedin: editingItem.social_links?.linkedin || '',
          twitter: editingItem.social_links?.twitter || '',
          website: editingItem.social_links?.website || '',
        },
        avatar_url: editingItem.avatar_url || '',
      });
    } else if (isOpen && !editingItem) {
      form.reset();
    }
  }, [isOpen, editingItem, form]);

  // Form submission
  const handleSubmit = async (values: TeamFormValues) => {
    try {
      // Clean up empty social links
      const cleanedSocialLinks = {
        github: values.social_links.github || undefined,
        linkedin: values.social_links.linkedin || undefined,
        twitter: values.social_links.twitter || undefined,
        website: values.social_links.website || undefined,
      };

      await onSubmit({
        ...values,
        social_links: cleanedSocialLinks,
        avatar_url: values.avatar_url || undefined,
        bio: values.bio || undefined,
      });
      toast.success(editingItem ? 'Team member updated successfully' : 'Team member created successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`Failed to save team member: ${(err as Error).message}`);
    }
  };

  // Image upload handler - integrated with Supabase Storage
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    try {
      const result = await uploadFile(file);
      return result.url;
    } catch (error) {
      console.error('[TeamForm] Upload error:', error);
      throw error;
    }
  }, [uploadFile]);

  // Handle image delete from Supabase Storage
  const handleImageDelete = useCallback(async (url: string) => {
    try {
      await deleteFile(url);
      form.setValue('avatar_url', '');
    } catch (error) {
      console.error('[TeamForm] Delete error:', error);
      // Even if delete fails, clear the form value
      form.setValue('avatar_url', '');
    }
  }, [deleteFile, form]);

  // Character count helper
  const getCharCount = (field: keyof TeamFormValues) => {
    const value = form.watch(field);
    return typeof value === 'string' ? value.length : 0;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Team Member' : 'New Team Member'}
      description="Fill in the team member details below"
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
                  placeholder="John Doe"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  placeholder="Founder & CEO"
                  {...form.register('role')}
                />
                {form.formState.errors.role && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.role.message}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio ({getCharCount('bio')}/2000)</Label>
                <Textarea
                  id="bio"
                  placeholder="Team member biography (supports Markdown)"
                  rows={4}
                  maxLength={2000}
                  {...form.register('bio')}
                />
                <p className="text-xs text-muted-foreground mt-1">Supports Markdown formatting</p>
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.bio.message}
                  </p>
                )}
              </div>

              {/* Display Order */}
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="0"
                  max="9999"
                  placeholder="0"
                  {...form.register('display_order', {
                    setValueAs: (v) => (v === '' ? 0 : parseInt(v, 10)),
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">Higher numbers appear first</p>
                {form.formState.errors.display_order && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.display_order.message}
                  </p>
                )}
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="cursor-pointer">
                  {form.watch('is_active') ? 'Active' : 'Inactive'}
                </Label>
                <Switch
                  id="is_active"
                  checked={form.watch('is_active')}
                  onCheckedChange={(checked) => form.setValue('is_active', checked)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 2: SKILLS & SOCIAL LINKS */}
          {/* ========================================= */}
          <AccordionItem value="skills">
            <AccordionTrigger>Skills & Social</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Skills */}
              <div>
                <Label htmlFor="skills">Skills (Max 20)</Label>
                <MultiSelect
                  options={skillOptions}
                  value={form.watch('skills') || []}
                  onChange={(value) => form.setValue('skills', value)}
                  placeholder="Select skills"
                  maxCount={20}
                  onCreate={async (value) => {
                    // Add custom skill
                    const current = form.getValues('skills') || [];
                    form.setValue('skills', [...current, value]);
                  }}
                />
                {form.formState.errors.skills && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.skills.message}
                  </p>
                )}
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <Label>Social Links</Label>

                {/* GitHub */}
                <div>
                  <Label htmlFor="github" className="text-sm">GitHub</Label>
                  <Input
                    id="github"
                    type="url"
                    placeholder="https://github.com/username"
                    {...form.register('social_links.github')}
                  />
                  {form.formState.errors.social_links?.github && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.social_links.github.message}
                    </p>
                  )}
                </div>

                {/* LinkedIn */}
                <div>
                  <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    {...form.register('social_links.linkedin')}
                  />
                  {form.formState.errors.social_links?.linkedin && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.social_links.linkedin.message}
                    </p>
                  )}
                </div>

                {/* Twitter */}
                <div>
                  <Label htmlFor="twitter" className="text-sm">Twitter</Label>
                  <Input
                    id="twitter"
                    type="url"
                    placeholder="https://twitter.com/username"
                    {...form.register('social_links.twitter')}
                  />
                  {form.formState.errors.social_links?.twitter && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.social_links.twitter.message}
                    </p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <Label htmlFor="website" className="text-sm">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    {...form.register('social_links.website')}
                  />
                  {form.formState.errors.social_links?.website && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.social_links.website.message}
                    </p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 3: AVATAR */}
          {/* ========================================= */}
          <AccordionItem value="avatar">
            <AccordionTrigger>Avatar</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Avatar Upload */}
              <div>
                <Label>Avatar Image</Label>
                <ImageUpload
                  value={form.watch('avatar_url') || ''}
                  onChange={(url) => {
                    const newUrl = typeof url === 'string' ? url : '';
                    const currentUrl = form.getValues('avatar_url');
                    // If URL is being cleared and we had a previous URL, delete from storage
                    if (!newUrl && currentUrl) {
                      handleImageDelete(currentUrl);
                    } else {
                      form.setValue('avatar_url', newUrl);
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
                {form.formState.errors.avatar_url && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.avatar_url.message}
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
