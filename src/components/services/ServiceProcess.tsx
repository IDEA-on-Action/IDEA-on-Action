import { ProcessStep } from "@/types/services";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface ServiceProcessProps {
  steps: ProcessStep[];
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ServiceProcess 컴포넌트
 * 서비스 진행 프로세스를 4-5단계로 표시
 *
 * Features:
 * - 단계별 번호, 제목, 설명, 소요 시간 표시
 * - 화살표 연결선으로 흐름 표시
 * - 타임라인 스타일 레이아웃
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceProcess = ({
  steps,
  title = "진행 프로세스",
  description,
  className
}: ServiceProcessProps) => {
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

        {/* 프로세스 단계 - 데스크톱: 가로 레이아웃, 모바일: 세로 레이아웃 */}
        <div className="relative">
          {/* 데스크톱 - 수평 레이아웃 */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4 items-start">
            {steps.map((step, index) => (
              <div key={`step-${step.step}`} className="relative">
                <Card
                  className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    {/* 단계 번호 */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl font-bold text-white">{step.step}</span>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {step.title}
                    </h3>

                    {/* 설명 */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {step.description}
                    </p>

                    {/* 소요 시간 */}
                    {step.duration && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20">
                        <span className="text-xs font-medium text-primary">{step.duration}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 화살표 (마지막 단계 제외) */}
                {index < steps.length - 1 && (
                  <div className="absolute top-20 -right-2 transform translate-x-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 모바일/태블릿 - 수직 레이아웃 */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <div key={`step-mobile-${step.step}`} className="relative">
                <Card
                  className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in bg-background/80 backdrop-blur-sm dark:bg-background/50"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* 단계 번호 */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-xl font-bold text-white">{step.step}</span>
                      </div>

                      <div className="flex-1">
                        {/* 제목 */}
                        <h3 className="text-lg font-semibold mb-2 text-foreground">
                          {step.title}
                        </h3>

                        {/* 설명 */}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {step.description}
                        </p>

                        {/* 소요 시간 */}
                        {step.duration && (
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20">
                            <span className="text-xs font-medium text-primary">{step.duration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 화살표 (마지막 단계 제외) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-6 h-6 text-primary rotate-90" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
