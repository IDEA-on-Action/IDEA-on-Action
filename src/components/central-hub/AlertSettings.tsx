/**
 * AlertSettings 컴포넌트
 *
 * 알림 설정 UI 컴포넌트
 * 이메일 알림, Slack 웹훅 설정 등을 제공합니다.
 *
 * @module components/central-hub/AlertSettings
 */

import { useState } from 'react';
import { Settings, Mail, MessageSquare, Bell, Save, AlertCircle, Send } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type {
  ServiceId,
  IssueSeverity,
} from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendSlackTestMessage, isValidSlackWebhookUrl } from '@/utils/slack';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 알림 설정
 */
export interface AlertSettingsData {
  /** 이메일 알림 활성화 */
  enableEmailNotifications: boolean;
  /** 이메일 주소 */
  emailAddress: string;
  /** Slack 웹훅 활성화 */
  enableSlackWebhook: boolean;
  /** Slack 웹훅 URL */
  slackWebhookUrl: string;
  /** 서비스별 알림 활성화 */
  serviceNotifications: Record<ServiceId, boolean>;
  /** 심각도별 알림 활성화 */
  severityNotifications: Record<IssueSeverity, boolean>;
  /** 브라우저 알림 활성화 */
  enableBrowserNotifications: boolean;
  /** 소리 활성화 */
  enableSound: boolean;
}

