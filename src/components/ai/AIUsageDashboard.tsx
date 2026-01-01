/**
 * AIUsageDashboard 컴포넌트
 *
 * 토큰 사용량 추적 대시보드
 * - 월간 사용량 차트 (recharts)
 * - 모델별 사용량
 * - 비용 추정
 * - 사용량 경고
 * - 관리자 전용
 *
 * @module components/ai/AIUsageDashboard
 */

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Activity,
  Cpu,
  Info,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ClaudeModel,
  type ClaudeUsage,
  CLAUDE_MODEL_INFO,
  calculateCost,
} from "@/types/ai/claude.types";

// ============================================================================
// Types
// ============================================================================

/**
 * 일별 사용량 데이터
 */
export interface DailyUsage {
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 입력 토큰 */
  inputTokens: number;
  /** 출력 토큰 */
  outputTokens: number;
  /** 요청 횟수 */
  requestCount: number;
  /** 비용 (USD) */
  cost: number;
}

/**
 * 모델별 사용량 데이터
 */
export interface ModelUsage {
  /** 모델 ID */
  model: ClaudeModel;
  /** 총 입력 토큰 */
  inputTokens: number;
  /** 총 출력 토큰 */
  outputTokens: number;
  /** 요청 횟수 */
  requestCount: number;
  /** 총 비용 (USD) */
  cost: number;
  /** 비율 (%) */
  percentage: number;
}

/**
 * 사용량 경고 레벨
 */
export type UsageWarningLevel = "normal" | "warning" | "critical";

/**
 * 사용량 한도 설정
 */
export interface UsageLimits {
  /** 월간 토큰 한도 */
  monthlyTokenLimit: number;
  /** 월간 비용 한도 (USD) */
  monthlyCostLimit: number;
  /** 경고 임계값 (%) */
  warningThreshold: number;
  /** 위험 임계값 (%) */
  criticalThreshold: number;
}

/**
 * AIUsageDashboard 속성
 */
export interface AIUsageDashboardProps {
  /** 일별 사용량 데이터 */
  dailyUsage: DailyUsage[];
  /** 모델별 사용량 데이터 */
  modelUsage: ModelUsage[];
  /** 현재 월 총 사용량 */
  currentMonthTotal: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    cost: number;
  };
  /** 사용량 한도 설정 */
  limits: UsageLimits;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 추가 클래스 */
  className?: string;
  /** 이전 달 대비 변화율 (%) */
  monthOverMonthChange?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 차트 색상 팔레트
 */
const CHART_COLORS = {
  input: "hsl(262, 83%, 58%)",     // violet-500
  output: "hsl(280, 75%, 60%)",    // purple-500
  cost: "hsl(217, 91%, 60%)",      // blue-500
  warning: "hsl(45, 93%, 47%)",    // amber-500
  critical: "hsl(0, 84%, 60%)",    // red-500
};

/**
 * 모델별 색상 (파이 차트용)
 */
const MODEL_COLORS: Record<ClaudeModel, string> = {
  "claude-3-5-sonnet-20241022": "hsl(262, 83%, 58%)",
  "claude-3-5-haiku-20241022": "hsl(280, 75%, 60%)",
  "claude-3-opus-20240229": "hsl(217, 91%, 60%)",
  "claude-3-sonnet-20240229": "hsl(142, 71%, 45%)",
  "claude-3-haiku-20240307": "hsl(45, 93%, 47%)",
};

/**
 * 차트 설정
 */
