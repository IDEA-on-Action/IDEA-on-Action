/**
 * Sitemap Generator Script
 *
 * 빌드 시 sitemap.xml 생성
 * 실행: node scripts/generate-sitemap.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 사이트 기본 정보
const SITE_URL = 'https://www.ideaonaction.ai'
const CURRENT_DATE = new Date().toISOString().split('T')[0]

// 정적 페이지 목록
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/services', priority: '0.9', changefreq: 'weekly' },
  { url: '/blog', priority: '0.9', changefreq: 'daily' },
  { url: '/login', priority: '0.3', changefreq: 'monthly' },
]

/**
 * XML 이스케이프
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Sitemap XML 생성
 */
function generateSitemap(pages) {
  const urlset = pages
    .map(
      (page) => `
  <url>
    <loc>${escapeXml(SITE_URL + page.url)}</loc>
    <lastmod>${page.lastmod || CURRENT_DATE}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlset}
</urlset>`
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📍 Sitemap 생성 시작...')

  // 동적 페이지 추가 (서비스, 블로그 등)
  // TODO: Supabase에서 실제 데이터 가져오기
  const dynamicPages = [
    // 서비스 페이지 예시
    { url: '/services/ai-automation', priority: '0.8', changefreq: 'weekly' },
    { url: '/services/data-analysis', priority: '0.8', changefreq: 'weekly' },
    { url: '/services/consulting', priority: '0.8', changefreq: 'weekly' },
    // 블로그 페이지 예시
    { url: '/blog/future-of-ai-working-solutions', priority: '0.7', changefreq: 'monthly' },
    { url: '/blog/efficient-data-analysis-guide', priority: '0.7', changefreq: 'monthly' },
  ]

  const allPages = [...staticPages, ...dynamicPages]
  const sitemap = generateSitemap(allPages)

  // public 폴더에 저장
  const outputPath = path.join(__dirname, '../public/sitemap.xml')
  fs.writeFileSync(outputPath, sitemap, 'utf-8')

  console.log(`✅ Sitemap 생성 완료: ${outputPath}`)
  console.log(`   총 ${allPages.length}개 URL`)
}

main().catch(console.error)
