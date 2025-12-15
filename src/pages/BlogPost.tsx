/**
 * BlogPost Detail Page
 * WordPress 연동 버전
 *
 * WordPress.com API를 통해 단일 블로그 포스트 표시
 */

import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Calendar, User, Tag, Share2, Home, MessageCircle, Heart, ExternalLink } from 'lucide-react'
import { useWordPressPost } from '@/hooks/useWordPressPosts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageLayout } from '@/components/layouts/PageLayout'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { formatDistanceToNow } from 'date-fns'
import { devError } from '@/lib/errors'
import { generateArticleSchema, injectJsonLd } from '@/lib/json-ld'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()

  // WordPress ID 추출 (wp-123 형식에서 123 추출)
  const postId = slug?.startsWith('wp-') ? parseInt(slug.replace('wp-', ''), 10) : undefined

  const { data: post, isLoading, error } = useWordPressPost(postId)

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="게시글을 불러오는 중..." />
      </PageLayout>
    )
  }

  if (error || !post) {
    return (
      <PageLayout>
        <ErrorState
          error={error || new Error('게시글을 찾을 수 없습니다.')}
          title="게시글을 찾을 수 없습니다"
          onRetry={() => globalThis.location.reload()}
        />
      </PageLayout>
    )
  }

  const publishedDate = post.publishedAt
    ? formatDistanceToNow(post.publishedAt, { addSuffix: true })
    : 'Not published'

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: globalThis.location.href,
        })
      } catch (err) {
        devError(err, { operation: '콘텐츠 공유', service: 'Blog' })
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(globalThis.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  // HTML에서 텍스트만 추출하는 헬퍼 함수
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const excerptText = post.excerpt ? stripHtml(post.excerpt) : ''

  return (
    <PageLayout>
      <Helmet>
        <title>{post.title} | IDEA on Action</title>
        <meta name="description" content={excerptText} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={excerptText} />
        {post.featuredImage && (
          <meta property="og:image" content={post.featuredImage} />
        )}

        {/* JSON-LD Structured Data - Article */}
        <script type="application/ld+json">
          {injectJsonLd(generateArticleSchema({
            title: post.title,
            description: excerptText,
            slug: slug || '',
            publishedAt: post.publishedAt.toISOString(),
            updatedAt: undefined,
            author: post.author.name,
            image: post.featuredImage,
            tags: post.tags || []
          }))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/stories/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                블로그 목록
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                홈
              </Link>
            </Button>
          </div>
        </div>

        {/* Article Header */}
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Category Badges */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map(cat => (
                <Badge key={cat} variant="outline">
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <div
              className="text-xl text-muted-foreground mb-6"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
            {/* Author */}
            <div className="flex items-center gap-2">
              {post.author.avatar && (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <User className="w-4 h-4" />
              <span>{post.author.name}</span>
            </div>

            {/* Published Date */}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{publishedDate}</span>
            </div>

            {/* Comment Count */}
            {post.commentCount && post.commentCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.commentCount} comments</span>
              </div>
            )}

            {/* Like Count */}
            {post.likeCount && post.likeCount > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.likeCount} likes</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(tagName => (
                <Badge key={tagName} variant="secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {tagName}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            {/* WordPress 원본 링크 */}
            <Button variant="outline" size="sm" asChild>
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                원본 보기
              </a>
            </Button>

            {/* Share Button */}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
          </div>

          <Separator className="mb-8" />

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* HTML Content (WordPress returns HTML) */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Footer */}
          <Separator className="my-8" />

          {/* WordPress 원본 댓글 안내 */}
          <div className="my-12 p-6 bg-muted rounded-lg text-center">
            <h2 className="text-xl font-bold mb-4">댓글</h2>
            <p className="text-muted-foreground mb-4">
              댓글은 WordPress 원본 페이지에서 확인하실 수 있습니다.
            </p>
            <Button asChild>
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                댓글 보러 가기
              </a>
            </Button>
          </div>

          {/* Back to Blog */}
          <div className="text-center">
            <Button asChild>
              <Link to="/stories/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                블로그 목록으로
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </PageLayout>
  )
}
