/**
 * RAGSearchFilters Component
 *
 * RAG 검색 필터 컴포넌트
 * - 소스 타입 필터 (파일, URL, 수동, 서비스)
 * - 서비스 ID 필터 (Minu Find, Frame, Build, Keep)
 * - 날짜 범위 필터
 * - 최소 점수 슬라이더
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RAGSourceType } from '@/types/rag.types';
import type { MinuServiceId } from '@/types/claude.types';

/**
 * 필터 옵션
 */
export interface RAGSearchFilterOptions {
  /** 소스 타입 필터 */
  sourceTypes: RAGSourceType[];
  /** 서비스 ID 필터 */
  serviceIds: MinuServiceId[];
  /** 최소 유사도 점수 (0-1) */
  minSimilarity: number;
}

interface RAGSearchFiltersProps {
  /** 필터 변경 핸들러 */
  onChange: (filters: RAGSearchFilterOptions) => void;
  /** 기본 필터 */
  defaultFilters?: Partial<RAGSearchFilterOptions>;
  /** 추가 클래스 */
  className?: string;
}

/**
 * 기본 필터 값
 */
const DEFAULT_FILTERS: RAGSearchFilterOptions = {
  sourceTypes: [],
  serviceIds: [],
  minSimilarity: 0.7,
};

/**
 * RAG 검색 필터 컴포넌트
 */
export function RAGSearchFilters({
  onChange,
  defaultFilters,
  className,
}: RAGSearchFiltersProps) {
  // 필터 상태
  const [filters, setFilters] = useState<RAGSearchFilterOptions>({
    ...DEFAULT_FILTERS,
    ...defaultFilters,
  });

  // 필터 열림 상태
  const [isOpen, setIsOpen] = useState(false);

  // ============================================================================
  // 소스 타입 설정
  // ============================================================================

  const sourceTypeOptions: { value: RAGSourceType; label: string }[] = [
    { value: 'file', label: '파일' },
    { value: 'url', label: 'URL' },
    { value: 'manual', label: '수동 입력' },
    { value: 'service_data', label: '서비스 데이터' },
  ];

  /**
   * 소스 타입 토글
   */
  const handleSourceTypeToggle = useCallback(
    (sourceType: RAGSourceType) => {
      const newSourceTypes = filters.sourceTypes.includes(sourceType)
        ? filters.sourceTypes.filter((t) => t !== sourceType)
        : [...filters.sourceTypes, sourceType];

      const newFilters = {
        ...filters,
        sourceTypes: newSourceTypes,
      };

      setFilters(newFilters);
      onChange(newFilters);
    },
    [filters, onChange]
  );

  // ============================================================================
  // 서비스 ID 설정
  // ============================================================================

  const serviceIdOptions: { value: MinuServiceId; label: string }[] = [
    { value: 'minu-find', label: 'Minu Find' },
    { value: 'minu-frame', label: 'Minu Frame' },
    { value: 'minu-build', label: 'Minu Build' },
    { value: 'minu-keep', label: 'Minu Keep' },
  ];

  /**
   * 서비스 ID 토글
   */
  const handleServiceIdToggle = useCallback(
    (serviceId: MinuServiceId) => {
      const newServiceIds = filters.serviceIds.includes(serviceId)
        ? filters.serviceIds.filter((s) => s !== serviceId)
        : [...filters.serviceIds, serviceId];

      const newFilters = {
        ...filters,
        serviceIds: newServiceIds,
      };

      setFilters(newFilters);
      onChange(newFilters);
    },
    [filters, onChange]
  );

  // ============================================================================
  // 최소 점수 설정
  // ============================================================================

  /**
   * 최소 점수 변경
   */
  const handleMinSimilarityChange = useCallback(
    (value: number[]) => {
      const newFilters = {
        ...filters,
        minSimilarity: value[0],
      };

      setFilters(newFilters);
      onChange(newFilters);
    },
    [filters, onChange]
  );

  // ============================================================================
  // 초기화
  // ============================================================================

  /**
   * 필터 초기화
   */
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    onChange(DEFAULT_FILTERS);
  }, [onChange]);

  // ============================================================================
  // 활성 필터 카운트
  // ============================================================================

  const activeFilterCount =
    filters.sourceTypes.length +
    filters.serviceIds.length +
    (filters.minSimilarity !== 0.7 ? 1 : 0);

  return (
    <div className={cn('', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="relative"
            aria-label="필터 열기"
          >
            <Filter className="h-4 w-4 mr-2" />
            필터
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">검색 필터</CardTitle>
                  <CardDescription className="text-xs">
                    검색 결과를 세밀하게 조정하세요
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  초기화
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 소스 타입 필터 */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">소스 타입</Label>
                <div className="space-y-2">
                  {sourceTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`source-${option.value}`}
                        checked={filters.sourceTypes.includes(option.value)}
                        onCheckedChange={() =>
                          handleSourceTypeToggle(option.value)
                        }
                      />
                      <Label
                        htmlFor={`source-${option.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 서비스 ID 필터 */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">서비스</Label>
                <div className="space-y-2">
                  {serviceIdOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`service-${option.value}`}
                        checked={filters.serviceIds.includes(option.value)}
                        onCheckedChange={() =>
                          handleServiceIdToggle(option.value)
                        }
                      />
                      <Label
                        htmlFor={`service-${option.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최소 점수 슬라이더 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">최소 관련성</Label>
                  <span className="text-sm font-semibold text-primary">
                    {Math.round(filters.minSimilarity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[filters.minSimilarity]}
                  onValueChange={handleMinSimilarityChange}
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
