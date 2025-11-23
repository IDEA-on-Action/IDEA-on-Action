/**
 * MCP 권한 없음 시 표시되는 Fallback UI
 *
 * @description 구독 미가입, 플랜 부족, 만료, 서비스 오류 등 상황별 UI 제공
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Lock, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Fallback 표시 사유
 */
export type FallbackReason =
  | 'no_subscription'    // 구독 미가입
  | 'insufficient_plan'  // 플랜 부족
  | 'expired'            // 구독 만료
  | 'service_error'      // 서비스 오류
  | 'render_error';      // 렌더링 오류

interface MCPFallbackProps {
  /** 서비스 ID */
  serviceId: string;
  /** Fallback 사유 */
  reason: FallbackReason;
  /** 필요한 플랜 */
  requiredPlan?: string;
  /** 현재 플랜 */
  currentPlan?: string;
  /** 커스텀 메시지 */
  message?: string;
}

/**
 * 서비스 ID를 한글 서비스명으로 변환
 */
function getServiceName(serviceId: string): string {
  const names: Record<string, string> = {
    'minu-find': 'Minu Find',
    'minu-frame': 'Minu Frame',
    'minu-build': 'Minu Build',
    'minu-keep': 'Minu Keep',
  };
  return names[serviceId] ?? serviceId;
}

/**
 * 서비스 ID에서 슬러그 추출
 */
function getServiceSlug(serviceId: string): string {
  // minu-frame -> frame
  const match = serviceId.match(/minu-(\w+)/);
  return match?.[1] ?? serviceId;
}

interface FallbackContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

/**
 * 사유에 따른 Fallback 컨텐츠 생성
 */
function getContent(
  reason: FallbackReason,
  serviceName: string,
  serviceSlug: string,
  requiredPlan?: string,
  currentPlan?: string,
  message?: string
): FallbackContent {
  switch (reason) {
    case 'no_subscription':
      return {
        icon: <Lock className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '구독이 필요합니다',
        description: `${serviceName} 서비스를 이용하려면 구독이 필요합니다.`,
        primaryAction: {
          label: '플랜 선택하기',
          href: `/services/minu/${serviceSlug}`,
        },
        secondaryAction: {
          label: '무료 체험 시작',
          href: '/signup?trial=true',
        },
      };

    case 'insufficient_plan':
      return {
        icon: <Lock className="h-12 w-12 text-amber-500 mx-auto" />,
        title: '플랜 업그레이드 필요',
        description: `이 기능은 ${requiredPlan ?? 'Pro'} 플랜 이상에서 사용 가능합니다.${
          currentPlan ? ` 현재: ${currentPlan}` : ''
        }`,
        primaryAction: {
          label: '업그레이드',
          href: `/subscriptions/upgrade?plan=${requiredPlan?.toLowerCase() ?? 'pro'}`,
        },
        secondaryAction: {
          label: '플랜 비교',
          href: '/pricing',
        },
      };

    case 'expired':
      return {
        icon: <Clock className="h-12 w-12 text-destructive mx-auto" />,
        title: '구독이 만료되었습니다',
        description: '구독을 갱신하면 서비스를 계속 이용할 수 있습니다.',
        primaryAction: {
          label: '구독 갱신',
          href: '/subscriptions/renew',
        },
        secondaryAction: {
          label: '고객 지원',
          href: '/support',
        },
      };

    case 'service_error':
    case 'render_error':
    default:
      return {
        icon: <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '일시적인 문제가 발생했습니다',
        description: message ?? '잠시 후 다시 시도해주세요.',
        primaryAction: {
          label: '새로고침',
          href: '#',
        },
        secondaryAction: {
          label: '고객 지원',
          href: '/support',
        },
      };
  }
}

/**
 * MCP 권한 없음 시 표시되는 Fallback UI
 *
 * @example
 * ```tsx
 * <MCPFallback
 *   serviceId="minu-frame"
 *   reason="no_subscription"
 * />
 *
 * <MCPFallback
 *   serviceId="minu-build"
 *   reason="insufficient_plan"
 *   requiredPlan="Pro"
 *   currentPlan="Basic"
 * />
 * ```
 */
export function MCPFallback({
  serviceId,
  reason,
  requiredPlan,
  currentPlan,
  message,
}: MCPFallbackProps) {
  const serviceName = getServiceName(serviceId);
  const serviceSlug = getServiceSlug(serviceId);
  const content = getContent(
    reason,
    serviceName,
    serviceSlug,
    requiredPlan,
    currentPlan,
    message
  );

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {content.icon}
          <CardTitle className="mt-4">{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {content.primaryAction && (
            content.primaryAction.href === '#' ? (
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {content.primaryAction.label}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link to={content.primaryAction.href}>
                  {content.primaryAction.label}
                </Link>
              </Button>
            )
          )}
          {content.secondaryAction && (
            <Button variant="outline" asChild className="w-full">
              <Link to={content.secondaryAction.href}>
                {content.secondaryAction.label}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPFallback;
