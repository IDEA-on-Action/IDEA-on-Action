/**
 * Supabase PostgreSQL → Cloudflare D1 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-to-d1.ts [options]
 *
 * 옵션:
 *   --dry-run       실제 삽입 없이 추출만 수행
 *   --table=<name>  특정 테이블만 마이그레이션
 *   --batch-size=N  배치 크기 지정 (기본: 100)
 *   --skip-users    사용자 데이터 건너뛰기 (민감한 데이터)
 *
 * 환경변수:
 *   SUPABASE_URL            Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_KEY    Supabase 서비스 롤 키 (RLS 우회)
 *   D1_DATABASE_ID          Cloudflare D1 데이터베이스 ID
 *   CF_ACCOUNT_ID           Cloudflare 계정 ID
 *   CF_API_TOKEN            Cloudflare API 토큰
 *
 * @author Claude AI
 * @date 2025-12-27
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 타입 정의
// ============================================

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  specificTable: string | null;
  skipUsers: boolean;
  outputDir: string;
}

interface TableInfo {
  name: string;
  dependencies: string[]; // 이 테이블이 참조하는 다른 테이블들
  sensitiveFields: string[]; // 마스킹이 필요한 필드
  skipFields: string[]; // 마이그레이션에서 제외할 필드
  transformers?: Record<string, (value: unknown) => unknown>;
}

interface MigrationResult {
  table: string;
  success: boolean;
  rowsExtracted: number;
  rowsInserted: number;
  errors: string[];
  duration: number;
}

// ============================================
// 마이그레이션 대상 테이블 정의 (외래키 종속성 순서)
// ============================================

const TABLES: TableInfo[] = [
  // Level 1: 독립 테이블 (외래키 없음)
  {
    name: 'service_categories',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'post_categories',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'post_tags',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'role',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'category',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'payment_provider',
    dependencies: [],
    sensitiveFields: ['config'], // API 키 등 포함 가능
    skipFields: [],
  },
  {
    name: 'feature_flag',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'projects',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'notices',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 2: 사용자 관련 (민감한 데이터)
  {
    name: 'app_user',
    dependencies: [],
    sensitiveFields: ['password_hash', 'email'],
    skipFields: ['password_hash'], // 비밀번호 해시는 제외
    transformers: {
      email: (v: unknown) => maskEmail(v as string),
    },
  },

  // Level 3: 사용자 참조 테이블
  {
    name: 'user_role',
    dependencies: ['app_user', 'role'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'user_identity',
    dependencies: ['app_user'],
    sensitiveFields: ['access_token', 'refresh_token'],
    skipFields: ['access_token', 'refresh_token'], // 토큰 제외
  },
  {
    name: 'user_session',
    dependencies: ['app_user'],
    sensitiveFields: ['refresh_token'],
    skipFields: ['refresh_token', 'ip'], // 민감 정보 제외
  },

  // Level 4: 서비스 관련
  {
    name: 'services',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'service_category_mapping',
    dependencies: ['services', 'service_categories'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'service_gallery',
    dependencies: ['services'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'service_metrics',
    dependencies: ['services'],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 5: 상품 관련
  {
    name: 'product',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'product_variant',
    dependencies: ['product'],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 6: 장바구니/주문
  {
    name: 'carts',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'cart_items',
    dependencies: ['carts', 'services'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'orders',
    dependencies: [],
    sensitiveFields: ['customer_phone', 'email', 'billing_address'],
    skipFields: [],
    transformers: {
      email: (v: unknown) => maskEmail(v as string),
      customer_phone: (v: unknown) => maskPhone(v as string),
    },
  },
  {
    name: 'order_items',
    dependencies: ['orders', 'services'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'payments',
    dependencies: ['orders'],
    sensitiveFields: ['gateway_response'],
    skipFields: [],
  },

  // Level 7: 블로그
  {
    name: 'blog_posts',
    dependencies: ['post_categories'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'post_tag_relations',
    dependencies: ['blog_posts', 'post_tags'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'posts',
    dependencies: [],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 8: A/B 테스트
  {
    name: 'ab_test_experiment',
    dependencies: ['feature_flag'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'ab_test_assignment',
    dependencies: ['ab_test_experiment', 'app_user'],
    sensitiveFields: [],
    skipFields: [],
  },
  {
    name: 'ab_test_event',
    dependencies: ['ab_test_experiment', 'ab_test_assignment', 'app_user'],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 9: 기능 플래그 오버라이드
  {
    name: 'feature_flag_override',
    dependencies: ['feature_flag', 'app_user'],
    sensitiveFields: [],
    skipFields: [],
  },

  // Level 10: RAG 문서
  {
    name: 'rag_documents',
    dependencies: ['app_user', 'projects'],
    sensitiveFields: [],
    skipFields: [],
  },
];

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 이메일 마스킹
 */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

