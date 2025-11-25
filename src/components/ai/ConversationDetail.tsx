/**
 * 대화 상세 컴포넌트
 *
 * 기능:
 * - 대화 메시지 렌더링 (user/assistant 구분)
 * - 메시지 입력 폼
 * - 스크롤 자동 하단 이동
 * - 포크/내보내기 버튼
 * - 컨텍스트 요약 제안 (10개 이상 메시지)
 *
 * @module components/ai/ConversationDetail
 */

import * as React from 'react';
import { Send, GitBranch, Download, Lightbulb, User, Bot, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ConversationSession, ConversationMessage } from '@/types/conversation-context.types';

// ============================================================================
// Types
// ============================================================================

interface MessageBubbleProps {
  message: ConversationMessage;
  showTimestamp?: boolean;
  showTokens?: boolean;
}

interface ConversationDetailProps {
  conversation: ConversationSession | null;
  messages: ConversationMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  onSendMessage?: (content: string) => Promise<void>;
  onFork?: () => void;
  onExport?: (format: 'markdown' | 'json' | 'html') => void;
  onCreateSummary?: () => void;
}

// ============================================================================
// MessageBubble Component
// ============================================================================

function MessageBubble({ message, showTimestamp = true, showTokens = false }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  // 복사 핸들러
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 날짜 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // 토큰 포맷팅
  const formatTokens = (tokens: number | null) => {
    if (!tokens) return '0';
    if (tokens < 1000) return tokens.toString();
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  return (
    <div
      className={cn(
        'group flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* 아바타 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* 메시지 내용 */}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        {/* 메시지 버블 */}
        <div
          className={cn(
            'relative rounded-lg px-4 py-3 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted border border-border'
          )}
        >
          <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>

          {/* 복사 버튼 */}
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
              isUser
                ? 'hover:bg-primary-foreground/20'
                : 'hover:bg-accent'
            )}
            title="복사"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* 메타데이터 */}
        <div className="flex items-center gap-2 mt-1 px-1 text-xs text-muted-foreground">
          {showTimestamp && (
            <span>{formatTime(message.createdAt)}</span>
          )}
          {showTokens && message.tokenCount && (
            <>
              <span>•</span>
              <span>{formatTokens(message.tokenCount)} 토큰</span>
            </>
          )}
          {message.model && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5">
                {message.model.replace('claude-', '')}
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ConversationDetail Component
// ============================================================================

export function ConversationDetail({
  conversation,
  messages,
  isLoading = false,
  isSending = false,
  onSendMessage,
  onFork,
  onExport,
  onCreateSummary,
}: ConversationDetailProps) {
  const [inputValue, setInputValue] = React.useState('');
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 메시지가 추가되면 스크롤을 하단으로 이동
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // 메시지 전송 핸들러
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    try {
      await onSendMessage?.(inputValue);
      setInputValue('');
      // 포커스를 textarea로 복원
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Enter 키 핸들러 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 내보내기 핸들러
  const handleExport = (format: 'markdown' | 'json' | 'html') => {
    onExport?.(format);
  };

  // 요약 권장 여부 (메시지 10개 이상)
  const shouldSuggestSummary = messages.length >= 10;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 헤더 */}
      {conversation && (
        <header className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{conversation.title}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{messages.length}개 메시지</span>
              <span>•</span>
              <span>{(conversation.totalTokens / 1000).toFixed(1)}k 토큰</span>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onFork} disabled={!onFork}>
              <GitBranch className="w-4 h-4 mr-1" />
              포크
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!onExport}>
                  <Download className="w-4 h-4 mr-1" />
                  내보내기
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('markdown')}>
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  HTML (.html)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="px-6 py-4">
            {/* 요약 권장 알림 */}
            {shouldSuggestSummary && (
              <Alert className="mb-4">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>컨텍스트 요약 권장</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    메시지가 많아졌습니다. 컨텍스트를 요약하면 토큰 사용량을 줄일 수 있습니다.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateSummary}
                    disabled={!onCreateSummary}
                    className="ml-4"
                  >
                    요약 생성
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* 로딩 상태 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">메시지를 불러오는 중...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    대화를 시작해보세요!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showTimestamp
                  showTokens={message.role === 'assistant'}
                />
              ))
            )}

            {/* 전송 중 표시 */}
            {isSending && (
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="rounded-lg px-4 py-3 bg-muted border border-border">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 입력 영역 */}
      {conversation && (
        <footer className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              className="min-h-[80px] max-h-[200px] resize-none"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="h-auto"
            >
              <Send className="w-4 h-4" />
              <span className="sr-only">전송</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter로 전송, Shift+Enter로 줄바꿈
          </p>
        </footer>
      )}
    </div>
  );
}

export default ConversationDetail;
