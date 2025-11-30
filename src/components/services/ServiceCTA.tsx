import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, CreditCard, ArrowRight } from "lucide-react";
import { Service } from "@/types/services";

interface ServiceCTAProps {
  service: Service;
  onContact?: () => void;
  onPurchase?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ServiceCTA 컴포넌트
 * 서비스 문의 및 결제 Call-to-Action 섹션
 *
 * Features:
 * - 문의하기 / 결제하기 버튼
 * - Coming Soon 상태 처리
 * - 그라디언트 배경
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceCTA = ({
  service,
  onContact,
  onPurchase,
  title,
  description,
  className
}: ServiceCTAProps) => {
  const isComingSoon = service.status === "coming-soon";
  const defaultTitle = isComingSoon
    ? "출시 알림 받기"
    : "지금 시작하세요";
  const defaultDescription = isComingSoon
    ? `${service.name} 서비스 출시 시 가장 먼저 알려드립니다.`
    : `${service.name}로 여러분의 아이디어를 실현하세요. 지금 바로 시작하실 수 있습니다.`;

  return (
    <section className={cn("py-16 md:py-24 relative overflow-hidden", className)}>
      {/* 그라디언트 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 dark:from-primary/5 dark:to-secondary/5" />

      {/* 애니메이션 Glow 요소 */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float dark:bg-primary/5"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-4xl mx-auto bg-background/80 backdrop-blur-sm dark:bg-background/50 border-primary/20 shadow-2xl animate-fade-in">
          <CardContent className="p-8 md:p-12 lg:p-16">
            <div className="text-center space-y-6 md:space-y-8">
              {/* 제목 */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {title || defaultTitle}
                </span>
              </h2>

              {/* 설명 */}
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {description || defaultDescription}
              </p>

              {/* CTA 버튼들 */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                {!isComingSoon ? (
                  <>
                    {/* 문의하기 버튼 */}
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-6 border-primary/30 hover:bg-primary/10 group"
                      onClick={onContact}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                      문의하기
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Button>

                    {/* 결제하기 버튼 */}
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-base md:text-lg px-6 md:px-8 py-6 shadow-lg shadow-primary/25 group"
                      onClick={onPurchase}
                    >
                      <CreditCard className="w-5 h-5 mr-2" aria-hidden="true" />
                      결제하기
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  /* Coming Soon - 알림 신청 버튼 */
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-base md:text-lg px-6 md:px-8 py-6 shadow-lg shadow-primary/25 group"
                    onClick={onContact}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                    출시 알림 신청
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                )}
              </div>

              {/* 추가 안내 메시지 */}
              {!isComingSoon && (
                <p className="text-sm text-muted-foreground pt-4">
                  궁금한 점이 있으시면 언제든지 문의해 주세요. 친절하게 안내해 드리겠습니다.
                </p>
              )}

              {isComingSoon && service.launchDate && (
                <p className="text-sm text-muted-foreground pt-4">
                  출시 예정일: {new Date(service.launchDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
