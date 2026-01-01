/**
 * MediaUploader Component
 *
 * CMS Phase 5 - 미디어 업로드 UI 컴포넌트
 *
 * Features:
 * - 드래그 앤 드롭 + 클릭 업로드 지원
 * - 업로드 전 미리보기
 * - 진행률 표시
 * - 파일 유효성 검사 (크기, 타입)
 * - 다중 파일 업로드 지원
 * - WCAG 2.1 AA 접근성 준수
 * - 한글화 지원
 */

import React, { useCallback, useId } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ImagePlus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatBytesLocalized } from '@/lib/media-utils';
import type { UploadStatus } from '@/hooks/media/useMediaUpload';

// =====================================================
// Types
// =====================================================

export interface MediaUploaderProps {
  /** 업로드 처리 함수 */
  onUpload: (files: File[]) => Promise<void>;
  /** 업로드 중 여부 */
  isUploading?: boolean;
  /** 파일별 업로드 진행률 */
  uploadProgress?: Record<string, number>;
  /** 최대 파일 크기 (bytes) */
  maxFileSize?: number;
  /** 허용 MIME 타입 목록 */
  allowedMimeTypes?: string[];
  /** 다중 파일 업로드 허용 여부 */
  multiple?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 드롭존 높이 (compact/normal/large) */
  size?: 'compact' | 'normal' | 'large';
  /** 업로드 완료 시 자동 큐 제거 지연 시간 (ms) */
  clearDelay?: number;
}

interface QueuedFile {
  file: File;
  preview: string;
  status: UploadStatus;
  progress: number;
  error?: string;
}

// =====================================================
// Constants
// =====================================================

const SIZE_CLASSES = {
  compact: 'p-4',
  normal: 'p-8',
  large: 'p-12',
};

// =====================================================
// Component
// =====================================================

