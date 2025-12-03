#!/usr/bin/env node
/**
 * OAuth 클라이언트 검증 스크립트
 *
 * 목적: 4개 Minu Sandbox 서비스 OAuth 클라이언트 확인 및 Client Secret 유효성 검증
 * 참조: supabase/migrations/20251203000001_seed_oauth_clients_sandbox.sql
 *
 * 실행 방법:
 *   node scripts/db/verify-oauth-clients.js
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

// 예상되는 OAuth 클라이언트 목록
// ⚠️ 주의: 실제 스키마에 맞게 조정 (name, scopes 사용, metadata 없음)
const EXPECTED_CLIENTS = [
  {
    client_id: 'minu-find-sandbox',
    name: 'Minu Find (Sandbox)',
    redirect_uris: ['https://sandbox.find.minu.best/auth/callback'],
    scopes: ['openid', 'profile', 'email', 'offline_access', 'subscription:read'],
    description_contains: ['sandbox', 'find']
  },
  {
    client_id: 'minu-frame-sandbox',
    name: 'Minu Frame (Sandbox)',
    redirect_uris: ['https://sandbox.frame.minu.best/auth/callback'],
    scopes: ['openid', 'profile', 'email', 'offline_access', 'subscription:read'],
    description_contains: ['sandbox', 'frame']
  },
  {
    client_id: 'minu-build-sandbox',
    name: 'Minu Build (Sandbox)',
    redirect_uris: ['https://sandbox.build.minu.best/auth/callback'],
    scopes: ['openid', 'profile', 'email', 'offline_access', 'subscription:read'],
    description_contains: ['sandbox', 'build']
  },
  {
    client_id: 'minu-keep-sandbox',
    name: 'Minu Keep (Sandbox)',
    redirect_uris: ['https://sandbox.keep.minu.best/auth/callback'],
    scopes: ['openid', 'profile', 'email', 'offline_access', 'subscription:read'],
    description_contains: ['sandbox', 'keep']
  }
];

/**
 * 배열 비교 (순서 무관)
 */
function arraysEqual(arr1, arr2) {
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, idx) => val === sorted2[idx]);
}

/**
 * OAuth 클라이언트 검증
 */
