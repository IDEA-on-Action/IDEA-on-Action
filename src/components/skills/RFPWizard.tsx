/**
 * RFP 문서 생성 마법사 컴포넌트
 *
 * 4단계 마법사 형태로 RFP(제안요청서) 문서를 생성합니다.
 * - Step 1: 기본 정보 (프로젝트명, 고객명, RFP 유형)
 * - Step 2: 프로젝트 상세 (기간, 예산, 범위, 목표)
 * - Step 3: 요구사항 (기능 요구사항, 산출물, 팀 구성)
 * - Step 4: 검토 및 생성 (미리보기, 문서 생성)
 *
 * @module components/skills/RFPWizard
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Rocket,
  Building,
  Calendar,
  Target,
  Users,
  Download,
  Loader2,
  Check,
  Plus,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useDocxGenerate } from '@/hooks/useDocxGenerate';
import type { RFPCategory, TemplateData } from '@/types/documents/docx.types';
import { RFP_CATEGORY_LABELS } from '@/types/documents/docx.types';

// ============================================================================
// 타입 정의
// ============================================================================

interface RFPWizardProps {
  /** 완료 콜백 (파일명 전달) */
  onComplete?: (fileName: string) => void;
  /** 취소 콜백 */
  onCancel?: () => void;
  /** 기본 RFP 카테고리 */
  defaultCategory?: RFPCategory;
}

interface RFPFormData {
  // Step 1: 기본 정보
  projectName: string;
  clientName: string;
  category: RFPCategory;

  // Step 2: 프로젝트 상세
  startDate: string;
  endDate: string;
  budget: string;
  scope: string[];
  objectives: string[];

  // Step 3: 요구사항
  requirements: string[];
  deliverables: string[];
  teamSize: string;
  techStack: string[];
}

interface StepInfo {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// 상수 정의
// ============================================================================

const STEPS: StepInfo[] = [
  {
    id: 1,
    title: '기본 정보',
    description: '프로젝트 개요를 입력합니다',
    icon: FileText,
  },
  {
    id: 2,
    title: '프로젝트 상세',
    description: '일정과 예산을 설정합니다',
    icon: Calendar,
  },
  {
    id: 3,
    title: '요구사항',
    description: '기능과 산출물을 정의합니다',
    icon: Target,
  },
  {
    id: 4,
    title: '검토 및 생성',
    description: '최종 확인 후 문서를 생성합니다',
    icon: Check,
  },
];

const CATEGORY_CONFIG: Record<
  RFPCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
  }
> = {
  government: {
    icon: Building2,
    description: '공공기관/정부 발주 프로젝트',
    color: 'text-blue-600',
  },
  startup: {
    icon: Rocket,
    description: '스타트업/중소기업 프로젝트',
    color: 'text-green-600',
  },
  enterprise: {
    icon: Building,
    description: '대기업/엔터프라이즈 프로젝트',
    color: 'text-purple-600',
  },
};

const INITIAL_FORM_DATA: RFPFormData = {
  projectName: '',
  clientName: '',
  category: 'startup',
  startDate: '',
  endDate: '',
  budget: '',
  scope: [],
  objectives: [],
  requirements: [],
  deliverables: [],
  teamSize: '',
  techStack: [],
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 날짜를 한국어 형식으로 포맷팅
 */
function formatDateKR(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 예산을 한국어 형식으로 포맷팅
 */
function formatBudgetKR(budget: string): string {
  if (!budget) return '-';
  const num = Number.parseInt(budget, 10);
  if (Number.isNaN(num)) return '-';

  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억원`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(0)}만원`;
  }
  return `${num.toLocaleString()}원`;
}

// ============================================================================
// 서브 컴포넌트: 배열 입력
// ============================================================================

interface ArrayInputProps {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  maxItems?: number;
}

function ArrayInput({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  maxItems = 10,
}: ArrayInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && items.length < maxItems) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={items.length >= maxItems}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!inputValue.trim() || items.length >= maxItems}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, index) => (
            <Badge
              key={item}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                aria-label="삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {items.length >= maxItems && (
        <p className="text-xs text-muted-foreground">
          최대 {maxItems}개까지 추가할 수 있습니다
        </p>
      )}
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RFP 문서 생성 마법사
 *
 * @example
 * ```tsx
 * <RFPWizard
 *   defaultCategory="enterprise"
 *   onComplete={(fileName) => console.log('생성 완료:', fileName)}
 *   onCancel={() => console.log('취소됨')}
 * />
 * ```
 */
