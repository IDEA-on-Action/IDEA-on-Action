/**
 * A2UI Audio 컴포넌트
 * AI 에이전트가 오디오를 렌더링할 수 있게 해주는 컴포넌트
 */

import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';

export interface A2UIAudioProps {
  /** 오디오 URL */
  src: string;
  /** 제목 */
  title?: string;
  /** 아티스트/설명 */
  artist?: string;
  /** 커버 이미지 URL */
  cover?: string;
  /** 컨트롤 표시 */
  controls?: boolean;
  /** 자동 재생 */
  autoPlay?: boolean;
  /** 반복 재생 */
  loop?: boolean;
  /** 음소거 */
  muted?: boolean;
  /** 컴팩트 모드 (커버 없이) */
  compact?: boolean;
}

interface Props extends A2UIAudioProps {
  className?: string;
}

export function A2UIAudio({
  src,
  title,
  artist,
  cover,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  compact = false,
  className,
}: Props) {
  // 컴팩트 모드
  if (compact) {
    return (
      <div className={cn('w-full', className)}>
        {title && (
          <div className="mb-2 text-sm font-medium">{title}</div>
        )}
        <audio
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          className="w-full"
        >
          <track kind="captions" />
          브라우저가 오디오를 지원하지 않습니다.
        </audio>
      </div>
    );
  }

  // 전체 모드 (커버 포함)
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-card p-4',
        className
      )}
    >
      {/* 커버 이미지 */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={title || '오디오 커버'}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* 정보 및 컨트롤 */}
      <div className="flex flex-1 flex-col gap-2">
        {(title || artist) && (
          <div>
            {title && (
              <div className="font-medium leading-tight">{title}</div>
            )}
            {artist && (
              <div className="text-sm text-muted-foreground">{artist}</div>
            )}
          </div>
        )}
        <audio
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          className="h-8 w-full"
        >
          <track kind="captions" />
          브라우저가 오디오를 지원하지 않습니다.
        </audio>
      </div>
    </div>
  );
}
