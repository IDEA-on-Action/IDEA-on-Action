import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  duration?: string;
  href: string;
  status?: "available" | "coming-soon";
  launchDate?: string;
  className?: string;
}

export default function ServiceCard({
  title,
  description,
  price,
  duration,
  href,
  status = "available",
  launchDate,
  className,
}: ServiceCardProps) {
  const isComingSoon = status === "coming-soon";

  return (
    <Card className={cn("hover-lift transition-all", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          {isComingSoon && (
            <Badge variant="outline" className="text-xs">
              출시 예정
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">{price}</div>
          {duration && (
            <div className="text-sm text-muted-foreground">{duration}</div>
          )}
          {isComingSoon && launchDate && (
            <div className="text-sm text-muted-foreground">
              출시 예정: {launchDate}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isComingSoon ? (
          <Button variant="outline" className="w-full" disabled>
            출시 예정
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full group">
            <Link to={href}>
              자세히 보기
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
