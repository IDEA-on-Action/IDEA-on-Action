/**
 * Supabase Schema Extractor
 * 현재 데이터베이스의 전체 스키마를 추출합니다.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 환경 변수 로드 (Vite 및 Next.js 형식 모두 지원)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://zykjdneewbzyazfukzyg.supabase.co'

const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Supabase ANON KEY 환경 변수가 설정되지 않았습니다.')
  console.log('💡 .env.local 파일을 확인하거나 직접 KEY를 입력하세요.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function extractSchema() {
  console.log('🔍 Supabase 스키마 추출 시작...\n')

  try {
    // 1. 모든 테이블 목록 가져오기
    console.log('📊 Step 1: 테이블 목록 조회...')
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables')

    if (tablesError) {
      // RPC 함수가 없을 경우 대체 방법 사용
      console.log('⚠️  RPC 함수 없음. SQL 직접 실행 방식으로 변경...\n')
      await extractSchemaDirectSQL()
      return
    }

    if (!tables || tables.length === 0) {
      console.log('⚠️  테이블이 없거나 접근 권한이 없습니다.')
      return
    }

    console.log(`✅ 발견된 테이블 수: ${tables.length}\n`)

    // 2. 각 테이블의 컬럼 정보 가져오기
    const schemaInfo = {
      extracted_at: new Date().toISOString(),
      database_url: SUPABASE_URL,
      tables: []
    }

    for (const table of tables) {
      console.log(`📋 테이블 분석 중: ${table.table_name}`)

      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: table.table_name })

      if (columnsError) {
        console.error(`  ❌ 컬럼 정보 조회 실패: ${columnsError.message}`)
        continue
      }

      schemaInfo.tables.push({
        name: table.table_name,
        schema: table.table_schema || 'public',
        columns: columns || [],
        row_count: table.row_count || 0
      })

      console.log(`  ✅ 컬럼 수: ${columns?.length || 0}`)
    }

    // 3. 결과 저장
    const outputPath = join(__dirname, '..', 'docs', 'database', 'current-schema.json')
    writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2), 'utf-8')

    console.log(`\n✅ 스키마 정보 저장 완료: ${outputPath}`)
    console.log(`📊 총 ${schemaInfo.tables.length}개 테이블 추출 완료\n`)

    // 4. 요약 출력
    console.log('📌 테이블 요약:')
    schemaInfo.tables.forEach(table => {
      console.log(`  - ${table.name} (${table.columns.length} columns)`)
    })

  } catch (error) {
    console.error('❌ 스키마 추출 중 오류 발생:', error.message)
    process.exit(1)
  }
}

/**
 * SQL 직접 실행 방식 (RPC 함수 없을 때 대체)
 */
async function extractSchemaDirectSQL() {
  console.log('📊 SQL 직접 실행 방식으로 스키마 추출...\n')

  const queries = {
    tables: `
      SELECT
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
    columns: (tableName) => `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `,
    foreignKeys: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public';
    `
  }

  try {
    // 테이블 목록 가져오기 (Supabase에서 직접 조회)
    const { data: publicTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (tablesError) {
      console.log('⚠️  information_schema 접근 불가. 알려진 테이블로 시도...\n')
      await extractKnownTables()
      return
    }

    console.log(`✅ 발견된 테이블: ${publicTables?.length || 0}개\n`)

    const schemaInfo = {
      extracted_at: new Date().toISOString(),
      database_url: SUPABASE_URL,
      method: 'direct_sql',
      tables: []
    }

    // 각 테이블 정보 수집
    for (const table of publicTables || []) {
      console.log(`📋 ${table.table_name} 분석 중...`)

      const { data: rows } = await supabase
        .from(table.table_name)
        .select('*', { count: 'exact', head: true })

      schemaInfo.tables.push({
        name: table.table_name,
        schema: table.table_schema,
        estimated_rows: rows?.length || 0
      })
    }

    // 결과 저장
    const outputPath = join(__dirname, '..', 'docs', 'database', 'current-schema.json')
    writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2), 'utf-8')

    console.log(`\n✅ 스키마 정보 저장 완료: ${outputPath}\n`)

  } catch (error) {
    console.error('❌ SQL 실행 중 오류:', error.message)
    await extractKnownTables()
  }
}

/**
 * 알려진 테이블 직접 조회 (최후 수단)
 */
async function extractKnownTables() {
  console.log('📊 알려진 테이블 목록으로 스키마 추출...\n')

  const knownTables = [
    'services',
    'service_categories',
    'carts',
    'orders',
    'order_items',
    'payments',
    'user_profiles',
    'user_roles',
    'posts',
    'post_tags',
    'gallery',
    'metrics',
    'chat_messages',
    'analytics_events'
  ]

  const schemaInfo = {
    extracted_at: new Date().toISOString(),
    database_url: SUPABASE_URL,
    method: 'known_tables',
    note: 'This is a fallback method. Some tables might be missing.',
    tables: []
  }

  for (const tableName of knownTables) {
    try {
      console.log(`🔍 ${tableName} 확인 중...`)

      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`  ⚠️  테이블 없음 또는 접근 불가`)
        continue
      }

      // 첫 번째 행으로 컬럼 구조 파악
      const { data: sample } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        .single()

      const columns = sample ? Object.keys(sample).map(key => ({
        name: key,
        type: typeof sample[key],
        sample_value: sample[key]
      })) : []

      schemaInfo.tables.push({
        name: tableName,
        exists: true,
        row_count: count || 0,
        columns
      })

      console.log(`  ✅ 존재 (${count || 0}개 행, ${columns.length}개 컬럼)`)

    } catch (err) {
      console.log(`  ⚠️  오류: ${err.message}`)
    }
  }

  // 결과 저장
  const outputPath = join(__dirname, '..', 'docs', 'database', 'current-schema.json')
  writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2), 'utf-8')

  console.log(`\n✅ 스키마 정보 저장 완료: ${outputPath}`)
  console.log(`📊 발견된 테이블: ${schemaInfo.tables.length}개\n`)

  // 요약 출력
  console.log('📌 존재하는 테이블:')
  schemaInfo.tables.forEach(table => {
    console.log(`  - ${table.name} (${table.row_count} rows, ${table.columns?.length || 0} columns)`)
  })
}

// 실행
extractSchema()
