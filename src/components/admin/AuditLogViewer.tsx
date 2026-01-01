/**
 * AuditLogViewer Component - v2.36.0
 * 감사 로그 뷰어 (관리자 전용)
 *
 * 기능:
 * - 날짜 범위 필터
 * - 이벤트 타입 필터
 * - 사용자 필터
 * - 페이지네이션
 * - 상세 보기 모달
 * - 실시간 업데이트
 * - 내보내기 (JSON, CSV)
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ScrollText,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Activity,
  Clock,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

import { useAuditLogs, useAuditLog } from '@/hooks/analytics/useAuditLogs';
import type {
  AuditLogFilters,
  AuditLogPagination,
  AuditAction,
  EventType,
  ActorType,
  AuditLogWithUser,
} from '@/types/audit.types';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** 액션별 뱃지 색상 */
const ACTION_BADGE_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-500 hover:bg-green-600',
  read: 'bg-blue-500 hover:bg-blue-600',
  update: 'bg-yellow-500 hover:bg-yellow-600',
  delete: 'bg-red-500 hover:bg-red-600',
  login: 'bg-purple-500 hover:bg-purple-600',
  logout: 'bg-gray-500 hover:bg-gray-600',
  grant: 'bg-emerald-500 hover:bg-emerald-600',
  revoke: 'bg-orange-500 hover:bg-orange-600',
  cancel: 'bg-pink-500 hover:bg-pink-600',
  refund: 'bg-amber-500 hover:bg-amber-600',
};

/** 액터 타입별 아이콘 색상 */
const ACTOR_TYPE_COLORS: Record<ActorType, string> = {
  user: 'text-blue-600',
  admin: 'text-purple-600',
  system: 'text-green-600',
  service: 'text-orange-600',
};

// ============================================================================
// Main Component
// ============================================================================

