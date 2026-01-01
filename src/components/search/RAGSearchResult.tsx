/**
 * RAGSearchResult Component
 *
 * RAG 검색 결과 카드 컴포넌트
 * - 검색 결과 표시 (제목, 내용, 점수)
 * - 관련성 점수 시각화
 * - 소스 문서 링크
 * - 하이라이팅
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileText, Calendar, ExternalLink, TrendingUp } from 'lucide-react';
import type { RAGSearchResult as RAGSearchResultType } from '@/types/ai/rag.types';
import { highlightQuery } from '@/lib/rag';

interface RAGSearchResultProps {
  /** 검색 결과 */
  result: RAGSearchResultType;
  /** 검색어 (하이라이팅용) */
  searchQuery: string;
  /** 클릭 핸들러 (선택) */
  onClick?: (result: RAGSearchResultType) => void;
}

/**
 * RAG 검색 결과 카드 컴포넌트
 */
export function RAGSearchResult({
  result,
  searchQuery,
  onClick,
}: RAGSearchResultProps) {
  // 유사도 점수를 퍼센트로 변환
  const similarityPercent = Math.round(result.similarity * 100);

  // 점수별 색상
  const getScoreColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.8) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  // 프로그레스 바 색상
  const getProgressColor = (score: number): string => {
    if (score >= 0.9) return 'bg-green-600';
    if (score >= 0.8) return 'bg-blue-600';
    if (score >= 0.7) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  // 소스 타입별 배지 색상
  const getSourceTypeBadge = () => {
    const typeMap = {
      file: { label: '파일', variant: 'secondary' as const },
      url: { label: 'URL', variant: 'outline' as const },
      manual: { label: '수동', variant: 'default' as const },
      service_data: { label: '서비스', variant: 'default' as const },
    };

    return typeMap[result.sourceType] || typeMap.manual;
  };

  const sourceTypeBadge = getSourceTypeBadge();

  // 클릭 핸들러
  const handleClick = () => {
    if (onClick) {
      onClick(result);
    }
  };

  // 하이라이팅된 콘텐츠
  const highlightedContent = highlightQuery(result.chunkContent, searchQuery);

  return (
    <Card
      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        {/* 헤더: 제목 + 점수 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            {/* 문서 제목 */}
            <h3 className="text-lg font-semibold text-foreground line-clamp-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              {result.documentTitle}
            </h3>

            {/* 메타 정보 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 소스 타입 배지 */}
              <Badge variant={sourceTypeBadge.variant} className="text-xs">
                {sourceTypeBadge.label}
              </Badge>

              {/* 서비스 ID */}
              {result.serviceId && (
                <Badge variant="outline" className="text-xs">
                  {result.serviceId}
                </Badge>
              )}

              {/* 청크 인덱스 */}
              <span className="text-xs text-muted-foreground">
                청크 #{result.chunkIndex}
              </span>
            </div>
          </div>

          {/* 관련성 점수 */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-2xl font-bold ${getScoreColor(result.similarity)}`}>
              {similarityPercent}%
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              관련성
            </div>
          </div>
        </div>

        {/* 관련성 프로그레스 바 */}
        <div className="mt-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${getProgressColor(result.similarity)}`}
              style={{ width: `${similarityPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 청크 내용 (하이라이팅) */}
        <div
          className="text-sm text-muted-foreground line-clamp-3"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />

        {/* 소스 URL */}
        {result.sourceUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3 w-3" />
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">{result.sourceUrl}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* 메타데이터 (디버그용, 선택적) */}
        {result.metadata && Object.keys(result.metadata).length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              메타데이터 보기
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">
              {JSON.stringify(result.metadata, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
