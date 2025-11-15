/**
 * Section Component
 * 
 * 섹션 래퍼 컴포넌트
 * - 일관된 섹션 스타일 제공
 * - 배경색, 패딩 옵션 지원
 */

import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "gradient";
  container?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";
}

const variantClasses = {
  default: "",
  muted: "bg-muted/30",
  gradient: "bg-gradient-to-r from-primary/10 to-secondary/10",
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

export const Section = ({
  children,
  className = "",
  variant = "default",
  container = true,
  maxWidth = "6xl",
}: SectionProps) => {
  const variantClass = variantClasses[variant];
  const maxWidthClass = maxWidthClasses[maxWidth];

  return (
    <section className={`py-16 px-4 ${variantClass} ${className}`}>
      {container ? (
        <div className={`container mx-auto ${maxWidthClass}`}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
};

export default Section;
