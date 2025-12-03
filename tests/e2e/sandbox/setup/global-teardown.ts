/**
 * Playwright Sandbox 전역 Teardown
 * 
 * 목적: 모든 테스트 완료 후 정리 작업
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Sandbox 환경 정리 중...');

  // 필요 시 정리 작업 추가
  // 예: 임시 파일 삭제, 세션 정리 등

  console.log('✅ Sandbox 환경 정리 완료');
}

export default globalTeardown;
