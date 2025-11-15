/**
 * SearchResultCard Component
 *
 * 검색 결과 카드 컴포넌트
 * - 타입별 아이콘 표시
 * - 하이라이팅
 * - 반응형 디자인
 */

import { Link } from 'react-router-dom'
import { Package, FileText, Bell, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@/hooks/useSearch'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

interface SearchResultCardProps {
  result: SearchResult
  searchTerm: string
}

export function SearchResultCard({ result, searchTerm }: SearchResultCardProps) {
  const { t, i18n } = useTranslation('search')

  const typeConfig = {
    service: {
      label: t('search:card.service'),
      Icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    blog: {
      label: t('search:card.blog'),
      Icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    notice: {
      label: t('search:card.notice'),
      Icon: Bell,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  }

  const config = typeConfig[result.type]
  const { Icon } = config

  // 날짜 로케일
  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const dateFormat = i18n.language === 'ko' ? 'yyyy년 M월 d일' : 'MMM d, yyyy'

  // 검색어 하이라이팅
  const highlightText = (text: string) => {
    if (!searchTerm) return text

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 text-foreground font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <Link
      to={result.url}
      className="block glass-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex gap-4">
        {/* 이미지 (서비스/블로그만) */}
        {result.image_url && (
          <div className="flex-shrink-0">
            <img
              src={result.image_url}
              alt={result.title}
              className="w-24 h-24 object-cover rounded-lg"
              loading="lazy"
              width={96}
              height={96}
            />
          </div>
        )}

        {/* 콘텐츠 */}
        <div className="flex-1 space-y-2">
          {/* 헤더 (타입 배지 + 카테고리) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`${config.bgColor} ${config.color} border-0 font-medium`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>

            {result.category && (
              <Badge variant="outline" className="font-normal">
                {result.category}
              </Badge>
            )}

            {/* 날짜 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Calendar className="h-3 w-3" />
              {format(new Date(result.created_at), dateFormat, { locale: dateLocale })}
            </div>
          </div>

          {/* 제목 */}
          <h3 className="text-lg font-semibold text-foreground line-clamp-1">
            {highlightText(result.title)}
          </h3>

          {/* 설명 */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {highlightText(result.description)}
          </p>
        </div>
      </div>
    </Link>
  )
}
