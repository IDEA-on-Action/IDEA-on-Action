/**
 * Cloudflare Workers API 클라이언트
 * Supabase Edge Functions에서 마이그레이션
 */

// API 엔드포인트 설정
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://idea-on-action-api.sinclair-account.workers.dev';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Workers API 호출 헬퍼
 */
export async function callWorkersApi<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${WORKERS_API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || data.message || 'API 오류가 발생했습니다',
        status: response.status,
      };
    }

    return {
      data: data as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error('Workers API 호출 오류:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다',
      status: 0,
    };
  }
}

/**
 * 인증 API
 */
export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    return callWorkersApi<{
      user: { id: string; email: string; name: string | null };
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
  },

  login: async (email: string, password: string) => {
    return callWorkersApi<{
      user: { id: string; email: string; name: string | null; avatarUrl: string | null; isAdmin: boolean };
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  refresh: async (refreshToken: string) => {
    return callWorkersApi<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  logout: async (refreshToken: string) => {
    return callWorkersApi('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  forgotPassword: async (email: string) => {
    return callWorkersApi('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  resetPassword: async (token: string, password: string) => {
    return callWorkersApi('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },
};

/**
 * 사용자 API
 */
export const usersApi = {
  getMe: async (token: string) => {
    return callWorkersApi('/api/v1/users/me', { token });
  },

  updateMe: async (token: string, data: { name?: string; avatar_url?: string }) => {
    return callWorkersApi('/api/v1/users/me', {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  updateProfile: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/users/me/profile', {
      method: 'PATCH',
      token,
      body: data,
    });
  },
};

/**
 * 세션 API
 */
export const sessionsApi = {
  list: async (token: string) => {
    return callWorkersApi('/api/v1/sessions', { token });
  },

  create: async (token: string) => {
    return callWorkersApi('/api/v1/sessions', {
      method: 'POST',
      token,
    });
  },

  delete: async (token: string, sessionId: string) => {
    return callWorkersApi(`/api/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      token,
    });
  },

  deleteOthers: async (token: string, currentSessionId: string) => {
    return callWorkersApi('/api/v1/sessions/others', {
      method: 'DELETE',
      token,
      headers: { 'X-Session-ID': currentSessionId },
    });
  },
};

/**
 * 결제 API
 */
export const paymentsApi = {
  confirm: async (token: string, data: { paymentKey: string; orderId: string; amount: number }) => {
    return callWorkersApi('/api/v1/payments/toss/confirm', {
      method: 'POST',
      token,
      body: data,
    });
  },

  issueBillingKey: async (token: string, data: { authKey: string; customerKey: string }) => {
    return callWorkersApi('/api/v1/payments/toss/billing-key', {
      method: 'POST',
      token,
      body: data,
    });
  },

  subscriptionPayment: async (token: string, data: {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
  }) => {
    return callWorkersApi('/api/v1/payments/toss/subscription', {
      method: 'POST',
      token,
      body: data,
    });
  },

  cancel: async (token: string, data: { paymentKey: string; cancelReason: string; cancelAmount?: number }) => {
    return callWorkersApi('/api/v1/payments/toss/cancel', {
      method: 'POST',
      token,
      body: data,
    });
  },

  history: async (token: string, params?: { limit?: number; offset?: number }) => {
    const query = params ? `?limit=${params.limit || 20}&offset=${params.offset || 0}` : '';
    return callWorkersApi(`/api/v1/payments/toss/history${query}`, { token });
  },
};

/**
 * RAG 검색 API
 */
export const ragApi = {
  search: async (token: string | null, data: {
    query: string;
    limit?: number;
    threshold?: number;
    filters?: Record<string, unknown>;
    searchType?: 'vector' | 'keyword' | 'hybrid';
    hybridWeight?: number;
  }) => {
    return callWorkersApi('/api/v1/rag/search', {
      method: 'POST',
      token: token || undefined,
      body: data,
    });
  },

  embed: async (token: string, documentId: string) => {
    return callWorkersApi(`/api/v1/rag/embed/${documentId}`, {
      method: 'POST',
      token,
    });
  },

  similar: async (token: string | null, documentId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return callWorkersApi(`/api/v1/rag/similar/${documentId}${query}`, {
      token: token || undefined,
    });
  },
};

/**
 * 스토리지 API
 */
export const storageApi = {
  list: async (token: string, folder?: string) => {
    const query = folder ? `?folder=${folder}` : '';
    return callWorkersApi(`/api/v1/storage/files${query}`, { token });
  },

  upload: async (token: string, file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const response = await fetch(`${WORKERS_API_URL}/api/v1/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.error,
      status: response.status,
    };
  },

  delete: async (token: string, fileId: string) => {
    return callWorkersApi(`/api/v1/storage/files/${fileId}`, {
      method: 'DELETE',
      token,
    });
  },

  download: async (token: string, fileId: string) => {
    const response = await fetch(`${WORKERS_API_URL}/api/v1/storage/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response;
  },
};

/**
 * 실시간 API (WebSocket)
 */
export const realtimeApi = {
  connect: (roomId: string, userId?: string) => {
    const wsUrl = WORKERS_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const params = userId ? `?userId=${userId}` : '';
    return new WebSocket(`${wsUrl}/realtime/${roomId}${params}`);
  },

  getPresence: async (roomId: string) => {
    return callWorkersApi(`/realtime/${roomId}/presence`);
  },

  getStats: async (roomId: string) => {
    return callWorkersApi(`/realtime/${roomId}/stats`);
  },
};

/**
 * 헬스 체크
 */
export const healthApi = {
  check: async () => {
    return callWorkersApi<{
      status: string;
      version: string;
      environment: string;
      timestamp: string;
      checks: Array<{ name: string; status: string; latency: number }>;
    }>('/health');
  },
};

// 기본 내보내기
export default {
  auth: authApi,
  users: usersApi,
  sessions: sessionsApi,
  payments: paymentsApi,
  rag: ragApi,
  storage: storageApi,
  realtime: realtimeApi,
  health: healthApi,
  call: callWorkersApi,
};
