/**
 * Check local database status
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkDatabase() {
  console.log('🔍 Checking local database...\n')

  // 1. Check service_categories
  const { data: categories, error: catError } = await supabase
    .from('service_categories')
    .select('*')

  console.log('📋 service_categories:')
  if (catError) {
    console.error('  ❌ Error:', catError.message)
  } else {
    console.log(`  ✅ Found ${categories?.length || 0} categories`)
    categories?.forEach(cat => {
      console.log(`     - ${cat.name} (${cat.id})`)
    })
  }

  console.log()

  // 2. Check services
  const { data: services, error: servError } = await supabase
    .from('services')
    .select('id, title, slug, price, category_id')

  console.log('📦 services:')
  if (servError) {
    console.error('  ❌ Error:', servError.message)
  } else {
    console.log(`  ✅ Found ${services?.length || 0} services`)
    services?.forEach(srv => {
      console.log(`     - ${srv.title} (${srv.slug}) - ₩${srv.price.toLocaleString()}`)
    })
  }
}

checkDatabase().catch(console.error)
