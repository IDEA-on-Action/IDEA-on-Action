/**
 * Check services price - 1,000만원 초과 상품 확인
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkServicesPrices() {
  try {
    console.log('📊 서비스 가격 확인 중...\n')

    // 모든 서비스 조회 (가격 내림차순)
    const { data: services, error } = await supabase
      .from('services')
      .select('id, title, price, category:service_categories(name)')
      .order('price', { ascending: false })

    if (error) throw error

    if (!services || services.length === 0) {
      console.log('❌ 등록된 서비스가 없습니다.')
      return
    }

    console.log(`✅ 총 ${services.length}개 서비스 발견\n`)
    console.log('=' .repeat(80))
    console.log('순위\t서비스명\t\t\t\t카테고리\t\t가격')
    console.log('=' .repeat(80))

    let overTenMillion = []

    services.forEach((service, index) => {
      const priceFormatted = `₩${service.price.toLocaleString('ko-KR')}`
      const categoryName = service.category?.name || '미분류'
      const title = service.title.padEnd(30, ' ').substring(0, 30)

      console.log(`${(index + 1).toString().padStart(2)}.\t${title}\t${categoryName.padEnd(15)}\t${priceFormatted}`)

      // 1,000만원 초과 체크
      if (service.price > 10000000) {
        overTenMillion.push(service)
      }
    })

    console.log('=' .repeat(80))
    console.log()

    // 1,000만원 초과 상품 경고
    if (overTenMillion.length > 0) {
      console.log('⚠️  경고: 1,000만원 초과 상품 발견!')
      console.log('=' .repeat(80))
      console.log('토스페이먼츠는 1,000만원 초과 상품 판매 시 입점이 불가합니다.\n')

      overTenMillion.forEach((service) => {
        const priceFormatted = `₩${service.price.toLocaleString('ko-KR')}`
        console.log(`❌ ${service.title}: ${priceFormatted}`)
      })
      console.log('=' .repeat(80))
      console.log()
      console.log('📋 조치 필요:')
      console.log('   1. 해당 상품의 가격을 1,000만원 이하로 조정')
      console.log('   2. 또는 해당 상품을 비활성화/삭제')
      console.log()
    } else {
      console.log('✅ 모든 서비스 가격이 1,000만원 이하입니다.')
      console.log('   토스페이먼츠 심사 요건 충족!')
      console.log()
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error.message)
    process.exit(1)
  }
}

checkServicesPrices()