const chartConfig: ChartConfig = {
  inputTokens: {
    label: "입력 토큰",
    color: CHART_COLORS.input,
  },
  outputTokens: {
    label: "출력 토큰",
    color: CHART_COLORS.output,
  },
  cost: {
    label: "비용",
    color: CHART_COLORS.cost,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 사용량 경고 레벨 계산
 */
function getWarningLevel(
  usage: number,
  limit: number,
  warningThreshold: number,
  criticalThreshold: number
): UsageWarningLevel {
  const percentage = (usage / limit) * 100;
  if (percentage >= criticalThreshold) return "critical";
  if (percentage >= warningThreshold) return "warning";
  return "normal";
}

/**
 * 숫자 포맷팅 (K, M 단위)
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * 비용 포맷팅 (USD)
 */
function formatCost(cost: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * 날짜 포맷팅 (MM/DD)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * 통계 카드 컴포넌트
 */
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  warningLevel?: UsageWarningLevel;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  warningLevel = "normal",
}: StatCardProps) {
  const warningColors: Record<UsageWarningLevel, string> = {
    normal: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", warningColors[warningLevel])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend !== undefined && (
            <>
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={trend >= 0 ? "text-green-500" : "text-red-500"}>
                {trend >= 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            </>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 사용량 진행바 컴포넌트
 */
interface UsageProgressProps {
  label: string;
  current: number;
  limit: number;
  warningLevel: UsageWarningLevel;
  format?: "tokens" | "cost";
}

function UsageProgress({
  label,
  current,
  limit,
  warningLevel,
  format = "tokens",
}: UsageProgressProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const progressColors: Record<UsageWarningLevel, string> = {
    normal: "bg-green-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  const formatValue = format === "cost" ? formatCost : formatNumber;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatValue(current)} / {formatValue(limit)}
        </span>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div
          className={cn(
            "absolute inset-0 h-2 rounded-full transition-all",
            progressColors[warningLevel]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {percentage.toFixed(1)}% 사용 중
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AI 사용량 대시보드 컴포넌트
 *
 * @example
 * <AIUsageDashboard
 *   dailyUsage={dailyData}
 *   modelUsage={modelData}
 *   currentMonthTotal={totals}
 *   limits={limits}
 * />
 */
export function AIUsageDashboard({
  dailyUsage,
  modelUsage,
  currentMonthTotal,
  limits,
  isLoading = false,
  className,
  monthOverMonthChange,
}: AIUsageDashboardProps) {
  // 경고 레벨 계산
  const tokenWarningLevel = getWarningLevel(
    currentMonthTotal.inputTokens + currentMonthTotal.outputTokens,
    limits.monthlyTokenLimit,
    limits.warningThreshold,
    limits.criticalThreshold
  );

  const costWarningLevel = getWarningLevel(
    currentMonthTotal.cost,
    limits.monthlyCostLimit,
    limits.warningThreshold,
    limits.criticalThreshold
  );

  // 일별 차트 데이터 변환
  const dailyChartData = dailyUsage.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  // 모델별 파이 차트 데이터
  const modelPieData = modelUsage.map((m) => ({
    name: CLAUDE_MODEL_INFO[m.model]?.name || m.model,
    value: m.requestCount,
    cost: m.cost,
    color: MODEL_COLORS[m.model] || CHART_COLORS.input,
  }));

  // 경고 메시지 표시 여부
  const showWarning = tokenWarningLevel !== "normal" || costWarningLevel !== "normal";

  if (isLoading) {
    return (
      <div className={cn("space-y-6 animate-pulse", className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 경고 배너 */}
      {showWarning && (
        <Alert
          variant={costWarningLevel === "critical" || tokenWarningLevel === "critical" ? "destructive" : "default"}
          className={cn(
            costWarningLevel === "warning" || tokenWarningLevel === "warning"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
              : ""
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>사용량 경고</AlertTitle>
          <AlertDescription>
            {costWarningLevel === "critical" || tokenWarningLevel === "critical"
              ? "월간 사용량 한도에 거의 도달했습니다. 서비스 중단을 방지하려면 한도를 늘리거나 사용량을 줄이세요."
              : "월간 사용량이 임계치에 근접하고 있습니다. 사용량을 모니터링하세요."}
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="총 토큰 사용량"
          value={formatNumber(currentMonthTotal.inputTokens + currentMonthTotal.outputTokens)}
          description="이번 달"
          icon={Zap}
          trend={monthOverMonthChange}
          warningLevel={tokenWarningLevel}
        />
        <StatCard
          title="예상 비용"
          value={formatCost(currentMonthTotal.cost)}
          description="이번 달"
          icon={DollarSign}
          warningLevel={costWarningLevel}
        />
        <StatCard
          title="API 요청 수"
          value={formatNumber(currentMonthTotal.requestCount)}
          description="이번 달"
          icon={Activity}
        />
        <StatCard
          title="평균 요청당 토큰"
          value={formatNumber(
            currentMonthTotal.requestCount > 0
              ? Math.round(
                  (currentMonthTotal.inputTokens + currentMonthTotal.outputTokens) /
                    currentMonthTotal.requestCount
                )
              : 0
          )}
          description="입력 + 출력"
          icon={Cpu}
        />
      </div>

      {/* 사용량 진행바 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">월간 사용량 현황</CardTitle>
          <CardDescription>
            이번 달 사용량과 한도 대비 현황입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageProgress
            label="토큰 사용량"
            current={currentMonthTotal.inputTokens + currentMonthTotal.outputTokens}
            limit={limits.monthlyTokenLimit}
            warningLevel={tokenWarningLevel}
            format="tokens"
          />
          <UsageProgress
            label="비용"
            current={currentMonthTotal.cost}
            limit={limits.monthlyCostLimit}
            warningLevel={costWarningLevel}
            format="cost"
          />
        </CardContent>
      </Card>

      {/* 차트 섹션 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 일별 사용량 차트 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">일별 토큰 사용량</CardTitle>
                <CardDescription>최근 30일 사용 추이</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>막대: 입력/출력 토큰 분포</p>
                    <p>선: 누적 비용 추이</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span>
                            {name === "cost"
                              ? formatCost(Number(value))
                              : formatNumber(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="inputTokens"
                    stackId="tokens"
                    fill={CHART_COLORS.input}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="outputTokens"
                    stackId="tokens"
                    fill={CHART_COLORS.output}
                    radius={[4, 4, 0, 0]}
                  />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 모델별 사용량 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">모델별 사용량</CardTitle>
            <CardDescription>요청 횟수 기준 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {modelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, props) => (
                          <div className="space-y-1">
                            <p>요청: {formatNumber(Number(value))}회</p>
                            <p>비용: {formatCost(props.payload.cost)}</p>
                          </div>
                        )}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* 모델별 상세 목록 */}
            <div className="mt-4 space-y-2">
              {modelUsage.map((m) => (
                <div
                  key={m.model}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: MODEL_COLORS[m.model] }}
                    />
                    <span>{CLAUDE_MODEL_INFO[m.model]?.name || m.model}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{m.requestCount}회</Badge>
                    <span className="text-muted-foreground">
                      {formatCost(m.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비용 추이 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">일별 비용 추이</CardTitle>
          <CardDescription>API 사용 비용 변화</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCost(Number(value))}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={CHART_COLORS.cost}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.cost, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIUsageDashboard;
