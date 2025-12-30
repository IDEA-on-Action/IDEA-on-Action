/**
 * D1 데이터베이스 모니터링 대시보드
 *
 * Cloudflare D1 데이터베이스 상태 및 통계를 실시간으로 모니터링
 * - 테이블 목록 및 행 수
 * - 상위 테이블 차트
 * - 읽기 전용 쿼리 실행
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('SELECT name FROM sqlite_master WHERE type=\'table\' LIMIT 10');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

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
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

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

        {/* 상위 테이블 & 쿼리 실행 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* 쿼리 실행 */}
          <Card>
            <CardHeader>
              <CardTitle>SQL 쿼리 실행</CardTitle>
              <CardDescription>읽기 전용 쿼리만 허용됩니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="SELECT * FROM users LIMIT 10"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="font-mono text-sm min-h-[100px]"
              />
              <Button
                onClick={handleRunQuery}
                disabled={queryMutation.isPending}
                className="w-full"
              >
                {queryMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                쿼리 실행
              </Button>

              {/* 쿼리 결과 */}
              {queryResult && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {queryResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{queryResult.rowCount} 행</span>
                    </div>
                    <span className="text-muted-foreground">{queryResult.duration}</span>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    {queryResult.rows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(queryResult.rows[0]).map((key) => (
                              <TableHead key={key} className="font-mono text-xs">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResult.rows.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              {Object.values(row).map((value, j) => (
                                <TableCell key={j} className="font-mono text-xs">
                                  {String(value ?? 'NULL')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        결과 없음
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
      </div>
    </>
  );
}
