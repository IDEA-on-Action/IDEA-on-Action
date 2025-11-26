/**
 * RAG 하이브리드 검색 결과 컴포넌트
 *
 * 키워드 + 벡터 검색 결과를 점수와 함께 시각화
 *
 * @module components/ai/HybridSearchResults
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FileText, Calendar, Tag } from 'lucide-react';
import type { HybridSearchResult } from '@/hooks/useRAGHybridSearch';

// ============================================================================
// 타입 정의
// ============================================================================

interface HybridSearchResultsProps {
  /** 검색 결과 목록 */
  results: HybridSearchResult[];
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 에러 메시지 */
  error?: Error | null;
  /** 결과 클릭 핸들러 */
  onResultClick?: (result: HybridSearchResult) => void;
  /** 최대 표시 결과 수 */
  maxResults?: number;
  /** 점수 표시 여부 */
  showScores?: boolean;
  /** 메타데이터 표시 여부 */
  showMetadata?: boolean;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 점수에 따른 색상 클래스 반환
 */
function getScoreColorClass(score: number): string {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.6) return 'bg-yellow-500';
  return 'bg-gray-400';
}

/**
 * 점수를 퍼센트로 변환
 */
function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}

/**
 * 날짜 포맷
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/**
 * 점수 프로그레스 바
 */
interface ScoreProgressProps {
  label: string;
  score: number;
  className?: string;
}

const ScoreProgress: React.FC<ScoreProgressProps> = ({ label, score, className }) => {
  const percent = scoreToPercent(score);
  const colorClass = getScoreColorClass(score);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" indicatorClassName={colorClass} />
    </div>
  );
};

/**
 * 검색 결과 카드
 */
interface ResultCardProps {
  result: HybridSearchResult;
  index: number;
  showScores: boolean;
  showMetadata: boolean;
  onClick?: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  index,
  showScores,
  showMetadata,
  onClick,
}) => {
  const combinedPercent = scoreToPercent(result.combinedScore);
  const combinedColorClass = getScoreColorClass(result.combinedScore);

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="shrink-0">
                #{index + 1}
              </Badge>
              <CardTitle className="text-base truncate">{result.title}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>청크 {result.chunkIndex + 1}</span>
                {result.serviceId && (
                  <>
                    <span className="mx-1">•</span>
                    <Tag className="w-3 h-3" />
                    <span>{result.serviceId}</span>
                  </>
                )}
              </div>
            </CardDescription>
          </div>
          <Badge className={`${combinedColorClass} text-white shrink-0`}>
            {combinedPercent}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 청크 내용 */}
        <p className="text-sm text-muted-foreground line-clamp-3">{result.chunkContent}</p>

        {/* 점수 표시 */}
        {showScores && (
          <div className="space-y-2 pt-2">
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <ScoreProgress label="키워드 검색" score={result.keywordScore} />
              <ScoreProgress label="의미 검색" score={result.vectorScore} />
            </div>
          </div>
        )}

        {/* 메타데이터 */}
        {showMetadata && (
          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(result.createdAt)}</span>
            </div>
            {result.sourceType && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{result.sourceType}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RAG 하이브리드 검색 결과 컴포넌트
 *
 * @example
 * ```tsx
 * <HybridSearchResults
 *   results={results}
 *   isLoading={isSearching}
 *   error={error}
 *   showScores={true}
 *   showMetadata={true}
 *   onResultClick={(result) => console.log(result)}
 * />
 * ```
 */
export const HybridSearchResults: React.FC<HybridSearchResultsProps> = ({
  results,
  isLoading = false,
  error = null,
  onResultClick,
  maxResults = 50,
  showScores = true,
  showMetadata = true,
}) => {
  // ============================================================================
  // 로딩 상태
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">검색 중...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 에러 상태
  // ============================================================================

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="text-destructive">
            <FileText className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">검색 중 오류가 발생했습니다</p>
          </div>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 빈 결과
  // ============================================================================

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium">검색 결과가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            다른 키워드로 검색하거나 필터를 조정해보세요
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 검색 결과 표시
  // ============================================================================

  const displayResults = results.slice(0, maxResults);

  return (
    <div className="space-y-4">
      {/* 결과 요약 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-medium text-foreground">{results.length}개</span> 결과
          {results.length > maxResults && ` (상위 ${maxResults}개 표시)`}
        </p>
      </div>

      {/* 결과 목록 */}
      <div className="space-y-3">
        {displayResults.map((result, index) => (
          <ResultCard
            key={result.id}
            result={result}
            index={index}
            showScores={showScores}
            showMetadata={showMetadata}
            onClick={onResultClick ? () => onResultClick(result) : undefined}
          />
        ))}
      </div>

      {/* 더 많은 결과 안내 */}
      {results.length > maxResults && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            {results.length - maxResults}개 결과가 더 있습니다. 검색어를 더 구체적으로 입력해보세요.
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 내보내기
// ============================================================================

export default HybridSearchResults;
