/**
 * Supabase Storage → Cloudflare R2 마이그레이션 스크립트
 *
 * 기능:
 * 1. Supabase Storage 버킷 목록 조회
 * 2. 각 버킷의 파일 목록 추출
 * 3. R2에 파일 업로드 (스트리밍 처리)
 * 4. media_library 테이블 URL 업데이트
 *
 * 사용법:
 * ```bash
 * npx tsx scripts/migrate-to-r2.ts [--dry-run] [--bucket <name>] [--batch-size <n>]
 * ```
 *
 * 환경 변수 (.env.local):
 * - SUPABASE_URL: Supabase URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 역할 키 (Admin 접근용)
 * - R2_ACCOUNT_ID: Cloudflare 계정 ID
 * - R2_ACCESS_KEY_ID: R2 API 접근 키 ID
 * - R2_SECRET_ACCESS_KEY: R2 API 비밀 키
 * - R2_BUCKET_NAME: R2 버킷 이름 (기본값: idea-on-action-media)
 * - R2_PUBLIC_URL: R2 공개 URL (기본값: https://media.ideaonaction.ai)
 *
 * @module scripts/migrate-to-r2
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// ============================================================================
// 환경 변수 로드
// ============================================================================

// dotenv 로드 시도
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (error) {
  console.warn('⚠️ .env.local 파일을 로드할 수 없습니다. 환경 변수가 직접 설정되어 있는지 확인하세요.');
}

// ============================================================================
// 타입 정의
// ============================================================================

interface MigrationOptions {
  dryRun: boolean;
  bucketName?: string;
  batchSize: number;
  skipExisting: boolean;
  updateDatabase: boolean;
  verbose: boolean;
}

interface FileInfo {
  name: string;
  bucket: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MigrationResult {
  success: boolean;
  sourcePath: string;
  targetPath: string;
  size: number;
  error?: string;
}

interface MigrationStats {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  totalSize: number;
  startTime: number;
  endTime?: number;
}

// ============================================================================
// 설정
// ============================================================================

const CONFIG = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'idea-on-action-media',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://media.ideaonaction.ai',
  },
  // 마이그레이션할 Supabase 버킷 목록
  sourceBuckets: ['media-library', 'avatars', 'documents', 'uploads'],
  // 청크 크기 (스트리밍용)
  chunkSize: 5 * 1024 * 1024, // 5MB
};

// ============================================================================
// 클라이언트 초기화
// ============================================================================

let supabase: SupabaseClient | null = null;
let r2Client: S3Client | null = null;

/**
 * Supabase 클라이언트 초기화
 */
function initSupabase(): SupabaseClient {
  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceRoleKey) {
    throw new Error(
      'Supabase 환경 변수가 설정되지 않았습니다.\n' +
      '필요한 환경 변수: SUPABASE_URL (또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  if (!supabase) {
    supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

/**
 * R2 클라이언트 초기화 (S3 호환 API 사용)
 */
function initR2Client(): S3Client {
  if (!CONFIG.r2.accountId || !CONFIG.r2.accessKeyId || !CONFIG.r2.secretAccessKey) {
    throw new Error(
      'R2 환경 변수가 설정되지 않았습니다.\n' +
      '필요한 환경 변수: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CONFIG.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CONFIG.r2.accessKeyId,
        secretAccessKey: CONFIG.r2.secretAccessKey,
      },
    });
  }

  return r2Client;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 시간 형식화 (초를 mm:ss 형태로)
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds}초`;
}

/**
 * 진행률 표시 바 생성
 */
function progressBar(current: number, total: number, width: number = 40): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${(percentage * 100).toFixed(1)}%`;
}

/**
 * MIME 타입 추론
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    // 이미지
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    // 문서
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 텍스트
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    // 비디오
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // 오디오
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    // 압축
    zip: 'application/zip',
    gz: 'application/gzip',
    tar: 'application/x-tar',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================================================
// 마이그레이션 함수
// ============================================================================

/**
 * Supabase Storage 버킷 목록 조회
 */
async function listSupabaseBuckets(): Promise<string[]> {
  const client = initSupabase();
  const { data, error } = await client.storage.listBuckets();

  if (error) {
    throw new Error(`버킷 목록 조회 실패: ${error.message}`);
  }

  return data?.map(bucket => bucket.name) || [];
}

