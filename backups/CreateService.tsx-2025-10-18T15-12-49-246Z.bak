/**
 * CreateService Page
 *
 * 서비스 등록 페이지
 */

import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ServiceForm } from '@/components/admin/ServiceForm'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function CreateService() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // 카테고리 목록 가져오기
  const { data: categories, isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data
    },
  })

  // 서비스 생성
  const createMutation = useMutation({
    mutationFn: async ({ data, images, features }: { data: { title: string; description: string; category_id: string; price: number; status: string }; images: string[]; features: string[] }) => {
      // Features 포맷팅
      const formattedFeatures = features
        .filter((f: string) => f.trim())
        .map((title: string) => ({ title, icon: 'Check' }))

      const serviceData = {
        title: data.title,
        description: data.description,
        category_id: data.category_id,
        price: data.price,
        status: data.status,
        image_url: images[0] || null,
        images: images,
        features: formattedFeatures,
        metrics: {
          users: 0,
          satisfaction: 0,
          completion: 0,
        },
      }

      const { error } = await supabase.from('services').insert([serviceData])

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: '서비스 등록 완료',
        description: '새로운 서비스가 등록되었습니다.',
      })
      navigate('/admin/services')
    },
    onError: (error: Error) => {
      toast({
        title: '서비스 등록 실패',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: { title: string; description: string; category_id: string; price: number; status: string }, images: string[], features: string[]) => {
    createMutation.mutate({ data, images, features })
  }

  const handleCancel = () => {
    navigate('/admin/services')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>서비스 등록 | VIBE WORKING</title>
      </Helmet>

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link to="/admin/services">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">서비스 등록</h1>
            <p className="text-muted-foreground">새로운 서비스를 등록합니다</p>
          </div>
        </div>

        {/* 폼 */}
        {categories && (
          <ServiceForm
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </div>
    </>
  )
}
