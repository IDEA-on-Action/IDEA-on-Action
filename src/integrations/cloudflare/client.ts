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

  history: async (token: string, params?: { limit?: number; offset?: number; subscriptionId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));
    if (params?.subscriptionId) queryParams.set('subscription_id', params.subscriptionId);
    const query = queryParams.toString();
    return callWorkersApi(`/api/v1/payments/toss/history${query ? `?${query}` : ''}`, { token });
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

  getPublicUrl: (path: string) => {
    return `${WORKERS_API_URL}/api/v1/storage/public/${path}`;
  },
};

/**
 * 미디어 라이브러리 API
 */
export const mediaApi = {
  // 미디어 목록 조회
  list: async (token: string, params?: {
    search?: string;
    mime_type?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.mime_type) query.set('mime_type', params.mime_type);
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.sort_order) query.set('sort_order', params.sort_order);
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/media${queryString ? `?${queryString}` : ''}`, { token });
  },

  // 단일 미디어 조회
  getById: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/media/${id}`, { token });
  },

  // 미디어 업로드
  upload: async (token: string, files: File[], options?: {
    folder?: string;
    altText?: string;
  }) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (options?.folder) formData.append('folder', options.folder);
    if (options?.altText) formData.append('alt_text', options.altText);

    const response = await fetch(`${WORKERS_API_URL}/api/v1/media/upload`, {
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

  // 미디어 메타데이터 수정
  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/media/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  // 미디어 삭제 (소프트 삭제)
  delete: async (token: string, ids: string[]) => {
    return callWorkersApi('/api/v1/media/delete', {
      method: 'POST',
      token,
      body: { ids },
    });
  },

  // 미디어 영구 삭제
  permanentDelete: async (token: string, ids: string[]) => {
    return callWorkersApi('/api/v1/media/permanent-delete', {
      method: 'POST',
      token,
      body: { ids },
    });
  },

  // Public URL 조회
  getPublicUrl: (storagePath: string) => {
    return `${WORKERS_API_URL}/api/v1/media/public/${storagePath}`;
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

  updateStatus: async (token: string, id: string, status: string) => {
    return callWorkersApi(`/api/v1/orders/${id}`, {
      method: 'PATCH',
      token,
      body: { status },
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

  getByType: async (type: string) => {
    return callWorkersApi(`/api/v1/portfolio?category=${type}`);
  },

  // Admin CRUD
  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/portfolio', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/portfolio/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/portfolio/${id}`, {
      method: 'DELETE',
      token,
    });
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

  getPublished: async () => {
    return callWorkersApi('/api/v1/roadmap?status=published');
  },

  // Admin CRUD
  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/roadmap', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/roadmap/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/roadmap/${id}`, {
      method: 'DELETE',
      token,
    });
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

/**
 * 구독 API
 */
export const subscriptionsApi = {
  // 플랜 목록 조회
  getPlans: async () => {
    return callWorkersApi('/api/v1/subscriptions/plans');
  },

  // 현재 구독 조회
  getCurrent: async (token: string) => {
    return callWorkersApi('/api/v1/subscriptions/current', { token });
  },

  // 구독 내역 조회
  getHistory: async (token: string) => {
    return callWorkersApi('/api/v1/subscriptions/history', { token });
  },

  // 구독 생성
  create: async (token: string, data: { plan_id: string; billing_key_id: string }) => {
    return callWorkersApi('/api/v1/subscriptions', {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 구독 취소
  cancel: async (token: string, id: string, data: { cancel_immediately?: boolean; reason?: string }) => {
    return callWorkersApi(`/api/v1/subscriptions/${id}/cancel`, {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 구독 재개
  resume: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/subscriptions/${id}/resume`, {
      method: 'POST',
      token,
    });
  },

  // 플랜 변경
  changePlan: async (token: string, id: string, data: { new_plan_id: string }) => {
    return callWorkersApi(`/api/v1/subscriptions/${id}/change-plan`, {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 결제 수단 변경
  updatePayment: async (token: string, id: string, data: { billing_key_id: string }) => {
    return callWorkersApi(`/api/v1/subscriptions/${id}/update-payment`, {
      method: 'POST',
      token,
      body: data,
    });
  },
};

/**
 * 뉴스레터 API
 */
export const newsletterApi = {
  // 구독 신청 (공개)
  subscribe: async (email: string, metadata?: Record<string, unknown>) => {
    return callWorkersApi<{
      id: string;
      email: string;
      status: string;
      subscribed_at: string;
    }>('/api/v1/newsletter/subscribe', {
      method: 'POST',
      body: { email, metadata },
    });
  },

  // 구독 확인 (토큰 기반)
  confirm: async (confirmToken: string) => {
    return callWorkersApi('/api/v1/newsletter/confirm', {
      method: 'POST',
      body: { token: confirmToken },
    });
  },

  // 구독 취소 (공개)
  unsubscribe: async (email: string) => {
    return callWorkersApi('/api/v1/newsletter/unsubscribe', {
      method: 'POST',
      body: { email },
    });
  },

  // 통계 조회 (관리자)
  getStats: async (token: string) => {
    return callWorkersApi<{
      total: number;
      pending: number;
      confirmed: number;
      unsubscribed: number;
    }>('/api/v1/newsletter/stats', { token });
  },

  // 구독자 목록 조회 (관리자)
  getSubscribers: async (token: string, params?: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('date_from', params.dateFrom);
    if (params?.dateTo) query.set('date_to', params.dateTo);
    if (params?.orderBy) query.set('order_by', params.orderBy);
    if (params?.orderDirection) query.set('order_direction', params.orderDirection);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/newsletter/subscribers${queryString ? `?${queryString}` : ''}`, { token });
  },

  // 구독자 상태 변경 (관리자)
  updateStatus: async (token: string, id: string, status: string) => {
    return callWorkersApi(`/api/v1/newsletter/subscribers/${id}`, {
      method: 'PATCH',
      token,
      body: { status },
    });
  },

  // 구독자 삭제 (관리자)
  deleteSubscriber: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/newsletter/subscribers/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  // 구독자 일괄 삭제 (관리자)
  bulkDeleteSubscribers: async (token: string, ids: string[]) => {
    return callWorkersApi('/api/v1/newsletter/subscribers/bulk-delete', {
      method: 'POST',
      token,
      body: { ids },
    });
  },

  // 아카이브 목록 조회
  getArchive: async (params?: { limit?: number }) => {
    const query = params?.limit ? `?limit=${params.limit}` : '';
    return callWorkersApi(`/api/v1/newsletter/archive${query}`);
  },

  // 아카이브 단일 조회
  getArchiveItem: async (id: string) => {
    return callWorkersApi(`/api/v1/newsletter/archive/${id}`);
  },

  // 인접 아카이브 조회 (이전/다음)
  getAdjacentArchive: async (id: string, sentAt: string) => {
    return callWorkersApi(`/api/v1/newsletter/archive/${id}/adjacent?sent_at=${sentAt}`);
  },

  // 아카이브 검색
  searchArchive: async (searchTerm: string, limit?: number) => {
    const query = new URLSearchParams();
    query.set('q', searchTerm);
    if (limit) query.set('limit', String(limit));
    return callWorkersApi(`/api/v1/newsletter/archive/search?${query.toString()}`);
  },

  // 아카이브 통계
  getArchiveStats: async () => {
    return callWorkersApi('/api/v1/newsletter/archive/stats');
  },

  // 드래프트 목록 조회 (관리자)
  getDrafts: async (token: string, params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/newsletter/drafts${queryString ? `?${queryString}` : ''}`, { token });
  },

  // 드래프트 상세 조회 (관리자)
  getDraft: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/newsletter/drafts/${id}`, { token });
  },

  // 드래프트 생성 (관리자)
  createDraft: async (token: string, data: {
    subject: string;
    content: string;
    preview?: string;
    scheduled_at?: string;
    segment_filter?: Record<string, unknown>;
  }) => {
    return callWorkersApi('/api/v1/newsletter/drafts', {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 드래프트 수정 (관리자)
  updateDraft: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/newsletter/drafts/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  // 드래프트 삭제 (관리자)
  deleteDraft: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/newsletter/drafts/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  // 드래프트 예약 (관리자)
  scheduleDraft: async (token: string, id: string, scheduledAt: string) => {
    return callWorkersApi(`/api/v1/newsletter/drafts/${id}/schedule`, {
      method: 'POST',
      token,
      body: { scheduled_at: scheduledAt },
    });
  },

  // 예약 취소 (관리자)
  cancelSchedule: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/newsletter/drafts/${id}/cancel`, {
      method: 'POST',
      token,
    });
  },

  // 뉴스레터 발송 (관리자)
  sendNewsletter: async (token: string, data: {
    newsletter_id: string;
    test_mode?: boolean;
    test_email?: string;
  }) => {
    return callWorkersApi('/api/v1/newsletter/send', {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 드래프트 통계 (관리자)
  getDraftStats: async (token: string) => {
    return callWorkersApi('/api/v1/newsletter/drafts/stats', { token });
  },
};

/**
 * 프로젝트 API
 */
export const projectsApi = {
  list: async (params?: { status?: string; category?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/projects${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/projects/${id}`);
  },

  getBySlug: async (slug: string) => {
    return callWorkersApi(`/api/v1/projects/slug/${slug}`);
  },

  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/projects', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: string, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: string) => {
    return callWorkersApi(`/api/v1/projects/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 프로젝트 타입 API
 */
export const projectTypesApi = {
  list: async () => {
    return callWorkersApi('/api/v1/project-types');
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/project-types/${id}`);
  },

  getBySlug: async (slug: string) => {
    return callWorkersApi(`/api/v1/project-types/slug/${slug}`);
  },

  getStats: async () => {
    return callWorkersApi('/api/v1/project-types/stats');
  },

  updateOrder: async (token: string, items: Array<{ id: string; display_order: number }>) => {
    return callWorkersApi('/api/v1/project-types/order', {
      method: 'PATCH',
      token,
      body: { items },
    });
  },

  toggle: async (token: string, id: string, isActive: boolean) => {
    return callWorkersApi(`/api/v1/project-types/${id}`, {
      method: 'PATCH',
      token,
      body: { is_active: isActive },
    });
  },
};

/**
 * 제안 API
 */
export const proposalsApi = {
  list: async (token: string, params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/proposals${queryString ? `?${queryString}` : ''}`, { token });
  },

  getMyProposals: async (token: string) => {
    return callWorkersApi('/api/v1/proposals/me', { token });
  },

  submit: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/proposals', {
      method: 'POST',
      token,
      body: data,
    });
  },

  updateStatus: async (token: string, id: number, status: string, adminNotes?: string) => {
    return callWorkersApi(`/api/v1/proposals/${id}/status`, {
      method: 'PATCH',
      token,
      body: { status, admin_notes: adminNotes },
    });
  },

  delete: async (token: string, id: number) => {
    return callWorkersApi(`/api/v1/proposals/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 바운티 API
 */
export const bountiesApi = {
  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/bounties${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id: number) => {
    return callWorkersApi(`/api/v1/bounties/${id}`);
  },

  apply: async (token: string, bountyId: number) => {
    return callWorkersApi(`/api/v1/bounties/${bountyId}/apply`, {
      method: 'POST',
      token,
    });
  },

  create: async (token: string, data: Record<string, unknown>) => {
    return callWorkersApi('/api/v1/bounties', {
      method: 'POST',
      token,
      body: data,
    });
  },

  update: async (token: string, id: number, data: Record<string, unknown>) => {
    return callWorkersApi(`/api/v1/bounties/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  delete: async (token: string, id: number) => {
    return callWorkersApi(`/api/v1/bounties/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  assign: async (token: string, bountyId: number, userId: string) => {
    return callWorkersApi(`/api/v1/bounties/${bountyId}/assign`, {
      method: 'POST',
      token,
      body: { user_id: userId },
    });
  },
};

/**
 * 서비스 이벤트 API
 */
export const serviceEventsApi = {
  list: async (params?: {
    service_id?: string;
    event_type?: string;
    project_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.service_id) query.set('service_id', params.service_id);
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.project_id) query.set('project_id', params.project_id);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/service-events${queryString ? `?${queryString}` : ''}`);
  },

  getByService: async (serviceId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return callWorkersApi(`/api/v1/service-events/service/${serviceId}${query}`);
  },

  getByProject: async (projectId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return callWorkersApi(`/api/v1/service-events/project/${projectId}${query}`);
  },

  getStats: async (serviceId?: string) => {
    const query = serviceId ? `?service_id=${serviceId}` : '';
    return callWorkersApi(`/api/v1/service-events/stats${query}`);
  },
};

/**
 * 서비스 헬스 API
 */
export const serviceHealthApi = {
  list: async () => {
    return callWorkersApi('/api/v1/service-health');
  },

  getByService: async (serviceId: string) => {
    return callWorkersApi(`/api/v1/service-health/${serviceId}`);
  },
};

/**
 * 서비스 이슈 API
 */
export const serviceIssuesApi = {
  list: async (params?: {
    service_id?: string;
    severity?: string;
    status?: string;
    project_id?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.service_id) query.set('service_id', params.service_id);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.status) query.set('status', params.status);
    if (params?.project_id) query.set('project_id', params.project_id);
    if (params?.assigned_to) query.set('assigned_to', params.assigned_to);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryString = query.toString();
    return callWorkersApi(`/api/v1/service-issues${queryString ? `?${queryString}` : ''}`);
  },

  getOpen: async (serviceId?: string) => {
    const query = serviceId ? `?service_id=${serviceId}` : '';
    return callWorkersApi(`/api/v1/service-issues/open${query}`);
  },

  getById: async (id: string) => {
    return callWorkersApi(`/api/v1/service-issues/${id}`);
  },

  getStats: async () => {
    return callWorkersApi('/api/v1/service-issues/stats');
  },

  updateStatus: async (token: string, issueId: string, status: string, resolution?: string) => {
    return callWorkersApi(`/api/v1/service-issues/${issueId}/status`, {
      method: 'PATCH',
      token,
      body: { status, resolution },
    });
  },

  assign: async (token: string, issueId: string, assignedTo: string) => {
    return callWorkersApi(`/api/v1/service-issues/${issueId}/assign`, {
      method: 'PATCH',
      token,
      body: { assigned_to: assignedTo },
    });
  },
};

/**
 * 권한 API
 */
export const permissionsApi = {
  // 현재 사용자 권한 조회
  getMyPermissions: async (token: string) => {
    return callWorkersApi<{
      userId: string;
      isAdmin: boolean;
      roles: Array<{ id: string; name: string; permissions: string[] }>;
      permissions: string[];
    }>('/api/v1/permissions/me', { token });
  },

  // 권한 확인
  check: async (token: string, permission: string, resourceId?: string) => {
    return callWorkersApi<{ allowed: boolean; reason: string }>('/api/v1/permissions/check', {
      method: 'POST',
      token,
      body: { permission, resource_id: resourceId },
    });
  },

  // 리소스 권한 확인
  checkResource: async (token: string, resourceType: string, resourceId: string, action: 'read' | 'write' | 'delete') => {
    return callWorkersApi<{ allowed: boolean; reason: string }>('/api/v1/permissions/check-resource', {
      method: 'POST',
      token,
      body: { resource_type: resourceType, resource_id: resourceId, action },
    });
  },

  // 역할 목록 조회 (관리자)
  getRoles: async (token: string) => {
    return callWorkersApi<{ roles: Array<{ id: string; name: string; description: string; permissions: string[]; is_system: boolean }> }>(
      '/api/v1/permissions/roles',
      { token }
    );
  },

  // 역할 생성 (관리자)
  createRole: async (token: string, data: { name: string; description?: string; permissions: string[] }) => {
    return callWorkersApi<{ success: boolean; role: { id: string; name: string; description?: string; permissions: string[]; is_system: boolean } }>(
      '/api/v1/permissions/roles',
      { method: 'POST', token, body: data }
    );
  },

  // 역할 수정 (관리자)
  updateRole: async (token: string, roleId: string, data: { name?: string; description?: string; permissions?: string[] }) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/permissions/roles/${roleId}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  // 역할 삭제 (관리자)
  deleteRole: async (token: string, roleId: string) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/permissions/roles/${roleId}`, {
      method: 'DELETE',
      token,
    });
  },

  // 사용자 역할 조회 (관리자)
  getUserRoles: async (token: string, userId: string) => {
    return callWorkersApi<{ roles: Array<{ id: string; name: string; permissions: string[]; granted_at: string; granted_by: string; granted_by_name: string }> }>(
      `/api/v1/permissions/users/${userId}/roles`,
      { token }
    );
  },

  // 사용자에게 역할 부여 (관리자)
  assignRole: async (token: string, userId: string, roleId: string) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/permissions/users/${userId}/roles`, {
      method: 'POST',
      token,
      body: { role_id: roleId },
    });
  },

  // 사용자 역할 제거 (관리자)
  revokeRole: async (token: string, userId: string, roleId: string) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/permissions/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * 관리자 API
 */
export const adminsApi = {
  // 관리자 목록 조회
  list: async (token: string) => {
    return callWorkersApi<{ admins: Array<{ id: string; user_id: string; email: string; role: string; created_at: string }> }>(
      '/api/v1/admins',
      { token }
    );
  },

  // 역할별 관리자 조회
  listByRole: async (token: string, role: string) => {
    return callWorkersApi<{ admins: Array<{ id: string; user_id: string; email: string; role: string; created_at: string }> }>(
      `/api/v1/admins?role=${role}`,
      { token }
    );
  },

  // 관리자 생성
  create: async (token: string, data: { user_id: string; role: string }) => {
    return callWorkersApi<{ id: string; user_id: string; role: string }>('/api/v1/admins', {
      method: 'POST',
      token,
      body: data,
    });
  },

  // 관리자 수정
  update: async (token: string, id: string, data: { role: string }) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/admins/${id}`, {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  // 관리자 삭제
  delete: async (token: string, id: string) => {
    return callWorkersApi<{ success: boolean }>(`/api/v1/admins/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  // 현재 사용자가 관리자인지 확인
  checkIsAdmin: async (token: string) => {
    return callWorkersApi<{ isAdmin: boolean; role: string | null }>('/api/v1/admins/me', { token });
  },
};

/**
 * 2FA API
 */
export const twoFactorApi = {
  // 2FA 설정 조회
  getSettings: async (token: string) => {
    return callWorkersApi<{
      id: string;
      user_id: string;
      enabled: boolean;
      verified_at: string | null;
      backup_codes_used: number;
      created_at: string;
      updated_at: string;
      last_used_at: string | null;
    } | null>('/api/v1/2fa/settings', { token });
  },

  // 2FA 설정 초기화 (QR 코드 생성)
  setup: async (token: string) => {
    return callWorkersApi<{
      secret: string;
      qrCode: string;
      backupCodes: string[];
    }>('/api/v1/2fa/setup', { method: 'POST', token });
  },

  // 2FA 활성화 (토큰 검증 후)
  enable: async (token: string, totpToken: string) => {
    return callWorkersApi<{ success: boolean }>('/api/v1/2fa/enable', {
      method: 'POST',
      token,
      body: { token: totpToken },
    });
  },

  // 2FA 비활성화
  disable: async (token: string, password: string) => {
    return callWorkersApi<{ success: boolean }>('/api/v1/2fa/disable', {
      method: 'POST',
      token,
      body: { password },
    });
  },

  // 백업 코드 재생성
  regenerateBackupCodes: async (token: string) => {
    return callWorkersApi<{ backupCodes: string[] }>('/api/v1/2fa/backup-codes', {
      method: 'POST',
      token,
    });
  },

  // 2FA 검증
  verify: async (token: string, totpToken: string, isBackupCode?: boolean) => {
    return callWorkersApi<{ success: boolean }>('/api/v1/2fa/verify', {
      method: 'POST',
      token,
      body: { token: totpToken, isBackupCode },
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
  media: mediaApi,
  realtime: realtimeApi,
  health: healthApi,
  services: servicesApi,
  orders: ordersApi,
  cart: cartApi,
  blog: blogApi,
  portfolio: portfolioApi,
  roadmap: roadmapApi,
  notices: noticesApi,
  subscriptions: subscriptionsApi,
  newsletter: newsletterApi,
  projects: projectsApi,
  projectTypes: projectTypesApi,
  proposals: proposalsApi,
  bounties: bountiesApi,
  serviceEvents: serviceEventsApi,
  serviceHealth: serviceHealthApi,
  serviceIssues: serviceIssuesApi,
  permissions: permissionsApi,
  admins: adminsApi,
  twoFactor: twoFactorApi,
  call: callWorkersApi,
};
