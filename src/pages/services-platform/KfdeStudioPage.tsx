import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PageLayout from "@/components/layouts/PageLayout";
import { SEO } from "@/components/shared/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { features } from "@/config/features";
import { cn } from "@/lib/utils";
import { KFDE_STUDIO_INQUIRY_PATH, KFDE_STUDIO_PATH, kfdeStudioCopy as copy } from "@/data/products/kfde-studio";

/**
 * 공개 문구판의 표를 그대로 옮기는 표.
 * 좁은 화면에서는 표 영역만 가로로 스크롤합니다.
 */
function CopyTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[620px] border-collapse text-sm md:text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-muted/50">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b last:border-b-0">
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" className="whitespace-nowrap px-4 py-3 text-left align-top font-semibold">
                    {cell}
                  </th>
                ) : (
                  <td key={index} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InquiryButton({ className }: { className?: string }) {
  // 문의 양식의 공개가 확정되기 전에는 버튼을 보여 주지 않습니다.
  if (!features.productInquiry) return null;

  return (
    <Button asChild size="lg" className={className}>
      <Link to={KFDE_STUDIO_INQUIRY_PATH}>
        {copy.inquiryButton}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}

export default function KfdeStudioPage() {
  return (
    <PageLayout maxWidth="xl">
      <SEO
        title={copy.name}
        description={copy.tagline}
        canonical={KFDE_STUDIO_PATH}
        ogType="product"
        breadcrumbs={[
          { name: "홈", url: "/" },
          { name: "서비스", url: "/services" },
          { name: copy.name, url: KFDE_STUDIO_PATH },
        ]}
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-16 break-keep">
        {/* 1. 머리 */}
        <header className="flex flex-col gap-5">
          <p className="font-mono text-sm tracking-wider text-primary">{copy.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{copy.name}</h1>
          <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">{copy.tagline}</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-amber-600/60 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300"
            >
              {copy.stage}
            </Badge>
            {copy.chips.map((chip) => (
              <Badge key={chip} variant="outline" className="px-3 py-1 font-normal text-muted-foreground">
                {chip}
              </Badge>
            ))}
          </div>
          <div>
            <InquiryButton />
          </div>
        </header>

        {/* 2. 한눈에 보기 */}
        <section aria-labelledby="kfde-flow" className="flex flex-col gap-4">
          <h2 id="kfde-flow" className="text-2xl font-semibold md:text-3xl">
            {copy.flow.title}
          </h2>
          <div className="rounded-lg border bg-card p-4 md:p-6">
            <p className="sr-only">{copy.flow.summary}</p>
            <ol className="grid gap-3 md:grid-cols-4">
              {copy.flow.steps.map((step, index) => (
                <li key={step.tag} className="relative flex">
                  <div
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg border p-4",
                      "emphasis" in step && step.emphasis ? "border-primary bg-primary/10" : "bg-muted/40"
                    )}
                  >
                    <span className="font-mono text-xs text-primary">{step.tag}</span>
                    <span className="text-lg font-semibold">{step.title}</span>
                    {step.lines.map((line) => (
                      <span key={line} className="text-sm text-muted-foreground">
                        {line}
                      </span>
                    ))}
                  </div>
                  {index < copy.flow.steps.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      className="absolute -right-[14px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground md:block"
                    />
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg border border-dashed px-4 py-3 text-center text-sm">{copy.flow.audit}</p>
          </div>
          <p className="text-sm text-muted-foreground">{copy.flow.modesNote}</p>
          <ul className="flex flex-wrap gap-2" aria-label="실행 모드">
            {copy.flow.modes.map((mode) => (
              <li key={mode} className="rounded-md bg-primary/10 px-3 py-1 font-mono text-sm text-primary">
                {mode}
              </li>
            ))}
          </ul>
        </section>

        {/* 3. 무엇이 달라집니까 */}
        <section aria-labelledby="kfde-changes" className="flex flex-col gap-4">
          <h2 id="kfde-changes" className="text-2xl font-semibold md:text-3xl">
            {copy.changes.title}
          </h2>
          <CopyTable caption={copy.changes.title} headers={copy.changes.headers} rows={copy.changes.rows} />
        </section>

        {/* 4. 다섯 영역과 기반 */}
        <section aria-labelledby="kfde-areas" className="flex flex-col gap-4">
          <h2 id="kfde-areas" className="text-2xl font-semibold md:text-3xl">
            {copy.areas.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.areas.items.map((area) => (
              <Card key={area.tag}>
                <CardHeader className="gap-1 pb-3">
                  <span className="font-mono text-xs tracking-wide text-primary">{area.tag}</span>
                  <CardTitle className="text-lg">{area.title}</CardTitle>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {area.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <h3 className="mt-6 text-xl font-semibold">{copy.users.title}</h3>
          <CopyTable caption={copy.users.title} headers={copy.users.headers} rows={copy.users.rows} />
        </section>

        {/* 5. 검증 결과와 로드맵 */}
        <section aria-labelledby="kfde-proof" className="flex flex-col gap-4">
          <h2 id="kfde-proof" className="text-2xl font-semibold md:text-3xl">
            {copy.proof.title}
          </h2>
          <CopyTable caption={copy.proof.title} headers={copy.proof.headers} rows={copy.proof.rows} />
          <h2 id="kfde-roadmap" className="mt-6 text-2xl font-semibold md:text-3xl">
            {copy.roadmap.title}
          </h2>
          <CopyTable caption={copy.roadmap.title} headers={copy.roadmap.headers} rows={copy.roadmap.rows} />
          <p className="border-l-4 border-amber-600/70 bg-amber-500/10 px-4 py-3 text-sm">{copy.roadmap.disclaimer}</p>
        </section>

        {/* 6. 도입 문의 */}
        <section aria-labelledby="kfde-inquiry">
          <div className="flex flex-col gap-4 rounded-lg border border-primary bg-card p-6">
            <h2 id="kfde-inquiry" className="text-2xl font-semibold md:text-3xl">
              {copy.inquiry.title}
            </h2>
            <p className="max-w-3xl">{copy.inquiry.body}</p>
            <div>
              <InquiryButton />
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
          {copy.footer.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </footer>
      </div>
    </PageLayout>
  );
}
