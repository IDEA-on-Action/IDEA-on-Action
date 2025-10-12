import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import logoFull from "@/assets/logo-full.png";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <img 
              src={logoFull} 
              alt="VIBE WORKING - KEEP AWAKE, LIVE PASSIONATE" 
              className="h-20 md:h-24 mx-auto"
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI 기반 워킹 솔루션</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            생각과 행동으로
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              미래를 설계하다
            </span>
          </h1>

          {/* Slogan */}
          <p className="text-2xl md:text-3xl font-semibold text-accent mb-4">
            KEEP AWAKE, LIVE PASSIONATE
          </p>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            IDEA on Action은 AI 기반의 혁신적인 워킹 솔루션으로
            <br className="hidden md:block" />
            비즈니스의 생산성과 효율성을 극대화합니다
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 text-lg px-8 shadow-glow group"
            >
              무료로 시작하기
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 border-primary/30 hover:bg-primary/10"
            >
              더 알아보기
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
