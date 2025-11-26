/**
 * useConversationManager Hook
 *
 * 대화 컨텍스트 관리를 위한 통합 React Hook
 * - 대화 세션 CRUD (React Query)
 * - 메시지 관리
 * - 컨텍스트 요약 (Claude API)
 * - 대화 포크 및 내보내기
 *
 * @module hooks/useConversationManager
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { devError } from '@/lib/errors';
import type {
  ConversationSession,
  ConversationSessionDB,
  ConversationMessage,
  ConversationMessageDB,
  ConversationSessionWithStats,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
  ConversationFilters,
  ConversationsResponse,
  MessagesResponse,
  SummarizeContextInput,
  SummarizeContextResult,
  ForkConversationInput,
  ForkConversationResult,
  ExportMarkdownResult,
  UseConversationManagerResult,
  dbToConversationSession,
  dbToConversationMessage,
  conversationSessionToDb,
} from '@/types/conversation-context.types';

// 타입 변환 함수 임포트
import {
  dbToConversationSession as convertDbToSession,
  dbToConversationMessage as convertDbToMessage,
  conversationSessionToDb as convertSessionToDb,
} from '@/types/conversation-context.types';

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_LIMIT = 20;
const DEFAULT_MESSAGE_LIMIT = 100;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 인증 토큰 가져오기
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (err) {
    devError(err, { operation: '인증 토큰 가져오기' });
    return null;
  }
}

/**
 * 현재 사용자 ID 가져오기
 */
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  return user.id;
}

/**
 * 기본 세션 제목 생성
 */
function generateDefaultTitle(): string {
  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `새 대화 ${date}`;
}

/**
 * 토큰 수 추정 (간단한 휴리스틱)
 */
function estimateTokenCount(text: string): number {
  // 평균적으로 1 토큰 ≈ 4 글자
  return Math.ceil(text.length / 4);
}

// ============================================================================
// React Query 키
// ============================================================================

const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: ConversationFilters) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (sessionId: string) => [...conversationKeys.all, 'messages', sessionId] as const,
};

// ============================================================================
// 대화 세션 조회 훅
// ============================================================================

/**
 * 대화 세션 목록 조회
 *
 * @param filters - 필터 옵션
 * @returns 세션 목록 및 전체 개수
 *
 * @example
 * ```tsx
 * const { conversations, totalCount, isLoading } = useConversations({
 *   status: 'active',
 *   limit: 20,
 * });
 * ```
 */
export function useConversations(filters?: ConversationFilters) {
  return useQuery<ConversationsResponse>({
    queryKey: conversationKeys.list(filters),
    queryFn: async () => {
      // Base query with message count
      let query = supabase
        .from('ai_conversations')
        .select(
          `
          *,
          message_count:ai_messages(count)
        `,
          { count: 'exact' }
        );

      // Filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.templateId) {
        query = query.eq('template_id', filters.templateId);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Ordering
      const orderBy = filters?.orderBy || 'updated_at';
      const orderDirection = filters?.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Pagination
      const limit = filters?.limit || DEFAULT_LIMIT;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Conversations query error:', error);
        throw new Error(`세션 목록을 불러오는데 실패했습니다: ${error.message}`);
      }

      // DB 레코드를 클라이언트 객체로 변환
      const conversations: ConversationSessionWithStats[] = (data || []).map((record: unknown) => {
        const typedRecord = record as ConversationSessionDB & {
          message_count?: Array<{ count: number }>;
        };
        const session = convertDbToSession(typedRecord);
        return {
          ...session,
          messageCount: typedRecord.message_count?.[0]?.count || 0,
        };
      });

      return {
        data: conversations,
        count,
      };
    },
    staleTime: 30 * 1000, // 30초
  });
}

/**
 * 대화 세션 상세 조회
 *
 * @param sessionId - 세션 ID
 * @returns 세션 상세
 *
 * @example
 * ```tsx
 * const { conversation, isLoading } = useConversation('session-uuid');
 * ```
 */
export function useConversation(sessionId: string | null) {
  return useQuery<ConversationSession | null>({
    queryKey: conversationKeys.detail(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Conversation query error:', error);
        throw new Error(`세션을 불러오는데 실패했습니다: ${error.message}`);
      }

      return convertDbToSession(data as ConversationSessionDB);
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30초
  });
}

/**
 * 메시지 목록 조회
 *
 * @param sessionId - 세션 ID
 * @param limit - 메시지 제한 (기본 100)
 * @returns 메시지 목록
 *
 * @example
 * ```tsx
 * const { messages, isLoading } = useMessages('session-uuid');
 * ```
 */
