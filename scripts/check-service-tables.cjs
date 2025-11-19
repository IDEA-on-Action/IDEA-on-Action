/**
 * Check if service_packages and subscription_plans tables exist in production DB
 * Usage: node scripts/check-service-tables.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Please ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Checking service_packages and subscription_plans tables...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check service_packages table
  console.log('1️⃣ Checking service_packages table...');
  const { data: packages, error: packagesError } = await supabase
    .from('service_packages')
    .select('*')
    .limit(1);

  if (packagesError) {
    console.error('❌ service_packages table error:', packagesError.message);
    console.error('   Code:', packagesError.code);
    console.error('   Details:', packagesError.details);
    console.error('   Hint:', packagesError.hint);
  } else {
    console.log('✅ service_packages table exists!');
    console.log('   Rows fetched:', packages?.length || 0);
  }

  console.log('');

  // Check subscription_plans table
  console.log('2️⃣ Checking subscription_plans table...');
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('*')
    .limit(1);

  if (plansError) {
    console.error('❌ subscription_plans table error:', plansError.message);
    console.error('   Code:', plansError.code);
    console.error('   Details:', plansError.details);
    console.error('   Hint:', plansError.hint);
  } else {
    console.log('✅ subscription_plans table exists!');
    console.log('   Rows fetched:', plans?.length || 0);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Summary
  const hasPackagesError = !!packagesError;
  const hasPlansError = !!plansError;

  if (hasPackagesError || hasPlansError) {
    console.log('\n⚠️  MIGRATION REQUIRED');
    console.log('\nTo apply migrations to production:');
    console.log('  1. supabase link --project-ref zykjdneewbzyazfukzyg');
    console.log('  2. supabase db push');
    console.log('  3. Or manually run migrations in Supabase Dashboard → SQL Editor');
    console.log('');
    console.log('Migration files:');
    console.log('  - supabase/migrations/20251118000001_create_service_packages_table.sql');
    console.log('  - supabase/migrations/20251118000002_create_subscription_plans_table.sql');
    process.exit(1);
  } else {
    console.log('\n✅ All tables exist and are accessible!');
    process.exit(0);
  }
}

checkTables();