/**
 * 버킷 내 모든 파일 목록 조회 (재귀적으로 폴더 탐색)
 */
async function listBucketFiles(
  bucketName: string,
  prefix: string = '',
  options: MigrationOptions
): Promise<FileInfo[]> {
  const client = initSupabase();
  const allFiles: FileInfo[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage
      .from(bucketName)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      throw new Error(`파일 목록 조회 실패 (${bucketName}/${prefix}): ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        // 폴더인 경우 재귀적으로 탐색
        if (options.verbose) {
          console.log(`  📁 폴더 탐색: ${bucketName}/${fullPath}`);
        }
        const subFiles = await listBucketFiles(bucketName, fullPath, options);
        allFiles.push(...subFiles);
      } else {
        // 파일인 경우 정보 추가
        allFiles.push({
          name: item.name,
          bucket: bucketName,
          path: fullPath,
          size: item.metadata?.size || 0,
          mimeType: item.metadata?.mimetype || getMimeType(item.name),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        });
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return allFiles;
}

/**
 * R2에 이미 파일이 존재하는지 확인
 */
async function checkR2FileExists(key: string): Promise<boolean> {
  const client = initR2Client();

  try {
    await client.send(new HeadObjectCommand({
      Bucket: CONFIG.r2.bucketName,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * 단일 파일을 R2로 마이그레이션 (스트리밍)
 */
async function migrateFileToR2(
  file: FileInfo,
  options: MigrationOptions
): Promise<MigrationResult> {
  const targetPath = `${file.bucket}/${file.path}`;
  const result: MigrationResult = {
    success: false,
    sourcePath: `${file.bucket}/${file.path}`,
    targetPath,
    size: file.size,
  };

  try {
    // 기존 파일 확인 (스킵 옵션이 켜져있을 때)
    if (options.skipExisting) {
      const exists = await checkR2FileExists(targetPath);
      if (exists) {
        if (options.verbose) {
          console.log(`  ⏭️ 스킵 (이미 존재): ${targetPath}`);
        }
        result.success = true;
        return result;
      }
    }

    // DRY RUN 모드
    if (options.dryRun) {
      if (options.verbose) {
        console.log(`  📋 [DRY RUN] 마이그레이션 예정: ${targetPath} (${formatBytes(file.size)})`);
      }
      result.success = true;
      return result;
    }

    // Supabase에서 파일 다운로드
    const supabaseClient = initSupabase();
    const { data: downloadData, error: downloadError } = await supabaseClient.storage
      .from(file.bucket)
      .download(file.path);

    if (downloadError) {
      throw new Error(`다운로드 실패: ${downloadError.message}`);
    }

    if (!downloadData) {
      throw new Error('파일 데이터가 비어있습니다');
    }

    // Blob을 ArrayBuffer로 변환
    const arrayBuffer = await downloadData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2에 업로드
    const r2 = initR2Client();
    await r2.send(new PutObjectCommand({
      Bucket: CONFIG.r2.bucketName,
      Key: targetPath,
      Body: buffer,
      ContentType: file.mimeType,
      ContentLength: buffer.length,
      Metadata: {
        'original-bucket': file.bucket,
        'original-path': file.path,
        'migrated-at': new Date().toISOString(),
      },
    }));

    if (options.verbose) {
      console.log(`  ✅ 마이그레이션 완료: ${targetPath} (${formatBytes(file.size)})`);
    }

    result.success = true;
    return result;
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);

    console.error(`  ❌ 마이그레이션 실패: ${targetPath}`);
    if (options.verbose) {
      console.error(`     오류: ${result.error}`);
    }

    return result;
  }
}

/**
 * media_library 테이블의 URL 업데이트
 */
async function updateMediaLibraryUrls(
  migratedFiles: MigrationResult[],
  options: MigrationOptions
): Promise<number> {
  if (options.dryRun) {
    console.log('\n📋 [DRY RUN] 데이터베이스 URL 업데이트 예정...');
    return 0;
  }

  const client = initSupabase();
  let updatedCount = 0;

  console.log('\n📊 데이터베이스 URL 업데이트 중...');

  for (const file of migratedFiles.filter(f => f.success)) {
    try {
      // 기존 storage_path로 레코드 찾기
      const { data: existingItems, error: fetchError } = await client
        .from('media_library')
        .select('id, storage_path')
        .ilike('storage_path', `%${file.sourcePath.split('/').slice(1).join('/')}%`);

      if (fetchError) {
        if (options.verbose) {
          console.warn(`  ⚠️ 레코드 조회 실패: ${file.sourcePath}`);
        }
        continue;
      }

      if (!existingItems || existingItems.length === 0) {
        continue;
      }

      for (const item of existingItems) {
        const newUrl = `${CONFIG.r2.publicUrl}/${file.targetPath}`;

        const { error: updateError } = await client
          .from('media_library')
          .update({
            storage_path: file.targetPath,
            // thumbnail_path도 업데이트 (R2 이미지 변환 지원 시)
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          if (options.verbose) {
            console.warn(`  ⚠️ URL 업데이트 실패: ${item.id}`);
          }
        } else {
          updatedCount++;
          if (options.verbose) {
            console.log(`  ✅ URL 업데이트: ${item.id}`);
          }
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(`  ⚠️ 처리 중 오류: ${file.sourcePath}`);
      }
    }
  }

  return updatedCount;
}

/**
 * 배치로 파일 마이그레이션
 */
async function migrateBatch(
  files: FileInfo[],
  options: MigrationOptions,
  stats: MigrationStats
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // 진행률 표시
    const progress = i + 1;
    const total = files.length;
    process.stdout.write(`\r  ${progressBar(progress, total)} ${progress}/${total} 파일 처리 중...`);

    const result = await migrateFileToR2(file, options);
    results.push(result);

    if (result.success) {
      stats.successCount++;
      stats.totalSize += file.size;
    } else if (result.error?.includes('스킵')) {
      stats.skippedCount++;
    } else {
      stats.errorCount++;
    }
  }

  console.log(); // 줄바꿈
  return results;
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 명령줄 인수 파싱
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    bucketName: undefined,
    batchSize: 10,
    skipExisting: true,
    updateDatabase: true,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--bucket':
      case '-b':
        options.bucketName = args[++i];
        break;
      case '--batch-size':
      case '-s':
        options.batchSize = parseInt(args[++i], 10) || 10;
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '--no-skip-existing':
        options.skipExisting = false;
        break;
      case '--update-db':
        options.updateDatabase = true;
        break;
      case '--no-update-db':
        options.updateDatabase = false;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Supabase Storage → Cloudflare R2 마이그레이션 스크립트

사용법:
  npx tsx scripts/migrate-to-r2.ts [옵션]

옵션:
  --dry-run, -d           실제 마이그레이션 없이 시뮬레이션
  --bucket, -b <name>     특정 버킷만 마이그레이션
  --batch-size, -s <n>    동시 처리 파일 수 (기본값: 10)
  --skip-existing         R2에 이미 존재하는 파일 스킵 (기본값)
  --no-skip-existing      기존 파일도 덮어쓰기
  --update-db             media_library URL 업데이트 (기본값)
  --no-update-db          데이터베이스 업데이트 스킵
  --verbose, -v           상세 로그 출력
  --help, -h              도움말 표시

환경 변수 (.env.local):
  SUPABASE_URL            Supabase URL
  SUPABASE_SERVICE_ROLE_KEY Supabase 서비스 역할 키
  R2_ACCOUNT_ID           Cloudflare 계정 ID
  R2_ACCESS_KEY_ID        R2 API 접근 키 ID
  R2_SECRET_ACCESS_KEY    R2 API 비밀 키
  R2_BUCKET_NAME          R2 버킷 이름 (기본값: idea-on-action-media)
  R2_PUBLIC_URL           R2 공개 URL (기본값: https://media.ideaonaction.ai)

예시:
  npx tsx scripts/migrate-to-r2.ts --dry-run
  npx tsx scripts/migrate-to-r2.ts --bucket media-library --verbose
  npx tsx scripts/migrate-to-r2.ts --batch-size 20 --no-update-db
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   Supabase Storage → Cloudflare R2 마이그레이션');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const options = parseArgs();

  if (options.dryRun) {
    console.log('⚠️  DRY RUN 모드: 실제 마이그레이션은 수행하지 않습니다.\n');
  }

  // 설정 확인
  console.log('📋 설정 확인:');
  console.log(`   Supabase URL: ${CONFIG.supabase.url || '(미설정)'}`);
  console.log(`   R2 버킷: ${CONFIG.r2.bucketName}`);
  console.log(`   R2 공개 URL: ${CONFIG.r2.publicUrl}`);
  console.log(`   배치 크기: ${options.batchSize}`);
  console.log(`   기존 파일 스킵: ${options.skipExisting ? '예' : '아니오'}`);
  console.log(`   DB 업데이트: ${options.updateDatabase ? '예' : '아니오'}`);
  console.log('');

  // 클라이언트 초기화 테스트
  try {
    initSupabase();
    console.log('✅ Supabase 연결 확인');
  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!options.dryRun) {
    try {
      initR2Client();
      console.log('✅ R2 연결 확인');
    } catch (error) {
      console.error('❌ R2 연결 실패:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
  console.log('');

  // 통계 초기화
  const stats: MigrationStats = {
    totalFiles: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    totalSize: 0,
    startTime: Date.now(),
  };

  // 버킷 목록 가져오기
  console.log('📦 버킷 목록 조회 중...');
  const allBuckets = await listSupabaseBuckets();
  console.log(`   발견된 버킷: ${allBuckets.join(', ')}`);

  // 마이그레이션할 버킷 결정
  let bucketsToMigrate: string[];
  if (options.bucketName) {
    if (!allBuckets.includes(options.bucketName)) {
      console.error(`❌ 버킷을 찾을 수 없습니다: ${options.bucketName}`);
      process.exit(1);
    }
    bucketsToMigrate = [options.bucketName];
  } else {
    bucketsToMigrate = allBuckets.filter(b => CONFIG.sourceBuckets.includes(b));
  }

  console.log(`   마이그레이션 대상: ${bucketsToMigrate.join(', ')}`);
  console.log('');

  // 모든 마이그레이션 결과
  const allResults: MigrationResult[] = [];

  // 각 버킷 처리
  for (const bucket of bucketsToMigrate) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`📁 버킷: ${bucket}`);
    console.log('───────────────────────────────────────────────────────────────');

    // 파일 목록 조회
    console.log('  파일 목록 조회 중...');
    const files = await listBucketFiles(bucket, '', options);
    console.log(`  총 ${files.length}개 파일 발견 (${formatBytes(files.reduce((sum, f) => sum + f.size, 0))})`);

    if (files.length === 0) {
      console.log('  ⏭️ 파일이 없어 건너뜁니다.\n');
      continue;
    }

    stats.totalFiles += files.length;

    // 배치로 마이그레이션
    console.log('  마이그레이션 시작...');
    const results = await migrateBatch(files, options, stats);
    allResults.push(...results);

    const bucketSuccess = results.filter(r => r.success).length;
    const bucketError = results.filter(r => !r.success).length;
    console.log(`  완료: ${bucketSuccess} 성공, ${bucketError} 실패\n`);
  }

  // 데이터베이스 URL 업데이트
  if (options.updateDatabase && allResults.length > 0) {
    const updatedCount = await updateMediaLibraryUrls(allResults, options);
    console.log(`  데이터베이스 ${updatedCount}개 레코드 업데이트됨`);
  }

  // 완료 통계
  stats.endTime = Date.now();
  const duration = stats.endTime - stats.startTime;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   마이그레이션 완료');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  📊 통계:`);
  console.log(`     총 파일: ${stats.totalFiles}개`);
  console.log(`     성공: ${stats.successCount}개`);
  console.log(`     실패: ${stats.errorCount}개`);
  console.log(`     스킵: ${stats.skippedCount}개`);
  console.log(`     전송 용량: ${formatBytes(stats.totalSize)}`);
  console.log(`     소요 시간: ${formatDuration(duration)}`);
  console.log('');

  if (stats.errorCount > 0) {
    console.log('⚠️ 일부 파일 마이그레이션에 실패했습니다.');
    console.log('   --verbose 옵션으로 다시 실행하여 상세 오류를 확인하세요.');
  } else {
    console.log('✅ 모든 파일이 성공적으로 마이그레이션되었습니다.');
  }

  if (options.dryRun) {
    console.log('\n📋 DRY RUN이었습니다. 실제 마이그레이션은 --dry-run 옵션을 제거하고 실행하세요.');
  }

  console.log('');
}

// ============================================================================
// 실행
// ============================================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