export function AuditLogViewer() {
  // ========== State Management ==========
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 0,
    pageSize: 50,
  });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // ========== Data Fetching ==========
  const { data: logsData, isLoading, refetch } = useAuditLogs(filters, pagination);
  const { data: selectedLog } = useAuditLog(selectedLogId || '');

  // ========== Handlers ==========

  /** 필터 변경 핸들러 */
  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPagination((prev) => ({ ...prev, page: 0 })); // 필터 변경 시 첫 페이지로
  };

  /** 날짜 범위 적용 */
  const applyDateRange = () => {
    setFilters((prev) => ({
      ...prev,
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined,
    }));
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  /** 필터 초기화 */
  const resetFilters = () => {
    setFilters({});
    setDateRange({ start: '', end: '' });
    setPagination({ page: 0, pageSize: 50 });
  };

  /** 페이지 변경 */
  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  /** JSON 내보내기 */
  const exportToJSON = () => {
    if (!logsData?.logs) return;

    const dataStr = JSON.stringify(logsData.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /** CSV 내보내기 */
  const exportToCSV = () => {
    if (!logsData?.logs) return;

    const headers = ['시간', '이벤트', '액션', '사용자', '리소스', 'IP'];
    const rows = logsData.logs.map((log) => [
      new Date(log.created_at).toLocaleString('ko-KR'),
      log.event_type,
      log.action,
      log.actor?.email || '-',
      `${log.resource_type || '-'}/${log.resource_id?.substring(0, 8) || '-'}`,
      log.ip_address || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ========== Render ==========

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ScrollText className="w-8 h-8" />
            감사 로그
          </h1>
          <p className="text-muted-foreground mt-1">
            모든 중요 이벤트를 추적하고 모니터링합니다
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={exportToJSON}>
            <FileJson className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터
          </CardTitle>
          <CardDescription>검색 조건을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 이벤트 타입 */}
            <div className="space-y-2">
              <Label htmlFor="event-type" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                이벤트 타입
              </Label>
              <Select
                value={filters.event_type || 'all'}
                onValueChange={(v) => handleFilterChange('event_type', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="user.login">로그인</SelectItem>
                  <SelectItem value="user.logout">로그아웃</SelectItem>
                  <SelectItem value="subscription.created">구독 생성</SelectItem>
                  <SelectItem value="subscription.cancelled">구독 취소</SelectItem>
                  <SelectItem value="payment.succeeded">결제 성공</SelectItem>
                  <SelectItem value="payment.refunded">환불</SelectItem>
                  <SelectItem value="team.member_added">팀 멤버 추가</SelectItem>
                  <SelectItem value="permission.granted">권한 부여</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 액션 */}
            <div className="space-y-2">
              <Label htmlFor="action">액션</Label>
              <Select
                value={filters.action || 'all'}
                onValueChange={(v) => handleFilterChange('action', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="create">생성</SelectItem>
                  <SelectItem value="read">조회</SelectItem>
                  <SelectItem value="update">수정</SelectItem>
                  <SelectItem value="delete">삭제</SelectItem>
                  <SelectItem value="login">로그인</SelectItem>
                  <SelectItem value="logout">로그아웃</SelectItem>
                  <SelectItem value="grant">권한 부여</SelectItem>
                  <SelectItem value="revoke">권한 회수</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 액터 타입 */}
            <div className="space-y-2">
              <Label htmlFor="actor-type" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                액터 타입
              </Label>
              <Select
                value={filters.actor_type || 'all'}
                onValueChange={(v) => handleFilterChange('actor_type', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="actor-type">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="user">사용자</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                  <SelectItem value="service">서비스</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 리소스 타입 */}
            <div className="space-y-2">
              <Label htmlFor="resource-type">리소스 타입</Label>
              <Select
                value={filters.resource_type || 'all'}
                onValueChange={(v) => handleFilterChange('resource_type', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="resource-type">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="user">사용자</SelectItem>
                  <SelectItem value="subscription">구독</SelectItem>
                  <SelectItem value="payment">결제</SelectItem>
                  <SelectItem value="team">팀</SelectItem>
                  <SelectItem value="service">서비스</SelectItem>
                  <SelectItem value="order">주문</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 시작 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                시작 날짜
              </Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>

            {/* 종료 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="end-date">종료 날짜</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
            </div>

            {/* 날짜 적용 버튼 */}
            <div className="space-y-2 flex items-end">
              <Button onClick={applyDateRange} className="w-full">
                날짜 적용
              </Button>
            </div>

            {/* 초기화 버튼 */}
            <div className="space-y-2 flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              결과 ({logsData?.total || 0}건)
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              페이지 {pagination.page + 1} / {logsData?.totalPages || 1}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !logsData?.logs || logsData.logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>조건에 맞는 감사 로그가 없습니다</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>이벤트</TableHead>
                    <TableHead>액션</TableHead>
                    <TableHead>액터</TableHead>
                    <TableHead>리소스</TableHead>
                    <TableHead>IP 주소</TableHead>
                    <TableHead className="text-right">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.event_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-white',
                            ACTION_BADGE_COLORS[log.action as AuditAction]
                          )}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className={cn('w-4 h-4', ACTOR_TYPE_COLORS[log.actor_type])} />
                          <span className="text-sm">
                            {log.actor?.email || log.actor_id?.substring(0, 8) || '알 수 없음'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.resource_type || '-'} / {log.resource_id?.substring(0, 8) || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{log.ip_address || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogId(log.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {logsData.logs.length}개 표시 중 (전체 {logsData.total}개)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= (logsData.totalPages || 1) - 1}
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLogId} onOpenChange={(open) => !open && setSelectedLogId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>감사 로그 상세</DialogTitle>
            <DialogDescription>
              ID: {selectedLogId?.substring(0, 16)}...
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">이벤트 타입</Label>
                  <p className="font-mono text-sm mt-1">{selectedLog.event_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">액션</Label>
                  <Badge
                    className={cn(
                      'mt-1 text-white',
                      ACTION_BADGE_COLORS[selectedLog.action as AuditAction]
                    )}
                  >
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">액터</Label>
                  <p className="text-sm mt-1">
                    {selectedLog.actor?.email || '알 수 없음'} ({selectedLog.actor_type})
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">시간</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedLog.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">리소스</Label>
                  <p className="font-mono text-sm mt-1">
                    {selectedLog.resource_type || '-'} / {selectedLog.resource_id || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP 주소</Label>
                  <p className="text-sm mt-1">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">변경사항</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mt-1">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">메타데이터</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mt-1">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogViewer;
