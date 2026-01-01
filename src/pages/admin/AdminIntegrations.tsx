/**
 * AdminIntegrations Page
 *
 * 서비스 연동 관리 페이지
 * - Notion, GitHub, Slack 등 외부 서비스 연동 관리
 * - 연동 상태 모니터링
 * - 수동 동기화 트리거
 * - CRUD 작업
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import {
  useIntegrations,
  useDeleteIntegration,
  useTriggerSync,
  useToggleIntegration,
  useIntegrationStats,
} from '@/hooks/integrations/useIntegrations';
import { IntegrationForm } from '@/components/admin/IntegrationForm';
import type {
  ServiceIntegrationWithService,
  IntegrationType,
  SyncStatus,
  HealthStatus,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from '@/types/integrations/integrations';
import {
  INTEGRATION_TYPE_INFO,
  SYNC_STATUS_INFO,
  HEALTH_STATUS_INFO,
} from '@/types/integrations/integrations';

// ============================================================================
// Status Badge Components
// ============================================================================

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const info = SYNC_STATUS_INFO[status];
  const icons: Record<SyncStatus, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    syncing: <RefreshCw className="h-3 w-3 animate-spin" />,
    synced: <CheckCircle className="h-3 w-3" />,
    error: <XCircle className="h-3 w-3" />,
    disabled: <XCircle className="h-3 w-3" />,
  };

  return (
    <Badge
      variant={status === 'error' ? 'destructive' : 'secondary'}
      className="gap-1"
    >
      {icons[status]}
      {info.label_ko}
    </Badge>
  );
}

function HealthStatusBadge({ status }: { status: HealthStatus }) {
  const info = HEALTH_STATUS_INFO[status];
  const colors: Record<HealthStatus, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge className={colors[status]}>
      {info.label_ko}
    </Badge>
  );
}

function IntegrationTypeBadge({ type }: { type: IntegrationType }) {
  const info = INTEGRATION_TYPE_INFO[type];
  return (
    <Badge variant="outline" className="gap-1">
      {info.name}
    </Badge>
  );
}

// ============================================================================
// Stats Cards Component
// ============================================================================

function IntegrationStatsCards() {
  const { data: stats, isLoading } = useIntegrationStats();

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-12 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 연동</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            활성: {stats.active}개
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">동기화 완료</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byStatus.synced}</div>
          <p className="text-xs text-muted-foreground">
            동기화 중: {stats.byStatus.syncing}개
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">오류</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.byStatus.error}
          </div>
          <p className="text-xs text-muted-foreground">
            비정상: {stats.byHealth.unhealthy}개
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">연동 유형</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {stats.byType.notion > 0 && (
              <Badge variant="secondary">Notion: {stats.byType.notion}</Badge>
            )}
            {stats.byType.github > 0 && (
              <Badge variant="secondary">GitHub: {stats.byType.github}</Badge>
            )}
            {stats.byType.slack > 0 && (
              <Badge variant="secondary">Slack: {stats.byType.slack}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminIntegrations() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<ServiceIntegrationWithService | null>(null);

  // Queries & Mutations
  const { data: integrations, isLoading, refetch } = useIntegrations({
    integration_type:
      typeFilter !== 'all' ? (typeFilter as IntegrationType) : undefined,
    sync_status:
      statusFilter !== 'all' ? (statusFilter as SyncStatus) : undefined,
  });

  const deleteMutation = useDeleteIntegration();
  const triggerSyncMutation = useTriggerSync();
  const toggleMutation = useToggleIntegration();

  // Filter integrations by search
  const filteredIntegrations = integrations?.filter((integration) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      integration.name.toLowerCase().includes(searchLower) ||
      integration.external_id?.toLowerCase().includes(searchLower) ||
      integration.service?.title?.toLowerCase().includes(searchLower)
    );
  });

  // Handlers
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({
        title: '연동 삭제 완료',
        description: '연동이 삭제되었습니다.',
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: '연동 삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      await triggerSyncMutation.mutateAsync({ integrationId });
      toast({
        title: '동기화 시작',
        description: '동기화가 시작되었습니다.',
      });
    } catch (error) {
      toast({
        title: '동기화 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, isActive });
      toast({
        title: isActive ? '연동 활성화' : '연동 비활성화',
        description: `연동이 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
      });
    } catch (error) {
      toast({
        title: '상태 변경 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingIntegration(null);
    refetch();
  };

  const handleEdit = (integration: ServiceIntegrationWithService) => {
    setEditingIntegration(integration);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingIntegration(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>연동 관리 - Admin | IDEA on Action</title>
      </Helmet>

      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">연동 관리</h1>
            <p className="text-muted-foreground">
              Notion, GitHub, Slack 등 외부 서비스 연동을 관리합니다.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            새 연동 추가
          </Button>
        </div>

        {/* Stats Cards */}
        <IntegrationStatsCards />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="연동 이름, 외부 ID로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="연동 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="notion">Notion</SelectItem>
              <SelectItem value="github">GitHub</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
              <SelectItem value="google_calendar">Google Calendar</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="custom">커스텀</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="동기화 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="synced">동기화 완료</SelectItem>
              <SelectItem value="syncing">동기화 중</SelectItem>
              <SelectItem value="pending">대기 중</SelectItem>
              <SelectItem value="error">오류</SelectItem>
              <SelectItem value="disabled">비활성화</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>연결된 서비스</TableHead>
                <TableHead>동기화 상태</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>활성</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredIntegrations?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    연동이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIntegrations?.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{integration.name}</span>
                        {integration.external_id && (
                          <span className="text-xs text-muted-foreground">
                            {integration.external_id}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <IntegrationTypeBadge type={integration.integration_type} />
                    </TableCell>
                    <TableCell>
                      {integration.service?.title || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={integration.sync_status} />
                    </TableCell>
                    <TableCell>
                      <HealthStatusBadge status={integration.health_status} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={integration.is_active}
                        onCheckedChange={(checked) =>
                          handleToggle(integration.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(integration.id)}
                          disabled={
                            integration.sync_status === 'syncing' ||
                            !integration.is_active
                          }
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              integration.sync_status === 'syncing'
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                        </Button>
                        {integration.external_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={integration.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(integration)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(integration.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Integration Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? '연동 수정' : '새 연동 추가'}
            </DialogTitle>
            <DialogDescription>
              외부 서비스와의 연동을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <IntegrationForm
            integration={editingIntegration}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연동을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 연동 설정과 동기화 기록이 모두
              삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
