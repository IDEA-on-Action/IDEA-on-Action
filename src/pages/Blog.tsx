/**
 * Blog List Page
 *
 * 블로그 목록 페이지
 * - 게시물 목록 표시
 * - 태그/카테고리 필터링
 * - 검색 기능
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, Calendar, Clock, Tag, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

import { usePosts, usePostTags, getReadingTime } from '@/hooks/usePosts'
import type { Post } from '@/types/database'

export default function Blog() {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | undefined>()

  const { data: posts, isLoading, error } = usePosts({
    status: 'published',
    tag: selectedTag,
    search: search || undefined,
  })

  const { data: tags } = usePostTags()

  return (
    <>
      <Helmet>
        <title>블로그 | VIBE WORKING</title>
        <meta name="description" content="AI 워킹 솔루션, 기술 트렌드, 비즈니스 인사이트에 대한 블로그 게시물" />
      </Helmet>

      <div className="min-h-screen gradient-bg">
        <Header />

        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              VIBE WORKING 블로그
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI 기반 워킹 솔루션, 기술 트렌드, 비즈니스 인사이트를 공유합니다.
            </p>
          </section>

          {/* Search & Filters */}
          <section className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="게시물 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedTag === undefined ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(undefined)}
                >
                  전체
                </Button>
                {tags?.slice(0, 5).map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTag(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Posts Grid */}
          <section>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive">게시물을 불러오는데 실패했습니다.</p>
              </div>
            ) : posts?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">게시물이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts?.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}

// ===================================================================
// Components
// ===================================================================

function PostCard({ post }: { post: Post }) {
  const readingTime = getReadingTime(post.content)

  return (
    <Card className="glass-card hover-lift overflow-hidden group">
      {/* Featured Image */}
      {post.featured_image_url && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {post.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <Link to={`/blog/${post.slug}`}>
          <h2 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
        </Link>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Excerpt */}
        <p className="text-muted-foreground text-sm line-clamp-3">
          {post.excerpt || post.content.slice(0, 150)}
        </p>
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
        {/* Meta */}
        <div className="flex items-center gap-3">
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(post.published_at), 'MMM d, yyyy', { locale: ko })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime}분
          </span>
        </div>

        {/* Read More */}
        <Link
          to={`/blog/${post.slug}`}
          className="flex items-center gap-1 text-primary hover:underline"
        >
          읽기
          <ChevronRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  )
}

function PostSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardHeader className="pb-2">
        <div className="flex gap-1 mb-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-6 w-full" />
      </CardHeader>
      <CardContent className="pb-2">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter className="pt-2">
        <Skeleton className="h-4 w-24" />
      </CardFooter>
    </Card>
  )
}
