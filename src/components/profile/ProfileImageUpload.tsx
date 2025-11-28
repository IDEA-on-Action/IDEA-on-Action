/**
 * ProfileImageUpload Component
 *
 * 프로필 이미지 업로드 컴포넌트
 * - 드래그 앤 드롭 지원
 * - 이미지 미리보기
 * - 크롭 기능 (선택)
 */

import { useState, useRef, useCallback } from 'react'
import { useUploadAvatar, useDeleteAvatar } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  fallbackText?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onUploadSuccess?: (url: string) => void
  onDeleteSuccess?: () => void
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
}

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

export default function ProfileImageUpload({
  currentImageUrl,
  fallbackText = 'U',
  size = 'md',
  className,
  onUploadSuccess,
  onDeleteSuccess,
}: ProfileImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'JPG, PNG, WEBP 이미지만 업로드 가능합니다.'
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return '파일 크기는 5MB 이하여야 합니다.'
    }

    return null
  }

  const handleFile = async (file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 업로드
    try {
      const profile = await uploadAvatar.mutateAsync(file)
      setPreview(null)
      onUploadSuccess?.(profile.avatar_url || '')
    } catch (err) {
      setPreview(null)
      if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // 같은 파일 재선택 허용
    e.target.value = ''
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteAvatar.mutateAsync()
      onDeleteSuccess?.()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // dropZone 외부로 나갈 때만 처리
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadAvatar])

  const isLoading = uploadAvatar.isPending || deleteAvatar.isPending
  const displayImage = preview || currentImageUrl

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* 이미지 영역 */}
      <div
        ref={dropZoneRef}
        className={cn(
          'relative rounded-full transition-all',
          isDragging && 'ring-2 ring-primary ring-offset-2'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Avatar className={cn(sizeClasses[size])}>
          <AvatarImage src={displayImage || undefined} alt="프로필" />
          <AvatarFallback className={cn(textSizeClasses[size], 'bg-primary/10')}>
            {fallbackText}
          </AvatarFallback>
        </Avatar>

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-full">
            <Upload className="h-6 w-6 text-white" />
          </div>
        )}

        {/* 호버 오버레이 (변경 버튼) */}
        {!isLoading && !isDragging && (
          <label
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/50 rounded-full',
              'opacity-0 hover:opacity-100 transition-opacity cursor-pointer'
            )}
          >
            <Camera className="h-6 w-6 text-white" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Camera className="mr-2 h-4 w-4" />
          변경
        </Button>
        {currentImageUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 안내 텍스트 */}
      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG, WEBP 형식, 5MB 이하
        <br />
        드래그 앤 드롭으로도 업로드 가능
      </p>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
