/**
 * 대화 컨텍스트 관리 예제 페이지
 *
 * ConversationList와 ConversationDetail 컴포넌트 사용 예제
 *
 * @module pages/examples/ConversationContextExample
 */

import * as React from 'react';
import { ConversationList } from '@/components/ai/ConversationList';
import { ConversationDetail } from '@/components/ai/ConversationDetail';
import type {
  ConversationSessionWithStats,
  ConversationMessage,
  ConversationStatus,
} from '@/types/conversation-context.types';

// ============================================================================
// 더미 데이터 (실제로는 useConversationManager 훅 사용)
// ============================================================================

const dummyConversations: ConversationSessionWithStats[] = [
  {
    id: '1',
    userId: 'user-1',
    title: 'React 컴포넌트 설계 상담',
    systemPrompt: null,
    templateId: null,
    status: 'active',
    totalTokens: 15240,
    parentSessionId: null,
    forkIndex: null,
    summary: null,
    metadata: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
    messageCount: 12,
  },
  {
    id: '2',
    userId: 'user-1',
    title: 'TypeScript 타입 시스템 질문',
    systemPrompt: null,
    templateId: null,
    status: 'active',
    totalTokens: 8500,
    parentSessionId: null,
    forkIndex: null,
    summary: null,
    metadata: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messageCount: 8,
  },
  {
    id: '3',
    userId: 'user-1',
    title: 'API 설계 패턴 논의',
    systemPrompt: null,
    templateId: null,
    status: 'archived',
    totalTokens: 25000,
    parentSessionId: null,
    forkIndex: null,
    summary: 'RESTful API 설계 원칙과 GraphQL 비교 논의',
    metadata: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messageCount: 18,
  },
];

const dummyMessages: ConversationMessage[] = [
  {
    id: 'msg-1',
    sessionId: '1',
    role: 'user',
    content: 'React 함수 컴포넌트에서 상태 관리를 어떻게 하는 것이 좋을까요?',
    sequence: 1,
    tokenCount: null,
    model: null,
    isSummarized: false,
    metadata: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'msg-2',
    sessionId: '1',
    role: 'assistant',
    content:
      'React 함수 컴포넌트에서 상태 관리는 여러 방법이 있습니다:\n\n1. **useState**: 간단한 로컬 상태\n2. **useReducer**: 복잡한 상태 로직\n3. **Context API**: 전역 상태 공유\n4. **외부 라이브러리**: Zustand, Redux, Jotai 등\n\n어떤 방식을 사용하시나요?',
    sequence: 2,
    tokenCount: 1250,
    model: 'claude-3-5-sonnet-20241022',
    isSummarized: false,
    metadata: null,
    createdAt: new Date(Date.now() - 3540000).toISOString(),
  },
  {
    id: 'msg-3',
    sessionId: '1',
    role: 'user',
    content: 'Context API를 사용 중인데, 리렌더링이 많이 발생하는 것 같아요.',
    sequence: 3,
    tokenCount: null,
    model: null,
    isSummarized: false,
    metadata: null,
    createdAt: new Date(Date.now() - 3480000).toISOString(),
  },
  {
    id: 'msg-4',
    sessionId: '1',
    role: 'assistant',
    content:
      'Context API의 리렌더링 문제는 흔한 이슈입니다. 해결 방법:\n\n1. **Context 분리**: 자주 변경되는 상태와 정적 상태를 분리\n2. **useMemo/useCallback**: 메모이제이션으로 불필요한 재생성 방지\n3. **컴포넌트 분할**: Context를 사용하는 부분만 별도 컴포넌트로\n\n예제 코드를 보여드릴까요?',
    sequence: 4,
    tokenCount: 1450,
    model: 'claude-3-5-sonnet-20241022',
    isSummarized: false,
    metadata: null,
    createdAt: new Date(Date.now() - 3420000).toISOString(),
  },
];

// ============================================================================
// 예제 페이지 컴포넌트
// ============================================================================

export function ConversationContextExample() {
  const [selectedConversationId, setSelectedConversationId] = React.useState<string>('1');
  const [filter, setFilter] = React.useState<ConversationStatus>('active');
  const [isLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  // 선택된 대화 찾기
  const selectedConversation = dummyConversations.find((c) => c.id === selectedConversationId) || null;

  // 선택된 대화의 메시지 (실제로는 API 호출)
  const messages = selectedConversationId === '1' ? dummyMessages : [];

  // 새 대화 시작 핸들러
  const handleNewConversation = () => {
    console.log('새 대화 시작');
    // 실제 구현: API 호출하여 새 세션 생성
  };

  // 대화 선택 핸들러
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  // 메시지 전송 핸들러
  const handleSendMessage = async (content: string) => {
    console.log('메시지 전송:', content);
    setIsSending(true);

    // 실제 구현: API 호출하여 Claude에게 메시지 전송
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSending(false);
  };

  // 포크 핸들러
  const handleFork = () => {
    console.log('대화 포크:', selectedConversationId);
    // 실제 구현: API 호출하여 대화 포크
  };

  // 내보내기 핸들러
  const handleExport = (format: 'markdown' | 'json' | 'html') => {
    console.log('내보내기:', format);
    // 실제 구현: API 호출하여 대화 내보내기
  };

  // 요약 생성 핸들러
  const handleCreateSummary = () => {
    console.log('요약 생성:', selectedConversationId);
    // 실제 구현: API 호출하여 컨텍스트 요약
  };

  return (
    <div className="container mx-auto py-8">
      {/* 페이지 헤더 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">대화 컨텍스트 관리</h1>
        <p className="text-muted-foreground">
          Claude와의 대화를 세션별로 관리하고, 포크/내보내기/요약 기능을 활용하세요.
        </p>
      </header>

      {/* 레이아웃: 좌측 목록, 우측 상세 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* 대화 목록 */}
        <div className="lg:col-span-4 h-full">
          <ConversationList
            conversations={dummyConversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            isLoading={isLoading}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* 대화 상세 */}
        <div className="lg:col-span-8 h-full">
          <ConversationDetail
            conversation={selectedConversation}
            messages={messages}
            isLoading={isLoading}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            onFork={handleFork}
            onExport={handleExport}
            onCreateSummary={handleCreateSummary}
          />
        </div>
      </div>

      {/* 사용 방법 안내 */}
      <footer className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-3">사용 방법</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• 좌측에서 대화 세션을 선택하면 우측에 메시지가 표시됩니다</li>
          <li>• "새 대화" 버튼으로 새로운 세션을 시작할 수 있습니다</li>
          <li>• 각 대화는 "활성"과 "보관" 탭으로 필터링됩니다</li>
          <li>• 대화 아이템의 메뉴(⋮)에서 포크/아카이브/삭제 가능</li>
          <li>• 메시지가 10개 이상이면 컨텍스트 요약을 권장합니다</li>
          <li>• 우측 상단의 "내보내기" 버튼으로 Markdown/JSON/HTML 형식 다운로드</li>
        </ul>
      </footer>
    </div>
  );
}

export default ConversationContextExample;
