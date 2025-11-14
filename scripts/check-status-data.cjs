const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('\n=== Status 페이지 메트릭스 데이터 확인 ===\n');

  // Projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, metrics');

  if (projectsError) {
    console.log('❌ Projects 조회 실패:', projectsError.message);
  } else {
    console.log('✅ Projects:', projects.length, '개');
    if (projects.length > 0) {
      console.log('   예시:', projects.slice(0, 2).map(p => `${p.title} (${p.status})`).join(', '));
      const totalCommits = projects.reduce((sum, p) => sum + (p.metrics?.commits || 0), 0);
      console.log('   총 커밋:', totalCommits);
    }
  }

  // Bounties
  const { data: bounties, error: bountiesError } = await supabase
    .from('bounties')
    .select('id, title, status');

  if (bountiesError) {
    console.log('❌ Bounties 조회 실패:', bountiesError.message);
  } else {
    console.log('✅ Bounties:', bounties.length, '개');
    if (bounties.length > 0) {
      const openBounties = bounties.filter(b => b.status === 'open').length;
      const completedBounties = bounties.filter(b => b.status === 'done').length;
      console.log('   예시:', bounties.slice(0, 2).map(b => `${b.title} (${b.status})`).join(', '));
      console.log('   모집중:', openBounties, '완료:', completedBounties);
    }
  }

  // Logs
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('id, title, type, created_at');

  if (logsError) {
    console.log('❌ Logs 조회 실패:', logsError.message);
  } else {
    console.log('✅ Logs:', logs.length, '개');
    if (logs.length > 0) {
      console.log('   예시:', logs.slice(0, 2).map(l => `${l.title} (${l.type})`).join(', '));

      // 주간 활동 계산
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyLogs = logs.filter(log => new Date(log.created_at) >= weekAgo);
      console.log('   주간 활동:', weeklyLogs.length, '건');
    }
  }

  // Newsletter
  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletter_subscriptions')
    .select('status');

  if (newsletterError) {
    console.log('❌ Newsletter 조회 실패:', newsletterError.message);
  } else {
    const stats = {
      total: newsletter.length,
      confirmed: newsletter.filter(n => n.status === 'confirmed').length,
      pending: newsletter.filter(n => n.status === 'pending').length,
    };
    console.log('✅ Newsletter:', stats.total, '개');
    console.log('   확인됨:', stats.confirmed, '대기:', stats.pending);
  }

  console.log('\n=== Status 페이지 테스트 ===');
  console.log('http://localhost:8080/status 접속 가능\n');
}

checkData();
