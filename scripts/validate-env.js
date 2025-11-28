#!/usr/bin/env node
/**
 * 환경 변수 검증 스크립트
 * 필수 환경 변수가 설정되어 있는지 확인합니다.
 *
 * 사용법: node scripts/validate-env.js
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const optionalEnvVars = [
  'VITE_ENV',
  'VITE_TOSS_CLIENT_KEY',
  'VITE_SENTRY_DSN',
  'VITE_GA4_MEASUREMENT_ID',
];

let hasError = false;

console.log('🔍 환경 변수 검증 시작...\n');

// 필수 환경 변수 확인
console.log('📋 필수 환경 변수:');
requiredEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`  ✅ ${envVar}: 설정됨`);
  } else {
    console.log(`  ❌ ${envVar}: 누락됨`);
    hasError = true;
  }
});

console.log('\n📋 선택 환경 변수:');
optionalEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`  ✅ ${envVar}: 설정됨`);
  } else {
    console.log(`  ⚠️  ${envVar}: 미설정 (선택)`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasError) {
  console.log('❌ 필수 환경 변수가 누락되었습니다.');
  process.exit(1);
} else {
  console.log('✅ 모든 필수 환경 변수가 설정되었습니다.');
  process.exit(0);
}
