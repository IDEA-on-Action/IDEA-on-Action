/**
 * Check user_profiles newsletter_email status
 * Usage: node scripts/check-newsletter-profiles.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkNewsletterProfiles() {
  console.log('\n🔍 user_profiles newsletter_email 상태 확인...\n');

  // Get all newsletter subscribers from user_profiles
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, user_id, newsletter_subscribed, newsletter_email, newsletter_subscribed_at')
    .eq('newsletter_subscribed', true)
    .order('newsletter_subscribed_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const total = profiles.length;
  const withEmail = profiles.filter(p => p.newsletter_email).length;
  const withoutEmail = total - withEmail;

  console.log('📊 통계:');
  console.log(`   전체 구독자: ${total}개`);
  console.log(`   newsletter_email 있음: ${withEmail}개`);
  console.log(`   newsletter_email 없음: ${withoutEmail}개`);
  console.log(`   성공률: ${total > 0 ? ((withEmail / total) * 100).toFixed(2) : 0}%\n`);

  if (withoutEmail > 0) {
    console.log('⚠️  newsletter_email이 없는 구독자:');
    profiles.filter(p => !p.newsletter_email).forEach((p, i) => {
      console.log(`${i + 1}. user_id: ${p.user_id}`);
      console.log(`   subscribed_at: ${new Date(p.newsletter_subscribed_at).toLocaleString('ko-KR')}`);
    });
    console.log('\n⚠️  이 사용자들은 보안 마이그레이션 후 newsletter_subscribers 뷰에 표시되지 않습니다.');
    console.log('   마이그레이션 스크립트를 먼저 실행하세요:');
    console.log('   → scripts/migration/migrate-newsletter-email.sql\n');
  } else {
    console.log('✅ 모든 구독자가 newsletter_email을 가지고 있습니다.');
    console.log('   보안 마이그레이션을 진행해도 안전합니다.\n');
  }

  // Check auth.users email availability
  console.log('🔍 auth.users 이메일 가용성 확인...\n');

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ auth.users 조회 실패:', authError.message);
    return;
  }

  const profileUserIds = profiles.filter(p => !p.newsletter_email).map(p => p.user_id);
  const matchingAuthUsers = authUsers.users.filter(u => profileUserIds.includes(u.id));

  if (matchingAuthUsers.length > 0) {
    console.log('✅ auth.users에서 이메일을 가져올 수 있는 사용자:');
    matchingAuthUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email || '(no email)'} (user_id: ${u.id})`);
    });
  } else {
    console.log('ℹ️  auth.users에서 이메일을 가져올 수 있는 사용자가 없습니다.');
  }
}

checkNewsletterProfiles();
