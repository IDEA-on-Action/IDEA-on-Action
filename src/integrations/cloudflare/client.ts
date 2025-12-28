/**
 * Cloudflare Workers API 클라이언트
 * Supabase Edge Functions에서 마이그레이션
 */

// API 엔드포인트 설정
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai';

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

/**
 * 서비스 API
 */
export const servicesApi = {
  list: async (params?: {
    status?: string;
    category_id?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category_id) query.set('category_id', params.category_id);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/services${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/services/${id}`);
  },

  getBySlug: async (slug: string) => {
    return callWorkersApi(`/api/v1/services/slug/${slug}`);
  },

  getCategories: async () => {
    return callWorkersApi('/api/v1/services/categories/list');
  },

  getCategoryCount: async (categoryId: string) => {
    return callWorkersApi(`/api/v1/services/categories/${categoryId}/count`);
  },

  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/services', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/services/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/services/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 주문 API
 */
export const ordersApi = {
  list: async (token: string, params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/orders${queryString ? `?${queryString}` : ''}`, { token });
  },

  getById: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/orders/${id}`, { token });
  },

  create: async (token: string, data: { items: Array<{ service_id: string; package_id?: string; quantity?: number }>; notes?: string }) => {
    return callWorkersApi('/api/v1/orders', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/orders/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  cancel: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/orders/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 장바구니 API
 */
export const cartApi = {
  get: async (token: string) => {
    return callWorkersApi('/api/v1/cart', { token });
  },

  add: async (token: string, data: { service_id: string; package_id?: string; quantity?: number }) => {
    return callWorkersApi('/api/v1/cart', {
      method: 'POST',
      token,
      body: data,
    });
  },

  updateQuantity: async (token: string, id: string, quantity: number) => {
    return callWorkersApi(`/api/v1/cart/${id}`, {
      method: 'PATCH',
      token,
      body: { quantity },
    });
  },

  remove: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/cart/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  clear: async (token: string) => {
    return callWorkersApi('/api/v1/cart', {
      method: 'DELETE',
      token,
    });
  },

  checkout: async (token: string) => {
    return callWorkersApi('/api/v1/cart/checkout', {
      method: 'POST',
      token,
    });
  },
};

/**
 * 블로그 API
 */
export const blogApi = {
  getPosts: async (params?: {
    status?: string;
    category_id?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category_id) query.set('category_id', params.category_id);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/blog/posts${queryString ? `?${queryString}` : ''}`);
  },

  getPost: async (slug: string) => {
    return callWorkersApi(`/api/v1/blog/posts/${slug}`);
  },

  getCategories: async () => {
    return callWorkersApi('/api/v1/blog/categories');
  },

  getTags: async () => {
    return callWorkersApi('/api/v1/blog/tags');
  },

  createPost: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/blog/posts', {
      method: 'POST',
      token,
      body: data,
    });
  },

  updatePost: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/blog/posts/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  deletePost: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/blog/posts/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 포트폴리오 API (D1 스키마 매칭)
 */
export const portfolioApi = {
  list: async (params?: {
    category?: string;
    featured?: boolean;
    status?: 'draft' | 'published' | 'archived';
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.featured) query.set('featured', 'true');
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/portfolio${queryString ? `?${queryString}` : ''}`);
  },

  getFeatured: async () => {
    return callWorkersApi('/api/v1/portfolio/featured');
  },

  getByCategory: async (category: string) => {
    return callWorkersApi(`/api/v1/portfolio/category/${category}`);
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/portfolio/${id}`);
  },

  getBySlug: async (slug: string) => {
    return callWorkersApi(`/api/v1/portfolio/slug/${slug}`);
  },
};

/**
 * 로드맵 API (D1 스키마 매칭)
 */
export const roadmapApi = {
  list: async (params?: {
    category?: string;
    status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/roadmap${queryString ? `?${queryString}` : ''}`);
  },

  getActive: async () => {
    return callWorkersApi('/api/v1/roadmap/active');
  },

  getByCategory: async (category: string) => {
    return callWorkersApi(`/api/v1/roadmap/category/${category}`);
  },

  getByStatus: async (status: string) => {
    return callWorkersApi(`/api/v1/roadmap/status/${status}`);
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/roadmap/${id}`);
  },
};

/**
 * 공지사항 API
 */
export const noticesApi = {
  list: async (params?: { type?: string; include_expired?: boolean; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.include_expired) query.set('include_expired', 'true');
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/notices${queryString ? `?${queryString}` : ''}`);
  },

  getPinned: async () => {
    return callWorkersApi('/api/v1/notices/pinned');
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/notices/${id}`);
  },

  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/notices', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/notices/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/notices/${id}`, {
      method: 'DELETE',
      token,
    });
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
  services: servicesApi,
  orders: ordersApi,
  cart: cartApi,
  blog: blogApi,
  portfolio: portfolioApi,
  roadmap: roadmapApi,
  notices: noticesApi,
  call: callWorkersApi,
};
