import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTAButton {
  label: string;
  href: string;
}

interface CTASectionProps {
  primary: CTAButton;
  secondary?: CTAButton;
}

export default function CTASection({ primary, secondary }: CTASectionProps) {
  return (
    <section className="py-12 text-center">
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button asChild size="lg" className="group">
          <Link to={primary.href}>
            {primary.label}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        {secondary && (
          <Button asChild variant="outline" size="lg">
            <Link to={secondary.href}>{secondary.label}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
