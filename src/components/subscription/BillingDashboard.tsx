/**
 * 결제 대시보드 컴포넌트
 *
 * @description 구독 관리, 결제 내역, 사용량 등을 통합적으로 표시
 */

import React, { useState } from 'react';
import { useBillingPortal } from '@/hooks/subscription/useBillingPortal';
import { useSubscriptionUsage } from '@/hooks/subscription/useSubscriptionUsage';
import { useMySubscriptions, useSubscriptionPayments } from '@/hooks/subscription/useSubscriptions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  SUBSCRIPTION_STATUS_KR,
  SUBSCRIPTION_STATUS_VARIANT,
  PAYMENT_STATUS_KR,
  PAYMENT_STATUS_VARIANT,
  BILLING_CYCLE_KR,
} from '@/types/subscription.types';
import type { SubscriptionWithPlan } from '@/types/subscription.types';

/**
 * 사용량 카드 컴포넌트
 */
function UsageCard({ feature }: { feature: { feature_name: string; usage_count: number; limit: number; is_unlimited: boolean; usage_percentage: number } }) {
  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{feature.feature_name}</span>
        <span className="text-muted-foreground">
          {feature.is_unlimited ? (
            '무제한'
          ) : (
            `${feature.usage_count.toLocaleString()} / ${feature.limit.toLocaleString()}`
          )}
        </span>
      </div>
      {!feature.is_unlimited && (
        <div className="relative">
          <Progress value={feature.usage_percentage} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(feature.usage_percentage)}`}
            style={{ width: `${feature.usage_percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 결제 대시보드 컴포넌트
 *
 * @example
 * ```tsx
 * import { BillingDashboard } from '@/components/subscription/BillingDashboard';
 *
 * function SettingsPage() {
 *   return <BillingDashboard />;
 * }
 * ```
 */
export function BillingDashboard() {
  const { data: subscriptions, isLoading: subscriptionsLoading } = useMySubscriptions();
  const { data: usageSummary, isLoading: usageLoading } = useSubscriptionUsage();
  const { cancelSubscription, cancelLoading } = useBillingPortal();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);

  // 활성 구독 (첫 번째)
  const activeSubscription = subscriptions?.find((sub) => sub.status === 'active');

  // 결제 내역 조회
  const { data: payments, isLoading: paymentsLoading } = useSubscriptionPayments(
    activeSubscription?.id ?? ''
  );

  // 구독 취소 핸들러
  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      await cancelSubscription({
        subscription_id: selectedSubscription.id,
        cancel_at_period_end: cancelAtPeriodEnd,
        reason: '사용자 요청',
      });
      setCancelDialogOpen(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  // 로딩 상태
  if (subscriptionsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // 구독이 없는 경우
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>활성 구독이 없습니다</CardTitle>
            <CardDescription>
              서비스를 이용하려면 구독이 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/pricing">플랜 선택하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">결제 관리</h1>
        <p className="text-muted-foreground mt-1">구독 및 결제 정보를 관리하세요</p>
      </div>

      {/* 현재 구독 정보 */}
      {activeSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              현재 구독
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 플랜 정보 */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">플랜</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{activeSubscription.plan.plan_name}</p>
                  <Badge variant={SUBSCRIPTION_STATUS_VARIANT[activeSubscription.status]}>
                    {SUBSCRIPTION_STATUS_KR[activeSubscription.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {BILLING_CYCLE_KR[activeSubscription.plan.billing_cycle]} ₩
                  {activeSubscription.plan.price.toLocaleString()}
                </p>
              </div>

              {/* 다음 결제일 */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">다음 결제일</p>
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Calendar className="h-4 w-4" />
                  {activeSubscription.valid_until
                    ? format(new Date(activeSubscription.valid_until), 'PPP', { locale: ko })
                    : '-'}
                </div>
                {activeSubscription.cancel_at_period_end && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ 이 날짜에 취소 예정
                  </p>
                )}
              </div>

              {/* 결제 수단 */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">결제 수단</p>
                {activeSubscription.billing_key ? (
                  <div className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">
                      **** **** **** {activeSubscription.billing_key.card_number?.slice(-4) ?? '****'}
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">등록된 카드 없음</p>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" asChild>
                <Link to="/subscriptions/upgrade">플랜 변경</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSubscription(activeSubscription);
                  setCancelDialogOpen(true);
                }}
              >
                구독 취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이번 달 사용량 */}
      {usageSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              이번 달 사용량
            </CardTitle>
            <CardDescription>
              다음 리셋:{' '}
              {format(new Date(usageSummary.next_reset_date), 'PPP', { locale: ko })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usageSummary.features.map((feature) => (
                  <UsageCard key={feature.feature_key} feature={feature} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 최근 결제 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 결제 내역</CardTitle>
          <CardDescription>지난 3개월간의 결제 내역입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">결제 내역이 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), 'PPP', { locale: ko })}
                    </TableCell>
                    <TableCell>
                      {payment.subscription.service_title} - {payment.subscription.plan_name}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₩{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                        {payment.status === 'success' && (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        {payment.status === 'failed' && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {PAYMENT_STATUS_KR[payment.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 구독 취소 다이얼로그 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구독을 취소하시겠습니까?</DialogTitle>
            <DialogDescription>
              {cancelAtPeriodEnd
                ? '현재 결제 주기가 끝날 때 구독이 취소됩니다.'
                : '즉시 구독이 취소되며, 남은 기간에 대한 환불은 진행되지 않습니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cancel-at-period-end"
                checked={cancelAtPeriodEnd}
                onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="cancel-at-period-end" className="text-sm">
                현재 결제 주기 종료 시 취소 (권장)
              </label>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {cancelAtPeriodEnd ? (
                  <>
                    <strong>{selectedSubscription?.valid_until ? format(new Date(selectedSubscription.valid_until), 'PPP', { locale: ko }) : '-'}</strong>
                    까지 서비스를 계속 이용할 수 있습니다.
                  </>
                ) : (
                  '즉시 모든 서비스 접근이 제한됩니다.'
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? '처리 중...' : '구독 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BillingDashboard;
