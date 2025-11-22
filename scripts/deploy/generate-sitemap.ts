/**
 * Generate sitemap.xml
 * Phase 11 Week 2: SEO Optimization
 *
 * Run: npm run generate:sitemap
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')

    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim()
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  } catch (error) {
    console.error('⚠️ Could not load .env.local file')
  }
}

loadEnv()

const SITE_URL = 'https://www.ideaonaction.ai'

// Support both VITE_ and NEXT_PUBLIC_ prefixes
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please check .env.local file')
  console.error(`SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`)
  console.error(`SUPABASE_ANON_KEY: ${supabaseKey ? '✓' : '✗'}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface BlogPost {
  slug: string
  updated_at: string
}

interface Notice {
  id: string
  updated_at: string
}

interface Service {
  slug: string
  updated_at: string
}

interface Project {
  id: string
  updated_at: string
}

async function generateSitemap() {
  console.log('🔄 Generating sitemap.xml...')

  // Static pages (Version 2.5 - Site Restructure)
  // 7개 메뉴 → 5개 메뉴로 재구성 (홈, 서비스, 프로젝트, 이야기, 함께하기)
  const staticPages = [
    { url: '', changefreq: 'daily', priority: '1.0' },
    { url: '/services', changefreq: 'daily', priority: '0.9' },
    { url: '/projects', changefreq: 'weekly', priority: '0.9' },
    { url: '/stories', changefreq: 'weekly', priority: '0.9' },
    { url: '/connect', changefreq: 'weekly', priority: '0.8' },
    { url: '/stories/blog', changefreq: 'daily', priority: '0.9' },
    { url: '/stories/notices', changefreq: 'daily', priority: '0.8' },
    { url: '/connect/inquiry', changefreq: 'monthly', priority: '0.8' },
    { url: '/connect/community', changefreq: 'daily', priority: '0.8' },
    { url: '/now', changefreq: 'daily', priority: '0.9' },
    { url: '/status', changefreq: 'daily', priority: '0.7' },
  ]

  // Fetch blog posts
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  // Fetch notices
  const { data: notices } = await supabase
    .from('notices')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  // Fetch services
  const { data: services } = await supabase
    .from('services')
    .select('slug, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  // Fetch projects (Portfolio)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  // Static pages
  staticPages.forEach(page => {
    xml += '  <url>\n'
    xml += `    <loc>${SITE_URL}${page.url}</loc>\n`
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`
    xml += `    <priority>${page.priority}</priority>\n`
    xml += '  </url>\n'
  })

  // Blog posts (새 경로: /stories/blog/:slug)
  if (blogPosts) {
    blogPosts.forEach((post: BlogPost) => {
      xml += '  <url>\n'
      xml += `    <loc>${SITE_URL}/stories/blog/${post.slug}</loc>\n`
      xml += `    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>\n`
      xml += '    <changefreq>weekly</changefreq>\n'
      xml += '    <priority>0.7</priority>\n'
      xml += '  </url>\n'
    })
  }

  // Services (filter out null slugs)
  if (services) {
    services
      .filter((service: Service) => service.slug && service.slug !== 'null')
      .forEach((service: Service) => {
        xml += '  <url>\n'
        xml += `    <loc>${SITE_URL}/services/${service.slug}</loc>\n`
        xml += `    <lastmod>${new Date(service.updated_at).toISOString().split('T')[0]}</lastmod>\n`
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.8</priority>\n'
        xml += '  </url>\n'
      })
  }

  // Projects (새 경로: /projects/:id)
  if (projects) {
    projects.forEach((project: Project) => {
      xml += '  <url>\n'
      xml += `    <loc>${SITE_URL}/projects/${project.id}</loc>\n`
      xml += `    <lastmod>${new Date(project.updated_at).toISOString().split('T')[0]}</lastmod>\n`
      xml += '    <changefreq>weekly</changefreq>\n'
      xml += '    <priority>0.7</priority>\n'
      xml += '  </url>\n'
    })
  }

  xml += '</urlset>'

  // Write to public directory
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml')
  fs.writeFileSync(outputPath, xml, 'utf-8')

  console.log('✅ Sitemap generated successfully!')
  console.log(`📊 Static pages: ${staticPages.length}`)
  console.log(`📝 Blog posts: ${blogPosts?.length || 0}`)
  console.log(`🔔 Notices: ${notices?.length || 0}`)
  console.log(`📦 Services: ${services?.length || 0}`)
  console.log(`💼 Projects: ${projects?.length || 0}`)
  console.log(`📄 Total URLs: ${staticPages.length + (blogPosts?.length || 0) + (services?.length || 0) + (projects?.length || 0)}`)
  console.log(`💾 Saved to: ${outputPath}`)
}

generateSitemap().catch(console.error)
