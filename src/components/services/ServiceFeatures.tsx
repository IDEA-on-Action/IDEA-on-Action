import { ServiceFeature } from "@/types/services";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface ServiceFeaturesProps {
  features: ServiceFeature[];
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ServiceFeatures 컴포넌트
 * 서비스 주요 기능을 3-4개 표시
 *
 * Features:
 * - 아이콘과 함께 기능 표시
 * - 그리드 레이아웃 (모바일 1열, 태블릿 2열, 데스크톱 3-4열)
 * - 호버 효과
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceFeatures = ({
  features,
  title = "주요 기능",
  description,
  className
}: ServiceFeaturesProps) => {
  // 기능 개수에 따라 그리드 컬럼 설정
  const gridCols = features.length <= 3
    ? "lg:grid-cols-3"
    : "lg:grid-cols-4";

  return (
    <section className={cn("py-16 md:py-24 relative bg-card/30 dark:bg-card/10", className)}>
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

        {/* 기능 그리드 */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2", gridCols, "gap-6 md:gap-8")}>
          {features.map((feature, index) => {
            const Icon = feature.icon || CheckCircle;
            return (
              <Card
                key={`feature-${index}`}
                className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 md:p-8">
                  {/* 아이콘 */}
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" aria-hidden="true" />
                  </div>

                  {/* 제목 */}
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-foreground">
                    {feature.title}
                  </h3>

                  {/* 설명 */}
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
