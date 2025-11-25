/**
 * RAGSearchResults 컴포넌트
 *
 * RAG 검색 결과 표시 UI
 * - 검색 결과 카드 목록
 * - 유사도 점수 표시
 * - 출처 문서 링크
 * - 하이라이트된 텍스트 스니펫
 * - 빈 상태 처리
 *
 * @module components/ai/RAGSearchResults
 */

import * as React from 'react'
import {
  FileText,
  ExternalLink,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { RAGSearchResult } from '@/types/rag.types'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RAGSearchResults Props
 */
export interface RAGSearchResultsProps {
  /** 검색 결과 */
  results: RAGSearchResult[]
  /** 검색 중 여부 */
  isLoading?: boolean
  /** 검색어 */
  query?: string
  /** 결과 클릭 핸들러 */
  onResultClick?: (result: RAGSearchResult) => void
  /** 추가 클래스 */
  className?: string
  /** 최대 표시 결과 수 */
  maxResults?: number
  /** 컴팩트 모드 */
  compact?: boolean
}

/**
 * RAGSearchResultCard Props
 */
interface RAGSearchResultCardProps {
  result: RAGSearchResult
  query?: string
  onClick?: () => void
  compact?: boolean
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 유사도 점수를 퍼센트로 변환
 */
function similarityToPercent(similarity: number): number {
  return Math.round(similarity * 100)
}

/**
 * 유사도 점수에 따른 색상 클래스 반환
 */
function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.8) return 'text-green-600 dark:text-green-400'
  if (similarity >= 0.6) return 'text-blue-600 dark:text-blue-400'
  if (similarity >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-gray-600 dark:text-gray-400'
}

/**
 * 검색어 하이라이트
 */
function highlightQuery(text: string, query?: string): React.ReactNode {
  if (!query) return text

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const startIndex = textLower.indexOf(queryLower)

  if (startIndex === -1) return text

  const endIndex = startIndex + query.length

  return (
    <>
      {text.slice(0, startIndex)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {text.slice(startIndex, endIndex)}
      </mark>
      {text.slice(endIndex)}
    </>
  )
}

/**
 * 텍스트 요약 (최대 길이)
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// ============================================================================
// 검색 결과 카드
// ============================================================================

/**
 * RAGSearchResultCard 컴포넌트
 */
const RAGSearchResultCard: React.FC<RAGSearchResultCardProps> = ({
  result,
  query,
  onClick,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const similarityPercent = similarityToPercent(result.similarity)
  const similarityColor = getSimilarityColor(result.similarity)

  /**
   * 텍스트 복사
   */
  const handleCopy = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(result.chunkContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [result.chunkContent]
  )

  const displayText = compact
    ? truncateText(result.chunkContent, 150)
    : result.chunkContent

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        compact && 'p-3'
      )}
      onClick={onClick}
    >
      <CardHeader className={cn(compact && 'p-0 pb-2')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-base">
                {highlightQuery(result.documentTitle, query)}
              </CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2">
              {result.serviceId && (
                <Badge variant="outline" className="text-xs">
                  {result.serviceId}
                </Badge>
              )}
              <span className="text-xs">청크 #{result.chunkIndex + 1}</span>
            </CardDescription>
          </div>

          {/* 유사도 점수 */}
          <div className="flex flex-col items-end gap-1">
            <div className={cn('flex items-center gap-1 font-semibold', similarityColor)}>
              <TrendingUp className="h-4 w-4" />
              <span>{similarityPercent}%</span>
            </div>
            <span className="text-xs text-muted-foreground">유사도</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'p-0 pt-2')}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {/* 텍스트 스니펫 */}
          <div className="relative">
            <p
              className={cn(
                'text-sm text-gray-700 dark:text-gray-300 leading-relaxed',
                !isExpanded && compact && 'line-clamp-3'
              )}
            >
              {highlightQuery(displayText, query)}
            </p>

            {!compact && result.chunkContent.length > 150 && (
              <CollapsibleContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                  {result.chunkContent.slice(150)}
                </p>
              </CollapsibleContent>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              {/* 출처 링크 */}
              {result.sourceUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(result.sourceUrl || '', '_blank')
                  }}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  출처
                </Button>
              )}

              {/* 복사 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3 text-green-600" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    복사
                  </>
                )}
              </Button>
            </div>

            {/* 펼치기/접기 */}
            {!compact && result.chunkContent.length > 150 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      더 보기
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RAG 검색 결과 컴포넌트
 *
 * @example
 * <RAGSearchResults
 *   results={searchResults}
 *   isLoading={isSearching}
 *   query="프로젝트 관리"
 *   onResultClick={(result) => console.log(result)}
 * />
 */
export const RAGSearchResults = React.forwardRef<
  HTMLDivElement,
  RAGSearchResultsProps
>(
  (
    {
      results,
      isLoading = false,
      query,
      onResultClick,
      className,
      maxResults,
      compact = false,
    },
    ref
  ) => {
    const displayResults = maxResults ? results.slice(0, maxResults) : results

    // 로딩 상태
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn('space-y-4 animate-pulse', className)}
        >
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // 빈 상태
    if (!results || results.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
          )}
        >
          <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            검색 결과가 없습니다
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
            {query
              ? `"${query}"에 대한 관련 문서를 찾을 수 없습니다. 다른 키워드로 검색해보세요.`
              : '검색어를 입력하여 관련 문서를 찾아보세요.'}
          </p>
        </div>
      )
    }

    // 결과 목록
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">검색 결과</h3>
            <Badge variant="secondary">{results.length}개</Badge>
          </div>
          {query && (
            <p className="text-sm text-muted-foreground">
              "{query}" 검색 결과
            </p>
          )}
        </div>

        {/* 결과 카드 목록 */}
        <div className="space-y-3">
          {displayResults.map((result, index) => (
            <RAGSearchResultCard
              key={`${result.documentId}-${result.chunkIndex}`}
              result={result}
              query={query}
              onClick={() => onResultClick?.(result)}
              compact={compact}
            />
          ))}
        </div>

        {/* 더 보기 버튼 */}
        {maxResults && results.length > maxResults && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm">
              {results.length - maxResults}개 결과 더 보기
            </Button>
          </div>
        )}
      </div>
    )
  }
)

RAGSearchResults.displayName = 'RAGSearchResults'

export default RAGSearchResults
