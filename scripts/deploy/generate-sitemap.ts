/**
 * Generate sitemap.xml
 * Phase 11 Week 2: SEO Optimization
 * Updated: Workers API 마이그레이션 (2025-12-29)
 *
 * Run: npm run generate:sitemap
 */

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
const WORKERS_API_URL = process.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai'

interface BlogPost {
  slug: string
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

interface ApiResponse<T> {
  data: T[]
  total?: number
}

async function fetchFromWorkersAPI<T>(endpoint: string): Promise<T[]> {
  try {
    const response = await fetch(`${WORKERS_API_URL}${endpoint}`)
    if (!response.ok) {
      console.warn(`⚠️ API 호출 실패: ${endpoint} (${response.status})`)
      return []
    }
    const result: ApiResponse<T> = await response.json()
    return result.data || []
  } catch (error) {
    console.warn(`⚠️ API 호출 에러: ${endpoint}`, error)
    return []
  }
}

async function generateSitemap() {
  console.log('🔄 Generating sitemap.xml...')
  console.log(`📡 Workers API: ${WORKERS_API_URL}`)

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

  // Fetch from Workers API
  const [blogPosts, services, projects] = await Promise.all([
    fetchFromWorkersAPI<BlogPost>('/api/v1/blog/posts?status=published&limit=1000'),
    fetchFromWorkersAPI<Service>('/api/v1/services?status=active&limit=1000'),
    fetchFromWorkersAPI<Project>('/api/v1/projects?limit=1000'),
  ])

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
  blogPosts.forEach((post: BlogPost) => {
    if (!post.slug) return
    xml += '  <url>\n'
    xml += `    <loc>${SITE_URL}/stories/blog/${post.slug}</loc>\n`
    xml += `    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>\n`
    xml += '    <changefreq>weekly</changefreq>\n'
    xml += '    <priority>0.7</priority>\n'
    xml += '  </url>\n'
  })

  // Services (filter out null slugs)
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

  // Projects (새 경로: /projects/:id)
  projects.forEach((project: Project) => {
    if (!project.id) return
    xml += '  <url>\n'
    xml += `    <loc>${SITE_URL}/projects/${project.id}</loc>\n`
    xml += `    <lastmod>${new Date(project.updated_at).toISOString().split('T')[0]}</lastmod>\n`
    xml += '    <changefreq>weekly</changefreq>\n'
    xml += '    <priority>0.7</priority>\n'
    xml += '  </url>\n'
  })

  xml += '</urlset>'

  // Write to public directory
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml')
  fs.writeFileSync(outputPath, xml, 'utf-8')

  console.log('✅ Sitemap generated successfully!')
  console.log(`📊 Static pages: ${staticPages.length}`)
  console.log(`📝 Blog posts: ${blogPosts.length}`)
  console.log(`📦 Services: ${services.length}`)
  console.log(`💼 Projects: ${projects.length}`)
  console.log(`📄 Total URLs: ${staticPages.length + blogPosts.length + services.length + projects.length}`)
  console.log(`💾 Saved to: ${outputPath}`)
}

generateSitemap().catch(console.error)
