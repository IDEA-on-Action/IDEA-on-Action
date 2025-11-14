/**
 * BlogPost Detail Page
 * Phase 11 Week 1: Blog System
 *
 * Displays a single blog post
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Calendar, Clock, Eye, User, Tag, Share2, Home } from 'lucide-react'
import { useBlogPostBySlug, useIncrementViewCount } from '@/hooks/useBlogPosts'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { GiscusComments } from '@/components/community/GiscusComments'
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
  const { data: post, isLoading, error } = useBlogPostBySlug(slug)
  const incrementViewCount = useIncrementViewCount()

  // Increment view count when post loads
  useEffect(() => {
    if (post?.id) {
      incrementViewCount.mutate(post.id)
    }
  }, [post?.id, incrementViewCount])

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
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    )
  }

  const publishedDate = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : 'Not published'

  const authorName = post.author?.user_metadata?.full_name || post.author?.email?.split('@')[0] || 'Unknown'

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: window.location.href,
        })
      } catch (err) {
        devError(err, { operation: '콘텐츠 공유', service: 'Blog' })
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <PageLayout>
      <Helmet>
        <title>{post.meta_title || post.title} | VIBE WORKING</title>
        <meta
          name="description"
          content={post.meta_description || post.excerpt || ''}
        />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ''} />
        {post.featured_image && (
          <meta property="og:image" content={post.featured_image} />
        )}

        {/* JSON-LD Structured Data - Article */}
        <script type="application/ld+json">
          {injectJsonLd(generateArticleSchema({
            title: post.title,
            description: post.excerpt || '',
            slug: slug || '',
            publishedAt: post.published_at || '',
            updatedAt: post.updated_at,
            author: authorName,
            image: post.featured_image,
            tags: post.tags?.map(tag => tag.name).filter(Boolean) || []
          }))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
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
          {/* Category Badge */}
          {post.category && (
            <Badge variant="outline" className="mb-4">
              {post.category.name}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">
              {post.excerpt}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
            {/* Author */}
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{authorName}</span>
            </div>

            {/* Published Date */}
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{publishedDate}</span>
              </div>
            )}

            {/* Reading Time */}
            {post.read_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{post.read_time} min read</span>
              </div>
            )}

            {/* View Count */}
            {post.view_count > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.view_count} views</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(tag => (
                <Badge key={tag.id} variant="secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Share Button */}
          <div className="flex justify-end mb-6">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <Separator className="mb-8" />

          {/* Featured Image */}
          {post.featured_image && (
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Markdown Content */}
          <MarkdownRenderer content={post.content} />

          {/* Footer */}
          <Separator className="my-8" />

          {/* Category Description */}
          {post.category?.description && (
            <div className="p-4 bg-muted rounded-lg mb-6">
              <h3 className="font-semibold mb-2">About {post.category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {post.category.description}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="my-12">
            <h2 className="text-2xl font-bold mb-6">댓글</h2>
            <GiscusComments
              repo="IDEA-on-Action/idea-on-action"
              repoId="R_kgDOQBAuJw"
              category="Blog Comments"
              categoryId="DIC_kwDOQBAuJ84CxmNn"
              mapping="specific"
            />
          </div>

          {/* Back to Blog */}
          <div className="text-center">
            <Button asChild>
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </PageLayout>
  )
}
