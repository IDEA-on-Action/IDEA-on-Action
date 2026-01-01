/**
 * BlogCard Component
 * Phase 11 Week 1: Blog System
 *
 * Displays a blog post card in the list view
 */

import { Link } from 'react-router-dom'
import { Calendar, Clock, Eye, User, Tag } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BlogPostWithRelations } from '@/types/cms/blog'
import { formatDistanceToNow } from 'date-fns'

interface BlogCardProps {
  post: BlogPostWithRelations
}

export function BlogCard({ post }: BlogCardProps) {
  const publishedDate = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : 'Not published'

  const authorName = post.author?.user_metadata?.full_name || post.author?.email?.split('@')[0] || 'Unknown'

  return (
    <Card className="group hover-lift h-full flex flex-col">
      {/* Featured Image */}
      {post.featured_image && (
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            width={400}
            height={192}
          />
          {post.status === 'draft' && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              Draft
            </Badge>
          )}
        </div>
      )}

      <CardHeader>
        {/* Category Badge */}
        {post.category && (
          <Badge variant="outline" className="w-fit mb-2">
            {post.category.name}
          </Badge>
        )}

        {/* Title */}
        <CardTitle className="line-clamp-2">
          <Link
            to={`/blog/${post.slug}`}
            className="hover:text-primary transition-colors"
          >
            {post.title}
          </Link>
        </CardTitle>

        {/* Excerpt */}
        {post.excerpt && (
          <CardDescription className="line-clamp-3 mt-2">
            {post.excerpt}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map(tag => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{post.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
      </CardFooter>
    </Card>
  )
}
