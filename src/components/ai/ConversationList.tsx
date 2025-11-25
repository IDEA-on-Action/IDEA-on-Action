/**
 * 대화 목록 컴포넌트
 *
 * 기능:
 * - 대화 세션 목록 표시 (최근 활동순 정렬)
 * - 상태별 필터링 (active/archived)
 * - 새 대화 시작 버튼
 * - 대화 아카이브/삭제/포크 액션
 *
 * @module components/ai/ConversationList
 */

import * as React from 'react';
import { Plus, Archive, Trash2, GitBranch, MessageSquare, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ConversationSessionWithStats, ConversationStatus } from '@/types/conversation-context.types';

// ============================================================================
// Types
// ============================================================================

interface ConversationItemProps {
  conversation: ConversationSessionWithStats;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFork?: (id: string) => void;
}

interface ConversationListProps {
  conversations?: ConversationSessionWithStats[];
  selectedConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  isLoading?: boolean;
  filter?: ConversationStatus;
  onFilterChange?: (filter: ConversationStatus) => void;
}

// ============================================================================
// ConversationItem Component
// ============================================================================

function ConversationItem({
  conversation,
  isSelected = false,
  onClick,
  onArchive,
  onDelete,
  onFork,
}: ConversationItemProps) {
  const handleClick = () => {
    onClick?.(conversation.id);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(conversation.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(conversation.id);
  };

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFork?.(conversation.id);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 토큰 포맷팅
  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString();
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-all hover:bg-accent/50',
        isSelected && 'bg-accent border-primary'
      )}
      onClick={handleClick}
    >
      {/* 제목 및 액션 버튼 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{conversation.title}</h4>
          {conversation.parentSessionId && (
            <Badge variant="outline" className="mt-1">
              <GitBranch className="w-3 h-3 mr-1" />
              포크됨
            </Badge>
          )}
        </div>

        {/* 액션 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
              <span className="sr-only">메뉴 열기</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleFork}>
              <GitBranch className="w-4 h-4 mr-2" />
              대화 포크
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {conversation.status === 'archived' ? '활성화' : '아카이브'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 메타데이터 */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {conversation.messageCount}개
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {formatTokens(conversation.totalTokens)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(conversation.updatedAt)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// ConversationList Component
// ============================================================================

export function ConversationList({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading = false,
  filter = 'active',
  onFilterChange,
}: ConversationListProps) {
  // 상태별 필터링
  const activeConversations = conversations.filter((c) => c.status === 'active');
  const archivedConversations = conversations.filter((c) => c.status === 'archived');

  // 현재 탭에 따른 대화 목록
  const displayConversations = filter === 'active' ? activeConversations : archivedConversations;

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    onFilterChange?.(value as ConversationStatus);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">대화 목록</CardTitle>
        <Button size="sm" onClick={onNewConversation} className="h-8">
          <Plus className="w-4 h-4 mr-1" />
          새 대화
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <Tabs value={filter} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          {/* 탭 헤더 */}
          <div className="px-6 pb-4">
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1">
                활성 ({activeConversations.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1">
                보관 ({archivedConversations.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 탭 컨텐츠 */}
          <TabsContent value="active" className="flex-1 m-0 px-6 pb-6 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    로딩 중...
                  </div>
                ) : displayConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      활성 대화가 없습니다.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      새 대화를 시작해보세요!
                    </p>
                  </div>
                ) : (
                  displayConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversationId === conversation.id}
                      onClick={onSelectConversation}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="archived" className="flex-1 m-0 px-6 pb-6 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    로딩 중...
                  </div>
                ) : displayConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Archive className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      보관된 대화가 없습니다.
                    </p>
                  </div>
                ) : (
                  displayConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversationId === conversation.id}
                      onClick={onSelectConversation}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ConversationList;
