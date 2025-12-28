/**
 * Supabase Client 호환성 레이어
 *
 * 테스트 파일에서 @/integrations/supabase/client를 import하는 경우를 위한
 * 호환성 shim입니다. 실제 프로덕션 코드는 Cloudflare Workers API를 사용합니다.
 *
 * @deprecated 테스트 호환성을 위해서만 유지됩니다.
 * 새로운 코드는 @/integrations/cloudflare/workers-api를 사용하세요.
 */

// Mock 가능한 Supabase 클라이언트 인터페이스
interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQueryBuilder
  insert: (data: unknown) => SupabaseQueryBuilder
  update: (data: unknown) => SupabaseQueryBuilder
  delete: () => SupabaseQueryBuilder
  eq: (column: string, value: unknown) => SupabaseQueryBuilder
  neq: (column: string, value: unknown) => SupabaseQueryBuilder
  gt: (column: string, value: unknown) => SupabaseQueryBuilder
  gte: (column: string, value: unknown) => SupabaseQueryBuilder
  lt: (column: string, value: unknown) => SupabaseQueryBuilder
  lte: (column: string, value: unknown) => SupabaseQueryBuilder
  like: (column: string, value: string) => SupabaseQueryBuilder
  ilike: (column: string, value: string) => SupabaseQueryBuilder
  is: (column: string, value: unknown) => SupabaseQueryBuilder
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder
  contains: (column: string, value: unknown) => SupabaseQueryBuilder
  containedBy: (column: string, value: unknown) => SupabaseQueryBuilder
  range: (column: string, from: unknown, to: unknown) => SupabaseQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder
  limit: (count: number) => SupabaseQueryBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then: <T>(callback: (result: { data: unknown; error: unknown }) => T) => Promise<T>
}

interface SupabaseAuth {
  getUser: () => Promise<{ data: { user: unknown }; error: unknown }>
  getSession: () => Promise<{ data: { session: unknown }; error: unknown }>
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ data: unknown; error: unknown }>
  signInWithOAuth: (options: { provider: string; options?: { redirectTo?: string } }) => Promise<{ data: unknown; error: unknown }>
  signUp: (credentials: { email: string; password: string }) => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<{ error: unknown }>
  resetPasswordForEmail: (email: string) => Promise<{ data: unknown; error: unknown }>
  updateUser: (attributes: unknown) => Promise<{ data: unknown; error: unknown }>
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => { data: { subscription: { unsubscribe: () => void } } }
}

interface SupabaseStorage {
  from: (bucket: string) => {
    upload: (path: string, file: unknown) => Promise<{ data: unknown; error: unknown }>
    download: (path: string) => Promise<{ data: unknown; error: unknown }>
    remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>
    getPublicUrl: (path: string) => { data: { publicUrl: string } }
    list: (path?: string) => Promise<{ data: unknown[]; error: unknown }>
  }
}

interface SupabaseClient {
  from: (table: string) => SupabaseQueryBuilder
  auth: SupabaseAuth
  storage: SupabaseStorage
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>
  channel: (name: string) => {
    on: (event: string, callback: unknown) => unknown
    subscribe: () => unknown
    unsubscribe: () => void
  }
}

// Query Builder 생성 헬퍼 (체이닝 지원)
function createQueryBuilder(): SupabaseQueryBuilder {
  const builder: SupabaseQueryBuilder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    containedBy: () => builder,
    range: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (callback) => Promise.resolve({ data: null, error: null }).then(callback),
  }
  return builder
}

// Mock Supabase 클라이언트 (테스트에서 오버라이드 가능)
export const supabase: SupabaseClient = {
  from: (_table: string) => createQueryBuilder(),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
    updateUser: () => Promise.resolve({ data: null, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      list: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  rpc: () => Promise.resolve({ data: null, error: null }),
  channel: () => ({
    on: () => ({}),
    subscribe: () => ({}),
    unsubscribe: () => {},
  }),
}

export default supabase
