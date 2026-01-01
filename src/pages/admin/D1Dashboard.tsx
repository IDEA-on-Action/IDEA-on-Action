/**
 * D1 데이터베이스 모니터링 대시보드
 *
 * Cloudflare D1 데이터베이스 상태 및 통계를 실시간으로 모니터링
 * - 테이블 목록 및 행 수
 * - 상위 테이블 차트
 * - 읽기 전용 쿼리 실행
 * - 성능 모니터링 (쿼리 통계, 시계열 데이터)
 */

import { useState, lazy, Suspense, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { useD1Monitoring } from '@/hooks/analytics/useD1Monitoring';
import { formatBytes, formatDuration, getStatusBadgeVariant } from '@/types/shared/d1-monitoring.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Table as TableIcon,
  Rows3,
  RefreshCw,
  Search,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Gauge,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// 동적 import로 Recharts 번들 분리
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));

// 차트 로딩 스켈레톤
const ChartSkeleton = () => (
  <div className="h-[200px] flex items-center justify-center">
    <Skeleton className="w-full h-full" />
  </div>
);

// Types
interface D1Stats {
  database: {
    name: string;
    region: string;
    version: string;
  };
  stats: {
    totalTables: number;
    totalRows: number;
    timestamp: string;
  };
  topTables: Array<{ name: string; rows: number }>;
  allTables: Array<{ name: string; rows: number }>;
}

