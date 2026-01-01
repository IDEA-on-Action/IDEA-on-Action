/**
 * PackageSelector Component
 *
 * Grid layout for service packages and subscription plans
 * Features: tabs (packages vs plans), PricingCard display, selection handling
 *
 * Created: 2025-11-19
 * Related: TASK-009 Package Selection UI
 */

import * as React from 'react';
import { Package, CalendarClock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { PricingCard } from './PricingCard';
import type { ServicePackage, SubscriptionPlan } from '@/types/services/services-platform';

export interface PackageSelectorProps {
  /** One-time project packages */
  packages: ServicePackage[];
  /** Recurring subscription plans */
  plans: SubscriptionPlan[];
  /** Loading state */
  isLoading?: boolean;
  /** Selection handler */
  onSelectPackage?: (item: ServicePackage) => void;
  /** Selection handler for plans */
  onSelectPlan?: (item: SubscriptionPlan) => void;
}

/**
 * Loading skeleton for pricing cards
 */
function PricingCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="space-y-3 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-10 bg-muted rounded animate-pulse mt-6" />
      </div>
    </Card>
  );
}

/**
 * Empty state when no packages/plans available
 */
function EmptyState({ type }: { type: 'package' | 'plan' }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          {type === 'package' ? (
            <Package className="h-8 w-8 text-muted-foreground" />
          ) : (
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {type === 'package' ? '등록된 패키지가 없습니다' : '등록된 플랜이 없습니다'}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {type === 'package'
            ? '일회성 프로젝트 패키지가 준비 중입니다. 곧 만나보실 수 있습니다.'
            : '정기 구독 플랜이 준비 중입니다. 곧 만나보실 수 있습니다.'}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * PackageSelector - Tab-based selector for packages and plans
 *
 * Features:
 * - Tabs: "일회성 프로젝트" vs "정기 구독"
 * - Grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
 * - Loading skeletons
 * - Empty state handling
 * - Selection callbacks
 *
 * @example
 * ```tsx
 * <PackageSelector
 *   packages={packages}
 *   plans={plans}
 *   isLoading={false}
 *   onSelectPackage={(pkg) => addToCart(pkg)}
 *   onSelectPlan={(plan) => addToCart(plan)}
 * />
 * ```
 */
export function PackageSelector({
  packages,
  plans,
  isLoading = false,
  onSelectPackage,
  onSelectPlan,
}: PackageSelectorProps) {
  const hasPackages = packages.length > 0;
  const hasPlans = plans.length > 0;

  // Default to packages tab if available, otherwise plans tab
  const defaultTab = hasPackages ? 'packages' : 'plans';

  return (
    <section className="container mx-auto px-4 py-12" aria-labelledby="pricing-heading">
      <div className="text-center mb-12">
        <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold mb-4">
          요금제 선택
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          프로젝트 특성에 맞는 최적의 패키지나 정기 구독 플랜을 선택하세요.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger
            value="packages"
            className="flex items-center gap-2"
            disabled={!hasPackages && !isLoading}
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            <span>일회성 프로젝트</span>
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="flex items-center gap-2"
            disabled={!hasPlans && !isLoading}
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            <span>정기 구독</span>
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab Content */}
        <TabsContent value="packages" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <PricingCardSkeleton key={i} />
              ))}
            </div>
          ) : hasPackages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg) => (
                <PricingCard
                  key={pkg.id}
                  item={pkg}
                  isPackage={true}
                  onSelect={(item) => onSelectPackage?.(item as ServicePackage)}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="package" />
          )}
        </TabsContent>

        {/* Plans Tab Content */}
        <TabsContent value="plans" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <PricingCardSkeleton key={i} />
              ))}
            </div>
          ) : hasPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  item={plan}
                  isPackage={false}
                  onSelect={(item) => onSelectPlan?.(item as SubscriptionPlan)}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="plan" />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
