/**
 * PromptTemplateSelector 컴포넌트
 *
 * 프롬프트 템플릿 선택 및 변수 입력 UI
 * - 드롭다운 형태의 템플릿 선택기
 * - 카테고리별 그룹화 (내 템플릿 / 팀 공유 / 시스템)
 * - 선택 시 변수 입력 폼 표시
 * - 미리보기 기능
 * - 실시간 변수 치환 프리뷰
 *
 * @module components/ai/PromptTemplateSelector
 */

import * as React from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FileText,
  Eye,
  User,
  Users,
  Settings,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';

// 타입이 아직 생성되지 않았으므로 임포트 경로만 설정
// import type { PromptTemplate, TemplateVariable } from '@/types/prompt-template.types';

// ============================================================================
// Types (임시 - 실제로는 prompt-template.types.ts에서 임포트)
// ============================================================================

/**
 * 템플릿 카테고리
 */
type TemplateCategory = 'mine' | 'shared' | 'system';

/**
 * 템플릿 변수
 */
interface TemplateVariable {
  name: string;
  default_value?: string;
  description?: string;
}

/**
 * 프롬프트 템플릿 (실제 타입에서 가져옴)
 */
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

export interface PromptTemplateSelectorProps {
  /** 템플릿 선택 콜백 */
  onTemplateSelect?: (template: PromptTemplate) => void;
  /** 프롬프트 생성 콜백 */
  onPromptGenerate?: (prompt: string, template: PromptTemplate) => void;
  /** 추가 클래스 */
  className?: string;
  /** 기본 선택 템플릿 ID */
  defaultTemplateId?: string;
  /** 자동 프리뷰 표시 */
  autoShowPreview?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 변수를 실제 값으로 치환
 *
 * @param content - 템플릿 내용
 * @param values - 변수 값 맵
 * @returns 치환된 내용
 */
function substituteVariables(
  content: string,
  values: Record<string, string>
): string {
  let result = content;
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || `{{${key}}}`);
  });
  return result;
}

/**
 * 템플릿을 카테고리별로 그룹화
 *
 * @param templates - 템플릿 목록
 * @param currentUserId - 현재 사용자 ID
 * @returns 카테고리별 템플릿 맵
 */
