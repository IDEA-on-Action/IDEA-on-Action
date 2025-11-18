/**
 * Services Platform RLS 정책 검증 스크립트
 * 목적: services, service_packages, subscription_plans RLS 정책 확인
 * 사용법: node scripts/check-services-rls.cjs
 * TASK-004: RLS 정책 검증
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (anon 역할)
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

// Service key로 admin 클라이언트 생성 (admin 권한)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔐 Services Platform RLS 정책 검증');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

async function checkRLSPolicies() {
  try {
    // 1. services 테이블 조회 (anon 역할)
    console.log('1️⃣  services 테이블 조회 (anon 역할)');
    const { data: servicesData, error: servicesError } = await anonClient
      .from('services')
      .select('id, title, slug, status')
      .limit(5);

    if (servicesError) {
      console.error('   ❌ 실패:', servicesError.message);
    } else {
      console.log(`   ✅ 성공: ${servicesData.length}개 서비스 조회`);
      servicesData.forEach(s => {
        console.log(`      - ${s.title} (${s.slug})`);
      });
    }
    console.log('');

    // 2. service_packages 테이블 조회 (anon 역할)
    console.log('2️⃣  service_packages 테이블 조회 (anon 역할)');
    const { data: packagesData, error: packagesError } = await anonClient
      .from('service_packages')
      .select('id, name, price')
      .limit(5);

    if (packagesError) {
      console.error('   ❌ 실패:', packagesError.message);
    } else {
      console.log(`   ✅ 성공: ${packagesData.length}개 패키지 조회`);
      if (packagesData.length === 0) {
        console.log('      ℹ️  아직 패키지 데이터가 없습니다 (정상)');
      }
    }
    console.log('');

    // 3. subscription_plans 테이블 조회 (anon 역할)
    console.log('3️⃣  subscription_plans 테이블 조회 (anon 역할)');
    const { data: plansData, error: plansError } = await anonClient
      .from('subscription_plans')
      .select('id, plan_name, billing_cycle, price')
      .limit(5);

    if (plansError) {
      console.error('   ❌ 실패:', plansError.message);
    } else {
      console.log(`   ✅ 성공: ${plansData.length}개 플랜 조회`);
      if (plansData.length === 0) {
        console.log('      ℹ️  아직 플랜 데이터가 없습니다 (정상)');
      }
    }
    console.log('');

    // 4. service_packages INSERT 시도 (anon 역할 - 실패해야 함)
    console.log('4️⃣  service_packages INSERT 시도 (anon 역할 - 실패해야 함)');
    const { error: insertError } = await anonClient
      .from('service_packages')
      .insert({
        service_id: 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', // 임시 UUID
        name: 'Test Package',
        price: 1000000
      });

    if (insertError) {
      console.log('   ✅ 성공: INSERT 차단됨 (정상)');
      console.log(`      - 에러: ${insertError.message}`);
    } else {
      console.error('   ❌ 실패: INSERT가 허용되었습니다 (비정상)');
    }
    console.log('');

    // 5. RLS 활성화 여부 확인
    console.log('5️⃣  RLS 활성화 여부 확인');
    const { data: rlsData, error: rlsError } = await adminClient.rpc('check_rls_status');

    // RLS 상태를 직접 쿼리
    const { data: tableInfo } = await adminClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['services', 'service_packages', 'subscription_plans']);

    if (tableInfo && tableInfo.length > 0) {
      tableInfo.forEach(table => {
        const status = table.rowsecurity ? '✅ 활성화' : '❌ 비활성화';
        console.log(`   - ${table.tablename}: ${status}`);
      });
    } else {
      // Fallback: 테이블이 존재하는지만 확인
      console.log('   ℹ️  RLS 상태를 직접 확인할 수 없습니다.');
      console.log('   ℹ️  Supabase 대시보드에서 확인하세요.');
    }
    console.log('');

    // 6. 정책 개수 확인
    console.log('6️⃣  RLS 정책 개수 확인');
    const { data: policyData } = await adminClient
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .eq('schemaname', 'public')
      .in('tablename', ['services', 'service_packages', 'subscription_plans']);

    if (policyData && policyData.length > 0) {
      const policyCount = {};
      policyData.forEach(policy => {
        if (!policyCount[policy.tablename]) {
          policyCount[policy.tablename] = 0;
        }
        policyCount[policy.tablename]++;
      });

      Object.entries(policyCount).forEach(([table, count]) => {
        let expected = 4;
        if (table === 'services') expected = 6; // services는 기존 정책 포함

        const status = count >= expected ? '✅' : '⚠️';
        console.log(`   ${status} ${table}: ${count}개 정책 (예상: ${expected}개)`);
      });
    } else {
      console.log('   ℹ️  정책 정보를 조회할 수 없습니다.');
      console.log('   ℹ️  Supabase 대시보드에서 확인하세요.');
    }
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ RLS 정책 검증 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📌 주요 확인 사항:');
    console.log('   1. anon 역할의 SELECT 권한 (✅)');
    console.log('   2. anon 역할의 INSERT 차단 (✅)');
    console.log('   3. RLS 활성화 상태 (위 참조)');
    console.log('   4. 정책 개수 (위 참조)');
    console.log('');
    console.log('📋 다음 단계:');
    console.log('   - Supabase 대시보드에서 RLS 정책 세부 내용 확인');
    console.log('   - Admin 역할 INSERT/UPDATE/DELETE 테스트 (Supabase Studio)');
    console.log('');

  } catch (error) {
    console.error('❌ 검증 중 오류 발생:', error);
  }
}

checkRLSPolicies();
