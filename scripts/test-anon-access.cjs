#!/usr/bin/env node
/**
 * anon 키로 service_packages, subscription_plans 조회 테스트
 * 브라우저와 동일한 권한으로 API 요청
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // 브라우저와 동일한 키
);

async function testAnonAccess() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Anon 사용자 권한 테스트 (브라우저와 동일)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. MVP 서비스 조회 (slug 기반)
  console.log('1️⃣ MVP 서비스 조회 (slug: "mvp")...');
  const { data: mvpService, error: mvpError } = await supabase
    .from('services')
    .select('*')
    .eq('slug', 'mvp')
    .maybeSingle();

  if (mvpError) {
    console.error('   ❌ 실패:', mvpError.message);
  } else if (mvpService) {
    console.log(`   ✅ 성공: ${mvpService.title} (id: ${mvpService.id})`);
  } else {
    console.log('   ⚠️ 데이터 없음');
  }

  // 2. service_packages 조회 (MVP 서비스 ID)
  if (mvpService) {
    console.log('\n2️⃣ MVP 서비스 패키지 조회...');
    const { data: packages, error: pkgError } = await supabase
      .from('service_packages')
      .select('*')
      .eq('service_id', mvpService.id)
      .order('display_order', { ascending: true });

    if (pkgError) {
      console.error('   ❌ 실패:', pkgError.message);
      console.error('   상세:', JSON.stringify(pkgError, null, 2));
    } else if (packages && packages.length > 0) {
      console.log(`   ✅ 성공: ${packages.length}개 패키지`);
      packages.forEach((pkg, i) => {
        console.log(`      ${i + 1}. ${pkg.name} (₩${pkg.price?.toLocaleString()})`);
      });
    } else {
      console.log('   ⚠️ 데이터 없음');
    }
  }

  // 3. Fullstack 서비스 조회
  console.log('\n3️⃣ Fullstack 서비스 조회 (slug: "fullstack")...');
  const { data: fullstackService, error: fullstackError } = await supabase
    .from('services')
    .select('*')
    .eq('slug', 'fullstack')
    .maybeSingle();

  if (fullstackError) {
    console.error('   ❌ 실패:', fullstackError.message);
  } else if (fullstackService) {
    console.log(`   ✅ 성공: ${fullstackService.title} (id: ${fullstackService.id})`);
  } else {
    console.log('   ⚠️ 데이터 없음');
  }

  // 4. subscription_plans 조회 (Fullstack 서비스 ID)
  if (fullstackService) {
    console.log('\n4️⃣ Fullstack 서비스 플랜 조회...');
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('service_id', fullstackService.id)
      .order('display_order', { ascending: true });

    if (planError) {
      console.error('   ❌ 실패:', planError.message);
      console.error('   상세:', JSON.stringify(planError, null, 2));
    } else if (plans && plans.length > 0) {
      console.log(`   ✅ 성공: ${plans.length}개 플랜`);
      plans.forEach((plan, i) => {
        console.log(`      ${i + 1}. ${plan.plan_name} (${plan.billing_cycle})`);
      });
    } else {
      console.log('   ⚠️ 데이터 없음');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 결과 요약:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('만약 ❌ 실패가 있다면:');
  console.log('  → RLS 정책에서 anon 사용자에게 SELECT 권한이 없음');
  console.log('  → Supabase Dashboard → Authentication → Policies 확인');
  console.log('\n만약 모두 ✅ 성공이면:');
  console.log('  → UI 컴포넌트 문제 (PackageSelector, PricingCard)');
  console.log('  → 브라우저 개발자 도구 Console 탭에서 에러 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testAnonAccess().catch(console.error);
