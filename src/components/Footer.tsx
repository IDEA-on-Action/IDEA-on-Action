import { Github, Linkedin, Mail, LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logoSymbol from "@/assets/logo-symbol.png";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

// Types
interface FooterProps {
  className?: string;
}

interface SocialLink {
  icon: LucideIcon;
  href: string;
  label: string;
  isExternal?: boolean;
}

interface FooterSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
  }>;
}

// Constants
const BRAND_INFO = {
  name: "IDEA on Action",
  tagline: "생각과행동",
  logo: logoSymbol,
  logoAlt: "IDEA on Action Logo",
  description: "생각과행동으로 미래를 설계하다",
  slogan: "KEEP AWAKE, LIVE PASSIONATE"
} as const;

const SOCIAL_LINKS: SocialLink[] = [
  {
    icon: Github,
    href: "https://github.com/IDEA-on-Action",
    label: "GitHub 프로필 방문하기",
    isExternal: true
  },
  {
    icon: Linkedin,
    href: "https://linkedin.com",
    label: "LinkedIn 프로필 방문하기",
    isExternal: true
  },
  {
    icon: Mail,
    href: "mailto:sinclair.seo@ideaonaction.ai",
    label: "이메일 보내기: sinclair.seo@ideaonaction.ai",
    isExternal: false
  }
];

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "솔루션",
    links: [
      { label: "AI 컨설팅", href: "/services" },
      { label: "워크플로우 자동화", href: "/services" },
      { label: "데이터 분석", href: "/services" }
    ]
  },
  {
    title: "회사",
    links: [
      { label: "회사소개", href: "/about" },
      { label: "로드맵", href: "/roadmap" },
      { label: "협업하기", href: "/work-with-us" }
    ]
  },
  {
    title: "리소스",
    links: [
      { 
        label: "GitHub", 
        href: "https://github.com/IDEA-on-Action/IdeaonAction-Homepage", 
        isExternal: true 
      },
      { 
        label: "웹사이트", 
        href: "https://www.ideaonaction.ai", 
        isExternal: true 
      },
      { label: "블로그", href: "/blog" }
    ]
  }
];

const COPYRIGHT_INFO = {
  year: new Date().getFullYear(),
  company: "IDEA on Action (생각과행동)",
  rights: "All rights reserved."
} as const;

const Footer = ({ className = "" }: FooterProps) => {
  const location = useLocation();

  return (
    <footer className={`border-t border-border bg-card/30 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
              aria-label="홈페이지로 이동"
            >
              <img
                src={BRAND_INFO.logo}
                alt={BRAND_INFO.logoAlt}
                className="h-10 w-10"
                width={40}
                height={40}
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">{BRAND_INFO.name}</span>
                <span className="text-xs text-muted-foreground">{BRAND_INFO.tagline}</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {BRAND_INFO.description}
            </p>
            <nav aria-label="소셜 미디어 링크">
              <div className="flex items-center gap-3 mb-6" role="list">
                {SOCIAL_LINKS.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      target={social.isExternal ? "_blank" : undefined}
                      rel={social.isExternal ? "noopener noreferrer" : undefined}
                      aria-label={social.label}
                      className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </nav>

            {/* Newsletter Section */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-sm">뉴스레터 구독</h4>
              <p className="text-xs text-muted-foreground mb-3">
                최신 소식과 인사이트를 받아보세요
              </p>
              <NewsletterForm variant="stacked" showIcon={false} location="footer" />
            </div>
          </div>

          {/* Footer Sections */}
          {FOOTER_SECTIONS.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground" role="list">
                {section.links.map((link, linkIndex) => {
                  const isActive = !link.isExternal && location.pathname === link.href;
                  const Component = link.isExternal ? 'a' : Link;
                  const props = link.isExternal
                    ? {
                        href: link.href,
                        target: "_blank",
                        rel: "noopener noreferrer"
                      }
                    : { to: link.href };

                  return (
                    <li key={linkIndex}>
                      <Component
                        {...props}
                        className={`hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm ${
                          isActive ? 'text-primary font-medium' : ''
                        }`}
                        aria-label={`${link.label} 페이지로 이동`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {link.label}
                      </Component>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright Section */}
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            © {COPYRIGHT_INFO.year} {COPYRIGHT_INFO.company}. {COPYRIGHT_INFO.rights}
          </p>
          <p className="mt-2 text-accent font-semibold">{BRAND_INFO.slogan}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
