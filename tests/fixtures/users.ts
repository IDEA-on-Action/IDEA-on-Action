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
  }
} as const;

/**
 * Helper function to get login credentials
 * Supports both email and username login
 */
export function getLoginCredentials(userType: 'superAdmin' | 'admin' | 'regularUser') {
  const user = testUsers[userType];
  return {
    // Username will be converted to email@ideaonaction.local in the login flow
    identifier: user.username,
    email: user.email,
    password: user.password
  };
}
