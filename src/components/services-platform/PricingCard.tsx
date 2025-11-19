/**
 * PricingCard Component
 *
 * Displays a service package or subscription plan as a pricing card
 * Features: price, features list, popular badge, select button
 *
 * Created: 2025-11-19
 * Related: TASK-009 Package Selection UI
 */

import * as React from 'react';
import { Check, Crown } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PricingCardProps } from '@/types/services-platform';
import { isSubscriptionPlan } from '@/types/services-platform';

/**
 * Format price to Korean Won with thousands separator
 * @param price - Price in KRW (number)
 * @returns Formatted string (e.g., "₩8,000,000")
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Get billing cycle label in Korean
 * @param cycle - Billing cycle (monthly, quarterly, yearly)
 * @returns Korean label
 */
function getBillingCycleLabel(cycle: string): string {
  const labels: Record<string, string> = {
    monthly: '월간',
    quarterly: '분기',
    yearly: '연간',
  };
  return labels[cycle] || cycle;
}

/**
 * PricingCard - Display service package or subscription plan
 *
 * Features:
 * - Popular badge (golden crown icon)
 * - Price formatting (KRW with commas)
 * - Billing cycle display (for plans only)
 * - Features list with checkmark icons
 * - Hover effects and transitions
 * - Accessible button with aria-label
 *
 * @example
 * ```tsx
 * <PricingCard
 *   item={package}
 *   isPackage={true}
 *   onSelect={(item) => console.log('Selected:', item)}
 * />
 * ```
 */
export function PricingCard({ item, isPackage, onSelect }: PricingCardProps) {
  const isPlan = isSubscriptionPlan(item);
  const displayName = isPackage ? item.name : item.plan_name;

  return (
    <Card
      className={cn(
        'relative flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-card',
        item.is_popular &&
          'border-2 border-primary shadow-md dark:border-primary/50'
      )}
    >
      {/* Popular Badge */}
      {item.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge
            className="flex items-center gap-1 px-3 py-1 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
          >
            <Crown className="h-3 w-3" />
            <span className="text-xs font-semibold">인기</span>
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pt-8 pb-4">
        {/* Plan/Package Name */}
        <CardTitle className="text-2xl font-bold">{displayName}</CardTitle>

        {/* Price */}
        <div className="mt-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold">
              {formatPrice(item.price)}
            </span>
          </div>

          {/* Billing Cycle (for subscription plans only) */}
          {isPlan && (
            <p className="mt-2 text-sm text-muted-foreground">
              {getBillingCycleLabel(item.billing_cycle)} 요금제
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-6 pb-6">
        {/* Features List */}
        <ul className="space-y-3" role="list">
          {item.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                className="h-5 w-5 text-primary shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-sm leading-relaxed">{feature.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="px-6 pb-6">
        <Button
          onClick={() => onSelect(item)}
          className={cn(
            "w-full font-semibold transition-all hover:scale-105",
            item.is_popular
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/50"
              : "bg-slate-700 text-white hover:bg-slate-800"
          )}
          size="lg"
          aria-label={`${displayName} 플랜 선택하기 - ${formatPrice(item.price)}`}
        >
          {isPackage ? '패키지 선택' : '플랜 선택'}
        </Button>
      </CardFooter>
    </Card>
  );
}
