/**
 * Blog List Page
 * Phase 11 Week 1: Blog System
 *
 * Displays all published blog posts
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Search, Filter, X } from 'lucide-react'
import { useBlogPosts, useCategories, useTags } from '@/hooks/useBlogPosts'
import { BlogCard } from '@/components/blog/BlogCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BlogPostFilters, BlogPostSortBy } from '@/types/blog'

export default function Blog() {
  const [filters, setFilters] = useState<BlogPostFilters>({ status: 'published' })
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<BlogPostSortBy>('published_at')

  const { data: posts, isLoading, error } = useBlogPosts({
    filters: { ...filters, search },
    sortBy,
    sortOrder: 'desc',
  })

  const { data: categories } = useCategories()
  const { data: tags } = useTags()

  const handleCategoryChange = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      category_id: categoryId === 'all' ? undefined : categoryId,
    }))
  }

  const handleTagClick = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tag_id: prev.tag_id === tagId ? undefined : tagId,
    }))
  }

  const clearFilters = () => {
    setFilters({ status: 'published' })
    setSearch('')
  }

  const hasActiveFilters = filters.category_id || filters.tag_id || search

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
                  value={filters.category_id || 'all'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as BlogPostSortBy)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published_at">Latest</SelectItem>
                    <SelectItem value="view_count">Most Viewed</SelectItem>
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
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={filters.tag_id === tag.id ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleTagClick(tag.id)}
                  >
                    {tag.name}
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
                  <BlogCard key={post.id} post={post} />
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
