/**
 * Create test account for Toss Payments review
 * 토스페이먼츠 심사용 테스트 계정 생성
 */

import { createClient } from '@supabase/supabase-js'

// 환경 선택: USE_LOCAL=true (로컬), USE_LOCAL=false (프로덕션)
const USE_LOCAL = process.env.USE_LOCAL === 'false' ? false : true

const supabaseUrl = USE_LOCAL
  ? 'http://127.0.0.1:54321'
  : (process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321')

const supabaseKey = USE_LOCAL
  ? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz')

console.log('🔧 Using:', USE_LOCAL ? 'Local Supabase' : 'Production Supabase')
console.log('   URL:', supabaseUrl)
console.log()

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 테스트 계정 정보
const TEST_ACCOUNT = {
  email: 'toss-review@ideaonaction.ai',
  password: 'TossReview2025!',
  fullName: '토스페이먼츠 심사팀',
  metadata: {
    full_name: '토스페이먼츠 심사팀',
    role: 'test_user',
    purpose: 'Toss Payments billing review',
    created_by: 'automated_script'
  }
}

async function createTestAccount() {
  try {
    console.log('👤 테스트 계정 생성 중...\n')
    console.log('📧 Email:', TEST_ACCOUNT.email)
    console.log('🔑 Password:', TEST_ACCOUNT.password)
    console.log()

    // 1. 기존 계정 확인
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser?.users.find(u => u.email === TEST_ACCOUNT.email)

    if (userExists) {
      console.log('⚠️  이미 존재하는 계정입니다.')
      console.log('   User ID:', userExists.id)
      console.log('   Email:', userExists.email)
      console.log('   Created:', new Date(userExists.created_at).toLocaleString('ko-KR'))

      // 비밀번호 업데이트
      console.log('\n🔄 비밀번호 업데이트 중...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userExists.id,
        { password: TEST_ACCOUNT.password }
      )

      if (updateError) {
        console.error('❌ 비밀번호 업데이트 실패:', updateError.message)
      } else {
        console.log('✅ 비밀번호 업데이트 완료!')
      }

      console.log('\n✅ 계정 준비 완료!')
      printAccountInfo()
      return
    }

    // 2. 새 계정 생성 (service role key로 이메일 확인 자동 처리)
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: TEST_ACCOUNT.email,
      password: TEST_ACCOUNT.password,
      email_confirm: true, // 이메일 자동 확인
      user_metadata: TEST_ACCOUNT.metadata
    })

    if (signUpError) {
      console.error('❌ 계정 생성 실패:', signUpError.message)
      process.exit(1)
    }

    console.log('✅ 테스트 계정 생성 완료!')
    console.log()
    console.log('📊 계정 정보:')
    console.log('   User ID:', newUser.user.id)
    console.log('   Email:', newUser.user.email)
    console.log('   Confirmed:', newUser.user.email_confirmed_at ? '✅' : '❌')
    console.log('   Created:', new Date(newUser.user.created_at).toLocaleString('ko-KR'))
    console.log()

    // 3. user_profiles 테이블에 프로필 추가
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: newUser.user.id,
        email: TEST_ACCOUNT.email,
        full_name: TEST_ACCOUNT.fullName,
        avatar_url: null,
      })

    if (profileError) {
      console.warn('⚠️  프로필 생성 실패 (선택사항):', profileError.message)
    } else {
      console.log('✅ 사용자 프로필 생성 완료!')
    }

    console.log()
    console.log('✅ 모든 설정 완료!')
    console.log()
    printAccountInfo()

  } catch (error) {
    console.error('❌ 에러 발생:', error.message)
    if (error.details) console.error('   상세:', error.details)
    process.exit(1)
  }
}

function printAccountInfo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 토스페이먼츠 심사용 테스트 계정')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log('🌐 로그인 URL: https://www.ideaonaction.ai/login')
  console.log('📧 Email:', TEST_ACCOUNT.email)
  console.log('🔑 Password:', TEST_ACCOUNT.password)
  console.log()
  console.log('🛒 테스트 플로우:')
  console.log('   1. 로그인: https://www.ideaonaction.ai/login')
  console.log('   2. COMPASS Navigator 서비스: https://www.ideaonaction.ai/services/compass-navigator')
  console.log('   3. "구독하기" 버튼 클릭')
  console.log('   4. 고객 정보 입력 및 약관 동의')
  console.log('   5. 토스페이먼츠 카드 등록 (테스트 카드 사용)')
  console.log('   6. 14일 무료 체험 시작 확인')
  console.log()
  console.log('💳 테스트 카드 정보:')
  console.log('   카드번호: 1234-1234-1234-1234')
  console.log('   만료일: 12/25')
  console.log('   CVC: 123')
  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

createTestAccount()
