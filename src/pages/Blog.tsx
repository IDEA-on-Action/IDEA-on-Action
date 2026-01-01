/**
 * Blog List Page
 * WordPress 연동 버전
 *
 * WordPress.com API를 통해 블로그 포스트 표시
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Search, Filter, X } from 'lucide-react'
import { useWordPressPosts, useWordPressCategories, useWordPressTags } from '@/hooks/integrations/useWordPressPosts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type WordPressSortBy = 'date' | 'modified' | 'title' | 'comment_count'

export default function Blog() {
  const [category, setCategory] = useState<string>('')
  const [tag, setTag] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<WordPressSortBy>('date')

  const { data: posts, isLoading, error } = useWordPressPosts({
    category: category || undefined,
    tag: tag || undefined,
    search: search || undefined,
    orderBy: sortBy,
    order: 'DESC',
    number: 20,
  })

  const { data: categories } = useWordPressCategories()
  const { data: tags } = useWordPressTags()

  const handleCategoryChange = (value: string) => {
    setCategory(value === 'all' ? '' : value)
  }

  const handleTagClick = (tagSlug: string) => {
    setTag(tag === tagSlug ? '' : tagSlug)
  }

  const clearFilters = () => {
    setCategory('')
    setTag('')
    setSearch('')
  }

  const hasActiveFilters = category || tag || search

  return (
    <>
      <Helmet>
        <title>Blog | IDEA on Action</title>
        <meta
          name="description"
          content="Explore insights on AI, productivity, and innovation. Stay updated with the latest from IDEA on Action."
        />
      </Helmet>

      <Header />
      <div className="min-h-screen gradient-bg">{/* Changed to match Index page */}
        {/* Hero Section */}
        <section className="relative py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                IDEA on Action <span className="text-primary">Blog</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Insights on AI, productivity, and innovation
              </p>
            </div>
          </div>
        </section>

        {/* Filters & Search */}
        <section className="py-8 border-y bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {/* Category Filter */}
                <Select
                  value={category || 'all'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-[180px]" aria-label="카테고리 필터">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name} ({cat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as WordPressSortBy)}
                >
                  <SelectTrigger className="w-[180px]" aria-label="정렬 기준">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest</SelectItem>
                    <SelectItem value="comment_count">Most Comments</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Tag Filter Pills */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map(t => (
                  <Badge
                    key={t.slug}
                    variant={tag === t.slug ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleTagClick(t.slug)}
                  >
                    {t.name} ({t.count})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading posts...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive">Failed to load blog posts.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error.message}
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && posts?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts found.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Posts Grid */}
            {!isLoading && !error && posts && posts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <Card key={post.id} className="group hover-lift h-full flex flex-col">
                    {/* Featured Image */}
                    {post.featuredImage && (
                      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          width={400}
                          height={192}
                        />
                      </div>
                    )}

                    <CardHeader>
                      {/* Category Badge */}
                      {post.categories && post.categories.length > 0 && (
                        <Badge variant="outline" className="w-fit mb-2">
                          {post.categories[0]}
                        </Badge>
                      )}

                      {/* Title */}
                      <CardTitle className="line-clamp-2">
                        <Link
                          to={`/stories/blog/${post.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {post.title}
                        </Link>
                      </CardTitle>

                      {/* Excerpt - WordPress returns HTML, strip tags */}
                      {post.excerpt && (
                        <CardDescription
                          className="line-clamp-3 mt-2"
                          dangerouslySetInnerHTML={{ __html: post.excerpt }}
                        />
                      )}
                    </CardHeader>

                    <CardContent className="flex-1">
                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map(tagName => (
                            <Badge key={tagName} variant="secondary" className="text-xs">
                              {tagName}
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
                      {post.author && (
                        <div className="flex items-center gap-2">
                          {post.author.avatar && (
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span>{post.author.name}</span>
                        </div>
                      )}

                      {/* Published Date */}
                      {post.publishedAt && (
                        <div className="flex items-center gap-1">
                          <span>{formatDistanceToNow(post.publishedAt, { addSuffix: true })}</span>
                        </div>
                      )}

                      {/* Comment Count */}
                      {post.commentCount && post.commentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <span>{post.commentCount} comments</span>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