interface AlertSettingsProps {
  /** 현재 설정 */
  settings: AlertSettingsData;
  /** 설정 변경 콜백 */
  onSettingsChange: (settings: AlertSettingsData) => void;
  /** 트리거 버튼 표시 여부 (기본: true) */
  showTrigger?: boolean;
  /** 열림 상태 (외부 제어용) */
  open?: boolean;
  /** 열림 상태 변경 콜백 (외부 제어용) */
  onOpenChange?: (open: boolean) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 기본 설정
// ============================================================================

const DEFAULT_ALERT_SETTINGS: AlertSettingsData = {
  enableEmailNotifications: false,
  emailAddress: '',
  enableSlackWebhook: false,
  slackWebhookUrl: '',
  serviceNotifications: {
    'minu-find': true,
    'minu-frame': true,
    'minu-build': true,
    'minu-keep': true,
  },
  severityNotifications: {
    critical: true,
    high: true,
    medium: true,
    low: false,
  },
  enableBrowserNotifications: false,
  enableSound: true,
};

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 심각도 한글 라벨
 */
function getSeverityLabel(severity: IssueSeverity): string {
  const labels: Record<IssueSeverity, string> = {
    critical: '심각',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[severity];
}

/**
 * 심각도 배지 색상
 */
function getSeverityBadgeClass(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * AlertSettings
 *
 * 알림 설정 UI를 제공하는 컴포넌트입니다.
 *
 * @param settings - 현재 설정
 * @param onSettingsChange - 설정 변경 콜백
 * @param showTrigger - 트리거 버튼 표시 여부
 * @param open - 열림 상태
 * @param onOpenChange - 열림 상태 변경 콜백
 * @param className - 추가 CSS 클래스
 */
export function AlertSettings({
  settings,
  onSettingsChange,
  showTrigger = true,
  open: controlledOpen,
  onOpenChange,
  className,
}: AlertSettingsProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<AlertSettingsData>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);

  // 열림 상태 관리 (외부 제어 vs 내부 제어)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // 로컬 설정 업데이트
  const updateLocalSettings = (updates: Partial<AlertSettingsData>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 유효성 검사
      if (localSettings.enableEmailNotifications && !localSettings.emailAddress) {
        toast({
          title: '이메일 주소 필요',
          description: '이메일 알림을 활성화하려면 이메일 주소를 입력해주세요.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      if (localSettings.enableSlackWebhook && !localSettings.slackWebhookUrl) {
        toast({
          title: 'Slack 웹훅 URL 필요',
          description: 'Slack 알림을 활성화하려면 웹훅 URL을 입력해주세요.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // 저장
      await new Promise((resolve) => setTimeout(resolve, 500)); // 시뮬레이션
      onSettingsChange(localSettings);

      // 브라우저 알림 권한 요청
      if (localSettings.enableBrowserNotifications && typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast({
              title: '브라우저 알림 권한 필요',
              description: '브라우저 알림을 활성화하려면 권한을 허용해주세요.',
              variant: 'destructive',
            });
            updateLocalSettings({ enableBrowserNotifications: false });
            setIsSaving(false);
            return;
          }
        }
      }

      toast({
        title: '설정 저장됨',
        description: '알림 설정이 성공적으로 저장되었습니다.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: '설정 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 취소
  const handleCancel = () => {
    setLocalSettings(settings); // 원래 설정으로 복원
    setIsOpen(false);
  };

  // Slack 테스트 전송
  const handleTestSlack = async () => {
    if (!localSettings.slackWebhookUrl) {
      toast({
        title: '웹훅 URL 필요',
        description: 'Slack 웹훅 URL을 먼저 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidSlackWebhookUrl(localSettings.slackWebhookUrl)) {
      toast({
        title: '유효하지 않은 URL',
        description: 'Slack 웹훅 URL 형식이 올바르지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingSlack(true);
    try {
      const result = await sendSlackTestMessage(localSettings.slackWebhookUrl);

      if (result.success) {
        toast({
          title: '테스트 성공',
          description: 'Slack 채널에 테스트 메시지가 전송되었습니다.',
        });
      } else {
        toast({
          title: '테스트 실패',
          description: result.error || 'Slack 메시지 전송에 실패했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '테스트 메시지 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingSlack(false);
    }
  };

  // 모달 열릴 때 로컬 설정 초기화
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalSettings(settings);
    }
    setIsOpen(open);
  };

  const dialogContent = (
    <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto', className)}>
      <DialogHeader>
        <DialogTitle>알림 설정</DialogTitle>
        <DialogDescription>
          이메일, Slack, 브라우저 알림을 설정하고 필터를 조정하세요.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* 이메일 알림 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">이메일 알림</CardTitle>
            </div>
            <CardDescription>
              중요한 알림을 이메일로 받아보세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-email">이메일 알림 활성화</Label>
              <Switch
                id="enable-email"
                checked={localSettings.enableEmailNotifications}
                onCheckedChange={(checked) =>
                  updateLocalSettings({ enableEmailNotifications: checked })
                }
              />
            </div>
            {localSettings.enableEmailNotifications && (
              <div className="space-y-2">
                <Label htmlFor="email-address">이메일 주소</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="your@email.com"
                  value={localSettings.emailAddress}
                  onChange={(e) =>
                    updateLocalSettings({ emailAddress: e.target.value })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slack 웹훅 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Slack 알림</CardTitle>
            </div>
            <CardDescription>
              Slack 채널로 알림을 전송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-slack">Slack 웹훅 활성화</Label>
              <Switch
                id="enable-slack"
                checked={localSettings.enableSlackWebhook}
                onCheckedChange={(checked) =>
                  updateLocalSettings({ enableSlackWebhook: checked })
                }
              />
            </div>
            {localSettings.enableSlackWebhook && (
              <div className="space-y-2">
                <Label htmlFor="slack-webhook">웹훅 URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="slack-webhook"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={localSettings.slackWebhookUrl}
                    onChange={(e) =>
                      updateLocalSettings({ slackWebhookUrl: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSlack}
                    disabled={isTestingSlack || !localSettings.slackWebhookUrl}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {isTestingSlack ? '전송 중...' : '테스트'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Slack 앱 설정에서 Incoming Webhook URL을 생성하세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 브라우저 알림 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">브라우저 알림</CardTitle>
            </div>
            <CardDescription>
              데스크톱 알림 및 소리 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-browser">브라우저 알림 활성화</Label>
              <Switch
                id="enable-browser"
                checked={localSettings.enableBrowserNotifications}
                onCheckedChange={(checked) =>
                  updateLocalSettings({ enableBrowserNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-sound">알림 소리 활성화</Label>
              <Switch
                id="enable-sound"
                checked={localSettings.enableSound}
                onCheckedChange={(checked) =>
                  updateLocalSettings({ enableSound: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 서비스별 알림 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">서비스별 알림</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(SERVICE_INFO).map((serviceId) => {
              const service = SERVICE_INFO[serviceId as ServiceId];
              return (
                <div
                  key={serviceId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Label
                    htmlFor={`service-${serviceId}`}
                    className="cursor-pointer"
                  >
                    {service.name}
                  </Label>
                  <Switch
                    id={`service-${serviceId}`}
                    checked={localSettings.serviceNotifications[serviceId as ServiceId]}
                    onCheckedChange={(checked) =>
                      updateLocalSettings({
                        serviceNotifications: {
                          ...localSettings.serviceNotifications,
                          [serviceId]: checked,
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* 심각도별 알림 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">심각도별 알림</h4>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as IssueSeverity[]).map((severity) => (
              <div
                key={severity}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <Label
                  htmlFor={`severity-${severity}`}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Badge className={cn('text-xs', getSeverityBadgeClass(severity))}>
                    {getSeverityLabel(severity)}
                  </Badge>
                </Label>
                <Switch
                  id={`severity-${severity}`}
                  checked={localSettings.severityNotifications[severity]}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      severityNotifications: {
                        ...localSettings.severityNotifications,
                        [severity]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* 경고 메시지 */}
        {localSettings.enableBrowserNotifications && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              브라우저 알림을 활성화하면 권한을 요청합니다. 브라우저 설정에서 알림 권한을 허용해주세요.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (showTrigger) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            알림 설정
          </Button>
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {dialogContent}
    </Dialog>
  );
}

export default AlertSettings;
