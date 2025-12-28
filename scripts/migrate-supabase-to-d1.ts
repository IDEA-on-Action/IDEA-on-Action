#!/usr/bin/env npx tsx
/**
 * Supabase PostgreSQL → Cloudflare D1 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-supabase-to-d1.ts --table=users
 *   npx tsx scripts/migrate-supabase-to-d1.ts --all
 *   npx tsx scripts/migrate-supabase-to-d1.ts --all --dry-run
 *   npx tsx scripts/migrate-supabase-to-d1.ts --table=services --batch-size=50
 *
 * 환경변수:
 *   VITE_SUPABASE_URL - Supabase 프로젝트 URL
 *   VITE_SUPABASE_SERVICE_ROLE_KEY - Supabase Service Role 키
 *
 * D1 데이터베이스: idea-on-action-db
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// 설정
// =============================================================================

const D1_DATABASE_NAME = 'idea-on-action-db';
const DEFAULT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// 환경 변수 로드 (.env.local)
function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// =============================================================================
// 마이그레이션 대상 테이블 (의존성 순서)
// =============================================================================

interface TableConfig {
  name: string;
  supabaseTable?: string; // Supabase에서 다른 이름인 경우
  columns?: string[]; // 특정 컬럼만 선택
  orderBy?: string; // 정렬 기준
  filter?: Record<string, unknown>; // 필터 조건
}

const MIGRATION_TABLES: TableConfig[] = [
  // 1단계: 핵심 사용자 테이블
  { name: 'users', orderBy: 'created_at' },
  { name: 'user_profiles', orderBy: 'created_at' },
  { name: 'admins', orderBy: 'created_at' },
  { name: 'roles', orderBy: 'created_at' },
  { name: 'user_roles', orderBy: 'assigned_at' },
  { name: 'two_factor_auth', orderBy: 'created_at' },

  // 2단계: 서비스 테이블
  { name: 'service_categories', orderBy: 'display_order' },
  { name: 'services', orderBy: 'created_at' },
  { name: 'service_packages', orderBy: 'display_order' },

  // 3단계: 장바구니/주문 테이블
  { name: 'carts', orderBy: 'created_at' },
  { name: 'cart_items', orderBy: 'created_at' },
  { name: 'orders', orderBy: 'created_at' },
  { name: 'order_items', orderBy: 'created_at' },
  { name: 'payments', orderBy: 'created_at' },
  { name: 'billing_keys', orderBy: 'created_at' },

  // 4단계: 구독 테이블
  { name: 'subscription_plans', orderBy: 'display_order' },
  { name: 'subscriptions', orderBy: 'created_at' },
  { name: 'subscription_payments', orderBy: 'created_at' },

  // 5단계: CMS 테이블
  // Supabase blog_categories → D1 post_categories, blog_categories 모두 삽입
  { name: 'blog_categories', orderBy: 'created_at' },
  { name: 'blog_posts', orderBy: 'created_at' },
  { name: 'tags', orderBy: 'created_at' },
  { name: 'notices', orderBy: 'created_at' },
  { name: 'portfolio_items', orderBy: 'created_at' },
  { name: 'roadmap_items', orderBy: 'created_at' },

  // 6단계: 기타 테이블
  { name: 'analytics_events', orderBy: 'created_at' },
  { name: 'media_library', orderBy: 'created_at' },
  { name: 'teams', orderBy: 'created_at' },
  { name: 'team_members', orderBy: 'joined_at' },
  { name: 'team_invitations', orderBy: 'created_at' },
  { name: 'ai_conversations', orderBy: 'created_at' },
  { name: 'ai_messages', orderBy: 'created_at' },
  { name: 'prompt_templates', orderBy: 'created_at' },
  { name: 'rag_documents', orderBy: 'created_at' },
  { name: 'work_with_us_inquiries', orderBy: 'created_at' },
  { name: 'notifications', orderBy: 'created_at' },
  { name: 'audit_logs', orderBy: 'created_at' },
  { name: 'oauth_connections', orderBy: 'created_at' },
  { name: 'newsletter_subscriptions', orderBy: 'id' }, // created_at 컬럼 없는 경우 대비
];

// =============================================================================
// 컬럼 매핑 (Supabase → D1 이름 변환)
// =============================================================================

const COLUMN_MAPPING: Record<string, Record<string, string>> = {
  // Supabase 컬럼명 → D1 컬럼명
  blog_posts: {
    read_time: 'reading_time', // Supabase read_time → D1 reading_time
  },
  order_items: {
    service_title: 'name', // Supabase service_title → D1 name (별도 컬럼도 존재)
  },
  payments: {
    provider_transaction_id: 'payment_key', // Supabase → D1 (별도 컬럼도 존재)
  },
  newsletter_subscriptions: {
    subscribed_at: 'created_at', // Supabase subscribed_at → D1 created_at (별도 컬럼도 존재)
  },
};

// 테이블명 매핑 (Supabase → D1)
// blog_categories는 D1의 blog_categories에 직접 삽입 (post_categories 복사는 별도 로직)
const TABLE_MAPPING: Record<string, string> = {
  // 현재 특별한 테이블 매핑 없음
};

// =============================================================================
// PostgreSQL → SQLite 타입 변환
// =============================================================================

interface TransformRule {
  type: 'date' | 'json' | 'boolean' | 'array' | 'uuid' | 'text' | 'number';
}

const COLUMN_TRANSFORMS: Record<string, Record<string, TransformRule>> = {
  // 테이블별 특수 변환 규칙
  users: {
    email_confirmed_at: { type: 'date' },
    last_sign_in_at: { type: 'date' },
    raw_app_meta_data: { type: 'json' },
    raw_user_meta_data: { type: 'json' },
  },
  services: {
    features: { type: 'json' },
    benefits: { type: 'json' },
    requirements: { type: 'json' },
    deliverables: { type: 'json' },
    gallery: { type: 'json' },
    images: { type: 'json' },
    metrics: { type: 'json' },
    is_featured: { type: 'boolean' },
  },
  service_categories: {
    is_active: { type: 'boolean' },
  },
  service_packages: {
    features: { type: 'json' },
    is_popular: { type: 'boolean' },
  },
  orders: {
    paid_at: { type: 'date' },
    completed_at: { type: 'date' },
    cancelled_at: { type: 'date' },
    refunded_at: { type: 'date' },
    confirmed_at: { type: 'date' },
    shipped_at: { type: 'date' },
    delivered_at: { type: 'date' },
    metadata: { type: 'json' },
    shipping_address: { type: 'json' },
  },
  order_items: {
    service_snapshot: { type: 'json' },
  },
  payments: {
    gateway_response: { type: 'json' },
    metadata: { type: 'json' },
    refunded_at: { type: 'date' },
  },
  blog_posts: {
    published_at: { type: 'date' },
    tags: { type: 'json' },
    gallery: { type: 'json' },
    is_featured: { type: 'boolean' },
  },
  subscriptions: {
    current_period_start: { type: 'date' },
    current_period_end: { type: 'date' },
    trial_start: { type: 'date' },
    trial_end: { type: 'date' },
    cancelled_at: { type: 'date' },
    ended_at: { type: 'date' },
    metadata: { type: 'json' },
  },
  subscription_plans: {
    features: { type: 'json' },
    limits: { type: 'json' },
    is_active: { type: 'boolean' },
    is_popular: { type: 'boolean' },
  },
  subscription_payments: {
    billing_date: { type: 'date' },
    paid_at: { type: 'date' },
  },
  analytics_events: {
    properties: { type: 'json' },
  },
  portfolio_items: {
    gallery: { type: 'json' },
    technologies: { type: 'json' },
    features: { type: 'json' },
    is_featured: { type: 'boolean' },
    completed_at: { type: 'date' },
    published_at: { type: 'date' },
  },
  roadmap_items: {
    target_date: { type: 'date' },
    completed_at: { type: 'date' },
  },
  notices: {
    is_pinned: { type: 'boolean' },
    published_at: { type: 'date' },
    expires_at: { type: 'date' },
  },
  teams: {
    settings: { type: 'json' },
    is_active: { type: 'boolean' },
  },
  team_members: {
    permissions: { type: 'json' },
    joined_at: { type: 'date' },
  },
  team_invitations: {
    expires_at: { type: 'date' },
    accepted_at: { type: 'date' },
  },
  ai_conversations: {
    metadata: { type: 'json' },
    is_archived: { type: 'boolean' },
  },
  ai_messages: {
    metadata: { type: 'json' },
  },
  prompt_templates: {
    variables: { type: 'json' },
    is_public: { type: 'boolean' },
  },
  rag_documents: {
    metadata: { type: 'json' },
    is_public: { type: 'boolean' },
    is_indexed: { type: 'boolean' },
    indexed_at: { type: 'date' },
  },
  work_with_us_inquiries: {
    attachments: { type: 'json' },
    responded_at: { type: 'date' },
  },
  notifications: {
    data: { type: 'json' },
    read_at: { type: 'date' },
  },
  audit_logs: {
    old_values: { type: 'json' },
    new_values: { type: 'json' },
  },
  oauth_connections: {
    token_expires_at: { type: 'date' },
    profile_data: { type: 'json' },
  },
  newsletter_subscriptions: {
    confirmed_at: { type: 'date' },
    unsubscribed_at: { type: 'date' },
    metadata: { type: 'json' },
    topics: { type: 'json' },
  },
  media_library: {
    tags: { type: 'json' },
    metadata: { type: 'json' },
    is_public: { type: 'boolean' },
    deleted_at: { type: 'date' },
  },
  admins: {
    permissions: { type: 'json' },
    is_super_admin: { type: 'boolean' },
  },
  roles: {
    permissions: { type: 'json' },
  },
  user_profiles: {
    social_links: { type: 'json' },
    preferences: { type: 'json' },
  },
  two_factor_auth: {
    backup_codes: { type: 'json' },
    enabled: { type: 'boolean' },
    verified_at: { type: 'date' },
    last_used_at: { type: 'date' },
  },
  carts: {
    expires_at: { type: 'date' },
  },
  cart_items: {
    options: { type: 'json' },
  },
  billing_keys: {
    is_default: { type: 'boolean' },
    is_active: { type: 'boolean' },
  },
  post_categories: {
    // post_categories에는 boolean 컬럼 없음 - 기본 변환만 적용
  },
  // 기본 변환 규칙 (모든 테이블에 적용)
  _default: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

function log(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
  const timestamp = new Date().toISOString();
  const icons = {
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
    success: '[OK]',
  };
  console.log(`${timestamp} ${icons[level]} ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 값 변환 함수
function transformValue(value: unknown, rule: TransformRule): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  switch (rule.type) {
    case 'date':
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        try {
          return new Date(value).toISOString();
        } catch {
          return value;
        }
      }
      return value;

    case 'json':
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      if (typeof value === 'string') {
        try {
          // 이미 JSON 문자열인지 확인
          JSON.parse(value);
          return value;
        } catch {
          return JSON.stringify(value);
        }
      }
      return JSON.stringify(value);

    case 'boolean':
      return value ? 1 : 0;

    case 'array':
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      return value;

    case 'number':
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      }
      return null;

    case 'uuid':
    case 'text':
    default:
      return value;
  }
}

// slug 생성 함수 (한글 지원)
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거 (한글 유지)
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 연속 하이픈 제거
    .replace(/^-|-$/g, '') // 앞뒤 하이픈 제거
    .substring(0, 100); // 최대 100자
}

// 행 변환 함수
function transformRow(
  tableName: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  const tableTransforms = COLUMN_TRANSFORMS[tableName] || {};
  const defaultTransforms = COLUMN_TRANSFORMS._default || {};
  const transforms = { ...defaultTransforms, ...tableTransforms };

  // 컬럼 매핑 가져오기
  const columnMapping = COLUMN_MAPPING[tableName] || {};

  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // D1 컬럼명으로 매핑 (매핑이 있으면 변환, 없으면 원본 유지)
    const d1Key = columnMapping[key] || key;

    let transformedValue: unknown;

    if (transforms[key]) {
      transformedValue = transformValue(value, transforms[key]);
    } else if (typeof value === 'boolean') {
      // 자동 boolean 변환
      transformedValue = value ? 1 : 0;
    } else if (value instanceof Date) {
      // 자동 Date 변환
      transformedValue = value.toISOString();
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 자동 JSON 변환 (배열은 PostgreSQL에서 다른 형태로 올 수 있음)
      transformedValue = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      // 배열은 JSON으로 변환
      transformedValue = JSON.stringify(value);
    } else {
      transformedValue = value;
    }

    // 원본 키도 유지 (새 컬럼에 추가된 경우를 위해)
    transformed[key] = transformedValue;

    // 매핑된 키가 다르면 해당 키에도 값 설정
    if (d1Key !== key) {
      transformed[d1Key] = transformedValue;
    }
  }

  // 특별 처리: slug 자동 생성 (notices, services 등)
  const slugRequiredTables = ['notices', 'services', 'blog_posts', 'portfolio_items', 'roadmap_items', 'subscription_plans', 'service_categories', 'blog_categories'];
  if (slugRequiredTables.includes(tableName) && !transformed['slug']) {
    const nameOrTitle = String(transformed['title'] || transformed['name'] || '');
    const id = String(transformed['id'] || Date.now());
    if (nameOrTitle) {
      transformed['slug'] = `${generateSlug(nameOrTitle)}-${id.substring(0, 8)}`;
    } else {
      // name도 title도 없으면 ID로만 slug 생성
      transformed['slug'] = `item-${id.substring(0, 8)}`;
    }
  }

  // 특별 처리: notices type 값 정규화
  if (tableName === 'notices' && transformed['type']) {
    const validTypes = ['general', 'important', 'maintenance', 'update'];
    if (!validTypes.includes(String(transformed['type']))) {
      transformed['type'] = 'general'; // 기본값으로 설정
    }
  }

  // 특별 처리: NULL 값을 기본값으로 변환
  if (tableName === 'services' && !transformed['status']) {
    transformed['status'] = 'active';
  }

  if (tableName === 'subscription_plans' && !transformed['name']) {
    transformed['name'] = transformed['slug'] || `plan-${transformed['id']}`;
  }

  if (tableName === 'work_with_us_inquiries' && !transformed['message']) {
    transformed['message'] = '(메시지 없음)';
  }

  // payments 테이블 NOT NULL 필드 기본값 처리
  if (tableName === 'payments') {
    if (!transformed['method']) {
      transformed['method'] = 'card'; // 기본 결제수단
    }
    if (!transformed['provider']) {
      transformed['provider'] = 'toss';
    }
    if (transformed['amount'] === null || transformed['amount'] === undefined) {
      transformed['amount'] = 0;
    }
    if (!transformed['status']) {
      transformed['status'] = 'pending';
    }
    // user_id는 NULL 허용 (0011 마이그레이션 적용됨)
  }

  return transformed;
}

// SQL 문자열 이스케이프
function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    // 작은따옴표 이스케이프
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  // 기타 타입은 JSON으로 변환
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

// =============================================================================
// Supabase 데이터 조회
// =============================================================================

async function fetchFromSupabase(
  supabase: SupabaseClient,
  config: TableConfig,
  options: { limit: number; offset: number }
): Promise<{ data: Record<string, unknown>[]; error: Error | null }> {
  const { limit, offset } = options;
  const tableName = config.supabaseTable || config.name;

  try {
    let query = supabase
      .from(tableName)
      .select(config.columns ? config.columns.join(',') : '*')
      .range(offset, offset + limit - 1);

    if (config.orderBy) {
      query = query.order(config.orderBy, { ascending: true });
    }

    if (config.filter) {
      for (const [key, value] of Object.entries(config.filter)) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    // 타입 캐스팅 (Supabase 응답 타입 호환)
    return { data: (data as unknown as Record<string, unknown>[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

// 테이블 행 수 조회
async function getTableCount(
  supabase: SupabaseClient,
  config: TableConfig
): Promise<number> {
  const tableName = config.supabaseTable || config.name;

  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      log('warn', `[${config.name}] 행 수 조회 실패: ${error.message}`);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

// =============================================================================
// D1 스키마 조회 (컬럼 필터링용)
// =============================================================================

const D1_COLUMN_CACHE: Record<string, string[]> = {};

async function getD1Columns(tableName: string): Promise<string[]> {
  // 캐시 확인
  if (D1_COLUMN_CACHE[tableName]) {
    return D1_COLUMN_CACHE[tableName];
  }

  try {
    const result = execSync(
      `npx wrangler d1 execute ${D1_DATABASE_NAME} --remote --command="PRAGMA table_info(${tableName})" --json`,
      {
        cwd: path.join(process.cwd(), 'cloudflare-workers'),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    );

    // JSON 파싱
    const parsed = JSON.parse(result);
    const columns = parsed[0]?.results?.map((r: { name: string }) => r.name) || [];
    D1_COLUMN_CACHE[tableName] = columns;
    return columns;
  } catch (err) {
    log('warn', `[${tableName}] D1 컬럼 조회 실패, 전체 컬럼 사용`);
    return [];
  }
}

// 데이터 행에서 D1에 존재하는 컬럼만 필터링
function filterColumnsForD1(
  tableName: string,
  row: Record<string, unknown>,
  d1Columns: string[]
): Record<string, unknown> {
  if (d1Columns.length === 0) {
    return row; // 컬럼 정보가 없으면 전체 반환
  }

  const filtered: Record<string, unknown> = {};
  for (const col of d1Columns) {
    if (col in row) {
      filtered[col] = row[col];
    }
  }
  return filtered;
}

// =============================================================================
// D1 데이터 삽입 (Wrangler CLI 사용)
// =============================================================================

async function executeD1Command(
  sql: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    log('info', `[DRY-RUN] ${sql.slice(0, 100)}...`);
    return { success: true };
  }

  // SQL을 임시 파일에 저장
  const tempDir = path.join(process.cwd(), '.temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `d1-${Date.now()}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf-8');

  try {
    // wrangler d1 execute 명령어 실행
    execSync(
      `npx wrangler d1 execute ${D1_DATABASE_NAME} --file="${tempFile}" --remote`,
      {
        cwd: path.join(process.cwd(), 'cloudflare-workers'),
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 60000, // 60초 타임아웃
      }
    );

    return { success: true };
  } catch (err) {
    const error = err as { message?: string; stderr?: string };
    return {
      success: false,
      error: error.stderr || error.message || 'Unknown error',
    };
  } finally {
    // 임시 파일 삭제
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

// 배치 INSERT 생성
function generateBatchInsert(
  tableName: string,
  rows: Record<string, unknown>[]
): string {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const columnList = columns.join(', ');

  const valuesList = rows.map(row => {
    const values = columns.map(col => escapeSqlValue(row[col]));
    return `(${values.join(', ')})`;
  });

  // INSERT OR REPLACE 사용 (기존 데이터 덮어쓰기)
  // PRAGMA foreign_keys=OFF로 외래키 검사 비활성화
  return `PRAGMA foreign_keys=OFF;\nINSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES\n${valuesList.join(',\n')};\nPRAGMA foreign_keys=ON;`;
}

// D1에 배치 삽입
async function insertToD1(
  tableName: string,
  rows: Record<string, unknown>[],
  options: { dryRun: boolean; batchSize: number; d1TableName?: string }
): Promise<{ success: number; failed: number; errors: string[] }> {
  const { dryRun, batchSize, d1TableName } = options;
  // D1 대상 테이블명 (매핑이 있으면 사용)
  const targetTable = d1TableName || TABLE_MAPPING[tableName] || tableName;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const sql = generateBatchInsert(targetTable, batch);

    let retries = 0;
    let lastError = '';

    while (retries < MAX_RETRIES) {
      const result = await executeD1Command(sql, dryRun);

      if (result.success) {
        success += batch.length;
        break;
      } else {
        lastError = result.error || 'Unknown error';
        retries++;

        if (retries < MAX_RETRIES) {
          log('warn', `[${tableName}] 배치 ${i / batchSize + 1} 재시도 ${retries}/${MAX_RETRIES}`);
          await sleep(RETRY_DELAY_MS * retries);
        }
      }
    }

    if (retries === MAX_RETRIES) {
      failed += batch.length;
      errors.push(`배치 ${i / batchSize + 1}: ${lastError}`);
      log('error', `[${tableName}] 배치 ${i / batchSize + 1} 실패: ${lastError}`);
    }

    // 진행 상황 출력 (10% 단위)
    const progress = Math.min(i + batchSize, rows.length);
    const percent = Math.round((progress / rows.length) * 100);
    if (percent % 10 === 0 || progress === rows.length) {
      log('info', `[${tableName}] 진행: ${progress}/${rows.length} (${percent}%)`);
    }
  }

  return { success, failed, errors };
}

// =============================================================================
// 테이블 마이그레이션
// =============================================================================

interface MigrationResult {
  table: string;
  total: number;
  success: number;
  failed: number;
  duration: number;
  errors: string[];
}

async function migrateTable(
  supabase: SupabaseClient,
  config: TableConfig,
  options: { dryRun: boolean; batchSize: number }
): Promise<MigrationResult> {
  const startTime = Date.now();
  const tableName = config.name;

  log('info', `\n${'='.repeat(70)}`);
  log('info', `[${tableName}] 마이그레이션 시작`);
  log('info', '='.repeat(70));

  // 테이블 행 수 확인
  const totalCount = await getTableCount(supabase, config);
  log('info', `[${tableName}] 총 ${totalCount}개 행`);

  // D1 컬럼 정보 조회
  const d1Columns = await getD1Columns(tableName);
  if (d1Columns.length > 0) {
    log('info', `[${tableName}] D1 컬럼: ${d1Columns.length}개 (${d1Columns.slice(0, 5).join(', ')}${d1Columns.length > 5 ? '...' : ''})`);
  }

  if (totalCount === 0) {
    log('info', `[${tableName}] 데이터 없음, 건너뜀`);
    return {
      table: tableName,
      total: 0,
      success: 0,
      failed: 0,
      duration: Date.now() - startTime,
      errors: [],
    };
  }

  let offset = 0;
  let totalFetched = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  const FETCH_LIMIT = options.batchSize * 10; // 한 번에 가져올 행 수

  while (true) {
    // Supabase에서 데이터 가져오기
    const { data: rows, error } = await fetchFromSupabase(supabase, config, {
      limit: FETCH_LIMIT,
      offset,
    });

    if (error) {
      log('error', `[${tableName}] Supabase 조회 에러: ${error.message}`);
      allErrors.push(`Supabase 조회: ${error.message}`);
      break;
    }

    if (rows.length === 0) {
      break;
    }

    log('info', `[${tableName}] ${rows.length}개 행 가져옴 (offset: ${offset})`);

    // 데이터 변환 및 D1 컬럼 필터링
    const transformed = rows.map(row => {
      const transformedRow = transformRow(tableName, row);
      return filterColumnsForD1(tableName, transformedRow, d1Columns);
    });

    // D1에 삽입
    const result = await insertToD1(tableName, transformed, options);

    totalFetched += rows.length;
    totalSuccess += result.success;
    totalFailed += result.failed;
    allErrors.push(...result.errors);

    // 특별 처리: blog_categories → post_categories 복사
    if (tableName === 'blog_categories') {
      log('info', `[blog_categories] post_categories에도 복사 중...`);
      const postCatColumns = await getD1Columns('post_categories');
      const postCatTransformed = rows.map(row => {
        const transformedRow = transformRow(tableName, row);
        return filterColumnsForD1('post_categories', transformedRow, postCatColumns);
      });
      const postCatResult = await insertToD1(tableName, postCatTransformed, {
        ...options,
        d1TableName: 'post_categories',
      });
      if (postCatResult.failed > 0) {
        log('warn', `[post_categories] 일부 실패: ${postCatResult.failed}개`);
      }
    }

    offset += FETCH_LIMIT;

    // 다음 배치가 없으면 종료
    if (rows.length < FETCH_LIMIT) {
      break;
    }

    // Rate limiting 방지
    await sleep(100);
  }

  const duration = Date.now() - startTime;

  log('success', `[${tableName}] 완료: 총 ${totalFetched}개, 성공 ${totalSuccess}개, 실패 ${totalFailed}개 (${(duration / 1000).toFixed(1)}초)`);

  return {
    table: tableName,
    total: totalFetched,
    success: totalSuccess,
    failed: totalFailed,
    duration,
    errors: allErrors,
  };
}

// =============================================================================
// 메인 함수
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 인자 파싱
  const dryRun = args.includes('--dry-run');
  const migrateAll = args.includes('--all');
  const verbose = args.includes('--verbose');

  const tableArg = args.find(arg => arg.startsWith('--table='));
  const specificTable = tableArg?.split('=')[1];

  const batchArg = args.find(arg => arg.startsWith('--batch-size='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : DEFAULT_BATCH_SIZE;

  console.log('\n');
  console.log('='.repeat(70));
  console.log('  Supabase PostgreSQL → Cloudflare D1 데이터 마이그레이션');
  console.log('='.repeat(70));
  console.log(`  모드: ${dryRun ? 'DRY-RUN (실제 데이터 삽입 없음)' : 'LIVE'}`);
  console.log(`  대상: ${migrateAll ? '전체 테이블' : specificTable || '지정 안 됨'}`);
  console.log(`  배치 크기: ${batchSize}`);
  console.log(`  D1 데이터베이스: ${D1_DATABASE_NAME}`);
  console.log('='.repeat(70));
  console.log('\n');

  // 인자 검증
  if (!migrateAll && !specificTable) {
    console.error('사용법:');
    console.error('  npx tsx scripts/migrate-supabase-to-d1.ts --all [--dry-run]');
    console.error('  npx tsx scripts/migrate-supabase-to-d1.ts --table=테이블명 [--dry-run]');
    console.error('\n옵션:');
    console.error('  --all           모든 테이블 마이그레이션');
    console.error('  --table=NAME    특정 테이블만 마이그레이션');
    console.error('  --dry-run       실제 삽입 없이 시뮬레이션');
    console.error('  --batch-size=N  배치 크기 (기본값: 100)');
    console.error('  --verbose       상세 로그 출력');
    process.exit(1);
  }

  // 환경 변수 검증
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('error', 'VITE_SUPABASE_URL 및 VITE_SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.');
    log('error', '.env.local 파일을 확인해주세요.');
    process.exit(1);
  }

  // Wrangler 설치 확인
  try {
    execSync('npx wrangler --version', { stdio: 'pipe' });
  } catch {
    log('error', 'wrangler가 설치되어 있지 않습니다. npm install -g wrangler 를 실행해주세요.');
    process.exit(1);
  }

  // Supabase 클라이언트 생성
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 마이그레이션할 테이블 결정
  let tablesToMigrate: TableConfig[];

  if (migrateAll) {
    tablesToMigrate = MIGRATION_TABLES;
  } else if (specificTable) {
    const found = MIGRATION_TABLES.find(t => t.name === specificTable);
    if (found) {
      tablesToMigrate = [found];
    } else {
      // 사용자 지정 테이블 (기본 설정)
      tablesToMigrate = [{ name: specificTable, orderBy: 'created_at' }];
      log('warn', `테이블 '${specificTable}'은 사전 정의된 목록에 없습니다. 기본 설정으로 마이그레이션합니다.`);
    }
  } else {
    tablesToMigrate = [];
  }

  // 마이그레이션 실행
  const results: MigrationResult[] = [];
  const startTime = Date.now();

  for (const tableConfig of tablesToMigrate) {
    try {
      const result = await migrateTable(supabase, tableConfig, { dryRun, batchSize });
      results.push(result);
    } catch (err) {
      const error = err as Error;
      log('error', `[${tableConfig.name}] 마이그레이션 실패: ${error.message}`);
      results.push({
        table: tableConfig.name,
        total: 0,
        success: 0,
        failed: 0,
        duration: 0,
        errors: [error.message],
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  // 최종 요약
  console.log('\n');
  console.log('='.repeat(70));
  console.log('  마이그레이션 요약');
  console.log('='.repeat(70));

  let grandTotal = 0;
  let grandSuccess = 0;
  let grandFailed = 0;

  for (const result of results) {
    const status = result.failed === 0 ? '[OK]' : '[FAIL]';
    console.log(
      `  ${status} ${result.table}: 총 ${result.total}개, 성공 ${result.success}개, 실패 ${result.failed}개 (${(result.duration / 1000).toFixed(1)}초)`
    );

    if (verbose && result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`       - ${error}`);
      }
    }

    grandTotal += result.total;
    grandSuccess += result.success;
    grandFailed += result.failed;
  }

  console.log('-'.repeat(70));
  console.log(`  전체: 총 ${grandTotal}개, 성공 ${grandSuccess}개, 실패 ${grandFailed}개`);
  console.log(`  소요 시간: ${(totalDuration / 1000).toFixed(1)}초`);
  console.log('='.repeat(70));

  if (dryRun) {
    console.log('\n  [주의] DRY-RUN 모드입니다. 실제 데이터는 이전되지 않았습니다.');
    console.log('  실제 마이그레이션을 실행하려면 --dry-run 플래그를 제거하세요.');
  }

  // 에러가 있으면 종료 코드 1
  if (grandFailed > 0) {
    process.exit(1);
  }
}

// 스크립트 실행
main().catch(err => {
  log('error', `예기치 않은 오류: ${err.message}`);
  process.exit(1);
});
