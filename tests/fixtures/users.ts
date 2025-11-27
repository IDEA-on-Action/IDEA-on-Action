/**
 * Test user fixtures for E2E tests
 *
 * IMPORTANT: Before running tests, create test users in Supabase
 * See: docs/guides/testing/test-user-setup.md
 */

export const testUsers = {
  superAdmin: {
    email: 'admin@ideaonaction.local',
    password: 'demian00',
    username: 'admin',
    role: 'admin'
  },
  admin: {
    email: 'admin@ideaonaction.local',
    password: 'demian00',
    username: 'admin',
    role: 'admin'
  },
  regularUser: {
    email: 'test-user@ideaonaction.local',
    password: 'TestUser123!',
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
