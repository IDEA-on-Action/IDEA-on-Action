import { Badge } from "@/components/ui/badge";
import { Service } from "@/types/services";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ServiceHeroProps {
  service: Service;
  className?: string;
}

/**
 * ServiceHero 컴포넌트
 * 서비스 상세 페이지 상단 히어로 섹션
 *
 * Features:
 * - 서비스 제목, 부제목, 설명 표시
 * - 카테고리 뱃지 표시
 * - 그라디언트 배경 및 애니메이션 효과
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceHero = ({ service, className }: ServiceHeroProps) => {
  const categoryLabel = service.category === "development" ? "개발 서비스" : "나침반 서비스";
  const isComingSoon = service.status === "coming-soon";

  return (
    <section className={cn("relative min-h-[60vh] flex items-center justify-center overflow-hidden py-20", className)}>
      {/* 그라디언트 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 dark:from-primary/5 dark:to-secondary/5" />

      {/* 애니메이션 Glow 요소 */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float dark:bg-primary/5"
        style={{ animationDelay: '0s' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float dark:bg-secondary/5"
        style={{ animationDelay: '1s' }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* 카테고리 뱃지 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{categoryLabel}</span>
            {isComingSoon && (
              <Badge variant="secondary" className="ml-2">
                Coming Soon
              </Badge>
            )}
          </div>

          {/* 서비스 이름 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {service.name}
            </span>
          </h1>

          {/* 서비스 제목 */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 text-foreground">
            {service.title}
          </h2>

          {/* 부제목 */}
          <p className="text-lg md:text-xl text-accent mb-6">
            {service.subtitle}
          </p>

          {/* 상세 설명 */}
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {service.description}
          </p>

          {/* 출시 예정일 (Coming Soon인 경우) */}
          {isComingSoon && service.launchDate && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card/70 backdrop-blur-sm border border-border">
              <span className="text-sm text-muted-foreground">
                출시 예정일: {new Date(service.launchDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 페이드 그라디언트 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
    </section>
  );
};
