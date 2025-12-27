/**
 * Cloudflare D1 SQL 실행 헬퍼 스크립트
 *
 * wrangler d1 execute 명령을 래핑하여 마이그레이션 SQL 실행
 *
 * 사용법:
 *   npx tsx scripts/d1-execute.ts [options]
 *
 * 옵션:
 *   --file=<path>     실행할 SQL 파일 경로
 *   --table=<name>    특정 테이블 SQL만 실행
 *   --all             모든 마이그레이션 SQL 실행
 *   --combined        통합 SQL 파일 실행
 *   --local           로컬 D1 에뮬레이터 사용
 *   --preview         프리뷰 환경에 실행
 *
 * @author Claude AI
 * @date 2025-12-27
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 설정
// ============================================

const D1_DATABASE_NAME = 'idea-on-action-db';
const MIGRATION_DIR = path.join(process.cwd(), 'scripts', 'd1-migration');
const WRANGLER_CONFIG = path.join(process.cwd(), 'cloudflare-workers', 'wrangler.toml');

// ============================================
// 유틸리티 함수
// ============================================

/**
 * wrangler d1 execute 명령 실행
 */
function executeD1Sql(sqlFilePath: string, isLocal: boolean = false, isPreview: boolean = false): void {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL 파일을 찾을 수 없음: ${sqlFilePath}`);
  }

  const fileSize = fs.statSync(sqlFilePath).size;
  const fileSizeKB = (fileSize / 1024).toFixed(2);
  console.log(`📄 SQL 파일: ${path.basename(sqlFilePath)} (${fileSizeKB} KB)`);

  // wrangler 명령 구성
  let cmd = `wrangler d1 execute ${D1_DATABASE_NAME}`;
  cmd += ` --config="${WRANGLER_CONFIG}"`;
  cmd += ` --file="${sqlFilePath}"`;

  if (isLocal) {
    cmd += ' --local';
  }

  if (isPreview) {
    cmd += ' --env=staging';
  }

  console.log(`\n🚀 실행 명령: ${cmd}\n`);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`\n✅ SQL 실행 완료: ${path.basename(sqlFilePath)}`);
  } catch (err) {
    console.error(`\n❌ SQL 실행 실패: ${path.basename(sqlFilePath)}`);
    throw err;
  }
}

/**
 * 마이그레이션 디렉토리의 모든 SQL 파일 목록
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATION_DIR)) {
    throw new Error(`마이그레이션 디렉토리 없음: ${MIGRATION_DIR}`);
  }

  const files = fs.readdirSync(MIGRATION_DIR)
    .filter(f => f.endsWith('_data.sql') && !f.startsWith('_'))
    .map(f => path.join(MIGRATION_DIR, f));

  return files;
}

/**
 * 테이블 종속성 순서로 파일 정렬
 */
function sortByDependency(files: string[]): string[] {
  // migrate-to-d1.ts의 TABLES 순서와 동일하게
  const order = [
    'service_categories',
    'post_categories',
    'post_tags',
    'role',
    'category',
    'payment_provider',
    'feature_flag',
    'projects',
    'notices',
    'app_user',
    'user_role',
    'user_identity',
    'user_session',
    'services',
    'service_category_mapping',
    'service_gallery',
    'service_metrics',
    'product',
    'product_variant',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'payments',
    'blog_posts',
    'post_tag_relations',
    'posts',
    'ab_test_experiment',
    'ab_test_assignment',
    'ab_test_event',
    'feature_flag_override',
    'rag_documents',
  ];

  return files.sort((a, b) => {
    const tableA = path.basename(a).replace('_data.sql', '');
    const tableB = path.basename(b).replace('_data.sql', '');
    const indexA = order.indexOf(tableA);
    const indexB = order.indexOf(tableB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}

// ============================================
// 메인 실행
// ============================================

async function main() {
  const args = process.argv.slice(2);

  const isLocal = args.includes('--local');
  const isPreview = args.includes('--preview');
  const executeAll = args.includes('--all');
  const executeCombined = args.includes('--combined');

  // 특정 파일 실행
  const fileArg = args.find(a => a.startsWith('--file='));
  if (fileArg) {
    const filePath = fileArg.replace('--file=', '');
    executeD1Sql(filePath, isLocal, isPreview);
    return;
  }

  // 특정 테이블 실행
  const tableArg = args.find(a => a.startsWith('--table='));
  if (tableArg) {
    const tableName = tableArg.replace('--table=', '');
    const filePath = path.join(MIGRATION_DIR, `${tableName}_data.sql`);
    executeD1Sql(filePath, isLocal, isPreview);
    return;
  }

  // 통합 SQL 실행
  if (executeCombined) {
    const combinedPath = path.join(MIGRATION_DIR, '_combined_migration.sql');
    executeD1Sql(combinedPath, isLocal, isPreview);
    return;
  }

  // 전체 실행
  if (executeAll) {
    console.log('='.repeat(60));
    console.log('모든 마이그레이션 SQL 순차 실행');
    console.log('='.repeat(60));

    const files = sortByDependency(getMigrationFiles());
    console.log(`\n총 ${files.length}개 테이블 마이그레이션\n`);

    for (const file of files) {
      try {
        executeD1Sql(file, isLocal, isPreview);
      } catch (err) {
        console.error(`\n⚠️  ${path.basename(file)} 실행 중 오류 발생, 계속 진행...`);
      }
    }

    console.log('\n✅ 전체 마이그레이션 완료');
    return;
  }

  // 사용법 출력
  console.log(`
Cloudflare D1 SQL 실행 헬퍼

사용법:
  npx tsx scripts/d1-execute.ts [옵션]

옵션:
  --file=<path>     특정 SQL 파일 실행
  --table=<name>    특정 테이블 데이터 SQL 실행
  --combined        통합 마이그레이션 SQL 실행
  --all             모든 테이블 SQL 순차 실행
  --local           로컬 D1 에뮬레이터 사용
  --preview         프리뷰(staging) 환경에 실행

예시:
  # 서비스 테이블만 마이그레이션
  npx tsx scripts/d1-execute.ts --table=services

  # 통합 SQL 로컬 테스트
  npx tsx scripts/d1-execute.ts --combined --local

  # 프로덕션 전체 마이그레이션
  npx tsx scripts/d1-execute.ts --combined

마이그레이션 파일 위치: ${MIGRATION_DIR}
  `);

  // 사용 가능한 파일 목록
  if (fs.existsSync(MIGRATION_DIR)) {
    const files = fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.sql'));
    if (files.length > 0) {
      console.log('사용 가능한 SQL 파일:');
      for (const file of files) {
        const filePath = path.join(MIGRATION_DIR, file);
        const size = (fs.statSync(filePath).size / 1024).toFixed(2);
        console.log(`  - ${file} (${size} KB)`);
      }
    }
  } else {
    console.log('⚠️  마이그레이션 SQL 파일이 없습니다.');
    console.log('   먼저 migrate-to-d1.ts를 실행하세요:');
    console.log('   SUPABASE_SERVICE_KEY=xxx npx tsx scripts/migrate-to-d1.ts');
  }
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
