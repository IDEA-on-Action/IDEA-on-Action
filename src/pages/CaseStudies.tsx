import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Briefcase, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import {
  caseStudies,
  CASE_CATEGORY_LABELS,
  CASE_SECTION_DESCRIPTIONS,
  CASE_SECTION_LABELS,
  CASE_STAGE_LABELS,
  type CaseCategory,
  type CaseSection,
  type CaseStudy,
} from "@/data/case-studies";

const SECTIONS: CaseSection[] = ["company", "career"];
const CATEGORIES = Object.keys(CASE_CATEGORY_LABELS) as CaseCategory[];

function CaseCard({ item }: { item: CaseStudy }) {
  return (
    <Link to={`/cases/${item.slug}`} data-testid="case-card">
      <Card className="glass-card p-6 space-y-3 hover-lift h-full flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {CASE_STAGE_LABELS[item.stage]}
          </Badge>
          <Badge variant="outline">{CASE_CATEGORY_LABELS[item.category]}</Badge>
        </div>
        <h3 className="text-lg font-bold line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{item.summary}</p>
        <p className="text-xs text-muted-foreground">
          {item.role}
          {item.period ? ` · ${item.period}` : ""}
        </p>
      </Card>
    </Link>
  );
}

const CaseStudies = () => {
  const [category, setCategory] = useState<CaseCategory | "all">("all");

  const filtered = useMemo(
    () => (category === "all" ? caseStudies : caseStudies.filter((c) => c.category === category)),
    [category]
  );

  return (
    <>
      <Helmet>
        <title>수행 사례 - IDEA on Action</title>
        <meta
          name="description"
          content="생각과행동의 수행 사례와 대표 경력을 분야와 수행 단계별로 확인하세요. AI·문서지능, 데이터 플랫폼, 커머스·결제, 앱 서비스, 설계·컨설팅."
        />
        <meta property="og:title" content="수행 사례 - IDEA on Action" />
        <meta property="og:description" content="분야와 수행 단계를 밝힌 수행 사례와 대표 경력" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Briefcase, text: "Case Studies" }}
          title="수행 사례"
          description={
            <p className="text-lg md:text-xl">
              사례마다 수행 단계와 맡은 역할을 밝혀 두었습니다. 과업과 비슷한 사례를 분야로 찾아보세요.
            </p>
          }
        />

        <Section maxWidth="6xl">
          <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label="분야 필터">
            <Button
              variant={category === "all" ? "default" : "outline"}
              className={category === "all" ? "bg-gradient-primary hover:opacity-90" : undefined}
              aria-pressed={category === "all"}
              size="sm"
              onClick={() => setCategory("all")}
            >
              전체
            </Button>
            {CATEGORIES.map((key) => (
              <Button
                key={key}
                variant={category === key ? "default" : "outline"}
                className={category === key ? "bg-gradient-primary hover:opacity-90" : undefined}
                aria-pressed={category === key}
                size="sm"
                onClick={() => setCategory(key)}
              >
                {CASE_CATEGORY_LABELS[key]}
              </Button>
            ))}
          </div>

          {SECTIONS.map((section) => {
            const items = filtered.filter((c) => c.section === section);
            return (
              <div key={section} className="mb-16" data-testid={`case-section-${section}`}>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {CASE_SECTION_LABELS[section]}
                  <span className="ml-2 text-base font-normal text-muted-foreground">{items.length}건</span>
                </h2>
                <p className="text-muted-foreground mb-6">{CASE_SECTION_DESCRIPTIONS[section]}</p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">이 분야에 해당하는 사례가 없습니다.</p>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <CaseCard key={item.slug} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="text-center">
            <Link to="/connect/inquiry">
              <Button size="lg" className="gap-2 bg-gradient-primary hover:opacity-90">
                프로젝트 문의하기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default CaseStudies;
