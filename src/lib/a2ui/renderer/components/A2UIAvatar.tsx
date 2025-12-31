/**
 * A2UI Avatar 컴포넌트
 * AI 에이전트가 사용자 아바타를 렌더링할 수 있게 해주는 컴포넌트
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface A2UIAvatarProps {
  /** 이미지 URL */
  src?: string;
  /** 대체 텍스트 */
  alt?: string;
  /** 폴백 텍스트 (이니셜 등) */
  fallback?: string;
  /** 아바타 크기 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 상태 표시 (온라인/오프라인 등) */
  status?: 'online' | 'offline' | 'away' | 'busy';
}

interface Props extends A2UIAvatarProps {
  className?: string;
}

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const statusStyles = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const statusSizeStyles = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

/**
 * 이름에서 이니셜 추출
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function A2UIAvatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  className,
}: Props) {
  const fallbackText = fallback || (alt ? getInitials(alt) : '?');

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeStyles[size], className)}>
        {src && <AvatarImage src={src} alt={alt} />}
        <AvatarFallback className={sizeStyles[size]}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>

      {/* 상태 표시 */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            statusStyles[status],
            statusSizeStyles[size]
          )}
          title={status}
        />
      )}
    </div>
  );
}
