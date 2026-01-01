/**
 * FormRichTextEditor Component
 * CMS Phase 5: React Hook Form Integration
 *
 * Wrapper component for RichTextEditor with react-hook-form Controller support.
 * Provides form validation, error display, and label support.
 */

import { Controller, type Control, type RegisterOptions, type FieldValues, type Path } from 'react-hook-form'
import { RichTextEditor } from '@/components/admin/editor/RichTextEditor'
import { Label } from '@/components/ui/label'
import type { EditorConfig, EditorMode } from '@/types/cms/editor.types'
import { cn } from '@/lib/utils'

/**
 * Props for FormRichTextEditor
 */
export interface FormRichTextEditorProps<TFieldValues extends FieldValues> {
  /** Field name for react-hook-form */
  name: Path<TFieldValues>
  /** React Hook Form control */
  control: Control<TFieldValues>
  /** Field label */
  label?: string
  /** Whether field is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Validation rules */
  rules?: RegisterOptions<TFieldValues, Path<TFieldValues>>
  /** Description text below the editor */
  description?: string
  /** Editor configuration */
  config?: EditorConfig
  /** Default editor mode (wysiwyg or markdown) */
  defaultMode?: EditorMode
  /** Output format (html or markdown) */
  outputFormat?: 'html' | 'markdown'
  /** Disabled state */
  disabled?: boolean
  /** Minimum height in pixels */
  minHeight?: number
  /** Maximum height in pixels */
  maxHeight?: number
  /** Additional CSS class */
  className?: string
}

/**
 * FormRichTextEditor - RichTextEditor with React Hook Form integration
 *
 * @example
 * ```tsx
 * <FormRichTextEditor
 *   name="description"
 *   control={form.control}
 *   label="Description"
 *   required
 *   placeholder="Enter description..."
 *   rules={{ minLength: { value: 10, message: 'At least 10 characters required' } }}
 * />
 * ```
 */
export function FormRichTextEditor<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder,
  rules,
  description,
  config,
  defaultMode = 'wysiwyg',
  outputFormat = 'markdown',
  disabled = false,
  minHeight = 200,
  maxHeight = 600,
  className,
}: FormRichTextEditorProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? '이 필드는 필수입니다' : false,
        ...rules,
      }}
      render={({ field, fieldState: { error } }) => (
        <div className={cn('space-y-2', className)}>
          {label && (
            <Label
              htmlFor={name}
              className={cn(error && 'text-destructive')}
            >
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          )}

          <RichTextEditor
            value={field.value || ''}
            onChange={field.onChange}
            defaultMode={defaultMode}
            outputFormat={outputFormat}
            disabled={disabled}
            error={!!error}
            errorMessage={error?.message}
            config={{
              placeholder: placeholder || config?.placeholder,
              minHeight,
              maxHeight,
              ...config,
            }}
          />

          {description && !error && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  )
}

export default FormRichTextEditor
