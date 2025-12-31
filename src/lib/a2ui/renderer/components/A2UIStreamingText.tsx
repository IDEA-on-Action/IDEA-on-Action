/**
 * A2UI StreamingText 컴포넌트
 * 타이핑 효과로 텍스트를 점진적으로 표시하는 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface A2UIStreamingTextProps {
  /** 표시할 전체 텍스트 */
  text: string;
  /** 스트리밍 활성화 여부 */
  streaming?: boolean;
  /** 타이핑 속도 (ms per character) */
  speed?: number;
  /** 텍스트 variant */
  variant?: 'default' | 'heading' | 'muted' | 'code';
  /** 마크다운 렌더링 여부 */
  markdown?: boolean;
  /** 스트리밍 완료 시 콜백 */
  onComplete?: () => void;
  /** 커서 표시 여부 */
  showCursor?: boolean;
}

interface Props extends A2UIStreamingTextProps {
  className?: string;
}

const variantStyles = {
  default: 'text-foreground',
  heading: 'text-lg font-semibold text-foreground',
  muted: 'text-sm text-muted-foreground',
  code: 'font-mono text-sm bg-muted px-1.5 py-0.5 rounded',
};

export function A2UIStreamingText({
  text,
  streaming = true,
  speed = 20,
  variant = 'default',
  markdown = true,
  onComplete,
  showCursor = true,
  className,
}: Props) {
  const [displayedText, setDisplayedText] = useState(streaming ? '' : text);
  const [isComplete, setIsComplete] = useState(!streaming);
  const indexRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    // 스트리밍 비활성화 시 전체 텍스트 표시
    if (!streaming) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // 텍스트가 변경되면 리셋
    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    const animate = () => {
      if (indexRef.current < text.length) {
        // 한 번에 여러 글자씩 추가 (더 자연스러운 효과)
        const charsToAdd = Math.min(
          Math.ceil(Math.random() * 3) + 1,
          text.length - indexRef.current
        );
        indexRef.current += charsToAdd;
        setDisplayedText(text.slice(0, indexRef.current));

        // 다음 프레임 예약
        animationRef.current = window.setTimeout(animate, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    // 시작
    animationRef.current = window.setTimeout(animate, speed);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [text, streaming, speed, onComplete]);

  // 텍스트가 없으면 렌더링하지 않음
  if (!text) return null;

  const content = markdown ? (
    <ReactMarkdown
      components={{
        // 마크다운 스타일링
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-3">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children, className: codeClassName }) => {
          const isInline = !codeClassName;
          return isInline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
          ) : (
            <code className={codeClassName}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2 text-sm">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic mb-2">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {displayedText}
    </ReactMarkdown>
  ) : (
    <span>{displayedText}</span>
  );

  return (
    <div className={cn(variantStyles[variant], className)}>
      {content}
      {/* 커서 */}
      {showCursor && !isComplete && (
        <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5" />
      )}
    </div>
  );
}