export function RFPWizard({
  onComplete,
  onCancel,
  defaultCategory = 'startup',
}: RFPWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RFPFormData>({
    ...INITIAL_FORM_DATA,
    category: defaultCategory,
  });

  const { generate, isGenerating, progress, error, reset } = useDocxGenerate();

  // ============================================================================
  // 폼 데이터 업데이트 함수
  // ============================================================================

  const updateField = useCallback(
    <K extends keyof RFPFormData>(field: K, value: RFPFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addToArray = useCallback(
    (field: keyof RFPFormData, value: string) => {
      if (value.trim()) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...(prev[field] as string[]), value.trim()],
        }));
      }
    },
    []
  );

  const removeFromArray = useCallback(
    (field: keyof RFPFormData, index: number) => {
      setFormData((prev) => ({
        ...prev,
        [field]: (prev[field] as string[]).filter((_, i) => i !== index),
      }));
    },
    []
  );

  // ============================================================================
  // 유효성 검사
  // ============================================================================

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          formData.projectName.trim() !== '' &&
          formData.clientName.trim() !== '' &&
          formData.category
        );
      case 2:
        return formData.startDate !== '';
      case 3:
        return true; // 요구사항은 선택적
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  // ============================================================================
  // 네비게이션 함수
  // ============================================================================

  const handleNext = useCallback(() => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, canProceed]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      // 이전 단계는 항상 이동 가능
      if (step < currentStep) {
        setCurrentStep(step);
        return;
      }
      // 다음 단계는 현재 단계가 완료되어야 이동 가능
      if (step === currentStep + 1 && canProceed()) {
        setCurrentStep(step);
      }
    },
    [currentStep, canProceed]
  );

  // ============================================================================
  // 문서 생성 함수
  // ============================================================================

  const handleGenerate = useCallback(async () => {
    reset();

    const templateData: TemplateData = {
      projectName: formData.projectName,
      clientName: formData.clientName,
      startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      budget: formData.budget ? Number.parseInt(formData.budget, 10) : undefined,
      scope: formData.scope,
      deliverables: formData.deliverables,
      requirements: formData.requirements,
      objectives: formData.objectives,
      team: formData.teamSize
        ? [{ name: '팀', role: '담당', responsibilities: [] }]
        : undefined,
      customFields: {
        techStack: formData.techStack,
        teamSize: formData.teamSize,
      },
    };

    try {
      const result = await generate({
        template: 'rfp',
        category: formData.category,
        data: templateData,
      });

      if (result.success && onComplete) {
        onComplete(result.fileName);
      }
    } catch (err) {
      console.error('RFP 생성 실패:', err);
    }
  }, [formData, generate, onComplete, reset]);

  // ============================================================================
  // Step 1: 기본 정보 렌더링
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectName">
          프로젝트명 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="projectName"
          placeholder="예: 스마트 물류 시스템 구축"
          value={formData.projectName}
          onChange={(e) => updateField('projectName', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">
          발주 기관/회사 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="clientName"
          placeholder="예: ABC 주식회사"
          value={formData.clientName}
          onChange={(e) => updateField('clientName', e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label>
          RFP 유형 <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['government', 'startup', 'enterprise'] as RFPCategory[]).map(
            (cat) => {
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const isSelected = formData.category === cat;

              return (
                <Card
                  key={cat}
                  className={`cursor-pointer transition-all ${isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:border-primary/50'
                    }`}
                  onClick={() => updateField('category', cat)}
                >
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <Icon
                      className={`h-8 w-8 mb-2 ${isSelected ? 'text-primary' : config.color}`}
                    />
                    <span className="text-sm font-medium">
                      {RFP_CATEGORY_LABELS[cat]}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {config.description}
                    </span>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Step 2: 프로젝트 상세 렌더링
  // ============================================================================

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">
            시작일 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">종료일 (선택)</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            min={formData.startDate || undefined}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">예산 (원, 선택)</Label>
        <Input
          id="budget"
          type="number"
          placeholder="예: 100000000 (1억원)"
          value={formData.budget}
          onChange={(e) => updateField('budget', e.target.value)}
        />
        {formData.budget && (
          <p className="text-sm text-muted-foreground">
            {formatBudgetKR(formData.budget)}
          </p>
        )}
      </div>

      <ArrayInput
        label="프로젝트 범위"
        placeholder="범위 항목 입력 후 Enter"
        items={formData.scope}
        onAdd={(value) => addToArray('scope', value)}
        onRemove={(index) => removeFromArray('scope', index)}
      />

      <ArrayInput
        label="프로젝트 목표"
        placeholder="목표 항목 입력 후 Enter"
        items={formData.objectives}
        onAdd={(value) => addToArray('objectives', value)}
        onRemove={(index) => removeFromArray('objectives', index)}
      />
    </div>
  );

  // ============================================================================
  // Step 3: 요구사항 렌더링
  // ============================================================================

  const renderStep3 = () => (
    <div className="space-y-6">
      <ArrayInput
        label="기능 요구사항"
        placeholder="요구사항 입력 후 Enter"
        items={formData.requirements}
        onAdd={(value) => addToArray('requirements', value)}
        onRemove={(index) => removeFromArray('requirements', index)}
        maxItems={20}
      />

      <ArrayInput
        label="산출물"
        placeholder="산출물 입력 후 Enter (예: 요구사항 정의서)"
        items={formData.deliverables}
        onAdd={(value) => addToArray('deliverables', value)}
        onRemove={(index) => removeFromArray('deliverables', index)}
      />

      <div className="space-y-2">
        <Label htmlFor="teamSize">예상 팀 규모</Label>
        <Input
          id="teamSize"
          placeholder="예: 5~7명"
          value={formData.teamSize}
          onChange={(e) => updateField('teamSize', e.target.value)}
        />
      </div>

      <ArrayInput
        label="기술 스택"
        placeholder="기술 스택 입력 후 Enter (예: React, Node.js)"
        items={formData.techStack}
        onAdd={(value) => addToArray('techStack', value)}
        onRemove={(index) => removeFromArray('techStack', index)}
        maxItems={15}
      />
    </div>
  );

  // ============================================================================
  // Step 4: 검토 및 생성 렌더링
  // ============================================================================

  const renderStep4 = () => {
    const CategoryIcon = CATEGORY_CONFIG[formData.category].icon;

    return (
      <div className="space-y-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            입력한 내용을 확인하고 RFP 문서를 생성합니다.
          </AlertDescription>
        </Alert>

        {/* 기본 정보 */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            기본 정보
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">프로젝트명:</span>
              <p className="font-medium">{formData.projectName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">발주 기관:</span>
              <p className="font-medium">{formData.clientName}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">RFP 유형:</span>
              <div className="flex items-center gap-2 mt-1">
                <CategoryIcon className="h-4 w-4" />
                <span className="font-medium">
                  {RFP_CATEGORY_LABELS[formData.category]}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 프로젝트 상세 */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            프로젝트 상세
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">시작일:</span>
              <p className="font-medium">{formatDateKR(formData.startDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">종료일:</span>
              <p className="font-medium">{formatDateKR(formData.endDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">예산:</span>
              <p className="font-medium">{formatBudgetKR(formData.budget)}</p>
            </div>
          </div>

          {formData.scope.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                프로젝트 범위:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.scope.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {formData.objectives.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                프로젝트 목표:
              </span>
              <ul className="list-disc list-inside mt-1 text-sm">
                {formData.objectives.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Separator />

        {/* 요구사항 */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            요구사항
          </h4>

          {formData.requirements.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                기능 요구사항 ({formData.requirements.length}개):
              </span>
              <ul className="list-disc list-inside mt-1 text-sm">
                {formData.requirements.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {formData.requirements.length > 5 && (
                  <li className="text-muted-foreground">
                    외 {formData.requirements.length - 5}개
                  </li>
                )}
              </ul>
            </div>
          )}

          {formData.deliverables.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">산출물:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.deliverables.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.teamSize && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  예상 팀 규모:
                </span>
                <p className="font-medium">{formData.teamSize}</p>
              </div>
            )}
          </div>

          {formData.techStack.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">기술 스택:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.techStack.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 에러 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          RFP 문서 생성
        </CardTitle>
        <CardDescription>
          4단계를 거쳐 맞춤형 RFP 문서를 생성합니다.
        </CardDescription>

        {/* 진행 단계 표시기 */}
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => goToStep(step.id)}
                disabled={step.id > currentStep && !canProceed()}
                className={`flex items-center gap-2 transition-colors ${currentStep >= step.id
                  ? 'text-primary cursor-pointer'
                  : 'text-muted-foreground'
                  } ${step.id > currentStep && !canProceed() ? 'cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep > step.id ? 'bg-primary text-primary-foreground' : (currentStep === step.id ? 'border-2 border-primary' : 'border border-muted')
                    }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-sm hidden md:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 transition-colors ${currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 현재 단계 설명 (모바일) */}
        <p className="text-sm text-muted-foreground mt-2 md:hidden">
          {STEPS[currentStep - 1].description}
        </p>
      </CardHeader>

      <CardContent>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div>
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isGenerating}
            >
              취소
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isGenerating}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
          )}
          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중... {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  RFP 생성
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>

      {/* 생성 진행률 바 */}
      {isGenerating && (
        <div className="px-6 pb-6">
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </Card>
  );
}

export default RFPWizard;
