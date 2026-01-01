/**
 * AlertSubscriptionManager 컴포넌트
 *
 * Central Hub 대시보드용 알림 구독 관리 UI
 * 사용자별 알림 구독 설정을 조회, 추가, 수정, 삭제할 수 있습니다.
 *
 * @module components/central-hub/AlertSubscriptionManager
 */

import { useState, useMemo } from 'react';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Mail,
  Smartphone,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  useAlertSubscriptions,
  getTopicTypeLabel,
  getChannelLabel,
  type AlertSubscription,
} from '@/hooks/useAlertSubscriptions';
import { cn } from '@/lib/utils';

// ============================================================================
// 타입 정의
// ============================================================================

interface AlertSubscriptionManagerProps {
  /** 추가 CSS 클래스 */
  className?: string;
}

type FilterType = 'all' | 'service' | 'severity' | 'event_type';

interface SubscriptionFormData {
  topicType: 'service' | 'severity' | 'event_type';
  topicValue: string;
  enabledChannels: ('in_app' | 'email')[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  isEnabled: boolean;
}

// ============================================================================
// 상수
// ============================================================================

const TOPIC_VALUES: Record<string, string[]> = {
  service: ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'],
  severity: ['critical', 'high', 'medium', 'low'],
  event_type: ['deployment', 'incident', 'maintenance', 'alert'],
};

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 로딩 스켈레톤
 */
function SubscriptionListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border-l-4 border-l-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 빈 상태
 */
function EmptyState({ filter }: { filter: FilterType }) {
  const message =
    filter === 'all'
      ? '알림 구독이 없습니다. 새로운 구독을 추가하세요.'
      : `'${filter}' 유형의 구독이 없습니다.`;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Bell className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

/**
 * 에러 상태
 */
function ErrorState({ error }: { error: Error }) {
  return (
    <Card className="border-l-4 border-l-red-500">
      <CardContent className="flex items-start gap-3 py-6">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 구독 카드
 */
function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: {
  subscription: AlertSubscription;
  onEdit: (subscription: AlertSubscription) => void;
  onDelete: (id: string) => void;
}) {
  const borderColor = subscription.isEnabled
    ? 'border-l-green-500'
    : 'border-l-gray-300';

  return (
    <Card className={cn('border-l-4', borderColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell
              className={cn(
                'h-5 w-5',
                subscription.isEnabled ? 'text-green-500' : 'text-gray-400'
              )}
            />
            <div>
              <CardTitle className="text-base">
                {getTopicTypeLabel(subscription.topicType)}: {subscription.topicValue}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={subscription.isEnabled ? 'default' : 'secondary'}
              className="text-xs"
            >
              {subscription.isEnabled ? '활성' : '비활성'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subscription)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subscription.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 채널 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">채널:</span>
          <div className="flex gap-1">
            {subscription.enabledChannels.map((channel) => (
              <Badge key={channel} variant="outline" className="text-xs">
                {channel === 'in_app' && <Smartphone className="h-3 w-3 mr-1" />}
                {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                {getChannelLabel(channel)}
              </Badge>
            ))}
          </div>
        </div>

        {/* 조용한 시간 */}
        {subscription.quietHoursStart && subscription.quietHoursEnd && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              조용한 시간: {subscription.quietHoursStart} - {subscription.quietHoursEnd}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 구독 추가/수정 폼
 */
function SubscriptionForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: AlertSubscription;
  onSubmit: (data: SubscriptionFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<SubscriptionFormData>({
    topicType: initialData?.topicType || 'service',
    topicValue: initialData?.topicValue || '',
    enabledChannels: initialData?.enabledChannels || ['in_app'],
    quietHoursStart: initialData?.quietHoursStart || '',
    quietHoursEnd: initialData?.quietHoursEnd || '',
    isEnabled: initialData?.isEnabled ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleChannel = (channel: 'in_app' | 'email') => {
    setFormData((prev) => ({
      ...prev,
      enabledChannels: prev.enabledChannels.includes(channel)
        ? prev.enabledChannels.filter((c) => c !== channel)
        : [...prev.enabledChannels, channel],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 토픽 타입 */}
      <div className="space-y-2">
        <Label htmlFor="topicType">알림 유형</Label>
        <Select
          value={formData.topicType}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              topicType: value as 'service' | 'severity' | 'event_type',
              topicValue: '', // 타입 변경 시 값 초기화
            }))
          }
        >
          <SelectTrigger id="topicType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service">서비스</SelectItem>
            <SelectItem value="severity">심각도</SelectItem>
            <SelectItem value="event_type">이벤트 타입</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 토픽 값 */}
      <div className="space-y-2">
        <Label htmlFor="topicValue">값</Label>
        <Select
          value={formData.topicValue}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, topicValue: value }))
          }
        >
          <SelectTrigger id="topicValue">
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {TOPIC_VALUES[formData.topicType].map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 채널 */}
      <div className="space-y-3">
        <Label>알림 채널</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="channel-in-app" className="cursor-pointer">
                인앱 알림
              </Label>
            </div>
            <Switch
              id="channel-in-app"
              checked={formData.enabledChannels.includes('in_app')}
              onCheckedChange={() => toggleChannel('in_app')}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="channel-email" className="cursor-pointer">
                이메일 알림
              </Label>
            </div>
            <Switch
              id="channel-email"
              checked={formData.enabledChannels.includes('email')}
              onCheckedChange={() => toggleChannel('email')}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 조용한 시간 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label>조용한 시간 (선택사항)</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="quietHoursStart">시작</Label>
            <Input
              id="quietHoursStart"
              type="time"
              value={formData.quietHoursStart}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quietHoursStart: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quietHoursEnd">종료</Label>
            <Input
              id="quietHoursEnd"
              type="time"
              value={formData.quietHoursEnd}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quietHoursEnd: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 활성화 */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <Label htmlFor="isEnabled" className="cursor-pointer">
          구독 활성화
        </Label>
        <Switch
          id="isEnabled"
          checked={formData.isEnabled}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, isEnabled: checked }))
          }
        />
      </div>

      {/* 버튼 */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !formData.topicValue || formData.enabledChannels.length === 0}
        >
          {isSubmitting ? '저장 중...' : initialData ? '수정' : '추가'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * AlertSubscriptionManager
 *
 * 사용자별 알림 구독 설정을 관리하는 컴포넌트입니다.
 * 구독 목록 표시, 추가, 수정, 삭제 기능을 제공합니다.
 *
 * @param className - 추가 CSS 클래스
 */
export function AlertSubscriptionManager({
  className,
}: AlertSubscriptionManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<AlertSubscription | null>(null);

  // 훅 사용
  const {
    subscriptions,
    isLoading,
    error,
    createSubscription,
    updateSubscription,
    deleteSubscription,
  } = useAlertSubscriptions(user?.id || '');

  // 필터링된 구독 목록
  const filteredSubscriptions = useMemo(() => {
    if (filter === 'all') return subscriptions;
    return subscriptions.filter((sub) => sub.topicType === filter);
  }, [subscriptions, filter]);

  // 구독 추가
  const handleAddSubscription = async (data: SubscriptionFormData) => {
    if (!user) {
      toast({
        title: '오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createSubscription({
        userId: user.id,
        topicType: data.topicType,
        topicValue: data.topicValue,
        enabledChannels: data.enabledChannels,
        quietHoursStart: data.quietHoursStart || undefined,
        quietHoursEnd: data.quietHoursEnd || undefined,
        isEnabled: data.isEnabled,
      });

      toast({
        title: '구독 추가됨',
        description: '알림 구독이 성공적으로 추가되었습니다.',
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: '구독 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 구독 수정
  const handleEditSubscription = async (data: SubscriptionFormData) => {
    if (!editingSubscription) return;

    try {
      await updateSubscription(editingSubscription.id, {
        topicType: data.topicType,
        topicValue: data.topicValue,
        enabledChannels: data.enabledChannels,
        quietHoursStart: data.quietHoursStart || undefined,
        quietHoursEnd: data.quietHoursEnd || undefined,
        isEnabled: data.isEnabled,
      });

      toast({
        title: '구독 수정됨',
        description: '알림 구독이 성공적으로 수정되었습니다.',
      });
      setEditingSubscription(null);
    } catch (error) {
      toast({
        title: '오류',
        description: '구독 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 구독 삭제
  const handleDeleteSubscription = async (id: string) => {
    if (!window.confirm('이 구독을 삭제하시겠습니까?')) return;

    try {
      await deleteSubscription(id);
      toast({
        title: '구독 삭제됨',
        description: '알림 구독이 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '구독 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">알림 구독 관리</h2>
          <p className="text-muted-foreground">
            원하는 알림을 구독하고 채널을 설정하세요.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              구독 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 알림 구독</DialogTitle>
              <DialogDescription>
                알림을 받고 싶은 유형과 채널을 선택하세요.
              </DialogDescription>
            </DialogHeader>
            <SubscriptionForm
              onSubmit={handleAddSubscription}
              onCancel={() => setIsAddDialogOpen(false)}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2">
          {(['all', 'service', 'severity', 'event_type'] as FilterType[]).map(
            (filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterType)}
              >
                {filterType === 'all' && '전체'}
                {filterType === 'service' && '서비스'}
                {filterType === 'severity' && '심각도'}
                {filterType === 'event_type' && '이벤트 타입'}
              </Button>
            )
          )}
        </div>
      </div>

      {/* 구독 목록 */}
      {isLoading && <SubscriptionListSkeleton />}
      {error && <ErrorState error={error} />}
      {!isLoading && !error && filteredSubscriptions.length === 0 && (
        <EmptyState filter={filter} />
      )}
      {!isLoading && !error && filteredSubscriptions.length > 0 && (
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={setEditingSubscription}
              onDelete={handleDeleteSubscription}
            />
          ))}
        </div>
      )}

      {/* 수정 다이얼로그 */}
      <Dialog
        open={!!editingSubscription}
        onOpenChange={(open) => !open && setEditingSubscription(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>알림 구독 수정</DialogTitle>
            <DialogDescription>
              구독 설정을 변경하세요.
            </DialogDescription>
          </DialogHeader>
          {editingSubscription && (
            <SubscriptionForm
              initialData={editingSubscription}
              onSubmit={handleEditSubscription}
              onCancel={() => setEditingSubscription(null)}
              isSubmitting={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AlertSubscriptionManager;
