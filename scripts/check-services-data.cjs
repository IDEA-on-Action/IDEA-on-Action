const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    // Remove carriage return and trim
    line = line.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== Checking services table ===\n');

  // Check all services
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Services count:', services?.length || 0);
    if (services && services.length > 0) {
      console.log('\n📋 Services:');
      services.forEach(s => {
        console.log(`  - ID: ${s.id}, Title: ${s.title}, Status: ${s.status}`);
      });
    } else {
      console.log('⚠️  No services found in database');
    }
  }

  // Check specific service IDs needed for URLs
  console.log('\n=== Checking required service IDs ===');
  const requiredIds = ['mvp', 'fullstack', 'design', 'operations'];

  for (const id of requiredIds) {
    const { data, error } = await supabase
      .from('services')
      .select('id, title')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.log(`❌ Missing: ${id}`);
    } else {
      console.log(`✅ Found: ${id} - ${data.title}`);
    }
  }
}

checkData().catch(console.error);
