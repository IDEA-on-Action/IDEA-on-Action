/**
 * PromptTemplateForm Component
 * Prompt Template create/edit form with React Hook Form + Zod validation
 *
 * Features:
 * - 4 Accordion sections (Basic Info, Prompts, Variables, Settings)
 * - 9 form fields (name, description, category, system_prompt, user_prompt_template, variables, service_id, is_public, version)
 * - Zod validation
 * - Dynamic variable management (add/remove)
 * - Preview button (PromptTemplatePreview)
 * - extractVariables() auto-detection
 *
 * v2.21.0 - SSDD 프롬프트 템플릿 폼
 */

import React, { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, Plus, Eye } from 'lucide-react'

// UI Components
import { FormModal } from '@/components/admin/ui/FormModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Types & Hooks
import type {
  PromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplateVariable,
  PromptTemplateCategory,
  MinuServiceId,
  PromptVariableType,
} from '@/types/ai/prompt-template.types'
import {
  PROMPT_TEMPLATE_CATEGORY_LABELS,
  MINU_SERVICE_LABELS,
  PROMPT_VARIABLE_TYPE_LABELS,
  extractVariables,
} from '@/types/ai/prompt-template.types'
import {
  useCreatePromptTemplate,
  useUpdatePromptTemplate,
} from '@/hooks/ai/usePromptTemplates'
import { PromptTemplatePreview } from '@/components/admin/PromptTemplatePreview'

// =====================================================
// ZOD SCHEMA
// =====================================================

const variableSchema = z.object({
  name: z.string().min(1, '변수명을 입력하세요'),
  type: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object'] as const),
  required: z.boolean(),
  default: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  description: z.string().min(1, '설명을 입력하세요'),
  validation: z.string().optional(),
  example: z.string().optional(),
})

const promptTemplateSchema = z.object({
  // Basic Info
  name: z.string().min(2, '템플릿명은 최소 2자 이상이어야 합니다').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.enum(['rfp', 'requirements', 'plan', 'report', 'chat', 'custom'] as const),

  // Prompts
  system_prompt: z.string().optional().or(z.literal('')),
  user_prompt_template: z.string().min(1, '사용자 프롬프트는 필수입니다'),

  // Variables
  variables: z.array(variableSchema).default([]),

  // Settings
  service_id: z
    .enum(['minu-find', 'minu-frame', 'minu-build', 'minu-keep'] as const)
    .nullable()
    .optional(),
  is_public: z.boolean().default(false),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '버전은 X.Y.Z 형식이어야 합니다').default('1.0.0'),
})