/**
 * 전화번호 마스킹
 */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  // 뒷 4자리만 보이도록
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * PostgreSQL 값을 SQLite 호환 형식으로 변환
 */
function convertToSqliteValue(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // UUID → TEXT (그대로 유지)
  if (typeof value === 'string') {
    return value;
  }

  // TIMESTAMPTZ → TEXT (ISO 8601)
  if (value instanceof Date) {
    return value.toISOString();
  }

  // BOOLEAN → INTEGER (0 또는 1)
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  // JSONB → TEXT (JSON 문자열)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // NUMERIC → REAL 또는 INTEGER
  if (typeof value === 'number') {
    return value;
  }

  // 배열 → JSON 문자열
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * SQL 문자열 이스케이프
 */
function escapeSqlString(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  const str = String(value);
  // 작은따옴표 이스케이프
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * INSERT 문 생성
 */
function generateInsertSql(
  tableName: string,
  rows: Record<string, unknown>[],
  skipFields: string[]
): string[] {
  if (rows.length === 0) return [];

  const sqls: string[] = [];

  for (const row of rows) {
    const filteredRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!skipFields.includes(key)) {
        filteredRow[key] = convertToSqliteValue(value, key);
      }
    }

    const columns = Object.keys(filteredRow);
    const values = Object.values(filteredRow).map(escapeSqlString);

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    sqls.push(sql);
  }

  return sqls;
}

// ============================================
// 메인 마이그레이션 클래스
// ============================================

class D1Migrator {
  private supabase: SupabaseClient;
  private config: MigrationConfig;
  private results: MigrationResult[] = [];

