import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import * as jose from 'jose';
import productInquiries from '../src/handlers/api/product-inquiries';
import { authMiddleware } from '../src/middleware/auth';
import { validateProductInquiry } from '../src/lib/product-inquiry';
import type { AppType } from '../src/types';

const JWT_SECRET = 'test-secret';

type Row = Record<string, string | null>;

/** 핸들러가 쓰는 쿼리만 흉내 내는 D1 대역 */
function createFakeDb(rows: Row[] = []) {
  const statement = (sql: string, params: unknown[] = []) => ({
    bind: (...bound: unknown[]) => statement(sql, bound),
    async first() {
      if (sql.includes('COUNT(*)')) {
        const [email, since] = params as string[];
        return { count: rows.filter((r) => r.email === email && (r.created_at ?? '') >= since).length };
      }
      return rows.find((r) => r.id === params[0]) ?? null;
    },
    async run() {
      if (sql.includes('INSERT INTO product_inquiries')) {
        const [id, product_id, company, name, email, phone, role, use_case, deployment, timeline, consent_at, created_at] =
          params as (string | null)[];
        rows.push({
          id, product_id, company, name, email, phone, role, use_case, deployment, timeline,
          consent_at, status: 'received', admin_notes: null, created_at,
        });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith('UPDATE product_inquiries')) {
        const id = params[params.length - 1];
        const row = rows.find((r) => r.id === id);
        if (!row) return { meta: { changes: 0 } };
        const columns = [...sql.matchAll(/(\w+) = \?/g)].map((m) => m[1]).slice(0, -1);
        columns.forEach((column, index) => {
          row[column] = params[index] as string | null;
        });
        return { meta: { changes: 1 } };
      }
      throw new Error(`예상하지 못한 쿼리: ${sql}`);
    },
    async all() {
      let result = [...rows];
      if (sql.includes('status = ?')) result = result.filter((r) => r.status === params[0]);
      return { results: result.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')) };
    },
  });
  return { rows, db: { prepare: (sql: string) => statement(sql) } };
}

function createFakeKv() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      const value = store.get(key);
      return value ? JSON.parse(value) : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createEnv(overrides: Record<string, unknown> = {}) {
  const fake = createFakeDb();
  const env = {
    DB: fake.db,
    RATE_LIMIT: createFakeKv(),
    JWT_SECRET,
    ENVIRONMENT: 'production',
    PRODUCT_INQUIRY_ENABLED: 'true',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    RESEND_API_KEY: 'resend-key',
    PRODUCT_INQUIRY_RECIPIENT: 'recipient@example.com',
    ...overrides,
  };
  return { env, rows: fake.rows };
}

const app = new Hono<AppType>();
app.use('*', authMiddleware);
app.route('/api/v1/product-inquiries', productInquiries);

const validBody = {
  product_id: 'kfde-studio',
  company: '예시 회사',
  name: '홍길동',
  email: 'Hong@Example.com',
  phone: '',
  role: 'data_it',
  use_case: '설비 점검 이력을 온톨로지로 정의하고 조치 제안을 받으려고 합니다.',
  deployment: 'on_premise',
  timeline: '',
  consent: true,
  website: '',
  turnstile_token: 'token',
};

const post = (env: unknown, body: unknown) =>
  app.request(
    '/api/v1/product-inquiries',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    env as AppType['Bindings']
  );

async function token(isAdmin: boolean) {
  return new jose.SignJWT({ is_admin: isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

describe('제품 문의 API', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let turnstileSuccess: boolean;

  beforeEach(() => {
    turnstileSuccess = true;
    fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('turnstile')) {
        return new Response(JSON.stringify({ success: turnstileSuccess }));
      }
      return new Response(JSON.stringify({ id: 'email-1' }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const emailCalls = () =>
    fetchMock.mock.calls
      .filter(([url]) => String(url).includes('resend'))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

  it('공개 설정이 꺼져 있으면 접수하지 않는다', async () => {
    const { env, rows } = createEnv({ PRODUCT_INQUIRY_ENABLED: 'false' });
    const response = await post(env, validBody);

    expect(response.status).toBe(503);
    expect(rows).toHaveLength(0);
  });

  it('필수 항목과 동의를 검증한 뒤 product_inquiries 에 저장한다', async () => {
    const { env, rows } = createEnv();
    const response = await post(env, validBody);

    expect(response.status).toBe(201);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      product_id: 'kfde-studio',
      company: '예시 회사',
      email: 'hong@example.com',
      phone: null,
      role: 'data_it',
      deployment: 'on_premise',
      timeline: null,
      status: 'received',
    });
    expect(rows[0].consent_at).toBeTruthy();
  });

  it('수신자 알림 1통과 문의자 접수 확인 1통을 보낸다', async () => {
    const { env } = createEnv();
    await post(env, validBody);
    await vi.waitFor(() => expect(emailCalls()).toHaveLength(2));

    const recipients = emailCalls().map((call) => call.to[0]).sort();
    expect(recipients).toEqual(['hong@example.com', 'recipient@example.com']);
  });

  it('수신자가 정해지지 않았으면 접수 확인 메일만 보낸다', async () => {
    const { env, rows } = createEnv({ PRODUCT_INQUIRY_RECIPIENT: undefined });
    const response = await post(env, validBody);
    await vi.waitFor(() => expect(emailCalls()).toHaveLength(1));

    expect(response.status).toBe(201);
    expect(rows).toHaveLength(1);
    expect(emailCalls()[0].to).toEqual(['hong@example.com']);
  });

  it('동의 체크가 없으면 저장하지 않는다', async () => {
    const { env, rows } = createEnv();
    const response = await post(env, { ...validBody, consent: false });
    const json = (await response.json()) as { fields: Record<string, string> };

    expect(response.status).toBe(400);
    expect(json.fields.consent).toBeTruthy();
    expect(rows).toHaveLength(0);
  });

  it('적용하려는 업무가 20자 미만이면 저장하지 않는다', async () => {
    const { env, rows } = createEnv();
    const response = await post(env, { ...validBody, use_case: '짧은 내용' });

    expect(response.status).toBe(400);
    expect(rows).toHaveLength(0);
  });

  it('숨김 입력 칸이 채워져 있으면 저장하지 않고 메일도 보내지 않는다', async () => {
    const { env, rows } = createEnv();
    const response = await post(env, { ...validBody, website: 'https://spam.example' });

    expect(response.status).toBe(201);
    expect(rows).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Turnstile 검증에 실패하면 저장하지 않는다', async () => {
    turnstileSuccess = false;
    const { env, rows } = createEnv();
    const response = await post(env, validBody);

    expect(response.status).toBe(400);
    expect(rows).toHaveLength(0);
  });

  it('운영 환경에 Turnstile 비밀 키가 없으면 접수하지 않는다', async () => {
    const { env, rows } = createEnv({ TURNSTILE_SECRET_KEY: undefined });
    const response = await post(env, validBody);

    expect(response.status).toBe(503);
    expect(rows).toHaveLength(0);
  });

  it('같은 메일 주소로 하루 3건을 넘으면 막는다', async () => {
    const { env, rows } = createEnv();
    for (let i = 0; i < 3; i += 1) {
      expect((await post(env, validBody)).status).toBe(201);
    }
    const response = await post(env, validBody);

    expect(response.status).toBe(429);
    expect(rows).toHaveLength(3);
  });

  it('같은 IP 에서 한 시간에 5건을 넘으면 막는다', async () => {
    const { env } = createEnv();
    for (let i = 0; i < 5; i += 1) {
      await post(env, { ...validBody, email: `user${i}@example.com` });
    }
    const response = await post(env, { ...validBody, email: 'user9@example.com' });

    expect(response.status).toBe(429);
  });

  it('목록 조회와 상태 변경은 관리자만 할 수 있다', async () => {
    const { env, rows } = createEnv();
    await post(env, validBody);
    const id = rows[0].id as string;
    const bindings = env as unknown as AppType['Bindings'];

    const anonymous = await app.request('/api/v1/product-inquiries', {}, bindings);
    expect(anonymous.status).toBe(403);

    const userHeaders = { Authorization: `Bearer ${await token(false)}` };
    expect((await app.request('/api/v1/product-inquiries', { headers: userHeaders }, bindings)).status).toBe(403);

    const adminHeaders = { Authorization: `Bearer ${await token(true)}`, 'Content-Type': 'application/json' };
    const list = await app.request('/api/v1/product-inquiries', { headers: adminHeaders }, bindings);
    expect(list.status).toBe(200);
    expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(1);

    const patched = await app.request(
      `/api/v1/product-inquiries/${id}`,
      { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'contacted', admin_notes: '메일 회신' }) },
      bindings
    );
    expect(patched.status).toBe(200);
    expect(rows[0]).toMatchObject({ status: 'contacted', admin_notes: '메일 회신' });

    const invalid = await app.request(
      `/api/v1/product-inquiries/${id}`,
      { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'unknown' }) },
      bindings
    );
    expect(invalid.status).toBe(400);
  });
});

describe('validateProductInquiry', () => {
  it('선택 항목이 비어 있으면 null 로 정리한다', () => {
    const result = validateProductInquiry(validBody);
    expect(result.ok && result.value).toMatchObject({ phone: null, timeline: null, role: 'data_it' });
  });

  it('허용하지 않는 선택 값을 거부한다', () => {
    const result = validateProductInquiry({ ...validBody, deployment: 'moon', role: 'ceo', product_id: 'other' });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['deployment', 'product_id', 'role']);
  });
});