type PromptTemplateFormValues = z.infer<typeof promptTemplateSchema>

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface PromptTemplateFormProps {
  isOpen: boolean
  onClose: () => void
  editingItem: PromptTemplate | null
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PromptTemplateForm({
  isOpen,
  onClose,
  editingItem,
}: PromptTemplateFormProps) {
  // ========================================
  // Mutations
  // ========================================

  const createMutation = useCreatePromptTemplate()
  const updateMutation = useUpdatePromptTemplate()

  // ========================================
  // Form State
  // ========================================

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const form = useForm<PromptTemplateFormValues>({
    resolver: zodResolver(promptTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'custom',
      system_prompt: '',
      user_prompt_template: '',
      variables: [],
      service_id: null,
      is_public: false,
      version: '1.0.0',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variables',
  })

  // ========================================
  // Effects
  // ========================================

  // Load editing item
  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        description: editingItem.description || '',
        category: editingItem.category,
        system_prompt: editingItem.system_prompt || '',
        user_prompt_template: editingItem.user_prompt_template,
        variables: editingItem.variables || [],
        service_id: editingItem.service_id || null,
        is_public: editingItem.is_public,
        version: editingItem.version,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        category: 'custom',
        system_prompt: '',
        user_prompt_template: '',
        variables: [],
        service_id: null,
        is_public: false,
        version: '1.0.0',
      })
    }
  }, [editingItem, form])

  // ========================================
  // Event Handlers
  // ========================================

  const handleSubmit = async (values: PromptTemplateFormValues) => {
    try {
      if (editingItem?.id) {
        // Update
        const updates: UpdatePromptTemplateInput = {
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          system_prompt: values.system_prompt || undefined,
          user_prompt_template: values.user_prompt_template,
          variables: values.variables,
          service_id: values.service_id || undefined,
          is_public: values.is_public,
          version: values.version,
        }
        await updateMutation.mutateAsync({ id: editingItem.id, updates })
      } else {
        // Create
        const input: CreatePromptTemplateInput = {
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          system_prompt: values.system_prompt || undefined,
          user_prompt_template: values.user_prompt_template,
          variables: values.variables,
          service_id: values.service_id || undefined,
          is_public: values.is_public,
          version: values.version,
        }
        await createMutation.mutateAsync(input)
      }

      // Success
      onClose()
      form.reset()
    } catch (error) {
      // Error is already handled by mutation hooks (toast)
      console.error('Form submit error:', error)
    }
  }

  const handleAddVariable = () => {
    append({
      name: '',
      type: 'string',
      required: false,
      description: '',
    })
  }

  const handleAutoDetectVariables = () => {
    const userPrompt = form.getValues('user_prompt_template')
    const systemPrompt = form.getValues('system_prompt') || ''
    const combined = systemPrompt + '\n' + userPrompt

    const detected = extractVariables(combined)
    const existing = form.getValues('variables')

    // Add only new variables
    const newVariables = detected.filter(
      (varName) => !existing.find((v) => v.name === varName)
    )

    if (newVariables.length === 0) {
      toast.info('새로운 변수가 감지되지 않았습니다')
      return
    }

    newVariables.forEach((varName) => {
      append({
        name: varName,
        type: 'string',
        required: false,
        description: `변수: ${varName}`,
      })
    })

    toast.success(`${newVariables.length}개의 변수가 추가되었습니다`)
  }

  const handlePreview = () => {
    const errors = form.formState.errors
    if (errors.user_prompt_template) {
      toast.error('프롬프트를 먼저 작성해주세요')
      return
    }
    setIsPreviewOpen(true)
  }

  // ========================================
  // Render
  // ========================================

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        title={editingItem ? '템플릿 수정' : '신규 템플릿'}
        description={editingItem ? '프롬프트 템플릿을 수정합니다' : '새로운 프롬프트 템플릿을 생성합니다'}
        onSubmit={form.handleSubmit(handleSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={editingItem ? '수정' : '생성'}
        size="xl"
      >
        <form className="space-y-6">
          <Accordion type="multiple" defaultValue={['basic', 'prompts']} className="w-full">
            {/* Basic Information */}
            <AccordionItem value="basic">
              <AccordionTrigger>기본 정보</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    템플릿명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="예: 정부 SI RFP 템플릿"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    placeholder="템플릿 설명..."
                    rows={2}
                    {...form.register('description')}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">
                    카테고리 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(value) =>
                      form.setValue('category', value as PromptTemplateCategory)
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMPT_TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Prompts */}
            <AccordionItem value="prompts">
              <AccordionTrigger>프롬프트</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* System Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="system_prompt">시스템 프롬프트 (역할 정의)</Label>
                  <Textarea
                    id="system_prompt"
                    placeholder="당신은 전문 RFP 작성자입니다..."
                    rows={4}
                    {...form.register('system_prompt')}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI의 역할과 톤을 정의합니다 (선택사항)
                  </p>
                </div>

                {/* User Prompt Template */}
                <div className="space-y-2">
                  <Label htmlFor="user_prompt_template">
                    사용자 프롬프트 템플릿 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="user_prompt_template"
                    placeholder="프로젝트명: {{projectName}}, 예산: {{budget}}"
                    rows={6}
                    {...form.register('user_prompt_template')}
                  />
                  <p className="text-xs text-muted-foreground">
                    변수는 {`{{variableName}}`} 형식으로 작성합니다
                  </p>
                  {form.formState.errors.user_prompt_template && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.user_prompt_template.message}
                    </p>
                  )}
                </div>

                {/* Preview Button */}
                <Button type="button" variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  미리보기
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Variables */}
            <AccordionItem value="variables">
              <AccordionTrigger>변수 관리</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    프롬프트에서 사용할 변수를 정의합니다
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDetectVariables}
                    >
                      자동 감지
                    </Button>
                    <Button type="button" size="sm" onClick={handleAddVariable}>
                      <Plus className="h-4 w-4 mr-2" />
                      변수 추가
                    </Button>
                  </div>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    변수가 없습니다. "변수 추가" 또는 "자동 감지" 버튼을 눌러주세요.
                  </div>
                )}

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-4 space-y-3 bg-muted/50"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">변수 #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Variable Name */}
                      <div className="space-y-1">
                        <Label htmlFor={`variables.${index}.name`}>
                          변수명 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`variables.${index}.name`}
                          placeholder="projectName"
                          {...form.register(`variables.${index}.name`)}
                        />
                      </div>

                      {/* Variable Type */}
                      <div className="space-y-1">
                        <Label htmlFor={`variables.${index}.type`}>타입</Label>
                        <Select
                          value={form.watch(`variables.${index}.type`)}
                          onValueChange={(value) =>
                            form.setValue(`variables.${index}.type`, value as PromptVariableType)
                          }
                        >
                          <SelectTrigger id={`variables.${index}.type`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROMPT_VARIABLE_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label htmlFor={`variables.${index}.description`}>
                        설명 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`variables.${index}.description`}
                        placeholder="프로젝트명을 입력하세요"
                        {...form.register(`variables.${index}.description`)}
                      />
                    </div>

                    {/* Required Switch */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`variables.${index}.required`}
                        checked={form.watch(`variables.${index}.required`)}
                        onCheckedChange={(checked) =>
                          form.setValue(`variables.${index}.required`, checked)
                        }
                      />
                      <Label htmlFor={`variables.${index}.required`}>필수 변수</Label>
                    </div>

                    {/* Default Value */}
                    <div className="space-y-1">
                      <Label htmlFor={`variables.${index}.default`}>기본값 (선택)</Label>
                      <Input
                        id={`variables.${index}.default`}
                        placeholder="기본값"
                        {...form.register(`variables.${index}.default`)}
                      />
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Settings */}
            <AccordionItem value="settings">
              <AccordionTrigger>설정</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Service ID */}
                <div className="space-y-2">
                  <Label htmlFor="service_id">서비스 연결 (선택)</Label>
                  <Select
                    value={form.watch('service_id') || 'none'}
                    onValueChange={(value) =>
                      form.setValue('service_id', value === 'none' ? null : (value as MinuServiceId))
                    }
                  >
                    <SelectTrigger id="service_id">
                      <SelectValue placeholder="서비스 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">서비스 없음</SelectItem>
                      {Object.entries(MINU_SERVICE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Version */}
                <div className="space-y-2">
                  <Label htmlFor="version">버전</Label>
                  <Input
                    id="version"
                    placeholder="1.0.0"
                    {...form.register('version')}
                  />
                  <p className="text-xs text-muted-foreground">형식: X.Y.Z (예: 1.0.0)</p>
                  {form.formState.errors.version && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.version.message}
                    </p>
                  )}
                </div>

                {/* Is Public */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={form.watch('is_public')}
                    onCheckedChange={(checked) => form.setValue('is_public', checked)}
                  />
                  <Label htmlFor="is_public">공개 템플릿</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  공개 템플릿은 모든 사용자가 사용할 수 있습니다
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </FormModal>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>프롬프트 미리보기</DialogTitle>
          </DialogHeader>
          <PromptTemplatePreview
            systemPrompt={form.watch('system_prompt') || ''}
            userPromptTemplate={form.watch('user_prompt_template')}
            variables={form.watch('variables')}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
