import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Features from "@/components/Features";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen gradient-bg text-foreground">
      <Header />
      <main>
        <Hero />
        <Services />
        <Features />
        <About />
        <Contact />

        {/* Newsletter CTA Section */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10"></div>
          <div className="container mx-auto max-w-4xl relative">
            <div className="glass-card p-8 md:p-12 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Stay Connected</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                최신 소식을 받아보세요
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                새로운 프로젝트, 인사이트, 그리고 업데이트를 가장 먼저 확인하세요.
              </p>
              <div className="flex justify-center pt-4">
                <NewsletterForm
                  variant="inline"
                  placeholder="이메일 주소"
                  buttonText="구독"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                언제든지 구독을 취소할 수 있습니다. 개인정보는 안전하게 보호됩니다.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