  constructor(supabase: SupabaseClient, config: MigrationConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * 전체 마이그레이션 실행
   */
  async migrate(): Promise<void> {
    console.log('='.repeat(60));
    console.log('Supabase → Cloudflare D1 데이터 마이그레이션');
    console.log('='.repeat(60));
    console.log(`모드: ${this.config.dryRun ? 'DRY RUN (실제 삽입 없음)' : 'PRODUCTION'}`);
    console.log(`배치 크기: ${this.config.batchSize}`);
    console.log(`출력 디렉토리: ${this.config.outputDir}`);
    console.log('='.repeat(60));

    // 출력 디렉토리 생성
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // 마이그레이션할 테이블 필터링
    let tablesToMigrate = TABLES;
    if (this.config.specificTable) {
      tablesToMigrate = TABLES.filter(t => t.name === this.config.specificTable);
      if (tablesToMigrate.length === 0) {
        throw new Error(`테이블을 찾을 수 없음: ${this.config.specificTable}`);
      }
    }

    if (this.config.skipUsers) {
      tablesToMigrate = tablesToMigrate.filter(t =>
        !['app_user', 'user_role', 'user_identity', 'user_session'].includes(t.name)
      );
    }

    // 각 테이블 마이그레이션
    for (const tableInfo of tablesToMigrate) {
      await this.migrateTable(tableInfo);
    }

    // 결과 요약
    this.printSummary();

    // 통합 SQL 파일 생성
    await this.generateCombinedSql();
  }

  /**
   * 단일 테이블 마이그레이션
   */
  private async migrateTable(tableInfo: TableInfo): Promise<void> {
    const startTime = Date.now();
    console.log(`\n[${'▶'.repeat(3)}] ${tableInfo.name} 마이그레이션 시작...`);

    const result: MigrationResult = {
      table: tableInfo.name,
      success: false,
      rowsExtracted: 0,
      rowsInserted: 0,
      errors: [],
      duration: 0,
    };

    try {
      // 1. 데이터 추출
      const { data, error, count } = await this.supabase
        .from(tableInfo.name)
        .select('*', { count: 'exact' });

      if (error) {
        throw new Error(`데이터 추출 실패: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log(`  ⚠️  데이터 없음`);
        result.success = true;
        result.duration = Date.now() - startTime;
        this.results.push(result);
        return;
      }

      result.rowsExtracted = data.length;
      console.log(`  📊 ${data.length}개 행 추출`);

      // 2. 민감 데이터 변환
      const transformedData = data.map(row => {
        const newRow = { ...row };

        // 건너뛸 필드 제거
        for (const field of tableInfo.skipFields) {
          delete newRow[field];
        }

        // 변환기 적용
        if (tableInfo.transformers) {
          for (const [field, transformer] of Object.entries(tableInfo.transformers)) {
            if (field in newRow) {
              newRow[field] = transformer(newRow[field]);
            }
          }
        }

        return newRow;
      });

      // 3. SQL 생성
      const allSqls: string[] = [];

      for (let i = 0; i < transformedData.length; i += this.config.batchSize) {
        const batch = transformedData.slice(i, i + this.config.batchSize);
        const sqls = generateInsertSql(tableInfo.name, batch, tableInfo.skipFields);
        allSqls.push(...sqls);
      }

      // 4. SQL 파일 저장
      const sqlFileName = `${tableInfo.name}_data.sql`;
      const sqlFilePath = path.join(this.config.outputDir, sqlFileName);

      const sqlContent = [
        `-- ${tableInfo.name} 테이블 데이터 (${result.rowsExtracted}행)`,
        `-- 생성일: ${new Date().toISOString()}`,
        `-- Supabase PostgreSQL → Cloudflare D1 마이그레이션`,
        '',
        `-- 기존 데이터 삭제 (선택적)`,
        `-- DELETE FROM ${tableInfo.name};`,
        '',
        ...allSqls,
      ].join('\n');

      fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');
      console.log(`  💾 ${sqlFileName} 저장 완료`);

      result.rowsInserted = allSqls.length;
      result.success = true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(errorMessage);
      console.error(`  ❌ 오류: ${errorMessage}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  /**
   * 결과 요약 출력
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('마이그레이션 결과 요약');
    console.log('='.repeat(60));

    const successCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => !r.success).length;
    const totalRows = this.results.reduce((sum, r) => sum + r.rowsExtracted, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`총 테이블: ${this.results.length}`);
    console.log(`성공: ${successCount}`);
    console.log(`실패: ${failCount}`);
    console.log(`총 행 수: ${totalRows.toLocaleString()}`);
    console.log(`총 소요 시간: ${(totalDuration / 1000).toFixed(2)}초`);

    console.log('\n테이블별 상세:');
    console.log('-'.repeat(60));

    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      console.log(
        `${status} ${result.table.padEnd(30)} | ` +
        `${String(result.rowsExtracted).padStart(6)}행 | ` +
        `${(result.duration / 1000).toFixed(2)}초`
      );
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`   ⚠️  ${error}`);
        }
      }
    }
  }

  /**
   * 통합 SQL 파일 생성
   */
  private async generateCombinedSql(): Promise<void> {
    const combinedPath = path.join(this.config.outputDir, '_combined_migration.sql');

    const header = [
      '-- ================================================================',
      '-- Supabase → Cloudflare D1 통합 마이그레이션 SQL',
      `-- 생성일: ${new Date().toISOString()}`,
      '-- ================================================================',
      '',
      '-- 사용법:',
      '-- wrangler d1 execute idea-on-action-db --file=./scripts/d1-migration/_combined_migration.sql',
      '',
      '-- 주의사항:',
      '-- 1. 외래키 순서를 고려하여 테이블 순서대로 실행됩니다',
      '-- 2. 민감한 데이터(password_hash, token 등)는 제외되었습니다',
      '-- 3. 이메일, 전화번호는 마스킹되었습니다',
      '',
      'PRAGMA foreign_keys = OFF;',
      '',
    ].join('\n');

    let content = header;

    // 성공한 테이블만 포함
    for (const result of this.results) {
      if (result.success && result.rowsExtracted > 0) {
        const sqlFilePath = path.join(this.config.outputDir, `${result.table}_data.sql`);
        if (fs.existsSync(sqlFilePath)) {
          const tableContent = fs.readFileSync(sqlFilePath, 'utf8');
          content += '\n' + tableContent + '\n';
        }
      }
    }

    content += '\nPRAGMA foreign_keys = ON;\n';
    content += '\n-- 마이그레이션 완료\n';

    fs.writeFileSync(combinedPath, content, 'utf8');
    console.log(`\n📁 통합 SQL 파일: ${combinedPath}`);
  }
}

// ============================================
// CLI 실행
// ============================================

async function main() {
  // 환경변수 확인
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zykjdneewbzyazfukzyg.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
    console.error('   export SUPABASE_SERVICE_KEY=your_service_role_key');
    process.exit(1);
  }

  // CLI 인자 파싱
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    dryRun: args.includes('--dry-run'),
    batchSize: 100,
    specificTable: null,
    skipUsers: args.includes('--skip-users'),
    outputDir: path.join(process.cwd(), 'scripts', 'd1-migration'),
  };

  for (const arg of args) {
    if (arg.startsWith('--table=')) {
      config.specificTable = arg.replace('--table=', '');
    }
    if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.replace('--batch-size=', ''), 10) || 100;
    }
    if (arg.startsWith('--output=')) {
      config.outputDir = arg.replace('--output=', '');
    }
  }

  // Supabase 클라이언트 생성 (service role key로 RLS 우회)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 마이그레이션 실행
  const migrator = new D1Migrator(supabase, config);
  await migrator.migrate();
}

main().catch(err => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
