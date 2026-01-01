/**
 * RoadmapForm Component
 * Comprehensive roadmap create/edit form with React Hook Form + Zod validation
 *
 * Features:
 * - 5 Accordion sections (Basic Info, Progress, Milestones, KPIs, Visibility)
 * - Dynamic milestones and KPIs with useFieldArray
 * - Slider for progress (0-100%)
 * - Date range validation
 * - JSONB structure validation
 */

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal';
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
import type { CMSRoadmapItem, RoadmapMilestone, RoadmapKPI } from '@/types/cms/cms.types';

// =====================================================
// ZOD SCHEMA
// =====================================================

const roadmapMilestoneSchema = z.object({
  id: z.string().min(1, 'Milestone ID required'),
  title: z.string().min(1, 'Milestone title required'),
  description: z.string().min(1, 'Milestone description required'),
  due_date: z.string().min(1, 'Due date required'), // ISO 8601
  completed: z.boolean().default(false),
});

const roadmapKPISchema = z.object({
  metric: z.string().min(1, 'Metric name required'),
  target: z.number().positive('Target must be positive'),
  current: z.number().min(0, 'Current value must be non-negative'),
  unit: z.string().min(1, 'Unit required'),
});

const roadmapSchema = z.object({
  // Basic Info
  quarter: z.string().min(1, 'Quarter required (e.g., Q1 2025)'),
  theme: z.string().min(3, 'Theme must be at least 3 characters').max(200),
  goal: z.string().min(10, 'Goal must be at least 10 characters').max(1000),

  // Progress
  progress: z.number().int().min(0).max(100).default(0),
  risk_level: z.enum(['low', 'medium', 'high']).default('low'),
  owner: z.string().max(100).optional().or(z.literal('')),

  // Dates
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),

  // Milestones (JSONB array)
  milestones: z.array(roadmapMilestoneSchema).default([]),

  // KPIs (JSONB array)
  kpis: z.array(roadmapKPISchema).default([]),

  // Visibility
  is_published: z.boolean().default(false),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'End date must be after or equal to start date',
  path: ['end_date'],
});

