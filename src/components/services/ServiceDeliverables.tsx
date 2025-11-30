import { Deliverable } from "@/types/services";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface ServiceDeliverablesProps {
  deliverables: Deliverable[];
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ServiceDeliverables 컴포넌트
 * 서비스 결과물 목록 표시
 *
 * Features:
 * - 결과물 제목, 설명, 파일 형식 표시
 * - 아이콘 지원
 * - 그리드 레이아웃 (모바일 1열, 태블릿 2열, 데스크톱 3열)
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceDeliverables = ({
  deliverables,
  title = "결과물",
  description,
  className
}: ServiceDeliverablesProps) => {
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

        {/* 결과물 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {deliverables.map((deliverable, index) => {
            const Icon = deliverable.icon || FileText;
            return (
              <Card
                key={`deliverable-${index}`}
                className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 md:p-8">
                  {/* 아이콘 */}
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" aria-hidden="true" />
                  </div>

                  {/* 제목 및 형식 뱃지 */}
                  <div className="flex items-start justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground flex-1">
                      {deliverable.title}
                    </h3>
                    {deliverable.format && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        {deliverable.format}
                      </Badge>
                    )}
                  </div>

                  {/* 설명 */}
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {deliverable.description}
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
