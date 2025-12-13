const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://zykjdneewbzyazfukzyg.supabase.co',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSubscriptions() {
  console.log('=== 최근 구독 목록 ===');
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (subError) {
    console.log('구독 조회 오류:', subError.message);
  } else if (subs.length === 0) {
    console.log('구독 데이터 없음');
  } else {
    subs.forEach(s => {
      console.log(JSON.stringify(s, null, 2));
      console.log('---');
    });
  }

  console.log('\n=== 최근 결제 목록 ===');
  const { data: payments, error: payError } = await supabase
    .from('payments')
    .select('id, order_id, amount, status, provider, provider_transaction_id, created_at, paid_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (payError) {
    console.log('결제 조회 오류:', payError.message);
  } else if (payments.length === 0) {
    console.log('결제 데이터 없음');
  } else {
    payments.forEach(p => {
      console.log(`
ID: ${p.id}
Status: ${p.status}
Amount: ${p.amount}
Provider: ${p.provider}
Transaction ID: ${p.provider_transaction_id || 'N/A'}
Created: ${p.created_at}
Paid: ${p.paid_at || 'N/A'}
---`);
    });
  }
}

async function checkBillingKeys() {
  console.log('\n=== 빌링키 목록 ===');
  const { data: billingKeys, error } = await supabase
    .from('billing_keys')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('빌링키 조회 오류:', error.message);
  } else if (billingKeys.length === 0) {
    console.log('빌링키 데이터 없음');
  } else {
    billingKeys.forEach(bk => {
      console.log(JSON.stringify(bk, null, 2));
      console.log('---');
    });
  }
}

checkSubscriptions().then(() => checkBillingKeys()).catch(console.error);
