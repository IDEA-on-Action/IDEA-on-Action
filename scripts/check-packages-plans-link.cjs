#!/usr/bin/env node
/**
 * Service Packages & Plans 연결 확인
 * service_id가 올바르게 연결되었는지 검증
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPackagesPlansLink() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Service Packages & Plans 연결 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. service_packages 확인
  const { data: packages, error: pkgError } = await supabase
    .from('service_packages')
    .select('id, service_id, name, price, is_popular');

  if (pkgError) {
    console.error('❌ Packages 조회 실패:', pkgError.message);
  } else {
    console.log(`📦 Service Packages: ${packages?.length || 0}개\n`);
    packages?.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.name} (₩${pkg.price?.toLocaleString()})`);
      console.log(`   service_id: ${pkg.service_id || 'NULL ❌'}`);
      console.log(`   is_popular: ${pkg.is_popular ? '⭐' : ''}\n`);
    });
  }

  // 2. subscription_plans 확인
  const { data: plans, error: planError } = await supabase
    .from('subscription_plans')
    .select('id, service_id, plan_name, billing_cycle, price, is_popular');

  if (planError) {
    console.error('❌ Plans 조회 실패:', planError.message);
  } else {
    console.log(`\n📅 Subscription Plans: ${plans?.length || 0}개\n`);
    plans?.forEach((plan, i) => {
      console.log(`${i + 1}. ${plan.plan_name} (${plan.billing_cycle})`);
      console.log(`   price: ₩${plan.price?.toLocaleString()}/월`);
      console.log(`   service_id: ${plan.service_id || 'NULL ❌'}`);
      console.log(`   is_popular: ${plan.is_popular ? '⭐' : ''}\n`);
    });
  }

  // 3. JOIN 검증 (service_id로 services 테이블과 연결)
  const { data: joinedPackages, error: joinError } = await supabase
    .from('service_packages')
    .select(`
      id,
      name,
      price,
      services (
        id,
        slug,
        title
      )
    `);

  if (joinError) {
    console.error('\n❌ JOIN 조회 실패:', joinError.message);
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Packages ↔ Services JOIN 결과');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    joinedPackages?.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.name}`);
      if (pkg.services) {
        console.log(`   ✅ Connected to: ${pkg.services.title} (${pkg.services.slug})`);
      } else {
        console.log(`   ❌ No service connection (service_id NULL or invalid)`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkPackagesPlansLink().catch(console.error);
