/**
 * Create Post Page
 *
 * 새 블로그 게시물 작성 페이지
 */

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { PostForm, PostFormData } from '@/components/admin/PostForm'
import { useCreatePost } from '@/hooks/usePosts'
import { useAuth } from '@/hooks/useAuth'

export default function CreatePost() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const createPost = useCreatePost()

  const handleSubmit = async (data: PostFormData, status: 'draft' | 'published') => {
    try {
      await createPost.mutateAsync({
        ...data,
        author_id: user?.id || null,
        status,
        featured_image_url: data.featured_image_url || null,
        excerpt: data.excerpt || null,
      })

      toast({
        title: status === 'published' ? '게시물 발행 완료' : '임시저장 완료',
        description: status === 'published'
          ? '게시물이 발행되었습니다.'
          : '게시물이 임시저장되었습니다.',
      })

      navigate('/admin/posts')
    } catch (error) {
      toast({
        title: '오류',
        description: '게시물 저장에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/posts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">새 게시물</h1>
          <p className="text-muted-foreground">블로그 게시물을 작성합니다.</p>
        </div>
      </div>

      {/* Form */}
      <PostForm onSubmit={handleSubmit} isLoading={createPost.isPending} />
    </div>
  )
}
