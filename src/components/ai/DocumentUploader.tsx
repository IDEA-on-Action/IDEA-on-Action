/**
 * DocumentUploader 컴포넌트
 *
 * RAG용 문서 업로드 UI
 * - 파일 드래그앤드롭 지원
 * - URL 입력 지원
 * - 수동 텍스트 입력 지원
 * - 서비스 선택 (Minu 시리즈)
 * - 태그 입력
 * - 업로드 진행률 표시
 *
 * @module components/ai/DocumentUploader
 */

import * as React from 'react'
import { Upload, FileText, Link as LinkIcon, Type, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 업로드 모드
 */
type UploadMode = 'file' | 'url' | 'text'

/**
 * 서비스 ID (Minu 시리즈)
 */
type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | 'general'

/**
 * 업로드 상태
 */
interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message?: string
}

/**
 * DocumentUploader Props
 */
export interface DocumentUploaderProps {
  /** 기본 서비스 ID */
  defaultServiceId?: ServiceId
  /** 업로드 완료 콜백 */
  onUploadComplete?: (documentId: string) => void
  /** 에러 콜백 */
  onError?: (error: Error) => void
  /** 추가 클래스 */
  className?: string
}

// ============================================================================
// 상수
// ============================================================================

const ALLOWED_FILE_TYPES = ['.txt', '.md', '.pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const SERVICE_OPTIONS = [
  { value: 'general', label: '일반' },
  { value: 'minu-find', label: 'Minu Find - 사업기회 탐색' },
  { value: 'minu-frame', label: 'Minu Frame - 문제정의 & RFP' },
  { value: 'minu-build', label: 'Minu Build - 프로젝트 진행' },
  { value: 'minu-keep', label: 'Minu Keep - 운영/유지보수' },
] as const

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 문서 업로더 컴포넌트
 *
 * @example
 * <DocumentUploader
 *   defaultServiceId="minu-find"
 *   onUploadComplete={(id) => console.log('업로드 완료:', id)}
 *   onError={(err) => console.error(err)}
 * />
 */
export const DocumentUploader = React.forwardRef<
  HTMLDivElement,
  DocumentUploaderProps
>(({ defaultServiceId = 'general', onUploadComplete, onError, className }, ref) => {
  // 상태
  const [mode, setMode] = React.useState<UploadMode>('file')
  const [serviceId, setServiceId] = React.useState<ServiceId>(defaultServiceId)
  const [title, setTitle] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [uploadState, setUploadState] = React.useState<UploadState>({
    status: 'idle',
    progress: 0,
  })

  // 파일 입력
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // URL 입력
  const [url, setUrl] = React.useState('')

  // 텍스트 입력
  const [text, setText] = React.useState('')

  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ============================================================================
  // 파일 업로드 핸들러
  // ============================================================================

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = React.useCallback(
    (file: File) => {
      // 파일 타입 검증
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
      if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
        onError?.(new Error(`지원하지 않는 파일 형식입니다. (${ALLOWED_FILE_TYPES.join(', ')})`))
        return
      }

      // 파일 크기 검증
      if (file.size > MAX_FILE_SIZE) {
        onError?.(new Error(`파일 크기가 너무 큽니다. (최대 10MB)`))
        return
      }

      setSelectedFile(file)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    },
    [title, onError]
  )

  /**
   * 파일 드롭 핸들러
   */
  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  /**
   * 드래그 오버 핸들러
   */
  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  /**
   * 드래그 리브 핸들러
   */
  const handleDragLeave = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  // ============================================================================
  // 태그 관리
  // ============================================================================

  /**
   * 태그 추가
   */
  const handleAddTag = React.useCallback(() => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
      setTagInput('')
    }
  }, [tagInput, tags])

  /**
   * 태그 삭제
   */
  const handleRemoveTag = React.useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  /**
   * 태그 입력 엔터 키
   */
  const handleTagKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  // ============================================================================
  // 업로드 처리
  // ============================================================================

  /**
   * 업로드 실행
   */
  const handleUpload = React.useCallback(async () => {
    try {
      setUploadState({ status: 'uploading', progress: 0 })

      // TODO: 실제 업로드 API 호출
      // - 파일 업로드: supabase.storage.upload()
      // - 문서 생성: supabase.from('rag_documents').insert()
      // - 임베딩 생성: supabase.functions.invoke('rag/embed')

      // 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setUploadState({ status: 'processing', progress: 50 })

      await new Promise((resolve) => setTimeout(resolve, 1500))
      setUploadState({ status: 'success', progress: 100, message: '업로드 완료!' })

      // 콜백 호출
      onUploadComplete?.('doc_123')

      // 리셋
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0 })
        setSelectedFile(null)
        setUrl('')
        setText('')
        setTitle('')
        setTags([])
      }, 2000)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('업로드 중 오류가 발생했습니다.')
      setUploadState({
        status: 'error',
        progress: 0,
        message: error.message,
      })
      onError?.(error)
    }
  }, [onUploadComplete, onError])

  // ============================================================================
  // 렌더링
  // ============================================================================

  const canUpload =
    uploadState.status === 'idle' &&
    title.trim() &&
    ((mode === 'file' && selectedFile) ||
      (mode === 'url' && url.trim()) ||
      (mode === 'text' && text.trim()))

  return (
    <Card ref={ref} className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle>문서 업로드</CardTitle>
        <CardDescription>
          RAG 시스템에 문서를 추가하여 AI가 참고할 수 있도록 합니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 업로드 모드 선택 */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('file')}
          >
            <FileText className="mr-2 h-4 w-4" />
            파일
          </Button>
          <Button
            type="button"
            variant={mode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('url')}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            URL
          </Button>
          <Button
            type="button"
            variant={mode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('text')}
          >
            <Type className="mr-2 h-4 w-4" />
            텍스트
          </Button>
        </div>

        {/* 파일 업로드 영역 */}
        {mode === 'file' && (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-700',
              selectedFile && 'bg-gray-50 dark:bg-gray-800'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-12 w-12 text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  다른 파일 선택
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-sm text-muted-foreground">
                  파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-xs text-muted-foreground">
                  {ALLOWED_FILE_TYPES.join(', ')} (최대 10MB)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  파일 선택
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* URL 입력 */}
        {mode === 'url' && (
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              웹 페이지나 문서 URL을 입력하세요
            </p>
          </div>
        )}

        {/* 텍스트 입력 */}
        {mode === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="text">텍스트</Label>
            <Textarea
              id="text"
              placeholder="문서 내용을 직접 입력하세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
          </div>
        )}

        {/* 서비스 선택 */}
        <div className="space-y-2">
          <Label htmlFor="service">서비스</Label>
          <Select value={serviceId} onValueChange={(v) => setServiceId(v as ServiceId)}>
            <SelectTrigger id="service">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 제목 입력 */}
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            placeholder="문서 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 태그 입력 */}
        <div className="space-y-2">
          <Label htmlFor="tags">태그</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="태그 입력 후 Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              추가
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <XCircle className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 업로드 진행률 */}
        {uploadState.status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {uploadState.status === 'uploading' && '업로드 중...'}
                {uploadState.status === 'processing' && '처리 중...'}
                {uploadState.status === 'success' && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {uploadState.message}
                  </span>
                )}
                {uploadState.status === 'error' && (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {uploadState.message}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{uploadState.progress}%</span>
            </div>
            <Progress value={uploadState.progress} />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={!canUpload || uploadState.status !== 'idle'}
        >
          {uploadState.status === 'uploading' || uploadState.status === 'processing' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              업로드
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
})

DocumentUploader.displayName = 'DocumentUploader'

export default DocumentUploader
