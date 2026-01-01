/**
 * Edit Blog Post Page
 * Phase 11 Week 1: Blog System
 *
 * Admin page for editing existing blog posts
 */

import { useParams, Navigate } from 'react-router-dom'
import { useBlogPost } from '@/hooks/cms/useBlogPosts'
import { BlogPostForm } from '@/components/blog/BlogPostForm'
import { Loader2 } from 'lucide-react'

export default function EditBlogPost() {
  const { id } = useParams<{ id: string }>()
  const { data: post, isLoading, error } = useBlogPost(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4 text-muted-foreground">Loading post...</p>
      </div>
    )
  }

  if (error || !post) {
    return <Navigate to="/admin/blog" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Blog Post</h1>
        <p className="text-muted-foreground mt-1">
          Update "{post.title}"
        </p>
      </div>

      <BlogPostForm mode="edit" post={post} />
    </div>
  )
}