interface QueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: string;
  meta?: {
    served_by: string;
    duration: number;
    changes: number;
    last_row_id: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export default function D1Dashboard() {
  const { workersTokens } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('SELECT name FROM sqlite_master WHERE type=\'table\' LIMIT 10');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // 성능 모니터링 훅
  const { metrics: perfMetrics, isLoading: perfLoading, isRefetching: perfRefetching } = useD1Monitoring({
    refetchInterval: 30000,
  });

  // 시계열 차트 데이터
  const timeSeriesData = useMemo(() => {
    if (!perfMetrics?.timeSeries) return [];
    return perfMetrics.timeSeries.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      queries: point.queries,
      avgTime: point.avgResponseTime,
      errors: point.errors,
    }));
  }, [perfMetrics?.timeSeries]);

  // D1 통계 조회
  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['d1-stats'],
    queryFn: async () => {
      const response = await callWorkersApi<D1Stats>('/api/v1/admin/d1/stats', {
        token: workersTokens?.accessToken,
        headers: {
          'X-Service-Key': import.meta.env.VITE_SERVICE_KEY || '',
        },
      });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    refetchInterval: 60000, // 1분마다 자동 새로고침
  });

  // 쿼리 실행
  const queryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await callWorkersApi<QueryResult>('/api/v1/admin/d1/query', {
        method: 'POST',
        body: { query },
        token: workersTokens?.accessToken,
        headers: {
          'X-Service-Key': import.meta.env.VITE_SERVICE_KEY || '',
        },
      });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      setQueryResult(data);
      toast.success(`쿼리 실행 완료 (${data?.duration})`);
    },
    onError: (error) => {
      toast.error(`쿼리 실행 실패: ${error.message}`);
    },
  });

  // 테이블 필터링
  const filteredTables = stats?.allTables?.filter(
    (table) => table.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleRunQuery = () => {
    if (!sqlQuery.trim()) {
      toast.error('쿼리를 입력해주세요');
      return;
    }
    queryMutation.mutate(sqlQuery);
  };

  return (
    <>
      <Helmet>
        <title>D1 모니터링 | Admin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">D1 데이터베이스 모니터링</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Cloudflare D1 데이터베이스 상태 및 통계
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 상태 배지 */}
            {perfMetrics?.health && (
              <Badge
                variant={getStatusBadgeVariant(perfMetrics.health.status)}
                className="flex items-center gap-1"
              >
                {perfMetrics.health.status === 'healthy' && <CheckCircle2 className="h-3 w-3" />}
                {perfMetrics.health.status === 'degraded' && <AlertTriangle className="h-3 w-3" />}
                {perfMetrics.health.status === 'unhealthy' && <AlertCircle className="h-3 w-3" />}
                {perfMetrics.health.status === 'healthy' && '정상'}
                {perfMetrics.health.status === 'degraded' && '저하'}
                {perfMetrics.health.status === 'unhealthy' && '비정상'}
              </Badge>
            )}
            <Button
              onClick={() => refetch()}
              disabled={isRefetching || perfRefetching}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching || perfRefetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2" aria-label="개요">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">개요</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2" aria-label="성능">
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">성능</span>
            </TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2" aria-label="쿼리">
              <Play className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">쿼리</span>
            </TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">데이터베이스</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.database.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.database.region} · {stats?.database.version}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 테이블 수</CardTitle>
              <TableIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.stats.totalTables?.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">활성 테이블</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 행 수</CardTitle>
              <Rows3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.stats.totalRows?.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">전체 레코드</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">마지막 업데이트</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.stats.timestamp
                      ? new Date(stats.stats.timestamp).toLocaleTimeString('ko-KR')
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">자동 새로고침 1분</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 상위 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>상위 10개 테이블</CardTitle>
            <CardDescription>행 수 기준 상위 테이블</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.topTables.map((table, index) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="font-mono text-sm">{table.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {table.rows.toLocaleString()} 행
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 전체 테이블 목록 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>전체 테이블 목록</CardTitle>
                <CardDescription>
                  {filteredTables.length}개 테이블
                  {searchQuery && ` (필터: "${searchQuery}")`}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="테이블 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>테이블명</TableHead>
                      <TableHead className="text-right">행 수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-mono">{table.name}</TableCell>
                        <TableCell className="text-right">
                          {table.rows.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* 성능 탭 */}
          <TabsContent value="performance" className="space-y-6">
            {/* 쿼리 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 쿼리 수</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {perfLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {perfMetrics?.queryStats?.totalQueries?.toLocaleString() || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">24시간 기준</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 응답 시간</CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {perfLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {formatDuration(perfMetrics?.queryStats?.avgExecutionTime || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        최대: {formatDuration(perfMetrics?.queryStats?.maxExecutionTime || 0)}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">슬로우 쿼리</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {perfLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {perfMetrics?.queryStats?.slowQueries || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">100ms 이상</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">실패 쿼리</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {perfLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-destructive">
                        {perfMetrics?.queryStats?.failedQueries || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">에러 발생</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 시계열 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>쿼리 추이 (24시간)</CardTitle>
                <CardDescription>시간별 쿼리 수 및 응답 시간</CardDescription>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <ChartSkeleton />
                ) : timeSeriesData.length > 0 ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="queries"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="쿼리 수"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="avgTime"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          name="평균 응답 시간 (ms)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Suspense>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 슬로우 쿼리 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>슬로우 쿼리 목록</CardTitle>
                <CardDescription>100ms 이상 소요된 쿼리 (최근 10개)</CardDescription>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : perfMetrics?.slowQueries && perfMetrics.slowQueries.length > 0 ? (
                  <div className="space-y-2">
                    {perfMetrics.slowQueries.map((sq, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-muted/50 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono truncate max-w-[70%]">
                            {sq.query}
                          </code>
                          <Badge variant="destructive">
                            {formatDuration(sq.executionTime)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(sq.timestamp).toLocaleString('ko-KR')}
                          {sq.rowsAffected !== undefined && ` · ${sq.rowsAffected}행 영향`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>슬로우 쿼리가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 쿼리 탭 */}
          <TabsContent value="query" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL 쿼리 실행</CardTitle>
                <CardDescription>
                  읽기 전용 쿼리만 실행 가능합니다 (SELECT, PRAGMA)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="SELECT * FROM table_name LIMIT 10"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleRunQuery}
                    disabled={queryMutation.isPending}
                  >
                    <Play className={`h-4 w-4 mr-2 ${queryMutation.isPending ? 'animate-pulse' : ''}`} />
                    {queryMutation.isPending ? '실행 중...' : '쿼리 실행'}
                  </Button>
                </div>

                {/* 쿼리 결과 */}
                {queryResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {queryResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">
                          {queryResult.rowCount}개 행 반환
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {queryResult.duration}
                      </span>
                    </div>

                    {queryResult.meta && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>읽은 행: {queryResult.meta.rows_read}</span>
                        <span>·</span>
                        <span>쓴 행: {queryResult.meta.rows_written}</span>
                        <span>·</span>
                        <span>크기: {formatBytes(queryResult.meta.size_after)}</span>
                      </div>
                    )}

                    {queryResult.rows.length > 0 && (
                      <div className="border rounded-lg overflow-auto max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(queryResult.rows[0]).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queryResult.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Object.values(row).map((value, colIndex) => (
                                  <TableCell key={colIndex} className="font-mono text-sm">
                                    {value === null ? (
                                      <span className="text-muted-foreground">NULL</span>
                                    ) : typeof value === 'object' ? (
                                      JSON.stringify(value)
                                    ) : (
                                      String(value)
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
