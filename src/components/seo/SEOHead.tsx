/**
 * SEOHead Component
 *
 * 페이지별 SEO 메타 태그 관리
 * - Open Graph
 * - Twitter Cards
 * - 구조화된 데이터 (JSON-LD)
 */

import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  noindex?: boolean
}

const SITE_NAME = 'VIBE WORKING'
const SITE_URL = 'https://www.ideaonaction.ai'
const DEFAULT_DESCRIPTION = 'AI 기반 워킹 솔루션으로 비즈니스 생산성을 혁신하세요. 생각과행동이 제공하는 스마트한 업무 환경.'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`

  // JSON-LD 구조화된 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : type === 'product' ? 'Product' : 'WebSite',
    name: title,
    description,
    url: fullUrl,
    image: fullImage,
    ...(type === 'article' && {
      author: {
        '@type': 'Person',
        name: author || 'VIBE WORKING',
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo-symbol.png`,
        },
      },
      datePublished: publishedTime,
      dateModified: modifiedTime || publishedTime,
    }),
  }

  return (
    <Helmet>
      {/* 기본 메타 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <link rel="canonical" href={fullUrl} />

      {/* 로봇 */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:locale" content="ko_KR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Article 전용 */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* RSS Feed */}
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} RSS Feed`}
        href={`${SITE_URL}/rss.xml`}
      />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  )
}

/**
 * 홈페이지용 SEO
 */
export function HomeSEO() {
  return (
    <SEOHead
      title="VIBE WORKING"
      description="AI 기반 워킹 솔루션으로 비즈니스 생산성을 혁신하세요. 생각과행동이 제공하는 스마트한 업무 환경."
      keywords={['AI', '워킹솔루션', '생산성', '자동화', '비즈니스', '생각과행동']}
      url="/"
    />
  )
}

/**
 * 서비스 목록용 SEO
 */
export function ServicesSEO() {
  return (
    <SEOHead
      title="서비스"
      description="VIBE WORKING의 AI 기반 서비스를 살펴보세요. 업무 자동화, 데이터 분석, 컨설팅 서비스를 제공합니다."
      keywords={['AI서비스', '업무자동화', '데이터분석', '컨설팅']}
      url="/services"
    />
  )
}

/**
 * 블로그 목록용 SEO
 */
export function BlogSEO() {
  return (
    <SEOHead
      title="블로그"
      description="AI 워킹 솔루션, 기술 트렌드, 비즈니스 인사이트에 대한 블로그 게시물"
      keywords={['AI블로그', '기술트렌드', '비즈니스인사이트']}
      url="/blog"
    />
  )
}

/**
 * 블로그 게시물용 SEO
 */
export function BlogPostSEO({
  title,
  description,
  slug,
  image,
  publishedTime,
  author,
  tags = [],
}: {
  title: string
  description?: string
  slug: string
  image?: string
  publishedTime?: string
  author?: string
  tags?: string[]
}) {
  return (
    <SEOHead
      title={title}
      description={description}
      image={image}
      url={`/blog/${slug}`}
      type="article"
      publishedTime={publishedTime}
      author={author}
      keywords={tags}
    />
  )
}
