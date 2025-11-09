// Service role로 newsletter 데이터 확인 (RLS 우회)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local 수동 파싱
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다');
  console.error('필요한 변수: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Newsletter 데이터 확인 중 (Service Role)...\n');

const { data, error } = await supabase
  .from('newsletter_subscriptions')
  .select('*')
  .order('subscribed_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('❌ 에러:', error.message);
  process.exit(1);
}

console.log(`✅ Newsletter 구독자: ${data.length}개\n`);

if (data.length > 0) {
  console.log('최근 구독자:');
  data.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.email}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Subscribed: ${new Date(sub.subscribed_at).toLocaleString('ko-KR')}`);
    console.log('');
  });
}
