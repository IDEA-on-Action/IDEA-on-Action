import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Globe } from "lucide-react";

const Contact = () => {
  const handleConsultation = () => {
    // 이메일 문의 또는 전화 선택 옵션을 제공
    const userChoice = window.confirm(
      "상담 신청 방법을 선택해주세요:\n\n확인: 이메일로 문의\n취소: 전화로 문의"
    );
    
    if (userChoice) {
      // 이메일 문의
      const subject = encodeURIComponent("[IDEA on Action] 상담 신청");
      const body = encodeURIComponent(
        "안녕하세요.\n\nIDEA on Action 서비스에 대해 상담을 신청합니다.\n\n문의 내용:\n- \n\n연락처:\n- \n\n감사합니다."
      );
      window.open(`mailto:sinclairseo@gmail.com?subject=${subject}&body=${body}`);
    } else {
      // 전화 문의
      window.open("tel:010-4904-2671");
    }
  };
  return (
    <section id="contact" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              함께 <span className="bg-gradient-primary bg-clip-text text-transparent">시작</span>하세요
            </h2>
            <p className="text-lg text-muted-foreground">
              AI 기반 솔루션으로 비즈니스를 혁신할 준비가 되셨나요?
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-card/50 backdrop-blur-sm border-primary/20 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">연락처</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">이메일</div>
                      <a
                        href="mailto:sinclairseo@gmail.com"
                        aria-label="이메일 보내기: sinclairseo@gmail.com"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        sinclairseo@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">전화</div>
                      <a
                        href="tel:010-4904-2671"
                        aria-label="전화 걸기: 010-4904-2671"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        010-4904-2671
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">웹사이트</div>
                      <a
                        href="https://www.ideaonaction.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="웹사이트 방문하기: www.ideaonaction.ai"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        www.ideaonaction.ai
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6">대표자</h3>
                <div className="p-6 rounded-2xl bg-background/50 border border-border mb-6">
                  <div className="text-lg font-semibold mb-2">서민원 대표</div>
                  <div className="text-muted-foreground text-sm">
                    IDEA on Action CEO
                  </div>
                </div>

                <Button className="w-full bg-gradient-primary hover:opacity-90 text-lg py-6">
                  상담 신청하기
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
