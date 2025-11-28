/**
 * RSS Feed Generator Script
 *
 * 빌드 시 rss.xml 생성
 * 실행: node scripts/generate-rss.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 사이트 기본 정보
const SITE_URL = 'https://www.ideaonaction.ai'
const SITE_TITLE = 'VIBE WORKING 블로그'
const SITE_DESCRIPTION = 'AI 기반 워킹 솔루션, 기술 트렌드, 비즈니스 인사이트를 공유합니다.'
const SITE_LANGUAGE = 'ko'

/**
 * XML 이스케이프
 */
function escapeXml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * RFC 822 날짜 형식
 */
function toRfc822Date(dateStr) {
  return new Date(dateStr).toUTCString()
}

/**
 * RSS Feed XML 생성
 */
function generateRssFeed(posts) {
  const items = posts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${escapeXml(post.slug)}</guid>
      <description>${escapeXml(post.excerpt || post.content?.slice(0, 200) || '')}</description>
      <pubDate>${toRfc822Date(post.published_at || post.created_at)}</pubDate>
      ${post.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ') || ''}
    </item>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>${SITE_LANGUAGE}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📰 RSS Feed 생성 시작...')

  // TODO: Supabase에서 실제 게시물 가져오기
  const mockPosts = [
    {
      title: 'AI 기반 워킹 솔루션의 미래',
      slug: 'future-of-ai-working-solutions',
      excerpt: 'AI 기술이 업무 환경을 어떻게 변화시키고 있는지 살펴봅니다.',
      content: '',
      published_at: '2025-11-28T00:00:00Z',
      tags: ['AI', '워킹솔루션', '미래기술'],
    },
    {
      title: '효율적인 데이터 분석 가이드',
      slug: 'efficient-data-analysis-guide',
      excerpt: '비즈니스 데이터를 효과적으로 분석하는 방법을 알아봅니다.',
      content: '',
      published_at: '2025-11-27T00:00:00Z',
      tags: ['데이터분석', '비즈니스인텔리전스'],
    },
  ]

  const rssFeed = generateRssFeed(mockPosts)

  // public 폴더에 저장
  const outputPath = path.join(__dirname, '../public/rss.xml')
  fs.writeFileSync(outputPath, rssFeed, 'utf-8')

  console.log(`✅ RSS Feed 생성 완료: ${outputPath}`)
  console.log(`   총 ${mockPosts.length}개 게시물`)
}

main().catch(console.error)
