import { FAQ } from "@/types/services";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ServiceFAQProps {
  faqs: FAQ[];
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ServiceFAQ 컴포넌트
 * 자주 묻는 질문을 Accordion으로 표시
 *
 * Features:
 * - Accordion UI로 질문/답변 표시
 * - 클릭하여 답변 확장/축소
 * - 접근성 지원
 * - 다크 모드 지원
 * - 반응형 레이아웃
 */
export const ServiceFAQ = ({
  faqs,
  title = "자주 묻는 질문",
  description,
  className
}: ServiceFAQProps) => {
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

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={`faq-${index}`}
                value={`item-${index}`}
                className="border border-border rounded-lg px-6 bg-background/80 backdrop-blur-sm dark:bg-background/50 hover:border-primary/40 transition-colors duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="text-base md:text-lg font-semibold text-foreground pr-4">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* 추가 문의 안내 */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm md:text-base text-muted-foreground">
            더 궁금하신 사항이 있으신가요?{" "}
            <a
              href="/contact"
              className="text-primary hover:underline font-medium"
            >
              문의하기
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
