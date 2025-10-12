import { Github, Linkedin, Mail } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logoSymbol} alt="IDEA on Action Logo" className="h-10 w-10" />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">IDEA on Action</span>
                <span className="text-xs text-muted-foreground">생각과행동</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              생각과행동으로 미래를 설계하다
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://github.com/IDEA-on-Action" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="mailto:sinclairseo@gmail.com"
                className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">솔루션</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#services" className="hover:text-primary transition-colors">AI 컨설팅</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">워크플로우 자동화</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">데이터 분석</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">회사</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-primary transition-colors">회사소개</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">기술</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">문의</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">리소스</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://github.com/IDEA-on-Action/IdeaonAction-Homepage" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a></li>
              <li><a href="https://www.ideaonaction.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">웹사이트</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">블로그</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2025 IDEA on Action (생각과행동). All rights reserved.</p>
          <p className="mt-2 text-accent font-semibold">KEEP AWAKE, LIVE PASSIONATE</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
