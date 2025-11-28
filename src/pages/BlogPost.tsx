/**
 * Blog Post Detail Page
 *
 * 블로그 게시물 상세 페이지
 * - 마크다운 렌더링
 * - 메타 정보 표시
 * - 관련 게시물
 */

import { Link, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Calendar, Clock, Tag, User } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

import { usePostBySlug, usePosts, getReadingTime } from '@/hooks/usePosts'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: post, isLoading, error } = usePostBySlug(slug || '')
  const { data: relatedPosts } = usePosts({ limit: 3, status: 'published' })

  if (isLoading) {
    return <BlogPostSkeleton />
  }

  if (error || !post) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">게시물을 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            블로그로 돌아가기
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  const readingTime = getReadingTime(post.content)

  return (
    <>
      <Helmet>
        <title>{post.title} | VIBE WORKING 블로그</title>
        <meta name="description" content={post.excerpt || post.content.slice(0, 160)} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || post.content.slice(0, 160)} />
        {post.featured_image_url && (
          <meta property="og:image" content={post.featured_image_url} />
        )}
      </Helmet>

      <div className="min-h-screen gradient-bg">
        <Header />

        <main className="container mx-auto px-4 py-12">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-8"
            onClick={() => navigate('/blog')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            블로그로 돌아가기
          </Button>

          <article className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.published_at), 'yyyy년 M월 d일', { locale: ko })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {readingTime}분 읽기
                </span>
              </div>
            </header>

            {/* Featured Image */}
            {post.featured_image_url && (
              <div className="aspect-video rounded-lg overflow-hidden mb-8">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <MarkdownContent content={post.content} />
            </div>

            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">카테고리</h3>
                <div className="flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <section className="max-w-3xl mx-auto mt-16">
              <Separator className="mb-8" />
              <h2 className="text-2xl font-bold mb-6">관련 게시물</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedPosts
                  .filter((p) => p.slug !== post.slug)
                  .slice(0, 3)
                  .map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      to={`/blog/${relatedPost.slug}`}
                      className="p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <h3 className="font-medium line-clamp-2">{relatedPost.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}

// ===================================================================
// Components
// ===================================================================

/**
 * 간단한 마크다운 렌더링 컴포넌트
 * react-markdown 설치 전 임시 사용
 */
function MarkdownContent({ content }: { content: string }) {
  // 기본적인 마크다운 변환
  const html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Line breaks
    .replace(/\n/g, '<br />')

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${html}</p>` }}
    />
  )
}

function BlogPostSkeleton() {
  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-12 w-full mb-4" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="aspect-video w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
