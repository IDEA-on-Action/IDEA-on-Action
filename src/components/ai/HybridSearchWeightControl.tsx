/**
 * RAG 하이브리드 검색 가중치 조절 컴포넌트
 *
 * 키워드 검색과 벡터 검색의 가중치를 조절하는 UI
 *
 * @module components/ai/HybridSearchWeightControl
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// 타입 정의
// ============================================================================

interface HybridSearchWeightControlProps {
  /** 키워드 검색 가중치 (0.0 ~ 1.0) */
  keywordWeight?: number;
  /** 벡터 검색 가중치 (0.0 ~ 1.0) */
  vectorWeight?: number;
  /** 가중치 변경 핸들러 */
  onWeightChange?: (keyword: number, vector: number) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 가중치를 퍼센트로 변환
 */
function toPercent(weight: number): number {
  return Math.round(weight * 100);
}

/**
 * 퍼센트를 가중치로 변환
 */
function toWeight(percent: number): number {
  return percent / 100;
}

/**
 * 가중치 정규화 (합계 1.0 유지)
 */
function normalizeWeights(keyword: number, vector: number): {
  keyword: number;
  vector: number;
} {
  const sum = keyword + vector;
  if (sum === 0) {
    return { keyword: 0.5, vector: 0.5 };
  }
  return {
    keyword: keyword / sum,
    vector: vector / sum,
  };
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RAG 하이브리드 검색 가중치 조절 컴포넌트
 *
 * @example
 * ```tsx
 * <HybridSearchWeightControl
 *   keywordWeight={0.3}
 *   vectorWeight={0.7}
 *   onWeightChange={(keyword, vector) => {
 *     console.log('New weights:', { keyword, vector });
 *   }}
 * />
 * ```
 */
export const HybridSearchWeightControl: React.FC<HybridSearchWeightControlProps> = ({
  keywordWeight: initialKeyword = 0.3,
  vectorWeight: initialVector = 0.7,
  onWeightChange,
  disabled = false,
}) => {
  // ============================================================================
  // 상태
  // ============================================================================

  const [keywordWeight, setKeywordWeight] = useState(initialKeyword);
  const [vectorWeight, setVectorWeight] = useState(initialVector);

  // ============================================================================
  // 초기값 동기화
  // ============================================================================

  useEffect(() => {
    const normalized = normalizeWeights(initialKeyword, initialVector);
    setKeywordWeight(normalized.keyword);
    setVectorWeight(normalized.vector);
  }, [initialKeyword, initialVector]);

  // ============================================================================
  // 핸들러
  // ============================================================================

  /**
   * 키워드 가중치 변경 핸들러
   */
  const handleKeywordChange = (values: number[]) => {
    const newKeyword = toWeight(values[0]);
    const newVector = 1 - newKeyword;

    setKeywordWeight(newKeyword);
    setVectorWeight(newVector);

    onWeightChange?.(newKeyword, newVector);
  };

  /**
   * 벡터 가중치 변경 핸들러
   */
  const handleVectorChange = (values: number[]) => {
    const newVector = toWeight(values[0]);
    const newKeyword = 1 - newVector;

    setKeywordWeight(newKeyword);
    setVectorWeight(newVector);

    onWeightChange?.(newKeyword, newVector);
  };

  // ============================================================================
  // 렌더링
  // ============================================================================

  const keywordPercent = toPercent(keywordWeight);
  const vectorPercent = toPercent(vectorWeight);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">검색 가중치 조절</CardTitle>
            <CardDescription className="text-xs">
              키워드 검색과 의미 검색의 비중을 조정하세요
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  <strong>키워드 검색</strong>: 정확한 단어 매칭에 강함
                  <br />
                  <strong>의미 검색</strong>: 문맥과 의미 파악에 강함
                  <br />
                  <br />
                  두 가중치의 합은 항상 100%입니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 키워드 검색 가중치 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="keyword-weight" className="text-sm">
              키워드 검색
            </Label>
            <Badge variant="secondary" className="font-mono text-xs">
              {keywordPercent}%
            </Badge>
          </div>
          <Slider
            id="keyword-weight"
            value={[keywordPercent]}
            onValueChange={handleKeywordChange}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            정확한 단어 매칭 (Full-Text Search)
          </p>
        </div>

        {/* 벡터 검색 가중치 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vector-weight" className="text-sm">
              의미 검색
            </Label>
            <Badge variant="secondary" className="font-mono text-xs">
              {vectorPercent}%
            </Badge>
          </div>
          <Slider
            id="vector-weight"
            value={[vectorPercent]}
            onValueChange={handleVectorChange}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            문맥과 의미 이해 (Semantic Search)
          </p>
        </div>

        {/* 프리셋 버튼 */}
        <div className="pt-2 border-t">
          <Label className="text-xs text-muted-foreground mb-2 block">빠른 설정</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setKeywordWeight(0.7);
                setVectorWeight(0.3);
                onWeightChange?.(0.7, 0.3);
              }}
              disabled={disabled}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              키워드 중심
              <br />
              <span className="text-[10px] text-muted-foreground">70% / 30%</span>
            </button>
            <button
              onClick={() => {
                setKeywordWeight(0.5);
                setVectorWeight(0.5);
                onWeightChange?.(0.5, 0.5);
              }}
              disabled={disabled}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              균형
              <br />
              <span className="text-[10px] text-muted-foreground">50% / 50%</span>
            </button>
            <button
              onClick={() => {
                setKeywordWeight(0.3);
                setVectorWeight(0.7);
                onWeightChange?.(0.3, 0.7);
              }}
              disabled={disabled}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              의미 중심
              <br />
              <span className="text-[10px] text-muted-foreground">30% / 70%</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// 내보내기
// ============================================================================

export default HybridSearchWeightControl;
