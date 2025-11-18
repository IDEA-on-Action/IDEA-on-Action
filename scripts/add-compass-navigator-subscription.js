/**
 * Add COMPASS Navigator subscription service
 * 토스페이먼츠 빌링 심사용 정기결제 상품 추가
 */

import { createClient } from '@supabase/supabase-js'

// 환경 선택: USE_LOCAL=true (로컬), USE_LOCAL=false (프로덕션)
const USE_LOCAL = process.env.USE_LOCAL === 'false' ? false : true

const supabaseUrl = USE_LOCAL
  ? 'http://127.0.0.1:54321'
  : (process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321')

const supabaseKey = USE_LOCAL
  ? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz')

console.log('🔧 Using:', USE_LOCAL ? 'Local Supabase' : 'Production Supabase')
console.log('   URL:', supabaseUrl)
console.log('   Key:', supabaseKey.substring(0, 20) + '...')
console.log()

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addCompassNavigator() {
  try {
    console.log('📦 COMPASS Navigator 정기결제 상품 추가 중...\n')

    // 1. 서비스 카테고리 확인 (구독 서비스)
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select('id, name')

    if (catError) {
      console.error('❌ 카테고리 조회 실패:', catError.message)
      process.exit(1)
    }

    console.log('📋 기존 카테고리:', categories?.map(c => c.name).join(', ') || '없음')

    // 기존 "개발 서비스" 카테고리 사용
    const subscriptionCategory = categories?.find(c => c.name === '개발 서비스')

    if (!subscriptionCategory) {
      console.error('❌ "개발 서비스" 카테고리를 찾을 수 없습니다.')
      console.error('   사용 가능한 카테고리:', categories?.map(c => c.name).join(', '))
      process.exit(1)
    }

    const subscriptionCategoryId = subscriptionCategory.id
    console.log('✅ 카테고리 사용:', '개발 서비스', `(${subscriptionCategoryId})`)

    // 2. COMPASS Navigator 서비스 추가
    const compassService = {
      title: 'COMPASS Navigator - 월 구독',
      description: `**AI 기반 워크플로우 자동화 플랫폼**

COMPASS Navigator는 업무 프로세스를 자동화하고 효율을 극대화하는 AI 에이전트 기반 플랫폼입니다.

### 주요 특징
- **지능형 작업 자동화**: 반복 작업을 AI가 자동으로 처리
- **실시간 협업**: 팀원들과 실시간으로 워크플로우 공유
- **통합 대시보드**: 모든 프로젝트를 한눈에 관리
- **보안 강화**: 엔터프라이즈급 보안 및 권한 관리

### 월 구독 혜택
- ✅ 14일 무료 체험
- ✅ 모든 기능 무제한 사용
- ✅ 월 단위 언제든 해지 가능
- ✅ 프리미엄 지원 포함`,
      category_id: subscriptionCategoryId,
      price: 99000, // 월 구독 기본 가격
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800',
      ],
      features: [
        {
          title: 'AI 에이전트 자동화',
          description: '반복적인 업무를 AI가 학습하여 자동으로 처리합니다.',
        },
        {
          title: '실시간 협업',
          description: '팀원들과 실시간으로 워크플로우를 공유하고 협업합니다.',
        },
        {
          title: '통합 대시보드',
          description: '모든 프로젝트와 작업을 한눈에 파악할 수 있는 직관적 UI를 제공합니다.',
        },
        {
          title: '엔터프라이즈 보안',
          description: '금융권 수준의 보안과 세밀한 권한 관리를 지원합니다.',
        },
      ],
      metrics: {
        users: 1200,
        satisfaction: 4.8,
        avg_roi_increase: 35,
      },
      status: 'active', // 'active' | 'draft' | 'archived'
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert(compassService)
      .select()
      .single()

    if (serviceError) {
      // 이미 존재하는 경우 업데이트
      if (serviceError.code === '23505') {
        console.log('⚠️  이미 존재하는 서비스, 업데이트 중...')
        const { data: updated, error: updateError } = await supabase
          .from('services')
          .update(compassService)
          .eq('slug', 'compass-navigator')
          .select()
          .single()

        if (updateError) throw updateError
        console.log('✅ COMPASS Navigator 업데이트 완료!')
        console.log()
        console.log('📊 서비스 정보:')
        console.log('   ID:', updated.id)
        console.log('   제목:', updated.title)
        console.log('   가격:', `₩${updated.price.toLocaleString()}/월`)
        console.log('   URL: https://www.ideaonaction.ai/services/compass-navigator')
        return
      }
      throw serviceError
    }

    console.log('✅ COMPASS Navigator 추가 완료!')
    console.log()
    console.log('📊 서비스 정보:')
    console.log('   ID:', service.id)
    console.log('   제목:', service.title)
    console.log('   가격:', `₩${service.price.toLocaleString()}/월`)
    console.log('   URL: https://www.ideaonaction.ai/services/compass-navigator')
    console.log()
    console.log('🎯 다음 단계:')
    console.log('   1. http://localhost:8080/services/compass-navigator 페이지 확인')
    console.log('   2. 정기결제 결제 흐름 구현')
    console.log('   3. PPT 스크린샷 제작')

  } catch (error) {
    console.error('❌ 에러 발생:', error.message)
    if (error.details) console.error('   상세:', error.details)
    process.exit(1)
  }
}

addCompassNavigator()
