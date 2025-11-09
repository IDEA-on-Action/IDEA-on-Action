/**
 * Generate RSS feed for blog
 * Phase 11 Week 2: SEO Optimization
 *
 * Run: npm run generate:rss
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SITE_URL = 'https://www.ideaonaction.ai'
const SITE_TITLE = 'VIBE WORKING Blog'
const SITE_DESCRIPTION = 'Insights on AI, productivity, and the future of work'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

interface BlogPost {
  title: string
  slug: string
  excerpt: string | null
  content: string
  published_at: string
  updated_at: string
  author: {
    email: string
    raw_user_meta_data: {
      full_name?: string
    }
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

async function generateRSS() {
  console.log('🔄 Generating RSS feed...')

  // Fetch blog posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(`
      title,
      slug,
      excerpt,
      content,
      published_at,
      updated_at,
      author:author_id(email, raw_user_meta_data)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error fetching blog posts:', error)
    return
  }

  // Build RSS XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
  xml += '  <channel>\n'
  xml += `    <title>${SITE_TITLE}</title>\n`
  xml += `    <link>${SITE_URL}/blog</link>\n`
  xml += `    <description>${SITE_DESCRIPTION}</description>\n`
  xml += `    <language>ko-KR</language>\n`
  xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`
  xml += `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n`

  if (posts) {
    posts.forEach((post: BlogPost) => {
      const author = post.author?.raw_user_meta_data?.full_name || post.author?.email || 'VIBE WORKING'
      const description = post.excerpt || post.content.substring(0, 200) + '...'

      xml += '    <item>\n'
      xml += `      <title>${escapeXml(post.title)}</title>\n`
      xml += `      <link>${SITE_URL}/blog/${post.slug}</link>\n`
      xml += `      <description>${escapeXml(description)}</description>\n`
      xml += `      <author>${escapeXml(author)}</author>\n`
      xml += `      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>\n`
      xml += `      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>\n`
      xml += '    </item>\n'
    })
  }

  xml += '  </channel>\n'
  xml += '</rss>'

  // Write to public directory
  const outputPath = path.join(process.cwd(), 'public', 'rss.xml')
  fs.writeFileSync(outputPath, xml, 'utf-8')

  console.log('✅ RSS feed generated successfully!')
  console.log(`📝 Blog posts: ${posts?.length || 0}`)
  console.log(`💾 Saved to: ${outputPath}`)
}

generateRSS().catch(console.error)
