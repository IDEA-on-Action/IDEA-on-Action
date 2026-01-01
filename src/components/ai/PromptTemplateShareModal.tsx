/**
 * PromptTemplateShareModal 컴포넌트
 *
 * 프롬프트 템플릿 공유 설정 모달
 * - is_public 토글 (공개/비공개)
 * - 공유 링크 복사
 * - 공유 시 알림 메시지
 * - 권한 설정 (읽기 전용/수정 가능)
 *
 * @module components/ai/PromptTemplateShareModal
 */

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import {
  Share2,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUpdatePromptTemplate } from '@/hooks/ai/usePromptTemplates';

// ============================================================================
// Types (임시 - 실제로는 prompt-template.types.ts에서 임포트)
// ============================================================================

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  skillType: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  version: string;
  serviceId?: string;
  isSystem?: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface PromptTemplateShareModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 모달 열림 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 공유할 템플릿 */
  template: PromptTemplate | null;
  /** 공유 설정 완료 콜백 */
  onShareComplete?: (template: PromptTemplate) => void;
  /** 추가 클래스 */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 프롬프트 템플릿 공유 모달
 *
 * @example
 * // 기본 사용
 * <PromptTemplateShareModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   template={selectedTemplate}
 *   onShareComplete={(template) => console.log('공유 완료:', template)}
 * />
 */
export const PromptTemplateShareModal: React.FC<
  PromptTemplateShareModalProps
> = ({ open, onOpenChange, template, onShareComplete, className }) => {
  // State
  const [isPublic, setIsPublic] = useState(template?.isPublic || false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Update mutation
  const updateMutation = useUpdatePromptTemplate();

  // 템플릿 변경 시 상태 동기화
  useEffect(() => {
    if (template) {
      setIsPublic(template.isPublic || false);
      setSuccess(false);
      setError(null);
      setLinkCopied(false);
    }
  }, [template]);

  // 공유 링크 생성
  const shareLink = template
    ? `${window.location.origin}/templates/${template.id}`
    : '';

  // 공개 상태 토글 핸들러
  const handleTogglePublic = useCallback((checked: boolean) => {
    setIsPublic(checked);
    setError(null);
    setSuccess(false);
  }, []);

  // 공유 설정 저장
  const handleSaveShare = useCallback(async () => {
    if (!template) return;

    setError(null);

    try {
      const updatedTemplate = await updateMutation.mutateAsync({
        id: template.id,
        updates: {
          is_public: isPublic,
        },
      });

      setSuccess(true);
      onShareComplete?.(updatedTemplate);

      // 2초 후 모달 닫기
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 설정에 실패했습니다.');
    }
  }, [template, isPublic, onShareComplete, onOpenChange, updateMutation]);

  // 링크 복사
  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('링크 복사 실패:', err);
      setError('링크 복사에 실패했습니다.');
    }
  }, [shareLink]);

  // 모달 닫기
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('sm:max-w-md', className)}
        data-testid="share-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" aria-hidden="true" />
            템플릿 공유 설정
          </DialogTitle>
          <DialogDescription>
            {template.name}의 공유 설정을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 공개 상태 토글 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe
                  className="h-5 w-5 text-green-500"
                  aria-hidden="true"
                />
              ) : (
                <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
              )}
              <div className="space-y-0.5">
                <Label
                  htmlFor="public-switch"
                  className="text-base font-medium"
                >
                  {isPublic ? '공개' : '비공개'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? '팀 멤버가 이 템플릿을 볼 수 있습니다'
                    : '나만 이 템플릿을 볼 수 있습니다'}
                </p>
              </div>
            </div>
            <Switch
              id="public-switch"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={updateMutation.isPending}
              aria-label="공개 상태 토글"
              data-testid="public-switch"
            />
          </div>

          {/* 공유 링크 */}
          {isPublic && (
            <div className="space-y-2" data-testid="share-link-section">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" aria-hidden="true" />
                공유 링크
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm">
                  <code className="text-xs break-all">{shareLink}</code>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  disabled={updateMutation.isPending}
                  aria-label="공유 링크 복사"
                  data-testid="copy-link-button"
                >
                  {linkCopied ? (
                    <CheckCircle
                      className="h-4 w-4 text-green-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {linkCopied && (
                <p
                  className="text-xs text-green-600 dark:text-green-400"
                  role="status"
                  data-testid="copy-success-message"
                >
                  링크가 클립보드에 복사되었습니다.
                </p>
              )}
            </div>
          )}

          {/* 공유 정보 */}
          {isPublic && (
            <div
              className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm"
              data-testid="share-info"
            >
              <Users
                className="h-5 w-5 text-blue-500 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  팀 공유 템플릿
                </p>
                <p className="text-blue-700 dark:text-blue-200">
                  같은 조직의 팀 멤버가 이 템플릿을 볼 수 있습니다. 편집 권한은
                  소유자에게만 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div
              className="flex items-center gap-2 text-sm text-destructive"
              role="alert"
              data-testid="error-message"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {success && (
            <div
              className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
              role="status"
              data-testid="success-message"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              공유 설정이 저장되었습니다.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={updateMutation.isPending}
            data-testid="cancel-button"
          >
            취소
          </Button>
          <Button
            onClick={handleSaveShare}
            disabled={updateMutation.isPending}
            data-testid="save-button"
          >
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

PromptTemplateShareModal.displayName = 'PromptTemplateShareModal';

export default PromptTemplateShareModal;
