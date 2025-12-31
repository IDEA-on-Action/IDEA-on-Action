import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIChatButton } from './AIChatButton';
import { AIChatWindow } from './AIChatWindow';
import { AIChatToolStatus } from './AIChatToolStatus';
import { AIChatSidePanel } from './AIChatSidePanel';
import { useClaudeStreaming } from '@/hooks/useClaudeStreaming';
import { useClaudeTools } from '@/hooks/useClaudeTools';
import { useA2UI } from '@/hooks/useA2UI';
// useConversationManager 제거 - 현재 사용하지 않으며 불필요한 API 호출 발생
// @see BL-AI-002 대화 컨텍스트 관리 기능은 RLS 정책 수정 후 재활성화 예정
// import { useConversationManager } from '@/hooks/useConversationManager';
import { useAuth } from '@/hooks/useAuth';
import { usePageContext } from '@/hooks/usePageContext';
import type { AIChatMessage, AIChatConfig, AIChatA2UIBlock } from '@/types/ai-chat-widget.types';
import type { ClaudeToolUseBlock, ClaudeToolResultBlock } from '@/types/claude.types';
import type { A2UIUserAction } from '@/lib/a2ui/types';
import type { RenderUIToolResult } from '@/lib/claude/tools/render-ui.tool';

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
  const [executingTool, setExecutingTool] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const pageContext = usePageContext();

  // A2UI 상태 관리
  const {
    sidePanel,
    openSidePanel,
    closeSidePanel,
    handleAction: handleA2UIAction,
    getFormData,
    updateSidePanelFormData,
  } = useA2UI({
    onAction: (action) => {
      console.log('[AIChatWidget] A2UI 액션:', action);
      handleA2UIActionCallback(action);
    },
  });

  // 액션 피드백 처리 (useCallback으로 감싸서 의존성 관리)
  const handleA2UIActionCallback = useCallback((action: A2UIUserAction) => {
    // navigate 액션: 페이지 이동
    if (action.action === 'navigate') {
      const path = action.data?.path as string;
      if (path) {
        navigate(path);
        return;
      }
    }

    // submit 액션: 폼 데이터 수집 후 Claude에게 전달
    if (action.action === 'submit') {
      const surfaceId = action.data?.surfaceId as string;
      const formData = surfaceId ? getFormData(surfaceId) : sidePanel.formData;

      // Claude에게 폼 제출 결과 전달
      const feedbackMessage = `[A2UI 폼 제출] ${action.data?.formName || '폼'}\n\n제출된 데이터:\n${JSON.stringify(formData, null, 2)}`;

      // 사용자 메시지로 추가하여 Claude에게 전달
      const userMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: feedbackMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // AI 응답 준비
      const assistantMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Claude API 호출
      claudeSendMessageRef.current?.(feedbackMessage);
      return;
    }

    // cancel 액션: 사이드 패널 닫기
    if (action.action === 'cancel') {
      closeSidePanel();
      return;
    }

    // 기타 액션: Claude에게 알림
    if (['view_issue', 'view_event', 'view_project', 'view_service', 'create_issue', 'create_event'].includes(action.action)) {
      const feedbackMessage = `[A2UI 액션] ${action.action}\n\n데이터: ${JSON.stringify(action.data, null, 2)}`;

      const userMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: feedbackMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      claudeSendMessageRef.current?.(feedbackMessage);
    }
  }, [navigate, getFormData, sidePanel.formData, closeSidePanel]);

  // Tool Use 기능 활성화 여부 (Feature Flag)
  const isToolUseEnabled = import.meta.env.VITE_FEATURE_TOOL_USE === 'true';

  // Claude Tools 훅
  const { tools, executeTool } = useClaudeTools();

  // Tool Use 콜백: 도구 실행 요청 처리
  const handleToolUse = useCallback(
    async (toolUses: ClaudeToolUseBlock[]): Promise<ClaudeToolResultBlock[]> => {
      const results: ClaudeToolResultBlock[] = [];

      for (const toolUse of toolUses) {
        setExecutingTool(toolUse.name);
        console.log(`[AIChatWidget] 도구 실행: ${toolUse.name}`, toolUse.input);

        try {
          const result = await executeTool({ toolUse });
          results.push(result);

          // render_ui 결과 처리: A2UI 블록을 메시지에 추가하거나 사이드 패널 열기
          if (toolUse.name === 'render_ui' && result.content) {
            try {
              const a2uiResult = JSON.parse(result.content as string) as RenderUIToolResult;

              if (a2uiResult.type === 'a2ui' && a2uiResult.success) {
                if (a2uiResult.surfaceType === 'sidePanel') {
                  // 사이드 패널 열기
                  openSidePanel(
                    a2uiResult.message,
                    (a2uiResult.message.data?.title as string) || '상세 정보',
                    (a2uiResult.message.data?.size as 'sm' | 'md' | 'lg' | 'xl') || 'md'
                  );
                } else {
                  // 인라인: 마지막 assistant 메시지에 a2uiBlocks 추가
                  const a2uiBlock: AIChatA2UIBlock = {
                    id: a2uiResult.message.surfaceId,
                    message: a2uiResult.message,
                  };

                  setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant') {
                      return [
                        ...prev.slice(0, -1),
                        {
                          ...lastMessage,
                          a2uiBlocks: [...(lastMessage.a2uiBlocks || []), a2uiBlock],
                        },
                      ];
                    }
                    return prev;
                  });
                }
              }
            } catch (parseError) {
              console.warn('[AIChatWidget] A2UI 결과 파싱 실패:', parseError);
            }
          }
        } catch (error) {
          console.error(`[AIChatWidget] 도구 실행 실패: ${toolUse.name}`, error);
          // 에러 발생 시 에러 결과 반환
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `도구 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            is_error: true,
          });
        }
      }

      setExecutingTool(null);
      return results;
    },
    [executeTool, openSidePanel]
  );

  // Claude Streaming 훅
  const {
    state: claudeState,
    sendMessage: claudeSendMessage,
    isStreaming,
    clearConversation: resetClaude,
  } = useClaudeStreaming({
    systemPrompt: buildSystemPrompt(pageContext, config?.systemPrompt),
    // Tool Use 옵션 (Feature Flag로 제어)
    enableTools: isToolUseEnabled,
    tools: isToolUseEnabled ? tools : undefined,
    toolChoice: isToolUseEnabled ? { type: 'auto' } : undefined,
    onToolUse: isToolUseEnabled ? handleToolUse : undefined,
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

  // claudeSendMessage를 ref로 저장 (콜백에서 사용하기 위해)
  const claudeSendMessageRef = useRef(claudeSendMessage);
  useEffect(() => {
    claudeSendMessageRef.current = claudeSendMessage;
  }, [claudeSendMessage]);

  // Conversation Manager 비활성화 - 403 오류 방지 (ai_conversations RLS)
  // @see BL-AI-002 대화 컨텍스트 관리 기능은 RLS 정책 수정 후 재활성화 예정
  // const conversationManager = useConversationManager();

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

        // 로그인한 경우 대화 저장 (선택적)
        // Note: 대화 저장 기능은 사용자 요청 시 활성화 가능
        // if (user && conversationManager.createConversation) {
        //   await conversationManager.createConversation({
        //     title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        //     messages: [...messages, userMessage, assistantMessage],
        //     context: pageContext,
        //   });
        // }
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
    [claudeSendMessage]
  );

  // 페이지 변경 시 시스템 프롬프트 업데이트
  // Note: 현재 useClaudeStreaming은 systemPrompt를 초기화 시점에만 설정합니다.
  // 동적 업데이트가 필요한 경우 대화를 초기화하거나,
  // useClaudeStreaming에 setSystemPrompt API를 추가해야 합니다.
  useEffect(() => {
    // 페이지 컨텍스트가 변경되면 새 대화 시작 권장
    // (자동 초기화는 사용자 경험을 해칠 수 있어 수동 초기화 권장)
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
          executingTool={executingTool}
          onA2UIAction={handleA2UIAction}
        />
      )}

      {/* A2UI 사이드 패널 */}
      <AIChatSidePanel
        isOpen={sidePanel.isOpen}
        onClose={closeSidePanel}
        message={sidePanel.message}
        title={sidePanel.title}
        size={sidePanel.size}
        onAction={handleA2UIAction}
        formData={sidePanel.formData}
        onFormValueChange={updateSidePanelFormData}
      />
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
