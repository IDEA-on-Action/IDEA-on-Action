/**
 * BlogPost Detail Page
 * Phase 11 Week 1: Blog System
 *
 * Displays a single blog post
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Calendar, Clock, Eye, User, Tag, Share2 } from 'lucide-react'
import { useBlogPostBySlug, useIncrementViewCount } from '@/hooks/useBlogPosts'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { devError } from '@/lib/errors'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { data: post, isLoading, error } = useBlogPostBySlug(slug)
  const incrementViewCount = useIncrementViewCount()

  // Increment view count when post loads
  useEffect(() => {
    if (post?.id) {
      incrementViewCount.mutate(post.id)
    }
  }, [post?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg">Post not found</p>
          <Button asChild className="mt-4">
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
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
    <>
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
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-8">
          <Button variant="ghost" asChild>
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
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
    </>
  )
}