export function MediaUploader({
  onUpload,
  isUploading = false,
  uploadProgress = {},
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  multiple = true,
  disabled = false,
  className,
  size = 'normal',
  clearDelay = 2000,
}: MediaUploaderProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [queuedFiles, setQueuedFiles] = React.useState<QueuedFile[]>([]);

  // Unique ID for accessibility
  const dropzoneId = useId();
  const errorId = useId();

  // ===================================================================
  // File Drop Handler
  // ===================================================================

  const onDrop = useCallback(
    async (
      acceptedFiles: File[],
      rejectedFiles: { file: File; errors: { message: string; code: string }[] }[]
    ) => {
      setError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const messages = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map(e => {
            // 에러 메시지 한글화
            if (e.code === 'file-too-large') {
              return `파일 크기가 ${formatBytesLocalized(maxFileSize)}를 초과합니다`;
            }
            if (e.code === 'file-invalid-type') {
              return '지원하지 않는 파일 형식입니다';
            }
            return e.message;
          });
          return `${file.name}: ${errorMessages.join(', ')}`;
        });
        setError(messages.join('\n'));
        return;
      }

      if (acceptedFiles.length === 0) return;

      // Add files to queue with preview
      const newQueuedFiles: QueuedFile[] = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        progress: 0,
      }));

      setQueuedFiles(prev => [...prev, ...newQueuedFiles]);

      // Update status to uploading
      setQueuedFiles(prev =>
        prev.map(qf =>
          acceptedFiles.some(f => f.name === qf.file.name)
            ? { ...qf, status: 'uploading' as const }
            : qf
        )
      );

      // Upload files
      try {
        await onUpload(acceptedFiles);

        // Mark all as completed
        setQueuedFiles(prev =>
          prev.map(qf =>
            acceptedFiles.some(f => f.name === qf.file.name)
              ? { ...qf, status: 'success' as const, progress: 100 }
              : qf
          )
        );

        // Clear queue after a delay
        setTimeout(() => {
          setQueuedFiles(prev => {
            // Cleanup preview URLs
            prev.forEach(qf => {
              if (acceptedFiles.some(f => f.name === qf.file.name)) {
                URL.revokeObjectURL(qf.preview);
              }
            });
            return prev.filter(qf => !acceptedFiles.some(f => f.name === qf.file.name));
          });
        }, clearDelay);
      } catch (err) {
        // Mark as error
        setQueuedFiles(prev =>
          prev.map(qf =>
            acceptedFiles.some(f => f.name === qf.file.name)
              ? { ...qf, status: 'error' as const, error: (err as Error).message }
              : qf
          )
        );
      }
    },
    [onUpload, maxFileSize, clearDelay]
  );

  // ===================================================================
  // Remove File from Queue
  // ===================================================================

  const removeFile = useCallback((fileName: string) => {
    setQueuedFiles(prev => {
      const file = prev.find(qf => qf.file.name === fileName);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(qf => qf.file.name !== fileName);
    });
  }, []);

  // ===================================================================
  // Retry Upload
  // ===================================================================

  const retryFile = useCallback((queuedFile: QueuedFile) => {
    // Remove from queue first
    setQueuedFiles(prev => prev.filter(qf => qf.file.name !== queuedFile.file.name));
    // Re-trigger upload
    onDrop([queuedFile.file], []);
  }, [onDrop]);

  // ===================================================================
  // Dropzone Configuration
  // ===================================================================

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple,
    disabled: disabled || isUploading,
    noClick: false,
    noKeyboard: false,
  });

  // ===================================================================
  // Helper Functions
  // ===================================================================

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: UploadStatus): string => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'uploading':
        return '업로드 중';
      case 'processing':
        return '처리 중';
      case 'success':
        return '완료';
      case 'error':
        return '오류';
      default:
        return '';
    }
  };

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps({
          'aria-label': '파일 업로드 영역',
          'aria-describedby': error ? errorId : undefined,
          role: 'button',
          tabIndex: 0,
        })}
        className={cn(
          'border-2 border-dashed rounded-lg text-center cursor-pointer transition-all',
          'hover:border-primary hover:bg-primary/5',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          SIZE_CLASSES[size],
          isDragActive && !isDragReject && 'border-primary bg-primary/10',
          isDragReject && 'border-destructive bg-destructive/10',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
        )}
      >
        <input
          {...getInputProps({
            id: dropzoneId,
            'aria-label': '파일 선택',
          })}
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          )}

          <div className="text-sm">
            {isDragActive ? (
              isDragReject ? (
                <p className="text-destructive font-medium" role="alert">
                  지원하지 않는 파일 형식입니다
                </p>
              ) : (
                <p className="text-primary font-medium">
                  파일을 여기에 놓으세요...
                </p>
              )
            ) : isUploading ? (
              <p className="text-muted-foreground">업로드 중...</p>
            ) : (
              <>
                <p>
                  <span className="font-medium text-primary">클릭하여 업로드</span>
                  {' '}또는 파일을 여기에 끌어다 놓으세요
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  이미지 (최대 {formatBytesLocalized(maxFileSize)})
                </p>
              </>
            )}
          </div>

          {/* File type info */}
          <div className="flex flex-wrap justify-center gap-1 text-xs text-muted-foreground">
            {allowedMimeTypes.map(type => (
              <span
                key={type}
                className="px-2 py-0.5 bg-muted rounded-full"
              >
                {type.split('/')[1]?.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" id={errorId} role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Queue */}
      {queuedFiles.length > 0 && (
        <div className="space-y-2" role="list" aria-label="업로드 대기열">
          <h4 className="text-sm font-medium text-muted-foreground">
            업로드 대기열 ({queuedFiles.length})
          </h4>
          <div className="space-y-2">
            {queuedFiles.map((qf) => {
              const progress = uploadProgress[qf.file.name] ?? qf.progress;
              return (
                <div
                  key={qf.file.name}
                  role="listitem"
                  className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg bg-card',
                    qf.status === 'success' && 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
                    qf.status === 'error' && 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  )}
                  aria-label={`${qf.file.name} - ${getStatusLabel(qf.status)}`}
                >
                  {/* Preview */}
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <img
                      src={qf.preview}
                      alt={`${qf.file.name} 미리보기`}
                      className="h-full w-full object-cover rounded"
                    />
                    {qf.status === 'success' && (
                      <div
                        className="absolute inset-0 bg-green-500/50 rounded flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{qf.file.name}</span>
                      {getStatusIcon(qf.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytesLocalized(qf.file.size)} • {getStatusLabel(qf.status)}
                    </div>
                    {qf.status === 'error' ? (
                      <div className="text-xs text-destructive mt-1" role="alert">
                        {qf.error}
                      </div>
                    ) : qf.status !== 'success' ? (
                      <Progress
                        value={progress}
                        className="mt-1 h-1"
                        aria-label={`업로드 진행률: ${progress}%`}
                      />
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1">
                    {qf.status === 'error' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => retryFile(qf)}
                        aria-label={`${qf.file.name} 다시 시도`}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {(qf.status === 'pending' || qf.status === 'error') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => removeFile(qf.file.name)}
                        aria-label={`${qf.file.name} 제거`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="sr-only">
        스페이스바 또는 엔터 키를 눌러 파일을 선택할 수 있습니다.
      </p>
    </div>
  );
}

export default MediaUploader;
