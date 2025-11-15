import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MonthlyPlan } from "@/types/services";

interface PlanComparisonTableProps {
  plans: MonthlyPlan[];
}

const featureLabels: Record<string, string> = {
  platforms: "플랫폼 통합",
  monthlyAnalysis: "월 분석 건수",
  aiAnalysis: "AI 분석",
  customFilter: "커스텀 필터",
  notifications: "실시간 알림",
  history: "히스토리",
  team: "팀 기능",
  support: "기술 지원",
  api: "API 연동",
};

export default function PlanComparisonTable({
  plans,
}: PlanComparisonTableProps) {
  // 모든 플랜의 features 키를 수집
  const allFeatureKeys = Array.from(
    new Set(plans.flatMap((plan) => Object.keys(plan.features)))
  );

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
    }).format(price);
  };

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">기능</TableHead>
            {plans.map((plan) => (
              <TableHead key={plan.name} className="text-center">
                <div className="space-y-1">
                  <div className="font-bold">{plan.name}</div>
                  {plan.recommended && (
                    <Badge variant="default" className="text-xs">
                      추천
                    </Badge>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 가격 행 */}
          <TableRow>
            <TableCell className="font-medium">월 이용료</TableCell>
            {plans.map((plan) => (
              <TableCell key={plan.name} className="text-center">
                <div className="space-y-1">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  {plan.annualDiscount && (
                    <div className="text-xs text-muted-foreground">
                      연간 {plan.annualDiscount}% 할인
                    </div>
                  )}
                </div>
              </TableCell>
            ))}
          </TableRow>

          {/* 기능 행들 */}
          {allFeatureKeys.map((key) => (
            <TableRow key={key}>
              <TableCell className="font-medium">
                {featureLabels[key] || key}
              </TableCell>
              {plans.map((plan) => (
                <TableCell key={plan.name} className="text-center">
                  {plan.features[key] !== undefined
                    ? renderFeatureValue(plan.features[key])
                    : "-"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
