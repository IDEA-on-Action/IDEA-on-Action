#!/usr/bin/env node
/**
 * Minu 서비스 데이터 검증 스크립트
 *
 * Supabase에서 Minu 서비스 데이터가 올바르게 설정되었는지 확인합니다.
 *
 * 사용법:
 *   node scripts/db/check-minu-service.cjs
 *   USE_PRODUCTION=true node scripts/db/check-minu-service.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 환경 변수 확인
const useProduction = process.env.USE_PRODUCTION === 'true';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   VITE_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMinuServices() {
  console.log('🔍 Minu 서비스 데이터 검증 시작...\n');
  console.log(`📍 환경: ${useProduction ? '프로덕션' : '로컬'}`);
  console.log(`📍 URL: ${supabaseUrl}\n`);

  const minuServices = ['find', 'frame', 'build', 'keep'];
  const results = {
    passed: [],
    failed: [],
  };

  // 1. services 테이블 확인
  console.log('1️⃣ services 테이블 확인...');
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, title, slug, status')
    .in('slug', minuServices);

  if (servicesError) {
    console.error('   ❌ 서비스 조회 실패:', servicesError.message);
    results.failed.push('서비스 조회');
  } else if (!services || services.length === 0) {
    console.log('   ⚠️ Minu 서비스가 아직 등록되지 않았습니다.');
    console.log('   💡 마이그레이션 실행이 필요합니다:');
    console.log('      supabase db push');
    results.failed.push('서비스 없음');
  } else {
    console.log(`   ✅ ${services.length}개 서비스 발견:`);
    services.forEach(service => {
      console.log(`      - ${service.title} (${service.slug}) [${service.status}]`);
    });
    results.passed.push('서비스 조회');
  }

  // 2. subscription_plans 테이블 확인
  console.log('\n2️⃣ subscription_plans 테이블 확인...');
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('id, plan_name, price, billing_cycle, service_id')
    .ilike('plan_name', '%Minu%');

  if (plansError) {
    console.error('   ❌ 플랜 조회 실패:', plansError.message);
    results.failed.push('플랜 조회');
  } else if (!plans || plans.length === 0) {
    console.log('   ⚠️ Minu 구독 플랜이 아직 등록되지 않았습니다.');
    results.failed.push('플랜 없음');
  } else {
    console.log(`   ✅ ${plans.length}개 플랜 발견:`);
    plans.forEach(plan => {
      console.log(`      - ${plan.plan_name}: ₩${plan.price?.toLocaleString()}/${plan.billing_cycle}`);
    });
    results.passed.push('플랜 조회');
  }

  // 3. minu_integration_view 확인
  console.log('\n3️⃣ minu_integration_view 뷰 확인...');
  const { data: viewData, error: viewError } = await supabase
    .from('minu_integration_view')
    .select('*')
    .limit(1);

  if (viewError) {
    if (viewError.message.includes('does not exist')) {
      console.log('   ⚠️ minu_integration_view가 아직 생성되지 않았습니다.');
      console.log('   💡 마이그레이션 실행이 필요합니다.');
    } else {
      console.error('   ❌ 뷰 조회 실패:', viewError.message);
    }
    results.failed.push('통합 뷰');
  } else {
    console.log('   ✅ minu_integration_view 뷰가 정상 작동합니다.');
    results.passed.push('통합 뷰');
  }

  // 4. 기존 compass 데이터 확인 (마이그레이션 전후 비교)
  console.log('\n4️⃣ 기존 COMPASS 데이터 확인...');
  const { data: compassServices, error: compassError } = await supabase
    .from('services')
    .select('id, title, slug')
    .or('slug.eq.navigator,slug.eq.cartographer,slug.eq.captain,slug.eq.harbor');

  if (compassError) {
    console.error('   ❌ COMPASS 서비스 조회 실패:', compassError.message);
  } else if (compassServices && compassServices.length > 0) {
    console.log('   ⚠️ 기존 COMPASS 서비스가 남아있습니다:');
    compassServices.forEach(service => {
      console.log(`      - ${service.title} (${service.slug})`);
    });
    console.log('   💡 마이그레이션을 실행하여 Minu로 전환하세요.');
    results.failed.push('COMPASS 잔여');
  } else {
    console.log('   ✅ 기존 COMPASS 서비스가 모두 마이그레이션되었습니다.');
    results.passed.push('COMPASS 마이그레이션');
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log('📊 검증 결과 요약');
  console.log('='.repeat(50));
  console.log(`✅ 통과: ${results.passed.length}개 - ${results.passed.join(', ') || '없음'}`);
  console.log(`❌ 실패: ${results.failed.length}개 - ${results.failed.join(', ') || '없음'}`);

  if (results.failed.length > 0) {
    console.log('\n💡 다음 단계:');
    console.log('   1. supabase db push 실행하여 마이그레이션 적용');
    console.log('   2. 필요시 수동으로 서비스 데이터 삽입');
    console.log('   3. 다시 이 스크립트 실행하여 검증');
    process.exit(1);
  } else {
    console.log('\n🎉 모든 검증이 통과되었습니다!');
  }
}

checkMinuServices().catch(error => {
  console.error('스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});
