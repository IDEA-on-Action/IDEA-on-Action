/**
 * Edit Post Page
 *
 * 블로그 게시물 수정 페이지
 */

import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { PostForm, PostFormData } from '@/components/admin/PostForm'
import { useUpdatePost } from '@/hooks/usePosts'
import { supabase } from '@/integrations/supabase/client'
import type { Post } from '@/types/database'

export default function EditPost() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const updatePost = useUpdatePost()

  // 게시물 조회 (ID 기반)
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Post
    },
    enabled: !!id,
  })

  const handleSubmit = async (data: PostFormData, status: 'draft' | 'published') => {
    if (!id) return

    try {
      await updatePost.mutateAsync({
        id,
        updates: {
          ...data,
          status,
          featured_image_url: data.featured_image_url || null,
          excerpt: data.excerpt || null,
        },
      })

      toast({
        title: status === 'published' ? '게시물 발행 완료' : '수정 완료',
        description: status === 'published'
          ? '게시물이 발행되었습니다.'
          : '게시물이 수정되었습니다.',
      })

      navigate('/admin/posts')
    } catch (error) {
      toast({
        title: '오류',
        description: '게시물 수정에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">게시물을 찾을 수 없습니다</h1>
        <Button onClick={() => navigate('/admin/posts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/posts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">게시물 수정</h1>
          <p className="text-muted-foreground">{post.title}</p>
        </div>
      </div>

      {/* Form */}
      <PostForm
        initialData={post}
        onSubmit={handleSubmit}
        isLoading={updatePost.isPending}
      />
    </div>
  )
}