async function verifyOAuthClients() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 OAuth 클라이언트 검증 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let allPassed = true;
  const results = [];

  // 1. 전체 Sandbox 클라이언트 조회 (description 또는 client_id로 필터링)
  const { data: allClients, error: queryError } = await supabase
    .from('oauth_clients')
    .select('*')
    .or('description.ilike.%sandbox%,client_id.like.%-sandbox');

  if (queryError) {
    console.error('❌ OAuth 클라이언트 조회 실패:', queryError);
    process.exit(1);
  }

  console.log(`📊 전체 Sandbox 클라이언트: ${allClients?.length || 0}개\n`);

  if (!allClients || allClients.length === 0) {
    console.log('❌ Sandbox OAuth 클라이언트가 없습니다.');
    console.log('마이그레이션을 다시 실행하세요: supabase/migrations/20251203000001_seed_oauth_clients_sandbox.sql');
    process.exit(1);
  }

  // 2. 각 클라이언트 검증
  for (const expected of EXPECTED_CLIENTS) {
    console.log(`\n📋 클라이언트: ${expected.client_name}`);
    console.log(`   ID: ${expected.client_id}`);

    const actual = allClients.find(c => c.client_id === expected.client_id);

    if (!actual) {
      console.log(`   ❌ 없음`);
      allPassed = false;
      results.push({
        client_id: expected.client_id,
        status: 'FAIL',
        reason: '클라이언트가 존재하지 않음'
      });
      continue;
    }

    console.log(`   ✅ 존재`);

    // 상세 검증
    const checks = [];

    // name 검증 (client_name → name)
    if (actual.name !== expected.name) {
      checks.push(`name 불일치 (예상: ${expected.name}, 실제: ${actual.name})`);
    }

    // redirect_uris 검증
    if (!arraysEqual(actual.redirect_uris, expected.redirect_uris)) {
      checks.push(`redirect_uris 불일치 (예상: ${JSON.stringify(expected.redirect_uris)}, 실제: ${JSON.stringify(actual.redirect_uris)})`);
    }

    // scopes 검증 (allowed_scopes → scopes)
    if (!arraysEqual(actual.scopes, expected.scopes)) {
      checks.push(`scopes 불일치`);
      console.log(`       예상: ${JSON.stringify(expected.scopes)}`);
      console.log(`       실제: ${JSON.stringify(actual.scopes)}`);
    }

    // is_active 검증
    if (!actual.is_active) {
      checks.push('is_active가 false (비활성)');
    }

    // description 검증 (metadata 대신)
    if (!actual.description) {
      checks.push('description 없음');
    } else {
      const descLower = actual.description.toLowerCase();
      for (const keyword of expected.description_contains) {
        if (!descLower.includes(keyword.toLowerCase())) {
          checks.push(`description에 '${keyword}' 키워드 없음`);
        }
      }
    }

    // client_secret 유효성 검증
    if (!actual.client_secret) {
      checks.push('client_secret 없음');
    } else if (!actual.client_secret.startsWith('sandbox_secret_')) {
      checks.push('client_secret 형식 오류 (sandbox_secret_으로 시작하지 않음)');
    } else {
      console.log(`   ✅ client_secret: 형식 유효 (${actual.client_secret.substring(0, 20)}...)`);
    }

    // 검증 결과 출력
    if (checks.length > 0) {
      console.log(`   ⚠️  검증 실패 (${checks.length}개):`);
      checks.forEach(check => console.log(`       - ${check}`));
      allPassed = false;
      results.push({
        client_id: expected.client_id,
        status: 'FAIL',
        reason: checks.join('; ')
      });
    } else {
      console.log(`   ✅ 모든 검증 통과`);
      results.push({
        client_id: expected.client_id,
        status: 'PASS',
        reason: '모든 검증 통과'
      });
    }
  }

  // 3. 추가 클라이언트 확인 (예상 외 클라이언트)
  const unexpectedClients = allClients.filter(
    c => !EXPECTED_CLIENTS.some(e => e.client_id === c.client_id)
  );

  if (unexpectedClients.length > 0) {
    console.log(`\n⚠️  예상 외 Sandbox 클라이언트 발견: ${unexpectedClients.length}개`);
    unexpectedClients.forEach(c => {
      console.log(`   - ${c.client_id} (${c.client_name})`);
    });
  }

  // 최종 결과 요약
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 검증 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log(`총 클라이언트: ${EXPECTED_CLIENTS.length}`);
  console.log(`✅ 통과: ${passCount}`);
  console.log(`❌ 실패: ${failCount}\n`);

  if (failCount > 0) {
    console.log('실패 상세:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.client_id}`);
        console.log(`    ${r.reason}`);
      });
  }

  // Client Secret 목록 출력 (개발자용)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Client Secret 목록 (환경 변수 설정용)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  allClients
    .filter(c => EXPECTED_CLIENTS.some(e => e.client_id === c.client_id))
    .forEach(client => {
      // description에서 service 추출 (예: "service: find" → "find")
      const serviceMatch = client.description?.match(/service:\s*(\w+)/i);
      const service = serviceMatch ? serviceMatch[1] : 'unknown';
      const envVarName = `MINU_${service.toUpperCase()}_SANDBOX_CLIENT_SECRET`;
      console.log(`${envVarName}=${client.client_secret}`);
    });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allPassed) {
    console.log('✅ 모든 OAuth 클라이언트 검증 완료!');
    process.exit(0);
  } else {
    console.log('❌ 일부 검증 실패. 마이그레이션을 다시 확인하세요.');
    process.exit(1);
  }
}

// 스크립트 실행
verifyOAuthClients().catch(error => {
  console.error('❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});