export function useMessages(sessionId: string | null, limit?: number) {
  return useQuery<MessagesResponse>({
    queryKey: [...conversationKeys.messages(sessionId || ''), limit],
    queryFn: async () => {
      if (!sessionId) {
        return { data: [], count: 0 };
      }

      const messageLimit = limit || DEFAULT_MESSAGE_LIMIT;

      const { data, error, count } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(messageLimit);

      if (error) {
        console.error('Messages query error:', error);
        throw new Error(`메시지를 불러오는데 실패했습니다: ${error.message}`);
      }

      const messages = (data || []).map((record) =>
        convertDbToMessage(record as ConversationMessageDB)
      );

      return {
        data: messages,
        count,
      };
    },
    enabled: !!sessionId,
    staleTime: 10 * 1000, // 10초 (메시지는 더 자주 업데이트)
  });
}

// ============================================================================
// 대화 세션 CRUD Mutations
// ============================================================================

/**
 * 세션 생성
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<ConversationSession> => {
      const userId = await getCurrentUserId();

      // 프롬프트 템플릿에서 system_prompt 가져오기 (템플릿 ID가 있을 때)
      let systemPrompt = input.systemPrompt || null;
      if (input.templateId && !systemPrompt) {
        const { data: template } = await supabase
          .from('prompt_templates')
          .select('system_prompt')
          .eq('id', input.templateId)
          .single();

        if (template) {
          systemPrompt = template.system_prompt;
        }
      }

      const dbRecord: Partial<ConversationSessionDB> = {
        user_id: userId,
        title: input.title || generateDefaultTitle(),
        system_prompt: systemPrompt,
        template_id: input.templateId || null,
        status: 'active',
        total_tokens: 0,
        parent_id: null,
        fork_index: 0,
        metadata: input.metadata || null,
      };

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        console.error('Create conversation error:', error);
        throw new Error(`세션 생성에 실패했습니다: ${error.message}`);
      }

      return convertDbToSession(data as ConversationSessionDB);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

/**
 * 세션 업데이트
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateConversationInput): Promise<ConversationSession> => {
      const { id, ...updates } = input;

      const dbUpdates = convertSessionToDb(updates as Partial<ConversationSession>);

      const { data, error } = await supabase
        .from('ai_conversations')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update conversation error:', error);
        throw new Error(`세션 수정에 실패했습니다: ${error.message}`);
      }

      return convertDbToSession(data as ConversationSessionDB);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(data.id) });
    },
  });
}

/**
 * 세션 아카이브
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ status: 'archived' })
        .eq('id', sessionId);

      if (error) {
        console.error('Archive conversation error:', error);
        throw new Error(`세션 아카이브에 실패했습니다: ${error.message}`);
      }
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(sessionId) });
    },
  });
}

// ============================================================================
// 메시지 관리 Mutations
// ============================================================================

/**
 * 메시지 추가
 */
export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMessageInput): Promise<ConversationMessage> => {
      // 토큰 수 계산 (제공되지 않은 경우)
      const tokenCount = input.tokenCount || estimateTokenCount(input.content);

      const dbRecord: Partial<ConversationMessageDB> = {
        conversation_id: input.sessionId,
        role: input.role,
        content: input.content,
        token_count: tokenCount,
        model: input.model || null,
      };

      const { data, error } = await supabase
        .from('ai_messages')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        console.error('Add message error:', error);
        throw new Error(`메시지 저장에 실패했습니다: ${error.message}`);
      }

      // Note: ai_conversations의 message_count와 total_tokens는 트리거로 자동 업데이트됨

      return convertDbToMessage(data as ConversationMessageDB);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.messages(data.sessionId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(data.sessionId) });
    },
  });
}

// ============================================================================
// 컨텍스트 요약
// ============================================================================

/**
 * 컨텍스트 요약 생성
 */
