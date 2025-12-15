/**
 * Test user fixtures for E2E tests
 *
 * IMPORTANT: Before running tests, create test users in Supabase
 * See: docs/guides/testing/test-user-setup.md
 *
 * 환경 변수로 테스트 계정 설정 가능:
 * - E2E_SUPER_ADMIN_EMAIL, E2E_SUPER_ADMIN_PASSWORD
 * - E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 * - E2E_EDITOR_EMAIL, E2E_EDITOR_PASSWORD
 * - E2E_USER_EMAIL, E2E_USER_PASSWORD
 */

// 환경 변수에서 테스트 계정 정보 읽기
const env = typeof process !== 'undefined' ? process.env : {};

export const testUsers = {
  // super_admin 역할 - 환경 변수 또는 기본값 사용
  superAdmin: {
    email: env.E2E_SUPER_ADMIN_EMAIL || 'sinclairseo@gmail.com',
    password: env.E2E_SUPER_ADMIN_PASSWORD || 'test1234!',
    username: 'sinclairseo',
    role: 'super_admin'
  },
  // admin 역할 - 환경 변수 또는 기본값 사용
  admin: {
    email: env.E2E_ADMIN_EMAIL || 'admin@ideaonaction.local',
    password: env.E2E_ADMIN_PASSWORD || 'Admin123!',
    username: 'admin',
    role: 'admin'
  },
  // editor 역할 - 환경 변수 또는 기본값 사용
  editor: {
    email: env.E2E_EDITOR_EMAIL || 'editor@ideaonaction.local',
    password: env.E2E_EDITOR_PASSWORD || 'Editor123!',
    username: 'editor',
    role: 'editor'
  },
  // 일반 사용자 - 환경 변수 또는 기본값 사용
  regularUser: {
    email: env.E2E_USER_EMAIL || 'test-user@ideaonaction.local',
    password: env.E2E_USER_PASSWORD || 'TestUser123!',
    username: 'test-user',
    role: 'user'
  },
  // Minu OAuth 테스트 계정
  minuFree: {
    email: 'test-free@example.com',
    password: 'TestFree123!',
    username: 'test-free',
    role: 'user',
    plan: 'Free',
    status: 'active'
  },
  minuBasic: {
    email: 'test-basic@example.com',
    password: 'TestBasic123!',
    username: 'test-basic',
    role: 'user',
    plan: 'Basic',
    status: 'active'
  },
  minuPro: {
    email: 'test-pro@example.com',
    password: 'TestPro123!',
    username: 'test-pro',
    role: 'user',
    plan: 'Pro',
    status: 'active'
  },
  minuExpired: {
    email: 'test-expired@example.com',
    password: 'TestExpired123!',
    username: 'test-expired',
    role: 'user',
    plan: 'Basic',
    status: 'expired'
  },
  minuEnterprise: {
    email: 'test-admin@example.com',
    password: 'TestAdmin123!',
    username: 'test-admin',
    role: 'admin',
    plan: 'Enterprise',
    status: 'active'
  }
} as const;

/**
 * Helper function to get login credentials
 * Supports both email and username login
 */
export function getLoginCredentials(userType: keyof typeof testUsers) {
  const user = testUsers[userType];
  return {
    // Username will be converted to email@ideaonaction.local in the login flow
    identifier: user.username,
    email: user.email,
    password: user.password
  };
}
