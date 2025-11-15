/**
 * PageLayout Component
 *
 * 페이지 전체 레이아웃 래퍼 컴포넌트
 * - 일관된 페이지 구조 제공
 * - Header/Footer 포함 여부 선택 가능
 * - 중앙 정렬 및 최대 너비 지원
 */

import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

export const PageLayout = ({
  children,
  title,
  description,
  showHeader = true,
  showFooter = true,
  className = "",
  maxWidth = "4xl",
}: PageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background flex flex-col ${className}`}>
      {showHeader && <Header />}
      <main className={`flex-1 ${showHeader ? 'pt-16' : ''}`}>
        <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-12 ${maxWidthClasses[maxWidth]}`}>
          {(title || description) && (
            <div className="mb-8 text-center">
              {title && (
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-lg text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default PageLayout;