export function useSummarizeContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SummarizeContextInput): Promise<SummarizeContextResult> => {
      const { sessionId, summarizeBeforeSequence } = input;

      // 메시지 조회
      const { data: messages } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .order('created_at', { ascending: true });

      if (!messages || messages.length === 0) {
        throw new Error('요약할 메시지가 없습니다.');
      }

      // 요약 대상 메시지 결정 (최근 10개는 제외)
      const cutoffSequence = summarizeBeforeSequence || messages.length - 10;
      const messagesToSummarize = messages.filter((msg) => msg.sequence < cutoffSequence);

      if (messagesToSummarize.length === 0) {
        throw new Error('요약할 메시지가 충분하지 않습니다. (최소 10개 이상 필요)');
      }

      // Claude API 호출하여 요약 생성
      const token = await getAuthToken();
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const summaryPrompt = `다음 대화를 간결하게 요약해주세요. 핵심 내용과 맥락만 포함하세요:\n\n${messagesToSummarize
        .map((msg) => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`)
        .join('\n\n')}`;

      const { data: summaryResponse, error: summaryError } = await supabase.functions.invoke(
        'claude-ai/chat',
        {
          body: {
            messages: [{ role: 'user', content: summaryPrompt }],
            max_tokens: 500,
          },
        }
      );

      if (summaryError || !summaryResponse?.success) {
        throw new Error('요약 생성에 실패했습니다.');
      }

      const summary = summaryResponse.data.content;

      // 세션 업데이트 (요약을 metadata에 저장)
      await supabase
        .from('ai_conversations')
        .update({
          metadata: supabase.rpc('jsonb_set_value', {
            target: 'metadata',
            path: '{summary}',
            value: JSON.stringify(summary),
          }),
        })
        .eq('id', sessionId);

      // 토큰 절약 추정
      const originalTokens = messagesToSummarize.reduce(
        (sum, msg) => sum + (msg.token_count || 0),
        0
      );
      const summaryTokens = estimateTokenCount(summary);
      const tokensSaved = Math.max(0, originalTokens - summaryTokens);

      return {
        summary,
        summarizedCount: messagesToSummarize.length,
        tokensSaved,
      };
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(input.sessionId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.messages(input.sessionId) });
    },
  });
}

// ============================================================================
// 대화 포크
// ============================================================================

/**
 * 대화 포크
 */
export function useForkConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ForkConversationInput): Promise<ForkConversationResult> => {
      const { parentSessionId, forkFromSequence, newTitle } = input;

      // 부모 세션 조회
      const { data: parentSession } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', parentSessionId)
        .single();

      if (!parentSession) {
        throw new Error('부모 세션을 찾을 수 없습니다.');
      }

      // fork_index 계산
      const { count } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', parentSessionId);

      const forkIndex = (count || 0) + 1;

      // 새 세션 생성
      const userId = await getCurrentUserId();

      const newSession: Partial<ConversationSessionDB> = {
        user_id: userId,
        title: newTitle || `${parentSession.title} (분기 ${forkIndex})`,
        system_prompt: parentSession.system_prompt,
        template_id: parentSession.template_id,
        status: 'active',
        total_tokens: 0,
        parent_id: parentSessionId,
        fork_index: forkIndex,
        metadata: parentSession.metadata,
      };

      const { data: createdSession, error: createError } = await supabase
        .from('ai_conversations')
        .insert(newSession)
        .select()
        .single();

      if (createError) {
        console.error('Fork conversation error:', createError);
        throw new Error(`대화 분기에 실패했습니다: ${createError.message}`);
      }

      // 메시지 복사 (forkFromSequence개까지만)
      const { data: messagesToCopy } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', parentSessionId)
        .order('created_at', { ascending: true })
        .limit(forkFromSequence);

      if (messagesToCopy && messagesToCopy.length > 0) {
        const copiedMessages = messagesToCopy.map((msg) => ({
          conversation_id: createdSession.id,
          role: msg.role,
          content: msg.content,
          content_blocks: msg.content_blocks,
          tool_use: msg.tool_use,
          tool_result: msg.tool_result,
          token_count: msg.token_count,
          model: msg.model,
          stop_reason: msg.stop_reason,
        }));

        await supabase.from('ai_messages').insert(copiedMessages);

        // Note: total_tokens는 트리거로 자동 업데이트됨
      }

      return {
        newSession: convertDbToSession(createdSession as ConversationSessionDB),
        copiedMessageCount: messagesToCopy?.length || 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

// ============================================================================
// Markdown 내보내기
// ============================================================================

/**
 * Markdown 내보내기
 */
export function useExportToMarkdown() {
  return useMutation({
    mutationFn: async (sessionId: string): Promise<ExportMarkdownResult> => {
      // 세션 조회
      const { data: session } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('세션을 찾을 수 없습니다.');
      }

      // 메시지 조회
      const { data: messages } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .order('created_at', { ascending: true });

      if (!messages || messages.length === 0) {
        throw new Error('내보낼 메시지가 없습니다.');
      }

      // Markdown 생성
      let markdown = `# ${session.title}\n\n`;
      markdown += `**생성일**: ${new Date(session.created_at).toLocaleString('ko-KR')}\n`;
      markdown += `**총 토큰**: ${session.total_tokens}\n`;
      if (session.system_prompt) {
        markdown += `**시스템 프롬프트**: ${session.system_prompt}\n`;
      }
      markdown += `\n---\n\n`;

      for (const msg of messages) {
        const role = msg.role === 'user' ? '사용자' : 'AI 어시스턴트';
        const timestamp = new Date(msg.created_at).toLocaleTimeString('ko-KR');

        markdown += `## ${role} (${timestamp})\n\n`;
        markdown += `${msg.content}\n\n`;

        if (msg.token_count) {
          markdown += `*토큰 수: ${msg.token_count}*\n\n`;
        }

        markdown += `---\n\n`;
      }

      // 파일명 생성
      const date = new Date().toISOString().split('T')[0];
      const filename = `conversation-${sessionId.slice(0, 8)}-${date}.md`;

      return {
        content: markdown,
        filename,
      };
    },
  });
}

