import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AIChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * AI 채팅 입력 컴포넌트
 *
 * @description
 * 사용자의 메시지 입력을 받습니다.
 * - Enter: 전송
 * - Shift+Enter: 줄바꿈
 * - 자동 높이 조절 (최대 5줄)
 */
export function AIChatInput({
  onSend,
  disabled = false,
  placeholder = '메시지를 입력하세요...',
}: AIChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
      // 높이 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter (Shift 없이): 전송
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    // 자동 높이 조절 (최대 5줄까지)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lineHeight = 24; // 예상 줄 높이 (픽셀)
      const maxHeight = lineHeight * 5;
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          'min-h-[40px] max-h-[120px] resize-none',
          'focus-visible:ring-1 focus-visible:ring-primary'
        )}
        aria-label="메시지 입력"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        className="shrink-0"
        aria-label="전송"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
