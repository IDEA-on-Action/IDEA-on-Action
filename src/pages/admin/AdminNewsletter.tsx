/**
 * AdminNewsletter
 *
 * 뉴스레터 구독자 관리 페이지 (관리자 전용)
 *
 * 기능:
 * - 구독자 목록 조회 (페이지네이션)
 * - 상태별 필터링 (pending/confirmed/unsubscribed)
 * - 이메일 검색
 * - 구독자 상태 변경
 * - 구독자 삭제 (GDPR 준수)
 * - 통계 대시보드
 *
 * @module AdminNewsletter
 */

import { useState, useMemo } from 'react';
import {
  useNewsletterSubscribers,
  useNewsletterAdminStats,
  useUpdateSubscriberStatus,
  useDeleteSubscriber,
  useExportNewsletterCSV,
} from '@/hooks/useNewsletterAdmin';
import type {
  NewsletterSubscriber,
  NewsletterStatus,
} from '@/types/newsletter.types';
import {
  NEWSLETTER_STATUS_COLORS,
  NEWSLETTER_STATUS_LABELS,
  SUBSCRIPTION_SOURCE_LABELS,
} from '@/types/newsletter.types';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  Mail,
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

/**
 * AdminNewsletter 페이지 컴포넌트
 */
export default function AdminNewsletter() {
  // ============================================
  // State Management
  // ============================================

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const itemsPerPage = 50;

  // ============================================
  // Data Fetching
  // ============================================

  const { data: statsData, isLoading: statsLoading } = useNewsletterAdminStats();

  const { data: subscribersResponse, isLoading: subscribersLoading } =
    useNewsletterSubscribers({
      status: statusFilter,
      search: search || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      orderBy: 'subscribed_at',
      orderDirection: 'desc',
    });

  const subscribers = subscribersResponse?.data || [];
  const totalCount = subscribersResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ============================================
  // Mutations
  // ============================================

  const updateStatus = useUpdateSubscriberStatus();
  const deleteSubscriber = useDeleteSubscriber();
  const exportCSV = useExportNewsletterCSV();

  // ============================================
  // Handlers
  // ============================================

  const handleStatusChange = async (id: string, status: NewsletterStatus) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSubscriber.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // Computed Values
  // ============================================

  const stats = useMemo(() => {
    if (!statsData) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        unsubscribed: 0,
        growth: { daily: 0 },
        churn_rate: 0,
      };
    }
    return statsData;
  }, [statsData]);

  const isLoading = subscribersLoading || statsLoading;

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
          <p className="text-muted-foreground mt-2">
            뉴스레터 구독자를 관리하고 통계를 확인하세요
          </p>
        </div>
        
        {/* Export Button */}
        <Button
          variant="outline"
          onClick={() => {
            const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
            const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
            exportCSV.mutateAsync({
              status: statusFilter,
              search: search || undefined,
              dateFrom,
              dateTo
            });
          }}
          disabled={exportCSV.isPending || subscribers.length === 0}
        >
          {exportCSV.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              내보내는 중...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              CSV 내보내기
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Subscribers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 구독자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats.growth.daily > 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{stats.growth.daily}</span>
                  <span className="ml-1">오늘</span>
                </>
              ) : (
                <span>변동 없음</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Confirmed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">확인 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0
                ? `${((stats.confirmed / stats.total) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">확인 대기</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              이메일 확인 필요
            </p>
          </CardContent>
        </Card>

        {/* Unsubscribed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">구독 취소</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unsubscribed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats.churn_rate > 0 ? (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{stats.churn_rate.toFixed(1)}%</span>
                  <span className="ml-1">이탈률</span>
                </>
              ) : (
                <span>이탈 없음</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>구독자 목록</CardTitle>
          <CardDescription>
            총 {totalCount.toLocaleString()}명의 구독자
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이메일 주소 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to first page
                  }}
                  className="pl-8"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as NewsletterStatus | 'all');
                  setCurrentPage(1); // Reset to first page
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">확인 대기</SelectItem>
                  <SelectItem value="confirmed">확인 완료</SelectItem>
                  <SelectItem value="unsubscribed">구독 취소</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Picker */}
              <DateRangePicker
                date={dateRange}
                onDateChange={(range) => {
                  setDateRange(range);
                  setCurrentPage(1); // Reset to first page
                }}
                placeholder="날짜 범위 선택"
                className="w-full sm:w-[280px]"
              />
            </div>

            {/* Clear Filters Button */}
            {(search || statusFilter !== 'all' || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setDateRange(undefined);
                  setCurrentPage(1);
                }}
                className="w-fit"
              >
                <XCircle className="mr-2 h-4 w-4" />
                필터 초기화
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">로딩 중...</p>
              </div>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'all'
                    ? '검색 결과가 없습니다'
                    : '구독자가 없습니다'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>구독일</TableHead>
                      <TableHead>구독 경로</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        {/* Email */}
                        <TableCell className="font-medium">
                          {subscriber.email}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={NEWSLETTER_STATUS_COLORS[subscriber.status]}
                          >
                            {NEWSLETTER_STATUS_LABELS[subscriber.status]}
                          </Badge>
                        </TableCell>

                        {/* Subscribed Date */}
                        <TableCell className="text-muted-foreground">
                          {new Date(subscriber.subscribed_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>

                        {/* Source */}
                        <TableCell className="text-muted-foreground">
                          {subscriber.metadata?.source
                            ? SUBSCRIPTION_SOURCE_LABELS[subscriber.metadata.source]
                            : '-'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>액션</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Status Change Options */}
                              {subscriber.status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(subscriber.id, 'confirmed')
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  확인 완료로 변경
                                </DropdownMenuItem>
                              )}

                              {subscriber.status === 'confirmed' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(subscriber.id, 'unsubscribed')
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                                  구독 취소로 변경
                                </DropdownMenuItem>
                              )}

                              {subscriber.status === 'unsubscribed' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(subscriber.id, 'confirmed')
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  확인 완료로 복구
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Delete */}
                              <DropdownMenuItem
                                onClick={() => setDeleteId(subscriber.id)}
                                className="text-red-600"
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                삭제 (GDPR)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    페이지 {currentPage} / {totalPages} (전체 {totalCount.toLocaleString()}
                    명)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독자 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 구독자 정보가 영구적으로 삭제됩니다.
              <br />
              <br />
              <strong>GDPR 준수:</strong> 사용자가 데이터 삭제를 요청한 경우에만 이 기능을
              사용하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
