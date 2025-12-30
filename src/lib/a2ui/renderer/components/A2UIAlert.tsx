/**
 * A2UI Alert 컴포넌트
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { A2UIAlertProps } from '../../types';

interface Props extends A2UIAlertProps {
  className?: string;
}

export function A2UIAlert({
  title,
  description,
  variant = 'default',
  className,
}: Props) {
  const Icon = variant === 'destructive' ? AlertCircle : Info;

  return (
    <Alert variant={variant} className={cn(className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