// ============================================================================
// 통합 훅
// ============================================================================

/**
 * 대화 컨텍스트 관리 통합 훅
 *
 * @param sessionId - 현재 활성 세션 ID (선택)
 * @param filters - 세션 목록 필터 (선택)
 * @returns 통합 관리 인터페이스
 *
 * @example
 * ```tsx
 * const {
 *   conversations,
 *   conversation,
 *   messages,
 *   createConversation,
 *   addMessage,
 *   summarizeContext,
 *   forkConversation,
 *   exportToMarkdown,
 *   isLoading,
 *   error,
 * } = useConversationManager('session-uuid');
 * ```
 */
export function useConversationManager(
  sessionId: string | null = null,
  filters?: ConversationFilters
): UseConversationManagerResult {
  const [error, setError] = useState<Error | null>(null);

  // 조회 훅
  const conversationsQuery = useConversations(filters);
  const conversationQuery = useConversation(sessionId);
  const messagesQuery = useMessages(sessionId);

  // CRUD 훅
  const createMutation = useCreateConversation();
  const updateMutation = useUpdateConversation();
  const archiveMutation = useArchiveConversation();
  const addMessageMutation = useAddMessage();

  // 고급 기능 훅
  const summarizeMutation = useSummarizeContext();
  const forkMutation = useForkConversation();
  const exportMutation = useExportToMarkdown();

  // Wrapper 함수 (에러 처리 포함)
  const createConversation = useCallback(
    async (input: CreateConversationInput) => {
      try {
        setError(null);
        return await createMutation.mutateAsync(input);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('세션 생성 실패');
        setError(error);
        throw error;
      }
    },
    [createMutation]
  );

  const updateConversation = useCallback(
    async (input: UpdateConversationInput) => {
      try {
        setError(null);
        return await updateMutation.mutateAsync(input);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('세션 수정 실패');
        setError(error);
        throw error;
      }
    },
    [updateMutation]
  );

  const archiveConversation = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        await archiveMutation.mutateAsync(sessionId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('세션 아카이브 실패');
        setError(error);
        throw error;
      }
    },
    [archiveMutation]
  );

  const addMessage = useCallback(
    async (input: CreateMessageInput) => {
      try {
        setError(null);
        return await addMessageMutation.mutateAsync(input);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('메시지 저장 실패');
        setError(error);
        throw error;
      }
    },
    [addMessageMutation]
  );

  const summarizeContext = useCallback(
    async (input: SummarizeContextInput) => {
      try {
        setError(null);
        return await summarizeMutation.mutateAsync(input);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('요약 생성 실패');
        setError(error);
        throw error;
      }
    },
    [summarizeMutation]
  );

  const forkConversation = useCallback(
    async (input: ForkConversationInput) => {
      try {
        setError(null);
        return await forkMutation.mutateAsync(input);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('대화 분기 실패');
        setError(error);
        throw error;
      }
    },
    [forkMutation]
  );

  const exportToMarkdown = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        return await exportMutation.mutateAsync(sessionId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('내보내기 실패');
        setError(error);
        throw error;
      }
    },
    [exportMutation]
  );

  // 통합 로딩 상태
  const isLoading =
    conversationsQuery.isLoading ||
    conversationQuery.isLoading ||
    messagesQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    addMessageMutation.isPending ||
    summarizeMutation.isPending ||
    forkMutation.isPending ||
    exportMutation.isPending;

  return {
    // 데이터
    conversations: conversationsQuery.data?.data || [],
    conversation: conversationQuery.data || null,
    messages: messagesQuery.data?.data || [],

    // CRUD
    createConversation,
    updateConversation,
    archiveConversation,
    addMessage,

    // 고급 기능
    summarizeContext,
    forkConversation,
    exportToMarkdown,

    // 상태
    isLoading,
    error: error || conversationsQuery.error || conversationQuery.error || messagesQuery.error,
  };
}

// ============================================================================
// 내보내기
// ============================================================================

export default useConversationManager;
