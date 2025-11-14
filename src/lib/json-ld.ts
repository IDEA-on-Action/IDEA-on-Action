/**
 * JSON-LD Structured Data Utilities
 * SEO Optimization: Sprint 3.6
 *
 * Generates structured data for search engines
 * @see https://schema.org/
 */

/**
 * Organization Schema (Home Page)
 * Describes the company information
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IDEA on Action',
    alternateName: '생각과행동',
    url: 'https://www.ideaonaction.ai',
    logo: 'https://www.ideaonaction.ai/logo.svg',
    description: 'AI 기반 혁신 솔루션과 프로덕트 개발을 제공하는 커뮤니티형 프로덕트 스튜디오',
    slogan: 'KEEP AWAKE, LIVE PASSIONATE',
    foundingDate: '2024',
    founder: {
      '@type': 'Person',
      name: '서민원',
      alternateName: 'Sinclair Seo',
      email: 'sinclairseo@gmail.com',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'sinclairseo@gmail.com',
      contactType: 'Customer Service',
      availableLanguage: ['Korean', 'English'],
    },
    sameAs: [
      'https://github.com/IDEA-on-Action',
      'https://www.linkedin.com/in/sinclair-seo',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressLocality: 'Seoul',
    },
    areaServed: {
      '@type': 'Country',
      name: 'South Korea',
    },
    knowsAbout: [
      'Artificial Intelligence',
      'Machine Learning',
      'Web Development',
      'React',
      'TypeScript',
      'Supabase',
      'Product Development',
    ],
  };
}

/**
 * Person Schema (About Page)
 * Describes the founder/representative
 */
export function generatePersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '서민원',
    alternateName: 'Sinclair Seo',
    jobTitle: '대표',
    worksFor: {
      '@type': 'Organization',
      name: 'IDEA on Action',
      alternateName: '생각과행동',
    },
    email: 'sinclairseo@gmail.com',
    url: 'https://www.ideaonaction.ai/about',
    sameAs: [
      'https://github.com/sinclair-seo',
      'https://www.linkedin.com/in/sinclair-seo',
    ],
    knowsAbout: [
      'Artificial Intelligence',
      'Product Management',
      'Software Development',
      'React',
      'TypeScript',
    ],
    description: 'AI 및 프로덕트 개발 전문가, IDEA on Action 대표',
  };
}

/**
 * Article Schema (Blog Post)
 * Describes a blog post/article
 */
export interface ArticleSchemaProps {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  image?: string;
  tags?: string[];
}

export function generateArticleSchema(props: ArticleSchemaProps) {
  const {
    title,
    description,
    slug,
    publishedAt,
    updatedAt,
    author = '서민원',
    image = 'https://www.ideaonaction.ai/og-image.jpg',
    tags = [],
  } = props;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `https://www.ideaonaction.ai/blog/${slug}`,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'IDEA on Action',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.ideaonaction.ai/logo.svg',
      },
    },
    image: {
      '@type': 'ImageObject',
      url: image,
    },
    keywords: tags.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.ideaonaction.ai/blog/${slug}`,
    },
  };
}

/**
 * BreadcrumbList Schema
 * Describes the breadcrumb navigation
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://www.ideaonaction.ai${item.url}`,
    })),
  };
}

/**
 * WebSite Schema
 * Describes the website for search engines
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IDEA on Action',
    alternateName: '생각과행동',
    url: 'https://www.ideaonaction.ai',
    description: 'AI 기반 혁신 솔루션과 프로덕트 개발을 제공하는 커뮤니티형 프로덕트 스튜디오',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.ideaonaction.ai/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Helper function to inject JSON-LD into page head
 * Usage: <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
 */
export function injectJsonLd(schema: object) {
  return JSON.stringify(schema);
}
