/**
 * A2UI Button 컴포넌트
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { A2UIButtonProps, A2UIActionHandler } from '../../types';

interface Props extends A2UIButtonProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UIButton({
  text,
  variant = 'default',
  size = 'default',
  disabled = false,
  onClick,
  className,
  onAction,
}: Props) {
  const handleClick = () => {
    if (onClick && onAction) {
      onAction(onClick);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={handleClick}
      className={cn(className)}
    >
      {text}
    </Button>
  );
}
