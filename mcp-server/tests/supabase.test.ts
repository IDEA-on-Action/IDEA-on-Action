/**
 * Supabase Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Supabase Utility', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('validateEnvironment', () => {
    it('should throw when SUPABASE_URL is not set', async () => {
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { validateEnvironment } = await import('../src/lib/supabase.js');
      expect(() => validateEnvironment()).toThrow('SUPABASE_URL environment variable is required');
    });

    it('should throw when no keys are set', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      vi.stubEnv('SUPABASE_ANON_KEY', '');

      const { validateEnvironment } = await import('../src/lib/supabase.js');
      expect(() => validateEnvironment()).toThrow(
        'Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required'
      );
    });
  });

  describe('PERMISSION_LEVELS', () => {
    it('should have correct permission levels', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { PERMISSION_LEVELS } = await import('../src/lib/supabase.js');
      expect(PERMISSION_LEVELS.trial).toBe(0);
      expect(PERMISSION_LEVELS.basic).toBe(1);
      expect(PERMISSION_LEVELS.pro).toBe(2);
      expect(PERMISSION_LEVELS.enterprise).toBe(3);
    });
  });

  describe('FEATURE_REQUIREMENTS', () => {
    it('should have required plans for features', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { FEATURE_REQUIREMENTS } = await import('../src/lib/supabase.js');
      expect(FEATURE_REQUIREMENTS.access_compass_basic).toBe('basic');
      expect(FEATURE_REQUIREMENTS.access_compass_pro).toBe('pro');
      expect(FEATURE_REQUIREMENTS.access_compass_enterprise).toBe('enterprise');
      expect(FEATURE_REQUIREMENTS.export_data).toBe('pro');
      expect(FEATURE_REQUIREMENTS.team_collaboration).toBe('enterprise');
    });
  });

  describe('hasPermission', () => {
    it('should allow access for matching plan', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('basic', 'access_compass_basic');
      expect(result.allowed).toBe(true);
    });

    it('should allow access for higher plan', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('pro', 'access_compass_basic');
      expect(result.allowed).toBe(true);
    });

    it('should allow enterprise access for enterprise plan', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('enterprise', 'team_collaboration');
      expect(result.allowed).toBe(true);
    });

    it('should deny access for lower plan', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('basic', 'access_compass_pro');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Requires pro plan');
    });

    it('should deny access for trial on basic feature', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('trial', 'access_compass_basic');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Requires basic plan');
    });

    it('should deny access for unknown permission', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('enterprise', 'unknown_permission');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown permission');
    });

    it('should handle null plan as trial', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission(null, 'access_compass_basic');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Current plan: trial');
    });

    it('should handle case-insensitive plan names', async () => {
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      const { hasPermission } = await import('../src/lib/supabase.js');
      const result = hasPermission('PRO', 'access_compass_pro');
      expect(result.allowed).toBe(true);
    });
  });
});
