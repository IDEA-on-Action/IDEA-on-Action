import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Package } from "@/types/services";

interface PricingPackageProps {
  package: Package;
  className?: string;
}

export default function PricingPackage({
  package: pkg,
  className,
}: PricingPackageProps) {
  const formattedPrice = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: pkg.currency,
  }).format(pkg.price);

  return (
    <Card className={cn("relative", pkg.recommended && "border-primary", className)}>
      {pkg.recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          추천
        </Badge>
      )}
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
        <div className="text-3xl font-bold">{formattedPrice}</div>
        {pkg.duration && (
          <div className="text-sm text-muted-foreground">{pkg.duration}</div>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {pkg.support && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">{pkg.support}</div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link to="/work-with-us">상담 신청하기</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
