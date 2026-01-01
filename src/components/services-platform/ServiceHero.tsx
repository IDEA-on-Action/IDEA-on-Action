/**
 * ServiceHero Component
 *
 * Displays the hero section for a service detail page
 * Includes title, description, image, category, and tags
 *
 * Created: 2025-11-19
 * Related types: src/types/services-platform.ts
 */

import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import type { ServiceHeroProps } from '@/types/services/services-platform';

/**
 * Hero section for service detail pages
 *
 * Features:
 * - Service title and description (markdown)
 * - Hero image with fallback
 * - Category badge
 * - Service tags
 * - Responsive layout (text on left, image on right)
 *
 * @example
 * ```tsx
 * <ServiceHero
 *   title="MVP 개발"
 *   description="**빠른 시장 검증**을 위한 최소 기능 제품 개발 서비스"
 *   image_url="/images/mvp-hero.jpg"
 *   category="Development"
 *   tags={["MVP", "Startup", "Agile"]}
 * />
 * ```
 */
export function ServiceHero({
  title,
  description,
  image_url,
  category,
  tags,
}: ServiceHeroProps) {
  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Column: Text Content */}
        <div className="space-y-6">
          {/* Category Badge */}
          {category && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            {title}
          </h1>

          {/* Description (Markdown) */}
          {description && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <MarkdownRenderer content={description} />
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Hero Image */}
        <div className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-muted">
          {image_url ? (
            <img
              src={image_url}
              alt={`${title} hero image`}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto opacity-50"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <p className="text-sm">이미지를 준비 중입니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