type RoadmapFormValues = z.infer<typeof roadmapSchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface RoadmapFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: CMSRoadmapItem | null;
  onSuccess?: () => void;
  onSubmit: (values: Partial<CMSRoadmapItem>) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function RoadmapForm({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
  onSubmit,
  isSubmitting = false,
  error = null,
}: RoadmapFormProps) {
  // Form setup
  const form = useForm<RoadmapFormValues>({
    resolver: zodResolver(roadmapSchema),
    defaultValues: {
      quarter: '',
      theme: '',
      goal: '',
      progress: 0,
      risk_level: 'low',
      owner: '',
      start_date: '',
      end_date: '',
      milestones: [],
      kpis: [],
      is_published: false,
    },
  });

  // Dynamic field arrays
  const {
    fields: milestoneFields,
    append: appendMilestone,
    remove: removeMilestone,
  } = useFieldArray({
    control: form.control,
    name: 'milestones',
  });

  const {
    fields: kpiFields,
    append: appendKPI,
    remove: removeKPI,
  } = useFieldArray({
    control: form.control,
    name: 'kpis',
  });

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      form.reset({
        quarter: editingItem.quarter || '',
        theme: editingItem.theme || '',
        goal: editingItem.goal || '',
        progress: editingItem.progress || 0,
        risk_level: editingItem.risk_level || 'low',
        owner: editingItem.owner || '',
        start_date: editingItem.start_date || '',
        end_date: editingItem.end_date || '',
        milestones: editingItem.milestones || [],
        kpis: editingItem.kpis || [],
        is_published: editingItem.is_published || false,
      });
    } else if (isOpen && !editingItem) {
      form.reset();
    }
  }, [isOpen, editingItem, form]);

  // Form submission
  const handleSubmit = async (values: RoadmapFormValues) => {
    try {
      await onSubmit(values);
      toast.success(editingItem ? 'Roadmap updated successfully' : 'Roadmap created successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`Failed to save roadmap: ${(err as Error).message}`);
    }
  };

  // Add milestone
  const handleAddMilestone = () => {
    appendMilestone({
      id: `m${Date.now()}`,
      title: '',
      description: '',
      due_date: '',
      completed: false,
    });
  };

  // Add KPI
  const handleAddKPI = () => {
    appendKPI({
      metric: '',
      target: 0,
      current: 0,
      unit: '',
    });
  };

  // Character count helper
  const getCharCount = (field: keyof RoadmapFormValues) => {
    const value = form.watch(field);
    return typeof value === 'string' ? value.length : 0;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Roadmap Item' : 'New Roadmap Item'}
      description="Fill in the roadmap details below"
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
              {/* Quarter */}
              <div>
                <Label htmlFor="quarter">Quarter *</Label>
                <Input
                  id="quarter"
                  placeholder="Q1 2025"
                  {...form.register('quarter')}
                />
                {form.formState.errors.quarter && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.quarter.message}
                  </p>
                )}
              </div>

              {/* Theme */}
              <div>
                <Label htmlFor="theme">Theme * ({getCharCount('theme')}/200)</Label>
                <Input
                  id="theme"
                  placeholder="Community & Open Metrics"
                  maxLength={200}
                  {...form.register('theme')}
                />
                {form.formState.errors.theme && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.theme.message}
                  </p>
                )}
              </div>

              {/* Goal */}
              <div>
                <Label htmlFor="goal">Goal * ({getCharCount('goal')}/1000)</Label>
                <Textarea
                  id="goal"
                  placeholder="Specific goal description for this quarter"
                  rows={4}
                  maxLength={1000}
                  {...form.register('goal')}
                />
                {form.formState.errors.goal && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.goal.message}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 2: PROGRESS & STATUS */}
          {/* ========================================= */}
          <AccordionItem value="progress">
            <AccordionTrigger>Progress & Status</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Progress Slider */}
              <div>
                <Label htmlFor="progress">Progress: {form.watch('progress')}%</Label>
                <Slider
                  id="progress"
                  min={0}
                  max={100}
                  step={1}
                  value={[form.watch('progress')]}
                  onValueChange={(value) => form.setValue('progress', value[0])}
                  className="mt-2"
                />
                {form.formState.errors.progress && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.progress.message}
                  </p>
                )}
              </div>

              {/* Risk Level */}
              <div>
                <Label htmlFor="risk_level">Risk Level *</Label>
                <Select
                  value={form.watch('risk_level')}
                  onValueChange={(value) =>
                    form.setValue('risk_level', value as 'low' | 'medium' | 'high')
                  }
                >
                  <SelectTrigger id="risk_level">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.risk_level && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.risk_level.message}
                  </p>
                )}
              </div>

              {/* Owner */}
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  placeholder="Team member or department"
                  maxLength={100}
                  {...form.register('owner')}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...form.register('start_date')}
                  />
                  {form.formState.errors.start_date && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.start_date.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...form.register('end_date')}
                  />
                  {form.formState.errors.end_date && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.end_date.message}
                    </p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 3: MILESTONES */}
          {/* ========================================= */}
          <AccordionItem value="milestones">
            <AccordionTrigger>Milestones ({milestoneFields.length})</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {milestoneFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No milestones added yet</p>
              )}

              {milestoneFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Milestone #{index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Milestone ID */}
                  <div>
                    <Label htmlFor={`milestones.${index}.id`}>ID *</Label>
                    <Input
                      id={`milestones.${index}.id`}
                      placeholder="m1"
                      {...form.register(`milestones.${index}.id`)}
                    />
                    {form.formState.errors.milestones?.[index]?.id && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.milestones[index]?.id?.message}
                      </p>
                    )}
                  </div>

                  {/* Milestone Title */}
                  <div>
                    <Label htmlFor={`milestones.${index}.title`}>Title *</Label>
                    <Input
                      id={`milestones.${index}.title`}
                      placeholder="Phase 1 Completion"
                      {...form.register(`milestones.${index}.title`)}
                    />
                    {form.formState.errors.milestones?.[index]?.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.milestones[index]?.title?.message}
                      </p>
                    )}
                  </div>

                  {/* Milestone Description */}
                  <div>
                    <Label htmlFor={`milestones.${index}.description`}>Description *</Label>
                    <Textarea
                      id={`milestones.${index}.description`}
                      placeholder="Milestone description"
                      rows={2}
                      {...form.register(`milestones.${index}.description`)}
                    />
                    {form.formState.errors.milestones?.[index]?.description && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.milestones[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Milestone Due Date */}
                  <div>
                    <Label htmlFor={`milestones.${index}.due_date`}>Due Date *</Label>
                    <Input
                      id={`milestones.${index}.due_date`}
                      type="date"
                      {...form.register(`milestones.${index}.due_date`)}
                    />
                    {form.formState.errors.milestones?.[index]?.due_date && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.milestones[index]?.due_date?.message}
                      </p>
                    )}
                  </div>

                  {/* Milestone Completed */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`milestones.${index}.completed`}
                      checked={form.watch(`milestones.${index}.completed`)}
                      onCheckedChange={(checked) =>
                        form.setValue(`milestones.${index}.completed`, checked as boolean)
                      }
                    />
                    <Label htmlFor={`milestones.${index}.completed`} className="cursor-pointer">
                      Completed
                    </Label>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddMilestone}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Milestone
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 4: KPIs */}
          {/* ========================================= */}
          <AccordionItem value="kpis">
            <AccordionTrigger>KPIs ({kpiFields.length})</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {kpiFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No KPIs added yet</p>
              )}

              {kpiFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>KPI #{index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKPI(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* KPI Metric */}
                  <div>
                    <Label htmlFor={`kpis.${index}.metric`}>Metric *</Label>
                    <Input
                      id={`kpis.${index}.metric`}
                      placeholder="Projects Completed"
                      {...form.register(`kpis.${index}.metric`)}
                    />
                    {form.formState.errors.kpis?.[index]?.metric && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.kpis[index]?.metric?.message}
                      </p>
                    )}
                  </div>

                  {/* KPI Target */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`kpis.${index}.target`}>Target *</Label>
                      <Input
                        id={`kpis.${index}.target`}
                        type="number"
                        step="0.01"
                        placeholder="10"
                        {...form.register(`kpis.${index}.target`, {
                          setValueAs: (v) => (v === '' ? 0 : parseFloat(v)),
                        })}
                      />
                      {form.formState.errors.kpis?.[index]?.target && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.kpis[index]?.target?.message}
                        </p>
                      )}
                    </div>

                    {/* KPI Current */}
                    <div>
                      <Label htmlFor={`kpis.${index}.current`}>Current *</Label>
                      <Input
                        id={`kpis.${index}.current`}
                        type="number"
                        step="0.01"
                        placeholder="5"
                        {...form.register(`kpis.${index}.current`, {
                          setValueAs: (v) => (v === '' ? 0 : parseFloat(v)),
                        })}
                      />
                      {form.formState.errors.kpis?.[index]?.current && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.kpis[index]?.current?.message}
                        </p>
                      )}
                    </div>

                    {/* KPI Unit */}
                    <div>
                      <Label htmlFor={`kpis.${index}.unit`}>Unit *</Label>
                      <Input
                        id={`kpis.${index}.unit`}
                        placeholder="projects"
                        {...form.register(`kpis.${index}.unit`)}
                      />
                      {form.formState.errors.kpis?.[index]?.unit && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.kpis[index]?.unit?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddKPI}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add KPI
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ========================================= */}
          {/* SECTION 5: VISIBILITY */}
          {/* ========================================= */}
          <AccordionItem value="visibility">
            <AccordionTrigger>Visibility</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Published */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_published" className="cursor-pointer">
                  {form.watch('is_published') ? 'Published' : 'Draft'}
                </Label>
                <Switch
                  id="is_published"
                  checked={form.watch('is_published')}
                  onCheckedChange={(checked) => form.setValue('is_published', checked)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Published roadmap items are visible to the public
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </FormModal>
  );
}
