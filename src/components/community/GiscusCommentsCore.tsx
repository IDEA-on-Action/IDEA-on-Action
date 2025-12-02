import { useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { GiscusCommentsProps } from './GiscusComments';

/**
 * Giscus Comments Core Component
 *
 * This is the actual implementation of the Giscus comments system.
 * It is lazy loaded by the GiscusComments wrapper component.
 */
const GiscusCommentsCore = ({
  repo = import.meta.env.VITE_GISCUS_REPO || 'IDEA-on-Action/idea-on-action',
  repoId = import.meta.env.VITE_GISCUS_REPO_ID || 'CONFIGURE_REPO_ID',
  category = import.meta.env.VITE_GISCUS_CATEGORY_GENERAL || 'General',
  categoryId = import.meta.env.VITE_GISCUS_CATEGORY_GENERAL_ID || 'CONFIGURE_CATEGORY_ID',
  mapping = 'pathname',
  reactionsEnabled = true,
  lang = 'ko',
}: GiscusCommentsProps) => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if configuration is needed
    if (repoId.includes('CONFIGURE') || categoryId.includes('CONFIGURE')) {
      console.warn(
        'Giscus is not configured. Please update repoId and categoryId.\n' +
        'Get your values from: https://giscus.app/'
      );
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', category);
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', mapping);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', reactionsEnabled ? '1' : '0');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', resolvedTheme === 'dark' ? 'dark' : 'light');
    script.setAttribute('data-lang', lang);
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    const container = containerRef.current;
    container.appendChild(script);

    return () => {
      // Cleanup
      if (container) {
        const iframe = container.querySelector('iframe.giscus-frame');
        if (iframe) {
          iframe.remove();
        }
      }
    };
  }, [repo, repoId, category, categoryId, mapping, reactionsEnabled, lang, resolvedTheme]);

  // Show placeholder if not configured
  if (repoId.includes('CONFIGURE') || categoryId.includes('CONFIGURE')) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <h3 className="text-lg font-bold">댓글 시스템 설정 필요</h3>
        <p className="text-sm text-muted-foreground">
          Giscus 댓글 시스템을 사용하려면 GitHub Discussions를 설정해야 합니다.
        </p>
        <ol className="text-sm text-left space-y-2 max-w-md mx-auto">
          <li>1. GitHub repository에 Giscus 앱 설치</li>
          <li>2. Discussions 활성화</li>
          <li>3. <a href="https://giscus.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">giscus.app</a>에서 설정값 받기</li>
          <li>4. <code className="bg-muted px-1 py-0.5 rounded text-xs">GiscusComments.tsx</code>에 repoId와 categoryId 업데이트</li>
        </ol>
      </div>
    );
  }

  return <div ref={containerRef} className="giscus-container" />;
};

export default GiscusCommentsCore;
