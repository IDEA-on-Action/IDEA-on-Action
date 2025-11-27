/**
 * FileUpload Component
 *
 * Drag & Drop 파일 업로드 컴포넌트
 * - 드래그 앤 드롭 영역 (drop zone)
 * - 클릭하여 파일 선택
 * - 파일 크기/타입 검증
 * - 이미지 미리보기
 * - 파일 목록 표시 (삭제 버튼)
 * - 에러 메시지 표시
 */

import React, { useState, useRef, useCallback, forwardRef } from 'react'
import { X, Upload, FileIcon, ImageIcon, Loader2 } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export interface FileUploadProps {
  /** 허용 파일 타입 (예: "image/*", ".pdf") */
  accept?: string
  /** 최대 파일 크기 (bytes) */
  maxSize?: number
  /** 최대 파일 수 (기본값: 1) */
  maxFiles?: number
  /** 파일 업로드 콜백 */
  onUpload: (files: File[]) => void | Promise<void>
  /** 이미지 미리보기 활성화 */
  preview?: boolean
  /** 비활성화 */
  disabled?: boolean
  /** 제어 컴포넌트 value */
  value?: File[]
  /** 업로드 진행률 (0-100) */
  uploadProgress?: number
  /** 클래스명 */
  className?: string
  /** 에러 메시지 */
  error?: string
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      accept,
      maxSize = 5 * 1024 * 1024, // 기본 5MB
      maxFiles = 1,
      onUpload,
      preview = false,
      disabled = false,
      value = [],
      uploadProgress,
      className,
      error,
    },
    ref
  ) => {
    const [files, setFiles] = useState<File[]>(value)
    const [isDragging, setIsDragging] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // 파일 검증
    const validateFile = useCallback(
      (file: File): string | null => {
        // 파일 크기 검증
        if (maxSize && file.size > maxSize) {
          return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)}까지 업로드할 수 있습니다.`
        }

        // 파일 타입 검증
        if (accept) {
          const acceptedTypes = accept.split(',').map((type) => type.trim())
          const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
          const mimeType = file.type

          const isAccepted = acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
              return fileExtension === type.toLowerCase()
            }
            if (type.endsWith('/*')) {
              const baseType = type.split('/')[0]
              return mimeType.startsWith(baseType)
            }
            return mimeType === type
          })

          if (!isAccepted) {
            return `허용되지 않는 파일 형식입니다. (${accept})`
          }
        }

        return null
      },
      [accept, maxSize]
    )

    // 파일 처리
    const handleFiles = useCallback(
      async (newFiles: FileList | null) => {
        if (!newFiles || newFiles.length === 0) return

        const fileArray = Array.from(newFiles)
        const validationErrors: string[] = []
        const validFiles: File[] = []

        // 파일 수 제한 검증
        if (files.length + fileArray.length > maxFiles) {
          setValidationError(`최대 ${maxFiles}개 파일까지 업로드할 수 있습니다.`)
          return
        }

        // 각 파일 검증
        for (const file of fileArray) {
          const error = validateFile(file)
          if (error) {
            validationErrors.push(error)
          } else {
            validFiles.push(file)
          }
        }

        if (validationErrors.length > 0) {
          setValidationError(validationErrors.join(', '))
          return
        }

        setValidationError(null)

        // 파일 상태 업데이트
        const updatedFiles = maxFiles === 1 ? validFiles : [...files, ...validFiles]
        setFiles(updatedFiles)

        // 업로드 콜백 실행
        try {
          setIsUploading(true)
          await onUpload(updatedFiles)
        } catch (err) {
          setValidationError(err instanceof Error ? err.message : '업로드 실패')
        } finally {
          setIsUploading(false)
        }
      },
      [files, maxFiles, onUpload, validateFile]
    )

    // 파일 제거
    const removeFile = useCallback(
      (index: number) => {
        const updatedFiles = files.filter((_, i) => i !== index)
        setFiles(updatedFiles)
        onUpload(updatedFiles)
      },
      [files, onUpload]
    )

    // 드래그 이벤트 핸들러
    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (disabled) return

        handleFiles(e.dataTransfer.files)
      },
      [disabled, handleFiles]
    )

    // 클릭 업로드
    const handleClick = useCallback(() => {
      if (disabled) return
      inputRef.current?.click()
    }, [disabled])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files)
      },
      [handleFiles]
    )

    const displayError = error || validationError

    return (
      <div className={cn('space-y-4', className)}>
        {/* Drop Zone */}
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            'hover:border-primary/50 hover:bg-accent/50',
            isDragging && 'border-primary bg-accent',
            disabled && 'opacity-50 cursor-not-allowed',
            displayError && 'border-destructive'
          )}
        >
          <input
            ref={ref || inputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="p-3 rounded-full bg-primary/10">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium">
                {isDragging ? '파일을 놓아주세요' : '파일을 드래그하거나 클릭하세요'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {accept && `허용 형식: ${accept}`}
                {maxSize && ` | 최대 크기: ${formatFileSize(maxSize)}`}
                {maxFiles > 1 && ` | 최대 ${maxFiles}개`}
              </p>
            </div>
          </div>

          {/* 업로드 진행률 */}
          {uploadProgress !== undefined && uploadProgress > 0 && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-1">
                업로드 중... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {displayError && (
          <div className="text-sm text-destructive">{displayError}</div>
        )}

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <FileItem
                key={`${file.name}-${index}`}
                file={file}
                preview={preview}
                onRemove={() => removeFile(index)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

FileUpload.displayName = 'FileUpload'

// 파일 아이템 컴포넌트
interface FileItemProps {
  file: File
  preview: boolean
  onRemove: () => void
  disabled: boolean
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  preview,
  onRemove,
  disabled,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

  // 이미지 미리보기 생성
  React.useEffect(() => {
    if (preview && isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file, preview, isImage, previewUrl])

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {/* 미리보기 또는 아이콘 */}
      <div className="flex-shrink-0">
        {preview && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="h-12 w-12 object-cover rounded"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
            {isImage ? (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            ) : (
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* 파일 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>

      {/* 삭제 버튼 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className="flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

