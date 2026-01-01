/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';

vi.unmock('@/hooks/auth/useAuth');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@/integrations/cloudflare/client', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), refresh: vi.fn(), logout: vi.fn() },
}));

vi.mock('@/lib/sentry', () => ({ setUser: vi.fn(), clearUser: vi.fn() }));
vi.mock('@/lib/errors', () => ({ devError: vi.fn(), devLog: vi.fn() }));

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => { store = newStore; },
  };
}

describe('useAuth', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let originalLocalStorage: Storage;
  let originalLocation: Location;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresIn: 3600 };
  const mockStoredTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresAt: Date.now() + 3600000, user: mockUser };

  beforeAll(() => {
    originalLocalStorage = window.localStorage;
    originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true });
    window.location = originalLocation;
  });

  beforeEach(async () => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    vi.clearAllMocks();
    vi.resetModules();
    window.location.href = '';
    mockNavigate.mockClear();
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('init state', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.workersUser).toBe(null);
  });

  it('valid token sets user', async () => {
    const validTokens = { ...mockStoredTokens, expiresAt: Date.now() + 3600000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(validTokens) });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.workersUser).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('no token means null user', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.workersUser).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('Google OAuth redirect', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(typeof result.current.signInWithGoogle).toBe('function');
    await act(async () => { await result.current.signInWithGoogle(); });
    expect(window.location.href).toContain('/oauth/google/authorize');
  });

  it('email login works', async () => {
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.login).mockResolvedValue({ data: { user: mockUser, ...mockTokens }, error: null, status: 200 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signInWithEmail('test@example.com', 'password123'); });
    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout works', async () => {
    const validTokens = { ...mockStoredTokens, expiresAt: Date.now() + 3600000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(validTokens) });
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.logout).mockResolvedValue({ data: { success: true }, error: null, status: 200 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signOut(); });
    expect(result.current.workersUser).toBe(null);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
  it('expired token triggers refresh', async () => {
    const expiredTokens = { ...mockStoredTokens, expiresAt: Date.now() - 1000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(expiredTokens) });
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'new', expiresIn: 3600 }, error: null, status: 200 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(authApi.refresh).toHaveBeenCalledWith(expiredTokens.refreshToken);
  });

  it('refresh failure clears auth', async () => {
    const expiredTokens = { ...mockStoredTokens, expiresAt: Date.now() - 1000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(expiredTokens) });
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.refresh).mockResolvedValue({ data: null, error: 'expired', status: 401 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.workersUser).toBe(null);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('workers_auth_tokens');
  });

  it('GitHub OAuth redirect', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signInWithGithub(); });
    expect(window.location.href).toContain('/oauth/github/authorize');
  });

  it('Kakao OAuth redirect', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signInWithKakao(); });
    expect(window.location.href).toContain('/oauth/kakao/authorize');
  });

  it('email login failure throws', async () => {
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.login).mockResolvedValue({ data: null, error: 'Invalid credentials', status: 401 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await expect(act(async () => { await result.current.signInWithEmail('test@example.com', 'wrong'); })).rejects.toThrow('Invalid credentials');
  });

  it('signup works', async () => {
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.register).mockResolvedValue({ data: { user: { id: '1', email: 'a@b.c', name: 'N' }, ...mockTokens }, error: null, status: 201 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signUpWithEmail('a@b.c', 'pass', 'N'); });
    expect(authApi.register).toHaveBeenCalledWith('a@b.c', 'pass', 'N');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('signup failure throws', async () => {
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.register).mockResolvedValue({ data: null, error: 'Email exists', status: 409 });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await expect(act(async () => { await result.current.signUpWithEmail('a@b.c', 'pass'); })).rejects.toThrow('Email exists');
  });

  it('logout API fail still clears local state', async () => {
    const validTokens = { ...mockStoredTokens, expiresAt: Date.now() + 3600000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(validTokens) });
    const { authApi } = await import('@/integrations/cloudflare/client');
    vi.mocked(authApi.logout).mockRejectedValue(new Error('Network'));
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    await act(async () => { await result.current.signOut(); });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('workers_auth_tokens');
    expect(result.current.workersUser).toBe(null);
  });

  it('getAccessToken returns token when logged in', async () => {
    const validTokens = { ...mockStoredTokens, expiresAt: Date.now() + 3600000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(validTokens) });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.getAccessToken()).toBe(validTokens.accessToken);
  });

  it('getAccessToken returns null when not logged in', async () => {
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.getAccessToken()).toBe(null);
  });

  it('legacy properties work correctly', async () => {
    const validTokens = { ...mockStoredTokens, expiresAt: Date.now() + 3600000 };
    localStorageMock._setStore({ workers_auth_tokens: JSON.stringify(validTokens) });
    const { useAuth } = await import('@/hooks/auth/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toBe(null);
    expect(result.current.authProvider).toBe('workers');
  });
});