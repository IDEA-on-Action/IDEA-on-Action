/**
 * A2UI Video 컴포넌트
 * AI 에이전트가 비디오를 렌더링할 수 있게 해주는 컴포넌트
 */

import { cn } from '@/lib/utils';

export interface A2UIVideoProps {
  /** 비디오 URL */
  src: string;
  /** 포스터 이미지 URL */
  poster?: string;
  /** 제목 */
  title?: string;
  /** 너비 */
  width?: string | number;
  /** 높이 */
  height?: string | number;
  /** 가로세로 비율 (예: "16/9") */
  aspectRatio?: string;
  /** 컨트롤 표시 */
  controls?: boolean;
  /** 자동 재생 */
  autoPlay?: boolean;
  /** 반복 재생 */
  loop?: boolean;
  /** 음소거 */
  muted?: boolean;
  /** 모서리 둥글기 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 캡션 */
  caption?: string;
}

interface Props extends A2UIVideoProps {
  className?: string;
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

export function A2UIVideo({
  src,
  poster,
  title,
  width,
  height,
  aspectRatio = '16/9',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  rounded = 'md',
  caption,
  className,
}: Props) {
  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width || '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    aspectRatio: aspectRatio?.replace('/', ' / '),
  };

  // YouTube/Vimeo 임베드 감지
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');

  if (isYouTube || isVimeo) {
    let embedUrl = src;

    // YouTube URL 변환
    if (isYouTube) {
      const videoId = src.includes('youtu.be')
        ? src.split('youtu.be/')[1]?.split('?')[0]
        : src.split('v=')[1]?.split('&')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        if (autoPlay) embedUrl += '?autoplay=1';
        if (muted) embedUrl += (autoPlay ? '&' : '?') + 'mute=1';
        if (loop) embedUrl += (autoPlay || muted ? '&' : '?') + `loop=1&playlist=${videoId}`;
      }
    }

    // Vimeo URL 변환
    if (isVimeo) {
      const videoId = src.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
        if (autoPlay) embedUrl += '?autoplay=1';
        if (muted) embedUrl += (autoPlay ? '&' : '?') + 'muted=1';
        if (loop) embedUrl += (autoPlay || muted ? '&' : '?') + 'loop=1';
      }
    }

    return (
      <figure className={cn('w-full', className)}>
        <div
          className={cn('overflow-hidden bg-black', roundedStyles[rounded])}
          style={containerStyle}
        >
          <iframe
            src={embedUrl}
            title={title || '비디오'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
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

  // 일반 비디오
  return (
    <figure className={cn('w-full', className)}>
      <video
        src={src}
        poster={poster}
        title={title}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className={cn('w-full bg-black', roundedStyles[rounded])}
        style={containerStyle}
      >
        <track kind="captions" />
        브라우저가 비디오를 지원하지 않습니다.
      </video>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
