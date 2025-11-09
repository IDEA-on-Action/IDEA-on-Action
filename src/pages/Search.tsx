/**
 * Search Page
 *
 * 통합 검색 페이지
 * - 서비스, 블로그, 공지사항 통합 검색
 * - 검색어 입력
 * - 타입 필터링
 * - 검색 결과 표시
 */

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SearchResultCard } from '@/components/search'
import { useSearch } from '@/hooks/useSearch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search as SearchIcon, X, Package, FileText, Bell, AlertCircle } from 'lucide-react'

export default function Search() {
  const { t } = useTranslation(['search', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialType = searchParams.get('type') || 'all'

  const [query, setQuery] = useState(initialQuery)
  const [inputValue, setInputValue] = useState(initialQuery)
  const [selectedType, setSelectedType] = useState<'all' | 'service' | 'blog' | 'notice'>(
    (initialType as 'all' | 'service' | 'blog' | 'notice') || 'all'
  )

  // 검색 실행
  const types =
    selectedType === 'all' ? ['service', 'blog', 'notice'] : [selectedType]

  const { data: results, isLoading, isError } = useSearch({
    query,
    types: types as ('service' | 'blog' | 'notice')[],
    limit: 30,
  })

  // URL 파라미터 업데이트
  useEffect(() => {
    if (query) {
      const params = new URLSearchParams()
      params.set('q', query)
      if (selectedType !== 'all') {
        params.set('type', selectedType)
      }
      setSearchParams(params, { replace: true })
    }
  }, [query, selectedType, setSearchParams])

  // 검색 제출
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setQuery(inputValue.trim())
    }
  }

  // 검색어 초기화
  const handleClear = () => {
    setInputValue('')
    setQuery('')
    setSearchParams(new URLSearchParams())
  }

  // 타입별 카운트
  const serviceCount = results?.filter((r) => r.type === 'service').length || 0
  const blogCount = results?.filter((r) => r.type === 'blog').length || 0
  const noticeCount = results?.filter((r) => r.type === 'notice').length || 0
  const totalCount = results?.length || 0

  return (
    <>
      <Helmet>
        <title>{t('search:title')} | VIBE WORKING</title>
        <meta
          name="description"
          content={`${t('search:title')} - VIBE WORKING`}
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-16 space-y-8">
          {/* 검색 헤더 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('search:title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('common:description')}
            </p>
          </div>

          {/* 검색 입력 */}
          <div className="glass-card p-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('search:placeholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pl-10 pr-10 h-12 text-lg"
                  autoFocus
                />
                {inputValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleClear}
                    aria-label={t('common:clear')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-primary hover:opacity-90 px-8"
                disabled={!inputValue.trim() || inputValue.trim().length < 2}
              >
                {t('search:button')}
              </Button>
            </form>

            {/* 타입 필터 */}
            {query && (
              <div className="mt-6">
                <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="all">
                      {t('search:filters.all')} ({totalCount})
                    </TabsTrigger>
                    <TabsTrigger value="service">
                      <Package className="h-4 w-4 mr-2" />
                      {t('search:filters.service')} ({serviceCount})
                    </TabsTrigger>
                    <TabsTrigger value="blog">
                      <FileText className="h-4 w-4 mr-2" />
                      {t('search:filters.blog')} ({blogCount})
                    </TabsTrigger>
                    <TabsTrigger value="notice">
                      <Bell className="h-4 w-4 mr-2" />
                      {t('search:filters.notice')} ({noticeCount})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          {/* 검색 결과 */}
          {query && (
            <div>
              {/* 로딩 상태 */}
              {isLoading && (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="glass-card p-6 space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
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
                  <AlertDescription>
                    {t('common:errors.generic')}
                  </AlertDescription>
                </Alert>
              )}

              {/* 결과 없음 */}
              {!isLoading && !isError && results && results.length === 0 && (
                <div className="text-center py-16 space-y-4">
                  <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold">{t('search:results.empty')}</h3>
                  <p className="text-muted-foreground">
                    &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;
                  </p>
                </div>
              )}

              {/* 검색 결과 목록 */}
              {!isLoading && !isError && results && results.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {t('search:results.count', { count: totalCount })}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {results.map((result) => (
                      <SearchResultCard
                        key={`${result.type}-${result.id}`}
                        result={result}
                        searchTerm={query}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 초기 상태 (검색어 없음) */}
          {!query && (
            <div className="text-center py-16 space-y-4">
              <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold">{t('search:results.minLength')}</h3>
              <p className="text-muted-foreground">
                {t('common:description')}
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
