import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { PageContext } from '@/types/ai/ai-chat-widget.types';

/**
 * 페이지 컨텍스트 훅
 *
 * @description
 * 현재 페이지의 URL과 서비스 정보를 추출하여 AI 채팅에 컨텍스트를 제공합니다.
 *
 * @example
 * ```tsx
 * const { path, pageType, serviceId, serviceName } = usePageContext();
 * console.log(pageType); // 'service' | 'home' | 'admin' | 'other'
 * ```
 */
export function usePageContext(): PageContext {
  const location = useLocation();
  const params = useParams();

  const context = useMemo(() => {
    const path = location.pathname;

    // 서비스 이름 매핑 (slug → 한글명)
    const serviceNameMap: Record<string, string> = {
      'mvp': 'MVP 개발',
      'fullstack': '풀스택 개발',
      'design': 'UI/UX 디자인',
      'operations': '운영 지원',
      'navigator': 'Minu Find (사업기회 탐색)',
      'cartographer': 'Minu Frame (문제정의 & RFP)',
      'captain': 'Minu Build (프로젝트 진행)',
      'harbor': 'Minu Keep (운영/유지보수)',
    };

    // 홈페이지
    if (path === '/' || path === '') {
      return {
        path,
        pageType: 'home' as const,
      };
    }

    // 서비스 상세 페이지: /services/:slug
    if (path.startsWith('/services/') && params.slug) {
      const slug = params.slug;
      return {
        path,
        pageType: 'service' as const,
        serviceId: slug,
        serviceName: serviceNameMap[slug] || slug,
      };
    }

    // 관리자 페이지
    if (path.startsWith('/admin')) {
      return {
        path,
        pageType: 'admin' as const,
      };
    }

    // 기타 페이지
    return {
      path,
      pageType: 'other' as const,
    };
  }, [location.pathname, params]);

  return context;
}
