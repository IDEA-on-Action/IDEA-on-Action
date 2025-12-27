/**
 * Supabase → D1 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-supabase-to-d1.ts --table users
 *   npx tsx scripts/migrate-supabase-to-d1.ts --all
 *   npx tsx scripts/migrate-supabase-to-d1.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const D1_API_URL = process.env.D1_API_URL || 'http://localhost:8787';
const D1_API_TOKEN = process.env.D1_API_TOKEN;

// 마이그레이션할 테이블 순서 (의존성 고려)
const MIGRATION_ORDER = [
  // 1단계: 핵심 사용자 테이블
  'users',
  'user_profiles',
  'admins',
  'roles',
  'user_roles',
  'two_factor_auth',

  // 2단계: 서비스 테이블
  'service_categories',
  'services',
  'service_packages',

  // 3단계: 장바구니/주문 테이블
  'carts',
  'cart_items',
  'orders',
  'order_items',
  'payments',
  'billing_keys',

  // 4단계: 구독 테이블
  'subscription_plans',
  'subscriptions',
  'subscription_payments',

  // 5단계: CMS 테이블
  'blog_categories',
  'blog_posts',
  'tags',
  'notices',
  'portfolio_items',
  'roadmap_items',

  // 6단계: 기타 테이블
  'analytics_events',
  'media_library',
  'teams',
  'team_members',
  'team_invitations',
  'ai_conversations',
  'ai_messages',
  'prompt_templates',
  'rag_documents',
  'work_with_us_inquiries',
  'notifications',
  'audit_logs',
  'oauth_connections',
  'newsletter_subscriptions',
];

// PostgreSQL → SQLite 타입 변환
interface TransformRule {
  type: 'date' | 'json' | 'boolean' | 'array' | 'uuid' | 'text';
}

const COLUMN_TRANSFORMS: Record<string, Record<string, TransformRule>> = {
  users: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    email_confirmed_at: { type: 'date' },
    last_sign_in_at: { type: 'date' },
    raw_app_meta_data: { type: 'json' },
    raw_user_meta_data: { type: 'json' },
  },
  services: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    features: { type: 'json' },
    benefits: { type: 'json' },
    requirements: { type: 'json' },
    deliverables: { type: 'json' },
    gallery: { type: 'json' },
    is_featured: { type: 'boolean' },
  },
  orders: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    paid_at: { type: 'date' },
    completed_at: { type: 'date' },
    cancelled_at: { type: 'date' },
    refunded_at: { type: 'date' },
    metadata: { type: 'json' },
  },
  blog_posts: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    published_at: { type: 'date' },
    tags: { type: 'json' },
    gallery: { type: 'json' },
    is_featured: { type: 'boolean' },
  },
  subscriptions: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    current_period_start: { type: 'date' },
    current_period_end: { type: 'date' },
    trial_start: { type: 'date' },
    trial_end: { type: 'date' },
    cancelled_at: { type: 'date' },
    ended_at: { type: 'date' },
    metadata: { type: 'json' },
  },
  analytics_events: {
    created_at: { type: 'date' },
    properties: { type: 'json' },
  },
  // 기본 변환 규칙 (모든 테이블에 적용)
  _default: {
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    metadata: { type: 'json' },
  },
};

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
        return new Date(value).toISOString();
      }
      return value;

    case 'json':
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;

    case 'boolean':
      return value ? 1 : 0;

    case 'array':
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      return value;

    case 'uuid':
    case 'text':
    default:
      return value;
  }
}

// 행 변환 함수
function transformRow(
  tableName: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  const transforms = {
    ...COLUMN_TRANSFORMS._default,
    ...COLUMN_TRANSFORMS[tableName],
  };

  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (transforms[key]) {
      transformed[key] = transformValue(value, transforms[key]);
    } else if (typeof value === 'boolean') {
      transformed[key] = value ? 1 : 0;
    } else if (value instanceof Date) {
      transformed[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      transformed[key] = JSON.stringify(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

// Supabase에서 데이터 가져오기
async function fetchFromSupabase(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Record<string, unknown>[]> {
  const { limit = 1000, offset = 0 } = options;

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(`[${tableName}] Supabase 조회 에러:`, error.message);
    return [];
  }

  return data || [];
}

// D1에 데이터 삽입
async function insertToD1(
  tableName: string,
  rows: Record<string, unknown>[],
  dryRun: boolean
): Promise<{ success: number; failed: number }> {
  if (rows.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  // 배치 처리 (100개씩)
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => row[col]);

      const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      if (dryRun) {
        console.log(`[DRY-RUN] SQL: ${sql.slice(0, 100)}...`);
        success++;
        continue;
      }

      try {
        const response = await fetch(`${D1_API_URL}/api/v1/d1/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(D1_API_TOKEN && { Authorization: `Bearer ${D1_API_TOKEN}` }),
          },
          body: JSON.stringify({ sql, params: values }),
        });

        if (response.ok) {
          success++;
        } else {
          const errorText = await response.text();
          console.error(`[${tableName}] D1 삽입 실패:`, errorText);
          failed++;
        }
      } catch (err) {
        console.error(`[${tableName}] D1 연결 에러:`, err);
        failed++;
      }
    }

    // 진행 상황 출력
    console.log(`[${tableName}] ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} 처리 완료`);
  }

  return { success, failed };
}

// 테이블 마이그레이션
async function migrateTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  options: { dryRun: boolean; limit?: number }
): Promise<{ total: number; success: number; failed: number }> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${tableName}] 마이그레이션 시작`);
  console.log('='.repeat(60));

  let offset = 0;
  let total = 0;
  let success = 0;
  let failed = 0;
  const FETCH_LIMIT = options.limit || 1000;

  while (true) {
    const rows = await fetchFromSupabase(supabase, tableName, {
      limit: FETCH_LIMIT,
      offset,
    });

    if (rows.length === 0) {
      break;
    }

    console.log(`[${tableName}] ${rows.length}개 행 가져옴 (offset: ${offset})`);

    // 데이터 변환
    const transformed = rows.map(row => transformRow(tableName, row));

    // D1에 삽입
    const result = await insertToD1(tableName, transformed, options.dryRun);

    total += rows.length;
    success += result.success;
    failed += result.failed;
    offset += FETCH_LIMIT;

    // 다음 배치가 없으면 종료
    if (rows.length < FETCH_LIMIT) {
      break;
    }
  }

  console.log(`[${tableName}] 완료: 총 ${total}개, 성공 ${success}개, 실패 ${failed}개`);

  return { total, success, failed };
}

// 메인 함수
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const migrateAll = args.includes('--all');
  const tableArg = args.find(arg => arg.startsWith('--table='));
  const specificTable = tableArg?.split('=')[1];

  console.log('Supabase → D1 마이그레이션');
  console.log('='.repeat(60));
  console.log(`모드: ${dryRun ? 'DRY-RUN (실제 데이터 삽입 없음)' : 'LIVE'}`);
  console.log(`대상: ${migrateAll ? '전체 테이블' : specificTable || '지정 안 됨'}`);
  console.log('='.repeat(60));

  if (!migrateAll && !specificTable) {
    console.error('사용법: npx tsx scripts/migrate-supabase-to-d1.ts --all | --table=테이블명 [--dry-run]');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('VITE_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const tables = migrateAll
    ? MIGRATION_ORDER
    : specificTable
    ? [specificTable]
    : [];

  const results: Record<string, { total: number; success: number; failed: number }> = {};

  for (const table of tables) {
    try {
      results[table] = await migrateTable(supabase, table, { dryRun });
    } catch (err) {
      console.error(`[${table}] 마이그레이션 실패:`, err);
      results[table] = { total: 0, success: 0, failed: 0 };
    }
  }

  // 최종 요약
  console.log('\n' + '='.repeat(60));
  console.log('마이그레이션 요약');
  console.log('='.repeat(60));

  let grandTotal = 0;
  let grandSuccess = 0;
  let grandFailed = 0;

  for (const [table, result] of Object.entries(results)) {
    console.log(`${table}: 총 ${result.total}개, 성공 ${result.success}개, 실패 ${result.failed}개`);
    grandTotal += result.total;
    grandSuccess += result.success;
    grandFailed += result.failed;
  }

  console.log('-'.repeat(60));
  console.log(`전체: 총 ${grandTotal}개, 성공 ${grandSuccess}개, 실패 ${grandFailed}개`);

  if (dryRun) {
    console.log('\n⚠️  DRY-RUN 모드입니다. 실제 데이터는 이전되지 않았습니다.');
    console.log('실제 마이그레이션을 실행하려면 --dry-run 플래그를 제거하세요.');
  }
}

main().catch(console.error);
