/**
 * A2UI Card 컴포넌트
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { A2UICardProps } from '../../types';
import type { ReactNode } from 'react';

interface Props extends A2UICardProps {
  className?: string;
  renderedChildren?: ReactNode;
}

export function A2UICard({
  title,
  description,
  className,
  renderedChildren,
}: Props) {
  const hasHeader = title || description;

  return (
    <Card className={cn('w-full', className)}>
      {hasHeader && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && (
            <CardDescription className="text-sm">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      {renderedChildren && (
        <CardContent className={cn(!hasHeader && 'pt-4')}>
          {renderedChildren}
        </CardContent>
      )}
    </Card>
  );
}
