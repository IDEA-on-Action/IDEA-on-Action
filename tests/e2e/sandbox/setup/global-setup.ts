/**
 * Playwright Sandbox 전역 Setup
 * 
 * 목적: 모든 테스트 실행 전 초기화 작업
 * - 환경 변수 검증
 * - Sandbox 데이터베이스 연결 확인
 * - 테스트 계정 검증
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Sandbox 환경 초기화 중...');

  // 1. 필수 환경 변수 검증
  const requiredEnvVars = [
    'VITE_SUPABASE_URL_SANDBOX',
    'VITE_SUPABASE_ANON_KEY_SANDBOX',
    'TEST_FREE_EMAIL',
    'TEST_BASIC_EMAIL',
    'TEST_PRO_EMAIL',
    'TEST_EXPIRED_EMAIL',
    'TEST_ENTERPRISE_EMAIL',
    'TEST_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0) {
    console.error('❌ 필수 환경 변수가 설정되지 않았습니다:');
    missingVars.forEach((envVar) => console.error(`   - ${envVar}`));
    console.error('');
    console.error('.env.sandbox 파일을 확인해주세요.');
    process.exit(1);
  }

  console.log('✅ 환경 변수 검증 완료');

  // 2. Supabase 연결 테스트
  try {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL_SANDBOX}/rest/v1/`, {
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY_SANDBOX || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase 연결 실패: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Supabase Sandbox 연결 확인');
  } catch (error) {
    console.error('❌ Supabase Sandbox 연결 실패:', error);
    process.exit(1);
  }

  console.log('🎉 Sandbox 환경 초기화 완료!');
  console.log('');
}

export default globalSetup;
