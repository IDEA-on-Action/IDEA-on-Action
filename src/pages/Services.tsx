/**
 * Services Page
 *
 * 서비스 목록 페이지
 * - 그리드 레이아웃 (반응형)
 * - 카테고리 필터링
 * - 정렬 기능
 * - 로딩/에러 상태 처리
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SEO } from '@/components/shared/SEO'
import { ServiceCard } from '@/components/services/ServiceCard'
import { useServices, useServiceCategories, type ServiceSortBy } from '@/hooks/useServices'
import { useIsAdmin } from '@/hooks/auth/useIsAdmin'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertCircle, PackageOpen, Plus } from 'lucide-react'

export default function Services() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<ServiceSortBy>('newest')
  const navigate = useNavigate()

  // 데이터 조회
  const { data: categories, isLoading: categoriesLoading } = useServiceCategories()
  const {
    data: services,
    isLoading: servicesLoading,
    isError,
    error,
  } = useServices({
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
  })
  const { data: isAdmin } = useIsAdmin()

  const isLoading = categoriesLoading || servicesLoading

  return (
    <>
      <SEO
        title="서비스"
        description="AI 기반 프로덕트 스튜디오 - 풀스택 개발, UI/UX 디자인, MVP 개발, 운영 대행까지. 아이디어를 실현하는 전문 서비스를 제공합니다."
        keywords={['AI 서비스', '풀스택 개발', 'MVP 개발', 'UI/UX 디자인', '운영 대행', '프로덕트 스튜디오']}
        canonical="/services"
        ogType="website"
        breadcrumbs={[
          { name: '홈', url: '/' },
          { name: '서비스', url: '/services' }
        ]}
      />

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-16 space-y-12" aria-label="서비스 목록">
          {/* 헤더 섹션 */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                우리의 서비스
              </h1>
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin/services/new')}
                  className="bg-gradient-primary hover:opacity-90"
                  aria-label="새 서비스 등록"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  서비스 등록
                </Button>
              )}
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI 기반 워킹 솔루션으로 업무 생산성을 극대화하세요
            </p>
          </div>

          {/* 필터 섹션 */}
          <div className="glass-card p-6 space-y-6">
            {/* 카테고리 필터 (Tabs) */}
            <div>
              <h3 id="category-label" className="text-sm font-medium mb-3">카테고리</h3>
              {categoriesLoading ? (
                <div className="flex gap-2" aria-label="카테고리 로딩 중">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24" aria-hidden="true" />
                  ))}
                </div>
              ) : (
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} aria-labelledby="category-label">
                  <TabsList className="flex-wrap h-auto" role="tablist">
                    <TabsTrigger value="all" role="tab" aria-label="모든 카테고리 보기">전체</TabsTrigger>
                    {categories?.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        role="tab"
                        aria-label={`${category.name} 카테고리 보기`}
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>

            {/* 정렬 옵션 */}
            <div className="flex items-center gap-4">
              <h3 id="sort-label" className="text-sm font-medium">정렬</h3>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as ServiceSortBy)}>
                <SelectTrigger className="w-[180px]" aria-labelledby="sort-label">
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된순</SelectItem>
                  <SelectItem value="price-asc">가격 낮은순</SelectItem>
                  <SelectItem value="price-desc">가격 높은순</SelectItem>
                  <SelectItem value="popular">인기순</SelectItem>
                </SelectContent>
              </Select>

              {/* 결과 카운트 */}
              {services && (
                <div className="ml-auto text-sm text-muted-foreground">
                  총 <span className="font-semibold text-foreground">{services.length}개</span>의 서비스
                </div>
              )}
            </div>
          </div>

          {/* 서비스 그리드 */}
          <div>
            {/* 로딩 상태 */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* 에러 상태 */}
            {isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류 발생</AlertTitle>
                <AlertDescription>
                  서비스를 불러오는 중 문제가 발생했습니다: {error?.message}
                </AlertDescription>
              </Alert>
            )}

            {/* 빈 상태 */}
            {!isLoading && !isError && services?.length === 0 && (
              <div className="text-center py-16 space-y-4" role="status">
                <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" aria-hidden="true" />
                <h3 className="text-lg font-semibold">서비스가 없습니다</h3>
                <p className="text-muted-foreground">
                  {selectedCategory === 'all'
                    ? '아직 등록된 서비스가 없습니다.'
                    : '해당 카테고리에 서비스가 없습니다. 다른 카테고리를 선택해보세요.'}
                </p>
              </div>
            )}

            {/* 서비스 목록 */}
            {!isLoading && !isError && services && services.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
