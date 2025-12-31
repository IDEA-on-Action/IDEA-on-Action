/**
 * A2UI Image 컴포넌트
 * AI 에이전트가 이미지를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

export interface A2UIImageProps {
  /** 이미지 URL */
  src: string;
  /** 대체 텍스트 */
  alt: string;
  /** 이미지 너비 */
  width?: string | number;
  /** 이미지 높이 */
  height?: string | number;
  /** 가로세로 비율 (예: "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** 이미지 맞춤 방식 */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** 모서리 둥글기 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 캡션 텍스트 */
  caption?: string;
  /** 로딩 실패 시 대체 텍스트 */
  fallbackText?: string;
}

interface Props extends A2UIImageProps {
  className?: string;
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export function A2UIImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  objectFit = 'cover',
  rounded = 'md',
  caption,
  fallbackText,
  className,
}: Props) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    aspectRatio: aspectRatio?.replace('/', ' / '),
  };

  if (error) {
    return (
      <figure className={cn('inline-block', className)}>
        <div
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground',
            roundedStyles[rounded]
          )}
          style={{ ...containerStyle, minHeight: 100, minWidth: 100 }}
        >
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <ImageOff className="h-8 w-8" />
            <span className="text-sm">{fallbackText || '이미지를 불러올 수 없습니다'}</span>
          </div>
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className={cn('inline-block', className)}>
      <div className="relative" style={containerStyle}>
        {loading && (
          <div
            className={cn(
              'absolute inset-0 animate-pulse bg-muted',
              roundedStyles[rounded]
            )}
          />
        )}
        <img
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full',
            roundedStyles[rounded],
            loading && 'opacity-0'
          )}
          style={{ objectFit }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