function groupTemplatesByCategory(
  templates: PromptTemplate[],
  currentUserId: string
): Record<TemplateCategory, PromptTemplate[]> {
  const groups: Record<TemplateCategory, PromptTemplate[]> = {
    mine: [],
    shared: [],
    system: [],
  };

  templates.forEach((template) => {
    if (template.isSystem) {
      groups.system.push(template);
    } else if (template.createdBy === currentUserId) {
      groups.mine.push(template);
    } else if (template.isPublic) {
      groups.shared.push(template);
    }
  });

  return groups;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 프롬프트 템플릿 선택기
 *
 * @example
 * // 기본 사용
 * <PromptTemplateSelector
 *   onPromptGenerate={(prompt, template) => console.log(prompt)}
 * />
 *
 * @example
 * // 기본 템플릿 선택 및 자동 미리보기
 * <PromptTemplateSelector
 *   defaultTemplateId="template-123"
 *   autoShowPreview={true}
 *   onTemplateSelect={(template) => console.log(template)}
 * />
 */
export const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
  onTemplateSelect,
  onPromptGenerate,
  className,
  defaultTemplateId,
  autoShowPreview = false,
}) => {
  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    defaultTemplateId || null
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(autoShowPreview);
  const [error, setError] = useState<string | null>(null);

  // 현재 사용자 인증 정보
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // 프롬프트 템플릿 목록 조회
  const { data: templatesResponse, isLoading } = usePromptTemplates();

  // 템플릿 목록 (memoized)
  const templates = useMemo(() => templatesResponse?.templates || [], [templatesResponse?.templates]);

  // 선택된 템플릿
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // 카테고리별 그룹화된 템플릿
  const groupedTemplates = useMemo(
    () => groupTemplatesByCategory(templates, currentUserId),
    [templates, currentUserId]
  );

  // 프리뷰 텍스트 (변수 치환된)
  const previewText = useMemo(() => {
    if (!selectedTemplate) return '';
    return substituteVariables(selectedTemplate.userPromptTemplate, variableValues);
  }, [selectedTemplate, variableValues]);

  // 모든 변수가 채워졌는지 확인
  const allVariablesFilled = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.variables.every(
      (varName) => variableValues[varName]?.trim().length > 0
    );
  }, [selectedTemplate, variableValues]);

  // 템플릿 선택 핸들러
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = templates.find((t) => t.id === templateId);

      if (template) {
        // 변수 초기값 설정
        const initialValues: Record<string, string> = {};
        template.variables.forEach((varName) => {
          initialValues[varName] = '';
        });
        setVariableValues(initialValues);

        onTemplateSelect?.(template);
      }
    },
    [templates, onTemplateSelect]
  );

  // 변수 값 변경 핸들러
  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // 프롬프트 생성 핸들러
  const handleGeneratePrompt = useCallback(() => {
    if (!selectedTemplate) return;

    const generatedPrompt = substituteVariables(
      selectedTemplate.userPromptTemplate,
      variableValues
    );

    onPromptGenerate?.(generatedPrompt, selectedTemplate);
  }, [selectedTemplate, variableValues, onPromptGenerate]);

  // 미리보기 토글
  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  // 카테고리 아이콘
  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'mine':
        return <User className="h-4 w-4" aria-hidden="true" />;
      case 'shared':
        return <Users className="h-4 w-4" aria-hidden="true" />;
      case 'system':
        return <Settings className="h-4 w-4" aria-hidden="true" />;
    }
  };

  // 카테고리 레이블
  const getCategoryLabel = (category: TemplateCategory) => {
    switch (category) {
      case 'mine':
        return '내 템플릿';
      case 'shared':
        return '팀 공유';
      case 'system':
        return '시스템';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" aria-hidden="true" />
          템플릿 선택
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
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

        {/* 템플릿 선택 드롭다운 */}
        <div className="space-y-2">
          <Label htmlFor="template-select">프롬프트 템플릿</Label>
          <Select
            value={selectedTemplateId || undefined}
            onValueChange={handleTemplateSelect}
            disabled={isLoading}
          >
            <SelectTrigger
              id="template-select"
              aria-label="프롬프트 템플릿 선택"
              data-testid="template-selector"
            >
              <SelectValue placeholder="템플릿을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {/* 내 템플릿 */}
              {groupedTemplates.mine.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    {getCategoryIcon('mine')}
                    {getCategoryLabel('mine')}
                  </SelectLabel>
                  {groupedTemplates.mine.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      data-testid={`template-item-${template.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {/* 팀 공유 템플릿 */}
              {groupedTemplates.shared.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    {getCategoryIcon('shared')}
                    {getCategoryLabel('shared')}
                  </SelectLabel>
                  {groupedTemplates.shared.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      data-testid={`template-item-${template.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {/* 시스템 템플릿 */}
              {groupedTemplates.system.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    {getCategoryIcon('system')}
                    {getCategoryLabel('system')}
                  </SelectLabel>
                  {groupedTemplates.system.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      data-testid={`template-item-${template.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 변수 입력 폼 */}
        {selectedTemplate && selectedTemplate.variables.length > 0 && (
          <div className="space-y-4" data-testid="variable-form">
            <div className="flex items-center justify-between">
              <Label className="text-base">변수 입력</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTogglePreview}
                className="gap-2"
                data-testid="preview-toggle"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                미리보기
              </Button>
            </div>

            <div className="grid gap-4">
              {selectedTemplate.variables.map((varName) => (
                <div key={varName} className="space-y-2">
                  <Label htmlFor={`var-${varName}`}>
                    {varName}
                  </Label>
                  <Input
                    id={`var-${varName}`}
                    value={variableValues[varName] || ''}
                    onChange={(e) =>
                      handleVariableChange(varName, e.target.value)
                    }
                    placeholder={`${varName} 입력`}
                    data-testid={`variable-input-${varName}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 프롬프트 생성 버튼 */}
        {selectedTemplate && (
          <Button
            onClick={handleGeneratePrompt}
            disabled={!allVariablesFilled}
            className="w-full gap-2"
            size="lg"
            data-testid="generate-button"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            프롬프트 생성
          </Button>
        )}

        {/* 미리보기 다이얼로그 */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl" data-testid="preview-dialog">
            <DialogHeader>
              <DialogTitle>프롬프트 미리보기</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name || '템플릿'} - 변수가 치환된 결과
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                value={previewText}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                data-testid="preview-text"
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  data-testid="preview-close"
                >
                  닫기
                </Button>
                <Button
                  onClick={handleGeneratePrompt}
                  disabled={!allVariablesFilled}
                  data-testid="preview-generate"
                >
                  프롬프트 생성
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

PromptTemplateSelector.displayName = 'PromptTemplateSelector';

export default PromptTemplateSelector;
