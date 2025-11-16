const fetch = require('node-fetch');

const SUPABASE_URL = 'https://zykjdneewbzyazfukzyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a2pkbmVld2J6eWF6ZnVrenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjc4MTUsImV4cCI6MjA3MTAwMzgxNX0.Lgnm2-NpoDVMLgb3qUK9xgrE2k1S-_eORbG-5RyGST8';

async function checkProductionServices() {
  const url = `${SUPABASE_URL}/rest/v1/services?slug=in.(mvp,fullstack,design,operations)&select=id,title,slug,image_url,images,features&status=eq.active`;

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('\n=== Production Services Status ===\n');
    console.log(`Total active services: ${data.length}\n`);

    data.forEach(service => {
      console.log(`[${service.slug}] ${service.title}`);
      console.log(`  - Image URL: ${service.image_url ? 'YES' : 'NO'}`);
      console.log(`  - Images: ${service.images?.length || 0} items`);
      console.log(`  - Features: ${service.features?.length || 0} items`);
      console.log('');
    });

    const summary = {
      total: data.length,
      with_images: data.filter(s => s.image_url !== null).length,
      total_images: data.reduce((sum, s) => sum + (s.images?.length || 0), 0),
      total_features: data.reduce((sum, s) => sum + (s.features?.length || 0), 0)
    };

    console.log('=== Summary ===');
    console.log(`Total services: ${summary.total}`);
    console.log(`Services with main image: ${summary.with_images}`);
    console.log(`Total gallery images: ${summary.total_images}`);
    console.log(`Total features: ${summary.total_features}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkProductionServices();
