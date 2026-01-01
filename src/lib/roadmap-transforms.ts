/**
 * Roadmap Transformation Utilities
 *
 * Converts technical metrics into user-friendly benefits
 * for the Roadmap page.
 */

import type { Roadmap, KPI } from '@/types/shared/v2';

/**
 * Converts technical theme to user-friendly title
 */
export const getUserFriendlyTheme = (theme: string): string => {
  const themeMap: Record<string, string> = {
    // Completed phases
    'Phase 1-14': '안전하고 빠른 사용자 경험',
    'Production Ready': '프로덕션 배포 완료',
    'Design System': '일관된 디자인 시스템',
    'Auth & Security': '안전한 로그인 시스템',
    'E-commerce': '편리한 온라인 쇼핑',
    'Content Management': '쉬운 콘텐츠 관리',
    'Performance Optimization': '빠른 페이지 로딩',

    // AI & Advanced Features
    'AI Features': '똑똑한 AI 검색 및 챗봇',
    'Real-time Features': '실시간 알림 및 업데이트',
    'Analytics Dashboard': '데이터 기반 의사결정',

    // Future phases
    'Mobile App': '모바일 앱 출시',
    'API Platform': '개발자 친화적 API',
    'Community Features': '활발한 커뮤니티',
  };

  return themeMap[theme] || theme;
};

/**
 * Converts KPIs to user benefit descriptions
 */
export const getKPIUserBenefits = (kpis: Record<string, KPI>): string[] => {
  const benefits: string[] = [];

  // Tests → Stability
  if (kpis.tests || kpis.test_count) {
    const kpi = kpis.tests || kpis.test_count;
    if (kpi.current >= kpi.target * 0.8) {
      benefits.push('버그 없는 안정적인 서비스');
    }
  }

  // Bundle size → Loading speed
  if (kpis.bundle_size || kpis.initial_bundle) {
    benefits.push('빠른 페이지 로딩 속도');
  }

  // Coverage → Quality
  if (kpis.coverage || kpis.test_coverage) {
    const kpi = kpis.coverage || kpis.test_coverage;
    if (kpi.current >= 70) {
      benefits.push('높은 코드 품질 보장');
    }
  }

  // PWA cache → Offline support
  if (kpis.pwa_cache || kpis.cache_size) {
    benefits.push('오프라인에서도 사용 가능');
  }

  // Dependencies → Security
  if (kpis.dependencies || kpis.dep_count) {
    benefits.push('보안 취약점 최소화');
  }

  // ESLint warnings → Code quality
  if (kpis.eslint_warnings || kpis.lint_errors) {
    benefits.push('유지보수하기 쉬운 코드');
  }

  // TypeScript any → Type safety
  if (kpis.typescript_any || kpis.any_types) {
    benefits.push('런타임 에러 예방');
  }

  // Build time → Developer experience
  if (kpis.build_time) {
    benefits.push('빠른 개발 및 배포');
  }

  // Fallback if no specific benefits detected
  if (benefits.length === 0) {
    benefits.push('더 나은 사용자 경험');
  }

  return benefits;
};

/**
 * Converts risk level to stability badge
 */
export const getStabilityBadge = (riskLevel?: string) => {
  const map = {
    'low': {
      label: '안정성 99.9%',
      variant: 'default' as const,
      description: '프로덕션 배포 준비 완료'
    },
    'medium': {
      label: '안정성 95%',
      variant: 'secondary' as const,
      description: '일부 기능 테스트 중'
    },
    'high': {
      label: '베타 단계',
      variant: 'outline' as const,
      description: '실험적 기능 포함'
    },
  };

  return map[riskLevel as keyof typeof map] || map.low;
};

/**
 * Gets progress badge variant based on completion percentage
 */
export const getProgressVariant = (progress: number) => {
  if (progress >= 100) return 'default';
  if (progress >= 75) return 'secondary';
  if (progress >= 50) return 'outline';
  return 'outline';
};

/**
 * Formats progress description
 */
export const getProgressDescription = (progress: number): string => {
  if (progress >= 100) return '모든 목표 달성 완료';
  if (progress >= 75) return '대부분의 목표 달성';
  if (progress >= 50) return '절반 이상 진행 중';
  if (progress >= 25) return '진행 중';
  return '시작 단계';
};

/**
 * Extracts highlights from roadmap data
 */
export const getRoadmapHighlights = (roadmap: Roadmap): string[] => {
  const highlights: string[] = [];

  // Add progress milestone
  if (roadmap.progress >= 100) {
    highlights.push('✅ 모든 마일스톤 완료');
  } else if (roadmap.progress >= 75) {
    highlights.push(`🎯 ${roadmap.progress}% 달성 중`);
  }

  // Add completed milestones count
  if (roadmap.milestones && Array.isArray(roadmap.milestones)) {
    const completedCount = roadmap.milestones.filter(m => m.status === 'completed').length;
    if (completedCount > 0) {
      highlights.push(`${completedCount}개 마일스톤 완료`);
    }
  }

  // Add KPI highlights
  if (roadmap.kpis && typeof roadmap.kpis === 'object') {
    const kpiHighlights = Object.entries(roadmap.kpis)
      .filter(([_, kpi]) => kpi && typeof kpi === 'object' && 'current' in kpi && 'target' in kpi && kpi.current >= kpi.target)
      .map(([key, _]) => key);

    if (kpiHighlights.length > 0) {
      highlights.push(`${kpiHighlights.length}개 목표 달성`);
    }
  }

  return highlights;
};
