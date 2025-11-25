import { useState, useCallback, useEffect } from 'react';
import { AIChatButton } from './AIChatButton';
import { AIChatWindow } from './AIChatWindow';
import { useClaudeStreaming } from '@/hooks/useClaudeStreaming';
import { useConversationManager } from '@/hooks/useConversationManager';
import { useAuth } from '@/hooks/useAuth';
import { usePageContext } from '@/hooks/usePageContext';
import type { AIChatMessage, AIChatConfig } from '@/types/ai-chat-widget.types';

interface AIChatWidgetProps {
  config?: Partial<AIChatConfig>;
}

/**
 * AI 채팅 위젯
 *
 * @description
 * 플로팅 버튼과 채팅창을 관리하는 메인 위젯입니다.
 * - Claude Streaming API 연동
 * - 로그인 시 대화 저장 (useConversationManager)
 * - 페이지 컨텍스트 자동 제공 (usePageContext)
 *
 * @example
 * ```tsx
 * <AIChatWidget />
 * ```
 */
export function AIChatWidget({ config }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(config?.defaultOpen ?? false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);

  const { user } = useAuth();
  const pageContext = usePageContext();

  // Claude Streaming 훅
  const {
    state: claudeState,
    sendMessage: claudeSendMessage,
    streamingText,
    isStreaming,
    reset: resetClaude,
  } = useClaudeStreaming({
    systemPrompt: buildSystemPrompt(pageContext, config?.systemPrompt),
    onStreamingText: (text) => {
      // 스트리밍 중인 메시지 업데이트
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: text, timestamp: new Date() },
          ];
        }
        return prev;
      });
    },
    onComplete: (finalText) => {
      // 스트리밍 완료 시 최종 메시지로 교체
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: finalText, isStreaming: false, timestamp: new Date() },
          ];
        }
        return prev;
      });
    },
  });

  // Conversation Manager (로그인 시)
  const conversationManager = useConversationManager();

  // 버튼 클릭
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // 닫기
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 새 대화
  const handleNewChat = useCallback(() => {
    setMessages([]);
    resetClaude();
  }, [resetClaude]);

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (content: string) => {
      // 사용자 메시지 추가
      const userMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // AI 응답 준비 (빈 메시지로 시작)
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: AIChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Claude API 호출
        await claudeSendMessage(content);

        // 로그인한 경우 대화 저장
        if (user && conversationManager.createConversation) {
          // TODO: 대화 세션 저장 로직 (선택적)
          // conversationManager.createConversation({ ... });
        }
      } catch (err) {
        console.error('AI 채팅 오류:', err);
        // 에러 메시지로 교체
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                isStreaming: false,
                timestamp: new Date(),
              },
            ];
          }
          return prev;
        });
      }
    },
    [user, claudeSendMessage, conversationManager]
  );

  // 페이지 변경 시 시스템 프롬프트 업데이트
  useEffect(() => {
    // 시스템 프롬프트 재생성
    const newSystemPrompt = buildSystemPrompt(pageContext, config?.systemPrompt);
    // TODO: useClaudeStreaming에 setSystemPrompt API가 있다면 업데이트
  }, [pageContext, config?.systemPrompt]);

  return (
    <>
      {/* 플로팅 버튼 */}
      {!isOpen && (
        <AIChatButton onClick={handleToggle} position={config?.position ?? 'bottom-right'} />
      )}

      {/* 채팅창 */}
      {isOpen && (
        <AIChatWindow
          messages={messages}
          isLoading={isStreaming}
          onClose={handleClose}
          onNewChat={handleNewChat}
          onSendMessage={handleSendMessage}
          position={config?.position ?? 'bottom-right'}
        />
      )}
    </>
  );
}

/**
 * 시스템 프롬프트 생성
 */
function buildSystemPrompt(
  pageContext: ReturnType<typeof usePageContext>,
  customPrompt?: string
): string {
  const basePrompt = `당신은 IDEA on Action의 AI 어시스턴트입니다.
사용자가 IDEA on Action의 서비스, 프로젝트, 기술 스택에 대해 질문하면 친절하고 정확하게 답변해주세요.

회사 정보:
- 회사명: 생각과행동 (IdeaonAction)
- 비전: "생각을 멈추지 않고, 행동으로 옮기는 회사"
- 슬로건: KEEP AWAKE, LIVE PASSIONATE
- 웹사이트: https://www.ideaonaction.ai/

서비스 라인업:
1. **Minu Find** (사업기회 탐색): 시장 분석, 경쟁사 리서치, 트렌드 분석
2. **Minu Frame** (문제정의 & RFP): 요구사항 정의, RFP 작성, 제안서 준비
3. **Minu Build** (프로젝트 진행): MVP/풀스택 개발, 디자인, 프로젝트 관리
4. **Minu Keep** (운영/유지보수): 모니터링, 버그 수정, 기능 개선

기술 스택:
- 프론트엔드: React, TypeScript, Vite, Tailwind CSS
- 백엔드: Supabase (PostgreSQL, Edge Functions)
- AI 통합: Claude API (Anthropic)
- 인프라: Vercel, PWA`;

  // 페이지 컨텍스트 추가
  let contextPrompt = `\n\n현재 페이지: ${pageContext.path}`;
  if (pageContext.pageType === 'service' && pageContext.serviceName) {
    contextPrompt += `\n서비스: ${pageContext.serviceName}`;
  }

  // 커스텀 프롬프트 추가
  const finalPrompt = customPrompt
    ? `${basePrompt}${contextPrompt}\n\n${customPrompt}`
    : `${basePrompt}${contextPrompt}`;

  return finalPrompt;
}
