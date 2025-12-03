#!/usr/bin/env node
/**
 * Sandbox 테스트 계정 검증 스크립트
 *
 * 목적: 5개 테스트 계정의 존재 여부, 구독 상태, 프로필 정보 확인
 * 참조: supabase/migrations/20251203000002_seed_sandbox_test_accounts.sql
 *
 * 실행 방법:
 *   node scripts/db/verify-sandbox-accounts.js
 *
 * 환경 변수:
 *   SUPABASE_URL - Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service Role Key (RLS 우회)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 오류: 환경 변수가 설정되지 않았습니다.');
  console.error('필요한 변수: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Service Role 클라이언트 (RLS 우회)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 테스트 계정 정의
const TEST_ACCOUNTS = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'test-free@ideaonaction.ai',
    name: 'Test Free User',
    expectedSubscriptions: 0,
    expectedStatus: 'free'
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'test-basic@ideaonaction.ai',
    name: 'Test Basic User',
    expectedSubscriptions: 1,
    expectedStatus: 'active'
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'test-pro@ideaonaction.ai',
    name: 'Test Pro User',
    expectedSubscriptions: 2,
    expectedStatus: 'active'
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'test-expired@ideaonaction.ai',
    name: 'Test Expired User',
    expectedSubscriptions: 1,
    expectedStatus: 'expired'
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    email: 'test-enterprise@ideaonaction.ai',
    name: 'Test Enterprise Admin',
    expectedSubscriptions: 4,
    expectedStatus: 'active'
  }
];

async function verifyTestAccounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Sandbox 테스트 계정 검증 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let allPassed = true;
  const results = [];

  for (const account of TEST_ACCOUNTS) {
    console.log(`\n📋 계정: ${account.email}`);
    console.log(`   ID: ${account.id}`);

    try {
      // 1. auth.users 확인
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(account.id);

      if (authError || !authUser) {
        console.log(`   ❌ auth.users: 없음`);
        allPassed = false;
        results.push({ account: account.email, status: 'FAIL', reason: 'auth.users에 없음' });
        continue;
      }
      console.log(`   ✅ auth.users: 존재`);

      // 2. profiles 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', account.id)
        .single();

      if (profileError || !profile) {
        console.log(`   ❌ profiles: 없음`);
        allPassed = false;
        results.push({ account: account.email, status: 'FAIL', reason: 'profiles에 없음' });
        continue;
      }

      if (profile.email !== account.email || profile.full_name !== account.name) {
        console.log(`   ⚠️  profiles: 데이터 불일치`);
        console.log(`       예상 이메일: ${account.email}, 실제: ${profile.email}`);
        console.log(`       예상 이름: ${account.name}, 실제: ${profile.full_name}`);
        allPassed = false;
        results.push({ account: account.email, status: 'FAIL', reason: 'profiles 데이터 불일치' });
        continue;
      }
      console.log(`   ✅ profiles: 일치`);

      // 3. subscriptions 확인
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          service:services(name),
          plan:subscription_plans(name)
        `)
        .eq('user_id', account.id);

      if (subsError) {
        console.log(`   ❌ subscriptions: 쿼리 실패`);
        console.log(`       오류: ${subsError.message}`);
        allPassed = false;
        results.push({ account: account.email, status: 'FAIL', reason: `subscriptions 쿼리 실패: ${subsError.message}` });
        continue;
      }

      const subsCount = subscriptions?.length || 0;
      if (subsCount !== account.expectedSubscriptions) {
        console.log(`   ⚠️  subscriptions: 개수 불일치 (예상: ${account.expectedSubscriptions}, 실제: ${subsCount})`);
        allPassed = false;
        results.push({
          account: account.email,
          status: 'FAIL',
          reason: `구독 개수 불일치 (예상 ${account.expectedSubscriptions}, 실제 ${subsCount})`
        });
      } else {
        console.log(`   ✅ subscriptions: ${subsCount}개`);

        // 구독 상세 정보 출력
        if (subscriptions && subscriptions.length > 0) {
          subscriptions.forEach((sub, idx) => {
            console.log(`       ${idx + 1}. ${sub.service?.name || 'Unknown'} - ${sub.plan?.name || 'Unknown'} (${sub.status})`);
          });
        }

        // 구독 상태 검증
        if (account.expectedStatus === 'active' && subscriptions) {
          const hasActiveSubscription = subscriptions.some(s => s.status === 'active');
          if (!hasActiveSubscription) {
            console.log(`   ⚠️  구독 상태: active 구독이 없음`);
            allPassed = false;
            results.push({ account: account.email, status: 'FAIL', reason: 'active 구독 없음' });
          }
        } else if (account.expectedStatus === 'expired' && subscriptions) {
          const hasExpiredSubscription = subscriptions.some(s => s.status === 'expired');
          if (!hasExpiredSubscription) {
            console.log(`   ⚠️  구독 상태: expired 구독이 없음`);
            allPassed = false;
            results.push({ account: account.email, status: 'FAIL', reason: 'expired 구독 없음' });
          }
        }
      }

      if (allPassed) {
        results.push({ account: account.email, status: 'PASS', reason: '모든 검증 통과' });
      }

    } catch (error) {
      console.log(`   ❌ 오류 발생: ${error.message}`);
      allPassed = false;
      results.push({ account: account.email, status: 'FAIL', reason: error.message });
    }
  }

  // 최종 결과 요약
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 검증 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log(`총 계정: ${TEST_ACCOUNTS.length}`);
  console.log(`✅ 통과: ${passCount}`);
  console.log(`❌ 실패: ${failCount}\n`);

  if (failCount > 0) {
    console.log('실패 상세:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.account}: ${r.reason}`);
      });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allPassed) {
    console.log('✅ 모든 테스트 계정 검증 완료!');
    process.exit(0);
  } else {
    console.log('❌ 일부 검증 실패. 마이그레이션을 다시 확인하세요.');
    process.exit(1);
  }
}

// 스크립트 실행
verifyTestAccounts().catch(error => {
  console.error('❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});
