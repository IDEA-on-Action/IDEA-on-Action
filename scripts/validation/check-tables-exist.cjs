const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkTables() {
  console.log('--- Checking Table Existence ---\n');

  const tables = [
    'billing_keys',
    'subscriptions',
    'subscription_payments'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: Does NOT exist`);
      console.log(`   Error: ${error.message}\n`);
    } else {
      console.log(`✅ ${table}: Exists (${data.length} rows)\n`);
    }
  }

  // RPC 함수 존재 확인
  console.log('--- Checking RPC Functions ---\n');

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_kpis', {
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString()
  });

  if (rpcError) {
    console.log('❌ get_kpis: Function call failed');
    console.log(`   Error: ${rpcError.message}\n`);
  } else {
    console.log('✅ get_kpis: Function exists and executable\n');
  }
}

checkTables().catch(console.error);
