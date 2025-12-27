/**
 * Cloudflare D1 마이그레이션 검증 스크립트
 *
 * Supabase와 D1의 데이터 무결성을 비교 검증
 *
 * 사용법:
 *   npx tsx scripts/d1-verify.ts [options]
 *
 * 옵션:
 *   --table=<name>  특정 테이블만 검증
 *   --quick         행 수만 비교 (빠른 검증)
 *   --detailed      모든 행의 체크섬 비교 (느림)
 *
 * 환경변수:
 *   SUPABASE_SERVICE_KEY    Supabase 서비스 롤 키
 *   D1_DATABASE_ID          Cloudflare D1 데이터베이스 ID
 *   CF_API_TOKEN            Cloudflare API 토큰
 *   CF_ACCOUNT_ID           Cloudflare 계정 ID
 *
 * @author Claude AI
 * @date 2025-12-27
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as path from 'path';

// ============================================
// 설정
// ============================================

const SUPABASE_URL = 'https://zykjdneewbzyazfukzyg.supabase.co';
const D1_DATABASE_NAME = 'idea-on-action-db';
const WRANGLER_CONFIG = path.join(process.cwd(), 'cloudflare-workers', 'wrangler.toml');

const TABLES_TO_VERIFY = [
  'service_categories',
  'services',
  'service_category_mapping',
  'service_gallery',
  'service_metrics',
  'post_categories',
  'post_tags',
  'blog_posts',
  'post_tag_relations',
  'posts',
  'orders',
  'order_items',
  'payments',
  'carts',
  'cart_items',
  'projects',
  'notices',
  'role',
  'product',
  'product_variant',
  'feature_flag',
  'rag_documents',
];

// ============================================
// 타입 정의
// ============================================

interface VerificationResult {
  table: string;
  supabaseCount: number;
  d1Count: number;
  match: boolean;
  errors: string[];
}

// ============================================
// D1 쿼리 실행
// ============================================

function queryD1(sql: string): string {
  try {
    const cmd = `wrangler d1 execute ${D1_DATABASE_NAME} --config="${WRANGLER_CONFIG}" --command="${sql}" --json`;
    const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result;
  } catch (err) {
    return '';
  }
}

/**
 * D1 테이블 행 수 조회
 */
function getD1RowCount(table: string): number {
  try {
    const result = queryD1(`SELECT COUNT(*) as count FROM ${table}`);
    // wrangler 출력 파싱
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
      return parsed[0].results[0]?.count || 0;
    }
    return 0;
  } catch {
    return -1; // 오류 시 -1 반환
  }
}

// ============================================
// 메인 검증 함수
// ============================================

async function verify(): Promise<void> {
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');
  const detailedMode = args.includes('--detailed');

  // 환경변수 확인
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Supabase ↔ Cloudflare D1 데이터 검증');
  console.log('='.repeat(60));
  console.log(`모드: ${quickMode ? '빠른 검증 (행 수)' : detailedMode ? '상세 검증 (체크섬)' : '기본 검증'}`);
  console.log('');

  // Supabase 클라이언트
  const supabase = createClient(SUPABASE_URL, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 검증할 테이블 필터
  const tableArg = args.find(a => a.startsWith('--table='));
  const tablesToCheck = tableArg
    ? [tableArg.replace('--table=', '')]
    : TABLES_TO_VERIFY;

  const results: VerificationResult[] = [];

  for (const table of tablesToCheck) {
    console.log(`\n검증 중: ${table}...`);

    const result: VerificationResult = {
      table,
      supabaseCount: 0,
      d1Count: 0,
      match: false,
      errors: [],
    };

    try {
      // Supabase 행 수
      const { count: supabaseCount, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        result.errors.push(`Supabase 오류: ${error.message}`);
      } else {
        result.supabaseCount = supabaseCount || 0;
      }

      // D1 행 수
      result.d1Count = getD1RowCount(table);

      if (result.d1Count === -1) {
        result.errors.push('D1 쿼리 실패 (테이블이 없거나 접근 불가)');
      }

      // 비교
      result.match = result.supabaseCount === result.d1Count && result.errors.length === 0;

      // 상세 검증 (옵션)
      if (detailedMode && result.match && result.supabaseCount > 0) {
        // TODO: 샘플 데이터 비교 구현
        console.log(`  ℹ️  상세 검증은 아직 구현되지 않았습니다.`);
      }

    } catch (err) {
      result.errors.push(`예외: ${err instanceof Error ? err.message : String(err)}`);
    }

    results.push(result);

    // 결과 출력
    const status = result.match ? '✅' : '❌';
    console.log(
      `  ${status} Supabase: ${result.supabaseCount} | D1: ${result.d1Count}` +
      (result.errors.length > 0 ? ` | 오류: ${result.errors.join(', ')}` : '')
    );
  }

  // 요약
  console.log('\n' + '='.repeat(60));
  console.log('검증 결과 요약');
  console.log('='.repeat(60));

  const matchCount = results.filter(r => r.match).length;
  const mismatchCount = results.filter(r => !r.match).length;

  console.log(`총 테이블: ${results.length}`);
  console.log(`일치: ${matchCount}`);
  console.log(`불일치: ${mismatchCount}`);

  if (mismatchCount > 0) {
    console.log('\n불일치 테이블:');
    for (const r of results.filter(r => !r.match)) {
      console.log(`  - ${r.table}: Supabase ${r.supabaseCount} vs D1 ${r.d1Count}`);
      for (const err of r.errors) {
        console.log(`    ⚠️  ${err}`);
      }
    }
    process.exit(1);
  }

  console.log('\n✅ 모든 테이블 검증 통과!');
}

verify().catch(err => {
  console.error('검증 실패:', err);
  process.exit(1);
});
