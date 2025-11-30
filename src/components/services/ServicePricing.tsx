import { Pricing, Package, MonthlyPlan } from "@/types/services";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";

interface ServicePricingProps {
  pricing: Pricing;
  title?: string;
  description?: string;
  onSelectPackage?: (packageName: string) => void;
  className?: string;
}

/**
 * ServicePricing 컴포넌트
 * 서비스 가격 및 패키지 표시
 *
 * Features:
 * - 패키지/월 구독 플랜 표시
 * - 추천 패키지 강조
 * - 연간 할인 표시
 * - 기능 목록 체크마크
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServicePricing = ({
  pricing,
  title = "가격 안내",
  description,
  onSelectPackage,
  className
}: ServicePricingProps) => {
  const formatPrice = (price: number, currency: "KRW" | "USD") => {
    if (currency === "KRW") {
      return `₩${price.toLocaleString('ko-KR')}`;
    }
    return `$${price.toLocaleString('en-US')}`;
  };

  const renderPackages = (packages: Package[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {packages.map((pkg, index) => (
        <Card
          key={`package-${index}`}
          className={cn(
            "group relative hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50",
            pkg.recommended && "border-primary shadow-xl scale-105"
          )}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {pkg.recommended && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                추천
              </Badge>
            </div>
          )}

          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl md:text-3xl mb-2">{pkg.name}</CardTitle>
            <CardDescription className="text-3xl md:text-4xl font-bold text-foreground">
              {formatPrice(pkg.price, pkg.currency)}
            </CardDescription>
            {pkg.duration && (
              <p className="text-sm text-muted-foreground mt-2">{pkg.duration}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 기능 목록 */}
            <ul className="space-y-3">
              {pkg.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* 지원 정보 */}
            {pkg.support && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">지원: </span>
                  {pkg.support}
                </p>
              </div>
            )}

            {/* 선택 버튼 */}
            <Button
              className={cn(
                "w-full",
                pkg.recommended && "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              )}
              variant={pkg.recommended ? "default" : "outline"}
              onClick={() => onSelectPackage?.(pkg.name)}
            >
              선택하기
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMonthlyPlans = (plans: MonthlyPlan[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {plans.map((plan, index) => (
        <Card
          key={`plan-${index}`}
          className={cn(
            "group relative hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50",
            plan.recommended && "border-primary shadow-xl scale-105"
          )}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {plan.recommended && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                추천
              </Badge>
            </div>
          )}

          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl md:text-3xl mb-2">{plan.name}</CardTitle>
            <CardDescription className="text-3xl md:text-4xl font-bold text-foreground">
              {formatPrice(plan.price, plan.currency)}
              <span className="text-sm text-muted-foreground font-normal">/월</span>
            </CardDescription>
            {plan.annualDiscount && (
              <p className="text-sm text-primary mt-2">
                연간 결제 시 {plan.annualDiscount}% 할인
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 기능 목록 */}
            <ul className="space-y-3">
              {Object.entries(plan.features).map(([key, value], idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {typeof value === 'boolean' ? (
                    value ? (
                      <>
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">{key}</span>
                      </>
                    ) : null
                  ) : (
                    <>
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-sm text-muted-foreground">
                        {key}: <span className="font-medium text-foreground">{value}</span>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {/* 선택 버튼 */}
            <Button
              className={cn(
                "w-full",
                plan.recommended && "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              )}
              variant={plan.recommended ? "default" : "outline"}
              onClick={() => onSelectPackage?.(plan.name)}
            >
              시작하기
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <section className={cn("py-16 md:py-24 relative", className)}>
      <div className="container mx-auto px-4">
        {/* 섹션 헤더 */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {title}
            </span>
          </h2>
          {description && (
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* 가격 타입에 따른 렌더링 */}
        {pricing.type === "package" && pricing.packages && renderPackages(pricing.packages)}

        {pricing.type === "monthly" && pricing.monthly && renderMonthlyPlans(pricing.monthly)}

        {pricing.type === "hourly" && pricing.hourly && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-background/80 backdrop-blur-sm dark:bg-background/50">
              <CardHeader>
                <CardTitle className="text-center">시간당 요금</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {pricing.hourly.map((rate, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center p-4 rounded-lg bg-card/50 dark:bg-card/30"
                    >
                      <span className="font-medium text-foreground">{rate.role}</span>
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(rate.rate, rate.currency)}
                        <span className="text-sm text-muted-foreground font-normal">/시간</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {pricing.type === "project" && (
          <div className="text-center">
            <Card className="max-w-md mx-auto bg-background/80 backdrop-blur-sm dark:bg-background/50">
              <CardHeader>
                <CardTitle>프로젝트 기반 견적</CardTitle>
                <CardDescription>
                  프로젝트 규모와 요구사항에 따라 맞춤 견적을 제공합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  onClick={() => onSelectPackage?.("견적 문의")}
                >
                  견적 문의하기
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};
