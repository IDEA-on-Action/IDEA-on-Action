/**
 * EditService Page
 *
 * 서비스 수정 페이지
 */

import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ServiceForm } from '@/components/admin/ServiceForm'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import type { Service } from '@/types/database'

export default function EditService() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 서비스 데이터 가져오기
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as Service
    },
    enabled: !!id,
  })

  // 카테고리 목록 가져오기
  const { data: categories, isLoading: categoriesLoading } = useQuery({
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

  // 서비스 수정
  const updateMutation = useMutation({
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
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
      toast({
        title: '서비스 수정 완료',
        description: '서비스가 수정되었습니다.',
      })
      navigate('/admin/services')
    },
    onError: (error: Error) => {
      toast({
        title: '서비스 수정 실패',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: { title: string; description: string; category_id: string; price: number; status: string }, images: string[], features: string[]) => {
    updateMutation.mutate({ data, images, features })
  }

  const handleCancel = () => {
    navigate('/admin/services')
  }

  if (serviceLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">서비스를 찾을 수 없습니다</h2>
        <Link to="/admin/services" className="mt-4 inline-block">
          <Button>목록으로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>서비스 수정 | VIBE WORKING</title>
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
            <h1 className="text-3xl font-bold">서비스 수정</h1>
            <p className="text-muted-foreground">{service.title}</p>
          </div>
        </div>

        {/* 폼 */}
        {categories && (
          <ServiceForm
            service={service}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </div>
    </>
  )
}
