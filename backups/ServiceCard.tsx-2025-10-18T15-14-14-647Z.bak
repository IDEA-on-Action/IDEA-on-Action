/**
 * ServiceCard Component
 *
 * 서비스 목록 페이지에서 사용되는 개별 서비스 카드
 * - 글래스모피즘 스타일
 * - 다크 모드 지원
 * - 호버 효과
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Star } from 'lucide-react'
import type { ServiceWithCategory } from '@/types/database'

interface ServiceCardProps {
  service: ServiceWithCategory
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { id, title, description, price, image_url, category, metrics } = service

  // 가격 포맷팅
  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price)

  // 메트릭 데이터
  const userCount = metrics?.users || 0
  const satisfaction = metrics?.satisfaction || 0

  return (
    <Link to={`/services/${id}`} className="block group">
      <Card className="glass-card hover-lift h-full overflow-hidden transition-all duration-300">
        {/* 이미지 섹션 */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
          {image_url ? (
            <img
              src={image_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-4xl font-bold text-muted-foreground opacity-50">
                {title.charAt(0)}
              </span>
            </div>
          )}

          {/* 카테고리 배지 (이미지 위 오버레이) */}
          {category && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="glass-card">
                {category.name}
              </Badge>
            </div>
          )}
        </div>

        {/* 콘텐츠 섹션 */}
        <CardHeader>
          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="line-clamp-3 text-sm">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 메트릭 정보 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {userCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{userCount.toLocaleString()}명</span>
              </div>
            )}
            {satisfaction > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{satisfaction.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* 가격 */}
          <div className="pt-2 border-t">
            <div className="text-2xl font-bold text-primary">
              {formattedPrice}
            </div>
            <div className="text-sm text-muted-foreground">부가세 별도</div>
          </div>
        </CardContent>

        {/* 푸터 - CTA */}
        <CardFooter>
          <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            자세히 보기
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
