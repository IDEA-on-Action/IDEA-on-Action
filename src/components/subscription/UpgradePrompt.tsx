/**
 * 업그레이드 유도 UI 컴포넌트
 *
 * @description 접근 권한이 없을 때 플랜 업그레이드를 유도하는 UI
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * UpgradePrompt 컴포넌트 Props
 */
interface UpgradePromptProps {
  /** 기능 키 */
  feature_key: string;
  /** 현재 플랜 */
  currentPlan?: string;
  /** 필요한 플랜 */
  requiredPlan?: string;
}

/**
 * 기능 키 → 한글 이름 매핑
 */
const FEATURE_NAMES: Record<string, string> = {
  api_calls: 'API 호출',
  storage_gb: '저장 공간',
  team_members: '팀 멤버',
  projects: '프로젝트',
  exports: '데이터 내보내기',
  ai_queries: 'AI 쿼리',
  advanced_analytics: '고급 분석',
  priority_support: '우선 지원',
};

/**
 * 기능 키 → 설명 매핑
 */
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  api_calls: 'API를 더 많이 호출하여 자동화를 확장하세요',
  storage_gb: '더 많은 파일과 데이터를 저장하세요',
  team_members: '팀원을 추가하여 협업하세요',
  projects: '더 많은 프로젝트를 동시에 관리하세요',
  exports: '데이터를 다양한 형식으로 내보내세요',
  ai_queries: 'AI 어시스턴트를 더 많이 활용하세요',
  advanced_analytics: '상세한 분석과 인사이트를 확인하세요',
  priority_support: '빠른 응답과 전문 지원을 받으세요',
};

/**
 * 업그레이드 유도 UI 컴포넌트
 *
 * @example
 * ```tsx
 * <UpgradePrompt
 *   feature_key="api_calls"
 *   currentPlan="Basic"
 *   requiredPlan="Pro"
 * />
 * ```
 */
export function UpgradePrompt({
  feature_key,
  currentPlan,
  requiredPlan = 'Pro',
}: UpgradePromptProps) {
  const featureName = FEATURE_NAMES[feature_key] ?? feature_key;
  const featureDescription = FEATURE_DESCRIPTIONS[feature_key] ?? '이 기능을 사용하세요';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4 md:p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl">
            {featureName} 기능이 제한되었습니다
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {featureDescription}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 플랜 비교 */}
          {currentPlan && (
            <div className="flex items-center justify-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">
                  현재
                </Badge>
                <p className="text-sm font-medium">{currentPlan}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <Badge className="mb-1">
                  <Sparkles className="mr-1 h-3 w-3" />
                  권장
                </Badge>
                <p className="text-sm font-medium">{requiredPlan}</p>
              </div>
            </div>
          )}

          {/* 업그레이드 혜택 */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">업그레이드 혜택:</p>
            <ul className="space-y-1 ml-4">
              <li>✓ {featureName} 무제한 사용</li>
              <li>✓ 고급 분석 및 리포트</li>
              <li>✓ 우선 고객 지원</li>
              <li>✓ 팀 협업 기능</li>
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild size="lg" className="w-full">
              <Link to={`/subscriptions/upgrade?plan=${requiredPlan.toLowerCase()}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                {requiredPlan} 플랜으로 업그레이드
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/pricing">
                모든 플랜 비교하기
              </Link>
            </Button>
          </div>

          {/* 무료 체험 안내 */}
          <p className="text-xs text-center text-muted-foreground">
            14일 무료 체험 가능 · 언제든 취소 가능
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default UpgradePrompt;
