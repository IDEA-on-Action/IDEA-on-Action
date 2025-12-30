/**
 * A2UI Text 컴포넌트
 * 마크다운 텍스트 렌더링
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { A2UITextProps } from '../../types';

interface Props extends A2UITextProps {
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-foreground',
  heading: 'text-lg font-semibold text-foreground',
  muted: 'text-sm text-muted-foreground',
  code: 'font-mono text-sm bg-muted px-1.5 py-0.5 rounded',
};

export function A2UIText({ text, variant = 'default', className }: Props) {
  if (variant === 'code') {
    return <code className={cn(variantStyles.code, className)}>{text}</code>;
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', variantStyles[variant], className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 링크는 새 창에서 열기
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          // 코드 블록 스타일링
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn('block', codeClassName)} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
