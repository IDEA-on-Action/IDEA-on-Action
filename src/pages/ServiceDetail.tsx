/**
 * ServiceDetail Page
 *
 * 서비스 상세 페이지 (Services Platform Integration)
 * - 서비스 정보 표시 (Hero Section)
 * - 패키지/플랜 선택 (PackageSelector)
 * - 프로세스 타임라인 (ProcessTimeline)
 * - 결과물 그리드 (DeliverablesGrid)
 * - FAQ 섹션 (FAQSection)
 *
 * Updated: 2025-11-19 (Services Platform Day 2)
 */

import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useServiceDetailBySlug } from '@/hooks/useServicesPlatform'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Info, ExternalLink } from 'lucide-react'

// Services Platform Components
import { ServiceHero } from '@/components/services-platform/ServiceHero'
import { PackageSelector } from '@/components/services-platform/PackageSelector'
import { ProcessTimeline } from '@/components/services-platform/ProcessTimeline'
import { DeliverablesGrid } from '@/components/services-platform/DeliverablesGrid'
import { FAQSection } from '@/components/services-platform/FAQSection'
import type { ServicePackage, SubscriptionPlan } from '@/types/services-platform'

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: service, isLoading, isError, error } = useServiceDetailBySlug(id || '')
  const { addServiceItem, openCart } = useCartStore()

  // Add to cart handlers
  const handleSelectPackage = (pkg: ServicePackage) => {
    if (!service) return

    addServiceItem({
      type: 'package',
      service_id: service.id,
      service_title: service.title,
      item_id: pkg.id,
      item_name: pkg.name,
      price: pkg.price,
      quantity: 1,
    })

    toast.success(`${pkg.name} 패키지를 장바구니에 추가했습니다`, {
      description: `${service.title} - ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(pkg.price)}`,
      action: {
        label: '장바구니 보기',
        onClick: () => openCart(),
      },
    })
  }

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!service) return

    addServiceItem({
      type: 'plan',
      service_id: service.id,
      service_title: service.title,
      item_id: plan.id,
      item_name: plan.plan_name,
      price: plan.price,
      quantity: 1,
      billing_cycle: plan.billing_cycle,
    })

    const billingCycleKorean = {
      monthly: '월간',
      quarterly: '분기',
      yearly: '연간',
    }

    toast.success(`${plan.plan_name}을 장바구니에 추가했습니다`, {
      description: `${service.title} - ${billingCycleKorean[plan.billing_cycle]} ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(plan.price)}`,
      action: {
        label: '장바구니 보기',
        onClick: () => openCart(),
      },
    })
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Skeleton className="h-12 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Error State
  if (isError || !service) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription>
              {error?.message || '서비스를 찾을 수 없습니다.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/services')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            서비스 목록으로
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  const {
    title,
    description,
    image_url,
    category,
    tags,
    packages,
    plans,
    process_steps,
    deliverables,
    faq,
  } = service

  return (
    <>
      <Helmet>
        <title>{title} | IDEA on Action</title>
        <meta name="description" content={description || ''} />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />

        <main className="flex-1">
          {/* Back Button */}
          <div className="container mx-auto px-4 pt-8">
            <Button variant="ghost" onClick={() => navigate('/services')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              서비스 목록으로
            </Button>
          </div>

          {/* Hero Section */}
          <ServiceHero
            title={title}
            description={description || ''}
            image_url={image_url}
            category={category}
            tags={tags}
          />

          {/* Digital Service Withdrawal Notice */}
          <div className="container mx-auto px-4 py-8">
            <Alert className="border-primary/50 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary font-semibold">디지털 서비스 청약철회 안내</AlertTitle>
              <AlertDescription className="mt-2 text-sm text-muted-foreground">
                본 서비스는 <strong>다운로드/실행/소스코드 전달 시점부터 청약철회가 제한</strong>됩니다.
                {' '}
                {service?.slug === 'compass-navigator' && (
                  <span className="text-primary font-medium">
                    무료 7일 체험판을 먼저 이용하시기 바랍니다.
                  </span>
                )}
                {(service?.slug === 'mvp' || service?.slug === 'fullstack' || service?.slug === 'design') && (
                  <span className="text-primary font-medium">
                    무료 상담을 통해 상세 견적서를 먼저 받아보시기 바랍니다.
                  </span>
                )}
                {' '}
                <a
                  href="/refund-policy#digital-services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  환불정책 자세히 보기
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          </div>

          {/* Package/Plan Selection */}
          {(packages.length > 0 || plans.length > 0) && (
            <section className="bg-muted/30 py-16">
              <PackageSelector
                packages={packages}
                plans={plans}
                onSelectPackage={handleSelectPackage}
                onSelectPlan={handleSelectPlan}
              />
            </section>
          )}

          {/* Process Timeline */}
          {process_steps && process_steps.length > 0 && (
            <section className="container mx-auto px-4 py-16">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                프로세스
              </h2>
              <ProcessTimeline steps={process_steps} />
            </section>
          )}

          {/* Deliverables Grid */}
          {deliverables && deliverables.length > 0 && (
            <section className="bg-muted/30 py-16">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                  결과물
                </h2>
                <DeliverablesGrid deliverables={deliverables} />
              </div>
            </section>
          )}

          {/* FAQ Section */}
          {faq && faq.length > 0 && (
            <section className="container mx-auto px-4 py-16">
              <FAQSection faqs={faq} />
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
