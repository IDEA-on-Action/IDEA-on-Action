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
  | 'subscription_required'    // 구독 필요
  | 'subscription_expired'     // 구독 만료
  | 'insufficient_permission'  // 권한 부족
  | 'service_unavailable'      // 서비스 이용 불가
  | 'no_subscription'          // @deprecated 하위 호환: 구독 미가입
  | 'insufficient_plan'        // @deprecated 하위 호환: 플랜 부족
  | 'expired'                  // @deprecated 하위 호환: 구독 만료
  | 'service_error'            // @deprecated 하위 호환: 서비스 오류
  | 'render_error';            // @deprecated 하위 호환: 렌더링 오류

/**
 * MCPFallback 컴포넌트 Props
 */
export interface MCPFallbackProps {
  /** Fallback 사유 */
  reason: FallbackReason;
  /** 서비스명 (표시용, 선택사항) */
  serviceName?: string;
  /** CTA 버튼 클릭 핸들러 (선택사항) */
  onAction?: () => void;
  /** @deprecated 하위 호환: 서비스 ID */
  serviceId?: string;
  /** @deprecated 하위 호환: 필요한 플랜 */
  requiredPlan?: string;
  /** @deprecated 하위 호환: 현재 플랜 */
  currentPlan?: string;
  /** @deprecated 하위 호환: 커스텀 메시지 */
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
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href: string };
}

/**
 * 사유에 따른 Fallback 컨텐츠 생성
 */
function getContent(
  reason: FallbackReason,
  serviceName: string,
  serviceSlug: string,
  onAction?: () => void,
  requiredPlan?: string,
  currentPlan?: string,
  message?: string
): FallbackContent {
  switch (reason) {
    // 새 API
    case 'subscription_required':
    case 'no_subscription':
      return {
        icon: <Lock className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '구독이 필요합니다',
        description: serviceName
          ? `${serviceName} 서비스를 이용하려면 구독이 필요합니다.`
          : '이 서비스를 이용하려면 구독이 필요합니다.',
        primaryAction: {
          label: '구독하기',
          onClick: onAction,
          href: serviceSlug ? `/services/minu/${serviceSlug}` : '/pricing',
        },
        secondaryAction: {
          label: '무료 체험 시작',
          href: '/signup?trial=true',
        },
      };

    case 'subscription_expired':
    case 'expired':
      return {
        icon: <Clock className="h-12 w-12 text-destructive mx-auto" />,
        title: '구독이 만료되었습니다',
        description: '구독을 갱신하면 서비스를 계속 이용할 수 있습니다.',
        primaryAction: {
          label: '구독 갱신',
          onClick: onAction,
          href: '/subscriptions/renew',
        },
        secondaryAction: {
          label: '고객 지원',
          href: '/support',
        },
      };

    case 'insufficient_permission':
    case 'insufficient_plan':
      return {
        icon: <Lock className="h-12 w-12 text-amber-500 mx-auto" />,
        title: '권한이 부족합니다',
        description: requiredPlan
          ? `이 기능은 ${requiredPlan} 플랜 이상에서 사용 가능합니다.${
              currentPlan ? ` 현재: ${currentPlan}` : ''
            }`
          : '이 기능을 사용하려면 권한이 필요합니다.',
        primaryAction: {
          label: '관리자에게 문의',
          onClick: onAction,
          href: '/support',
        },
        secondaryAction: {
          label: '플랜 비교',
          href: '/pricing',
        },
      };

    case 'service_unavailable':
    case 'service_error':
    case 'render_error':
    default:
      return {
        icon: <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '서비스를 이용할 수 없습니다',
        description: message ?? '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        primaryAction: {
          label: '다시 시도',
          onClick: onAction ?? (() => window.location.reload()),
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
 * // 새 API (요구사항)
 * <MCPFallback
 *   reason="subscription_required"
 *   serviceName="Minu Frame"
 *   onAction={() => router.push('/pricing')}
 * />
 *
 * <MCPFallback
 *   reason="insufficient_permission"
 *   onAction={() => alert('관리자에게 문의하세요')}
 * />
 *
 * // 하위 호환 API
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
  reason,
  serviceName: serviceNameProp,
  onAction,
  serviceId,
  requiredPlan,
  currentPlan,
  message,
}: MCPFallbackProps) {
  // 하위 호환: serviceId가 있으면 serviceName 자동 생성
  const serviceName = serviceNameProp ?? (serviceId ? getServiceName(serviceId) : '');
  const serviceSlug = serviceId ? getServiceSlug(serviceId) : '';

  const content = getContent(
    reason,
    serviceName,
    serviceSlug,
    onAction,
    requiredPlan,
    currentPlan,
    message
  );

  const handlePrimaryAction = () => {
    if (content.primaryAction?.onClick) {
      content.primaryAction.onClick();
    }
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
            content.primaryAction.onClick ? (
              <Button onClick={handlePrimaryAction} className="w-full">
                {content.primaryAction.href === '#' && (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {content.primaryAction.label}
              </Button>
            ) : content.primaryAction.href ? (
              <Button asChild className="w-full">
                <Link to={content.primaryAction.href}>
                  {content.primaryAction.label}
                </Link>
              </Button>
            ) : null
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
