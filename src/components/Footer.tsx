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
    href: "https://www.linkedin.com/company/ideaonaction",
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
    title: "서비스",
    links: [
      { label: "모든 서비스", href: "/services" },
      { label: "MVP 개발", href: "/services/mvp" },
      { label: "풀스택 개발", href: "/services/fullstack" },
      { label: "디자인 시스템", href: "/services/design" }
    ]
  },
  {
    title: "회사",
    links: [
      { label: "회사소개", href: "/about" },
      { label: "로드맵", href: "/roadmap" },
      { label: "포트폴리오", href: "/portfolio" },
      { label: "실험실", href: "/lab" },
      { label: "협업하기", href: "/work-with-us" }
    ]
  },
  {
    title: "리소스",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/IDEA-on-Action",
        isExternal: true
      },
      { label: "블로그", href: "/blog" }
    ]
  },
  {
    title: "법적 정보",
    links: [
      { label: "이용약관", href: "/terms" },
      { label: "개인정보처리방침", href: "/privacy" },
      { label: "환불정책", href: "/refund-policy" },
      { label: "전자금융거래약관", href: "/electronic-finance-terms" }
    ]
  }
];

const COPYRIGHT_INFO = {
  year: new Date().getFullYear(),
  company: "생각과 행동 (IDEA on Action)",
  rights: "All rights reserved."
} as const;

const Footer = ({ className = "" }: FooterProps) => {
  const location = useLocation();

  return (
    <footer
      role="contentinfo"
      className={`border-t border-border bg-card/30 backdrop-blur-sm ${className}`}
    >
      <div className="container mx-auto px-4 py-12">
        {/* Main Grid: Brand + 4 Sections */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-1">
            <Link
              to="/"
              className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
              aria-label="IDEA on Action 홈페이지로 이동"
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
              <div className="flex items-center gap-3">
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
          </div>

          {/* Footer Sections */}
          {FOOTER_SECTIONS.map((section, sectionIndex) => (
            <nav
              key={sectionIndex}
              aria-labelledby={`footer-section-${sectionIndex}`}
            >
              <h3
                id={`footer-section-${sectionIndex}`}
                className="font-semibold mb-4 text-sm"
              >
                {section.title}
              </h3>
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
            </nav>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="pt-8 pb-8 border-t border-border">
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-semibold mb-2">뉴스레터 구독</h3>
            <p className="text-sm text-muted-foreground mb-4">
              최신 소식과 인사이트를 받아보세요
            </p>
            <NewsletterForm variant="inline" showIcon={false} location="footer" />
          </div>
        </div>

        {/* Business Information & Copyright */}
        <div className="pt-8 border-t border-border">
          {/* Business Information */}
          <div className="text-center text-xs text-muted-foreground mb-4 space-y-1">
            <p>
              <span className="font-semibold">생각과 행동 (IDEA on Action)</span> | 대표자: 서민원
            </p>
            <p>
              사업자등록번호: 537-05-01511 | 신고번호: 2025-경기시흥-2094
            </p>
            <p>
              주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호
            </p>
            <p>
              이메일: sinclair.seo@ideaonaction.ai | 전화: 010-4904-2671
            </p>
          </div>

          {/* Copyright & Slogan */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © {COPYRIGHT_INFO.year} {COPYRIGHT_INFO.company}. {COPYRIGHT_INFO.rights}
            </p>
            <p className="mt-2 text-accent font-semibold">{BRAND_INFO.slogan}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
