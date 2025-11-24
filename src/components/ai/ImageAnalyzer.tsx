/**
 * ImageAnalyzer 컴포넌트
 *
 * 이미지 분석을 위한 Vision API UI 컴포넌트
 * - 드래그 앤 드롭 업로드 영역
 * - 이미지 미리보기
 * - 분석 유형 선택 (일반/UI 디자인/다이어그램/스크린샷/와이어프레임)
 * - 추가 프롬프트 입력
 * - 로딩 상태 및 결과 표시
 * - 접근성 (ARIA labels, 키보드 접근)
 * - 반응형 디자인
 *
 * @module components/ai/ImageAnalyzer
 */

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Copy,
  RefreshCw,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

/**
 * 분석 유형
 */
export type ImageAnalysisType =
  | 'general'
  | 'ui-design'
  | 'diagram'
  | 'screenshot'
  | 'wireframe';

/**
 * 분석 유형 옵션 설정
 */
interface AnalysisTypeOption {
  value: ImageAnalysisType;
  label: string;
  description: string;
  systemPrompt: string;
}

/**
 * ImageAnalyzer 속성
 */
export interface ImageAnalyzerProps {
  /** 분석 완료 콜백 */
  onAnalysisComplete?: (result: string) => void;
  /** 기본 분석 유형 */
  defaultAnalysisType?: ImageAnalysisType;
  /** 추가 클래스 */
  className?: string;
  /** 최대 파일 크기 (bytes, 기본값: 20MB) */
  maxFileSize?: number;
  /** 허용 파일 형식 */
  acceptedFormats?: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 분석 유형 옵션 목록
 */
const ANALYSIS_TYPE_OPTIONS: AnalysisTypeOption[] = [
  {
    value: 'general',
    label: '일반 분석',
    description: '이미지의 일반적인 내용 분석',
    systemPrompt:
      '이 이미지를 분석하고 내용을 자세히 설명해주세요. 주요 요소, 구성, 의미를 포함해주세요.',
  },
  {
    value: 'ui-design',
    label: 'UI/UX 디자인',
    description: '사용자 인터페이스 디자인 분석',
    systemPrompt:
      '이 UI/UX 디자인을 분석해주세요. 레이아웃, 색상 스킴, 타이포그래피, 사용성, 접근성 측면에서 평가하고 개선점을 제안해주세요.',
  },
  {
    value: 'diagram',
    label: '다이어그램',
    description: '순서도, 아키텍처 등 다이어그램 분석',
    systemPrompt:
      '이 다이어그램을 분석해주세요. 구조, 흐름, 구성 요소 간의 관계를 설명하고, 명확성이나 완성도 측면에서 피드백을 제공해주세요.',
  },
  {
    value: 'screenshot',
    label: '스크린샷',
    description: '앱/웹 스크린샷 분석',
    systemPrompt:
      '이 스크린샷을 분석해주세요. 표시된 내용, UI 요소, 기능, 그리고 잠재적인 이슈나 개선점을 설명해주세요.',
  },
  {
    value: 'wireframe',
    label: '와이어프레임',
    description: '와이어프레임/목업 분석',
    systemPrompt:
      '이 와이어프레임/목업을 분석해주세요. 정보 아키텍처, 사용자 흐름, 레이아웃 구조를 평가하고 UX 관점에서 피드백을 제공해주세요.',
  },
];

/**
 * 허용되는 이미지 형식
 */
const DEFAULT_ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * 기본 최대 파일 크기 (20MB)
 */
const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024;

// ============================================================================
// Component
// ============================================================================

/**
 * 이미지 분석 컴포넌트
 *
 * @example
 * // 기본 사용
 * <ImageAnalyzer
 *   onAnalysisComplete={(result) => console.log(result)}
 * />
 *
 * @example
 * // UI 디자인 분석으로 기본 설정
 * <ImageAnalyzer
 *   defaultAnalysisType="ui-design"
 *   onAnalysisComplete={handleResult}
 * />
 */
export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({
  onAnalysisComplete,
  defaultAnalysisType = 'general',
  className,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
}) => {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<ImageAnalysisType>(defaultAnalysisType);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 이미지 미리보기 생성
  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // 파일 검증
  const validateFile = useCallback(
    (file: File): string | null => {
      // 파일 크기 검증
      if (file.size > maxFileSize) {
        return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxFileSize)}까지 업로드할 수 있습니다.`;
      }

      // 파일 형식 검증
      if (!acceptedFormats.includes(file.type)) {
        const acceptedExtensions = acceptedFormats
          .map((format) => format.split('/')[1].toUpperCase())
          .join(', ');
        return `지원되지 않는 파일 형식입니다. (허용: ${acceptedExtensions})`;
      }

      return null;
    },
    [maxFileSize, acceptedFormats]
  );

  // 파일 선택 처리
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setResult(null);
      setSelectedFile(file);
    },
    [validateFile]
  );

  // 드래그 이벤트 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 드래그가 자식 요소로 이동했는지 확인
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // 파일 입력 변경 핸들러
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // 파일 제거
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 분석 시작
  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !previewUrl) {
      setError('이미지를 먼저 업로드해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const selectedOption = ANALYSIS_TYPE_OPTIONS.find(
        (opt) => opt.value === analysisType
      );
      const systemPrompt = selectedOption?.systemPrompt || '';
      const fullPrompt = additionalPrompt
        ? `${systemPrompt}\n\n추가 지시사항: ${additionalPrompt}`
        : systemPrompt;

      // Vision API 호출 (실제 구현에서는 Edge Function 호출)
      const response = await fetch('/functions/v1/claude-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: previewUrl,
          prompt: fullPrompt,
          analysisType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '이미지 분석에 실패했습니다.');
      }

      const data = await response.json();
      const analysisResult = data.content?.[0]?.text || data.result || '';

      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, previewUrl, analysisType, additionalPrompt, onAnalysisComplete]);

  // 결과 복사
  const handleCopyResult = useCallback(async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  }, [result]);

  // 재분석
  const handleReanalyze = useCallback(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  // 드롭 영역 클릭
  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 키보드 이벤트 핸들러
  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDropZoneClick();
      }
    },
    [handleDropZoneClick]
  );

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
          이미지 분석
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 드래그 앤 드롭 업로드 영역 */}
        <div
          ref={dropZoneRef}
          onClick={handleDropZoneClick}
          onKeyDown={handleDropZoneKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="이미지를 드래그하거나 클릭하여 업로드"
          data-testid="image-drop-zone"
          className={cn(
            'relative flex flex-col items-center justify-center gap-4 p-8',
            'border-2 border-dashed rounded-lg',
            'cursor-pointer transition-colors duration-200',
            'hover:border-primary/50 hover:bg-accent/50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            isDragging && 'border-primary bg-accent',
            error && 'border-destructive',
            selectedFile && 'border-green-500'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleInputChange}
            className="hidden"
            aria-label="파일 선택"
            data-testid="file-input"
          />

          {previewUrl ? (
            // 이미지 미리보기
            <div className="relative w-full max-w-xs">
              <img
                src={previewUrl}
                alt="업로드된 이미지 미리보기"
                className="w-full h-auto rounded-lg object-contain max-h-48"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="absolute -top-2 -right-2 h-6 w-6"
                aria-label="이미지 제거"
                data-testid="remove-image-button"
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
              </p>
            </div>
          ) : (
            // 업로드 안내
            <>
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {isDragging ? '파일을 놓아주세요' : '이미지를 드래그하거나 클릭하여 업로드'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG, GIF, WebP | 최대 {formatFileSize(maxFileSize)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div
            className="flex items-center gap-2 text-sm text-destructive"
            role="alert"
            data-testid="error-message"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* 분석 유형 선택 */}
        <div className="space-y-2">
          <Label htmlFor="analysis-type">분석 유형</Label>
          <Select
            value={analysisType}
            onValueChange={(value) => setAnalysisType(value as ImageAnalysisType)}
          >
            <SelectTrigger
              id="analysis-type"
              aria-label="분석 유형 선택"
              data-testid="analysis-type-select"
            >
              <SelectValue placeholder="분석 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              {ANALYSIS_TYPE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`analysis-type-${option.value}`}
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 추가 프롬프트 입력 */}
        <div className="space-y-2">
          <Label htmlFor="additional-prompt">추가 지시사항 (선택 사항)</Label>
          <Textarea
            id="additional-prompt"
            placeholder="분석 시 추가로 고려할 사항을 입력해주세요..."
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            className="min-h-[80px] resize-none"
            aria-describedby="additional-prompt-description"
            data-testid="additional-prompt-input"
          />
          <p
            id="additional-prompt-description"
            className="text-xs text-muted-foreground"
          >
            특별히 확인하고 싶은 내용이나 분석 방향을 지정할 수 있습니다.
          </p>
        </div>

        {/* 분석 시작 버튼 */}
        <Button
          onClick={handleAnalyze}
          disabled={!selectedFile || isLoading}
          className="w-full gap-2"
          size="lg"
          aria-label="이미지 분석 시작"
          data-testid="analyze-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              분석 중...
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
              분석 시작
            </>
          )}
        </Button>

        {/* 분석 결과 */}
        {result && (
          <div className="space-y-4" data-testid="analysis-result">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-green-500"
                  aria-hidden="true"
                />
                분석 결과
              </Label>
            </div>

            <div
              className="p-4 rounded-lg bg-muted/50 border max-h-80 overflow-y-auto"
              role="region"
              aria-label="분석 결과"
            >
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {result}
              </div>
            </div>

            {/* 결과 액션 버튼 */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResult}
                      className="gap-2"
                      aria-label="분석 결과 복사"
                      data-testid="copy-result-button"
                    >
                      {copySuccess ? (
                        <>
                          <CheckCircle
                            className="h-4 w-4 text-green-500"
                            aria-hidden="true"
                          />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          복사
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>클립보드에 복사</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReanalyze}
                      disabled={isLoading}
                      className="gap-2"
                      aria-label="다시 분석"
                      data-testid="reanalyze-button"
                    >
                      <RefreshCw
                        className={cn(
                          'h-4 w-4',
                          isLoading && 'animate-spin'
                        )}
                        aria-hidden="true"
                      />
                      재분석
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>같은 이미지로 다시 분석</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

ImageAnalyzer.displayName = 'ImageAnalyzer';

export default ImageAnalyzer;
