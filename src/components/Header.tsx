import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/logo-symbol.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoSymbol} alt="IDEA on Action Logo" className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">IDEA on Action</span>
            <span className="text-xs text-muted-foreground">생각과행동</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#services" className="text-foreground/80 hover:text-foreground transition-colors">
            솔루션
          </a>
          <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">
            기술
          </a>
          <a href="#about" className="text-foreground/80 hover:text-foreground transition-colors">
            회사소개
          </a>
          <a href="#contact" className="text-foreground/80 hover:text-foreground transition-colors">
            문의
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="default" className="hidden md:inline-flex bg-gradient-primary hover:opacity-90">
            시작하기
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
